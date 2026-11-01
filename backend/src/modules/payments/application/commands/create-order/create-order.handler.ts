import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Result } from '@shared/domain/result';
import { Money } from '@shared/domain/value-objects/money.vo';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { OrderEntity } from '../../../domain/entities/order.entity';
import { PAYMENTS_DISABLED_MESSAGE } from '../../constants/payment-method-disabled.constants';
import { PAYMENT_EVENT_QUERY_PORT } from '../../ports/event-query.port';
import type { PaymentEventQueryPort } from '../../ports/event-query.port';
import { FRAUD_DETECTION_PORT } from '../../ports/fraud-detection.port';
import type { FraudDetectionPort } from '../../ports/fraud-detection.port';
import type { OrderRepositoryPort } from '../../ports/order.repository.port';
import { ORDER_REPOSITORY } from '../../ports/order.repository.port';
import { TICKET_RESERVATION_PORT } from '../../ports/ticket-reservation.port';
import type { TicketReservationPort } from '../../ports/ticket-reservation.port';

import {
  CreateOrderCommand,
  CreateOrderError,
  CreateOrderResult,
} from './create-order.command';

@Injectable()
export class CreateOrderHandler {
  private readonly logger = new Logger(CreateOrderHandler.name);
  private readonly commissionRate: number;
  private readonly expirationMinutes: number;

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepositoryPort,
    @Inject(PAYMENT_EVENT_QUERY_PORT)
    private readonly eventQuery: PaymentEventQueryPort,
    @Inject(FRAUD_DETECTION_PORT)
    private readonly fraudDetection: FraudDetectionPort,
    @Inject(TICKET_RESERVATION_PORT)
    private readonly ticketReservation: TicketReservationPort,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly configService: ConfigService,
  ) {
    this.commissionRate =
      this.configService.get<number>('payments.commission.rate') ??
      this.configService.get<number>('PLATFORM_COMMISSION_RATE', 0.06);
    // Use the validated config (already parsed as number in payments.config.ts)
    this.expirationMinutes =
      this.configService.get<number>('payments.order.expirationMinutes') ?? 15;
  }

  async execute(
    command: CreateOrderCommand,
  ): Promise<Result<CreateOrderResult, CreateOrderError>> {
    this.logger.debug(`Creating order for user ${command.userId}, event ${command.eventId}`);

    if (command.items.length === 0 || command.items.length > OrderEntity.MAX_ITEMS ||
        new Set(command.items.map((item) => item.ticketTypeId)).size !== command.items.length ||
        command.items.some((item) => !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.holders.length !== item.quantity)) {
      return Result.fail({ type: 'VALIDATION_ERROR', message: 'Use distinct ticket types with positive quantities matching holder counts' });
    }

    // 2. Validate event exists and is published
    const event = await this.eventQuery.getEventById(command.eventId);
    if (!event) {
      return Result.fail({
        type: 'EVENT_NOT_FOUND',
        message: `Event ${command.eventId} not found`,
      });
    }
    if (event.status !== 'PUBLISHED') {
      return Result.fail({
        type: 'EVENT_NOT_PUBLISHED',
        message: 'Event is not available for ticket purchase',
      });
    }

    // 3. Validate items and build order items
    const orderItems = [];
    const allHolders: { ticketTypeId: string; holders: { name: string; email: string }[] }[] = [];

    for (const item of command.items) {
      const ticketType = await this.eventQuery.getTicketType(item.ticketTypeId);
      if (!ticketType || ticketType.eventId !== event.id) {
        return Result.fail({
          type: 'TICKET_TYPE_NOT_FOUND',
          message: `Ticket type ${item.ticketTypeId} not found`,
        });
      }

      if (ticketType.available < item.quantity) {
        return Result.fail({
          type: 'INSUFFICIENT_AVAILABILITY',
          message: `Only ${ticketType.available} tickets available for ${ticketType.name}`,
        });
      }

      if (!Number.isFinite(ticketType.price) || ticketType.price < 0 ||
          (orderItems.length > 0 && orderItems[0].price.currency !== ticketType.currency)) {
        return Result.fail({ type: 'VALIDATION_ERROR', message: 'Order prices must be non-negative and use one currency' });
      }

      orderItems.push({
        ticketTypeId: item.ticketTypeId,
        ticketTypeName: ticketType.name,
        price: Money.create(ticketType.price, ticketType.currency),
        quantity: item.quantity,
      });

      allHolders.push({ ticketTypeId: item.ticketTypeId, holders: item.holders });
    }

    const freeTicketsEnabled = event.freeTicketsEnabledOverride ??
      (this.configService.get<boolean>('payments.freeTickets.enabled', false) === true);
    if (orderItems.some((item) => item.price.amount === 0) && !freeTicketsEnabled) {
      return Result.fail({ type: 'FREE_TICKETS_DISABLED', message: 'Free tickets are disabled for this event' });
    }
    const isFree = orderItems.every((item) => item.price.amount === 0);
    if (!isFree && this.configService.get<boolean>('payments.gateways.enabled', false) !== true) {
      return Result.fail({ type: 'PAYMENT_METHOD_DISABLED', message: PAYMENTS_DISABLED_MESSAGE });
    }
    if (!(await this.fraudDetection.checkRateLimit(command.userId))) {
      return Result.fail({ type: 'RATE_LIMITED', message: 'Too many orders. Please wait before placing another order.' });
    }
    const quantity = command.items.reduce((count, item) => count + item.quantity, 0);
    if (!(await this.fraudDetection.checkTicketLimit(command.userId, command.eventId, quantity))) {
      return Result.fail({ type: 'TICKET_LIMIT_EXCEEDED', message: 'Maximum tickets per event exceeded' });
    }

    // 4. Create the order aggregate
    const orderResult = OrderEntity.create({
      userId: command.userId,
      eventId: command.eventId,
      items: orderItems,
      currency: orderItems[0].price.currency,
      commissionRate: event.commissionRateOverride ?? this.commissionRate,
      expirationMinutes: this.expirationMinutes,
      metadata: command.metadata,
    });

    if (orderResult.isFailure) {
      return Result.fail({
        type: 'VALIDATION_ERROR',
        message: orderResult.error!.message,
      });
    }

    const order = orderResult.value;

    // 5. Reserve tickets via Tickets module and collect ticket IDs
    const allTicketIds: string[] = [];
    try {
      for (const item of allHolders) {
        const reservationResult = await this.ticketReservation.reserveTickets(
          command.eventId,
          item.ticketTypeId,
          command.userId,
          item.holders.length,
          item.holders,
        );
        allTicketIds.push(...reservationResult.ticketIds);
      }
    } catch (error) {
      this.logger.error(`Failed to reserve tickets: ${error}`);
      // Compensation: cancel any tickets that were already reserved
      if (allTicketIds.length > 0) {
        try {
          await this.ticketReservation.cancelReservations(allTicketIds);
          this.logger.debug(`Compensated: cancelled ${allTicketIds.length} reserved tickets`);
        } catch (cancelError) {
          this.logger.error(`Failed to cancel reserved tickets during compensation: ${cancelError}`);
        }
      }
      return Result.fail({
        type: 'INSUFFICIENT_AVAILABILITY',
        message: 'Failed to reserve tickets. Please try again.',
      });
    }

    // 5b. Store ticket IDs in order metadata for later use by confirm/cancel/expire handlers
    order.setMetadata({
      ...order.metadata,
      ticketIds: allTicketIds,
    });

    // 6. Persist order
    try {
      await this.orderRepository.save(order);
    } catch (error) {
      this.logger.error(`Failed to save order: ${error}`);
      await this.cancelReservations(allTicketIds);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: 'Failed to create order. Please try again.',
      });
    }

    if (isFree) {
      try {
        await this.ticketReservation.confirmTickets(allTicketIds, order.id);
        const fulfilled = order.fulfillFree();
        if (fulfilled.isFailure) throw new Error(fulfilled.error.message);
        await this.orderRepository.save(order);
      } catch (error) {
        this.logger.error(`Free order ${order.id} fulfillment failed: ${error}`);
        await this.cancelReservations(allTicketIds);
        return Result.fail({ type: 'PERSISTENCE_ERROR', message: 'Free booking could not be completed; do not use its tickets' });
      }
    }

    // 7. Publish domain events
    const events = order.pullDomainEvents();
    await this.eventPublisher.publishMany(events);

    this.logger.log(`Order ${order.id} created successfully`);

    return Result.ok({
      orderId: order.id,
      subtotal: order.subtotalAmount,
      platformFee: order.platformFeeAmount,
      total: order.totalAmount,
      currency: order.currency,
      expiresAt: order.expiresAt,
      status: order.status,
      requiresPayment: !isFree,
    });
  }

  private async cancelReservations(ticketIds: string[]): Promise<void> {
    try {
      await this.ticketReservation.cancelReservations(ticketIds);
    } catch (error) {
      this.logger.error(`Reservation compensation failed for ${ticketIds.join(', ')}: ${error}`);
    }
  }
}
