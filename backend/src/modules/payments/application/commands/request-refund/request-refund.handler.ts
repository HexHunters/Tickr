import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';
import { Money } from '@shared/domain/value-objects/money.vo';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { RefundEntity } from '../../../domain/entities/refund.entity';
import {
  PAYMENT_METHOD_DISABLED_MESSAGE,
  PAYMENTS_DISABLED_MESSAGE,
} from '../../constants/payment-method-disabled.constants';
import { ORDER_REPOSITORY } from '../../ports/order.repository.port';
import type { OrderRepositoryPort } from '../../ports/order.repository.port';
import { PAYMENT_ADMIN_ACCESS } from '../../ports/payment-admin-access.port';
import type { PaymentAdminAccessPort } from '../../ports/payment-admin-access.port';
import { PAYMENT_PROVIDER_FACTORY } from '../../ports/payment-provider.port';
import type { PaymentProviderFactoryPort } from '../../ports/payment-provider.port';
import { REFUND_REPOSITORY } from '../../ports/refund.repository.port';
import type { RefundRepositoryPort } from '../../ports/refund.repository.port';
import { TICKET_RESERVATION_PORT } from '../../ports/ticket-reservation.port';
import type { TicketReservationPort } from '../../ports/ticket-reservation.port';

import { RequestRefundCommand, RequestRefundError, RequestRefundResult } from './request-refund.command';

@Injectable()
export class RequestRefundHandler {
  private readonly logger = new Logger(RequestRefundHandler.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepositoryPort,
    @Inject(REFUND_REPOSITORY)
    private readonly refundRepository: RefundRepositoryPort,
    @Inject(PAYMENT_PROVIDER_FACTORY)
    private readonly providerFactory: PaymentProviderFactoryPort,
    @Inject(TICKET_RESERVATION_PORT)
    private readonly ticketReservation: TicketReservationPort,
    private readonly eventPublisher: DomainEventPublisher,
    @Inject(PAYMENT_ADMIN_ACCESS)
    private readonly adminAccess: PaymentAdminAccessPort,
  ) {}

  async execute(
    command: RequestRefundCommand,
  ): Promise<Result<RequestRefundResult, RequestRefundError>> {
    this.logger.debug(`Refund requested for order ${command.orderId}`);

    const supportedMethods = this.providerFactory.getSupportedMethods();
    if (supportedMethods.length === 0) {
      return Result.fail({
        type: 'PAYMENT_METHOD_DISABLED',
        message: PAYMENTS_DISABLED_MESSAGE,
      });
    }

    // Back-office refunds re-check the account rather than the JWT role.
    if (command.asAdmin && !(await this.adminAccess.isActiveAdmin(command.userId))) {
      return Result.fail({
        type: 'ACCESS_DENIED',
        message: 'Only an active administrator can refund another buyer\'s order',
      });
    }

    // 1. Find order
    const order = await this.orderRepository.findById(command.orderId);
    if (!order) {
      return Result.fail({
        type: 'ORDER_NOT_FOUND',
        message: `Order ${command.orderId} not found`,
      });
    }

    // 2. Ownership check — return ORDER_NOT_FOUND to avoid leaking order existence
    if (!command.asAdmin && order.userId !== command.userId) {
      return Result.fail({
        type: 'ORDER_NOT_FOUND',
        message: `Order ${command.orderId} not found`,
      });
    }

    // Never let a disabled provider error fall through to markAsRefunded.
    if (order.paymentMethod && !supportedMethods.includes(order.paymentMethod)) {
      return Result.fail({
        type: 'PAYMENT_METHOD_DISABLED',
        message: PAYMENT_METHOD_DISABLED_MESSAGE,
      });
    }

    // 2. Validate refundable status
    if (!order.canBeRefunded()) {
      return Result.fail({
        type: 'INVALID_STATUS',
        message: `Order in ${order.status} status cannot be refunded`,
      });
    }

    // 3. Calculate refund amount (total minus platform fee — commission non-refundable)
    const refundAmount = Money.create(
      order.subtotalAmount + order.paymentFeesAmount,
      order.currency,
    );

    // 4. Create refund entity
    const refund = RefundEntity.create({
      orderId: order.id,
      amount: refundAmount,
      reason: command.reason,
    });

    // 5. Claim the order before any money moves: a concurrent refund request
    //    (customer and admin, or a double submit) loses the claim here.
    let claimed: boolean;
    try {
      claimed = await this.refundRepository.claim(refund);
    } catch (error) {
      this.logger.error(`Failed to claim refund for order ${order.id}: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: 'Failed to process refund',
      });
    }
    if (!claimed) {
      return Result.fail({
        type: 'INVALID_STATUS',
        message: 'A refund is already in progress or completed for this order',
      });
    }

    // 6. Attempt refund with gateway — only proceed if successful
    if (order.paymentMethod) {
      try {
        const provider = this.providerFactory.getProvider(order.paymentMethod);
        const gatewayRef = order.gatewayPaymentRef || order.transactionId || '';
        const refundResult = await provider.refund(gatewayRef, refundAmount);

        if (refundResult.success) {
          refund.markAsCompleted(refundResult.refundId);
        } else {
          this.logger.warn(`Gateway refund failed for order ${order.id}`);
          await this.releaseClaim(refund);
          return Result.fail({
            type: 'GATEWAY_ERROR',
            message: 'Refund was declined by the payment gateway',
          });
        }
      } catch (error) {
        // Konnect throws for manual refunds — do not mark order as refunded
        this.logger.warn(`Refund requires manual processing: ${error}`);
        await this.releaseClaim(refund);
        return Result.fail({
          type: 'GATEWAY_ERROR',
          message: 'Refund requires manual processing via payment gateway dashboard',
        });
      }
    }

    // 7. Mark order as refunded (only reached if gateway succeeded or no payment method)
    const refundedResult = order.markAsRefunded(command.reason);
    if (refundedResult.isFailure) {
      // Money may already be back with the buyer: keep the PENDING claim so no
      // retry can refund twice, and leave it for manual reconciliation.
      this.logger.error(
        `Refund ${refund.id} for order ${order.id} needs reconciliation: ${refundedResult.error!.message}`,
      );
      return Result.fail({
        type: 'INVALID_STATUS',
        message: refundedResult.error!.message,
      });
    }

    // 8. Cancel tickets
    try {
      // Use real ticket IDs stored in metadata during order creation
      const ticketIds = (order.metadata?.ticketIds as string[]) ?? [];
      if (ticketIds.length > 0) {
        await this.ticketReservation.cancelReservations(ticketIds);
      }
    } catch (error) {
      this.logger.error(`Failed to cancel tickets on refund: ${error}`);
    }

    // 9. Persist
    try {
      await this.refundRepository.save(refund);
      await this.orderRepository.save(order);
    } catch (error) {
      this.logger.error(`Failed to save refund: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: 'Failed to process refund',
      });
    }

    // 10. Publish events
    const events = order.pullDomainEvents();
    await this.eventPublisher.publishMany(events);

    this.logger.log(`Refund ${refund.id} processed for order ${order.id}`);
    if (command.asAdmin) {
      this.logger.log(
        `Admin ${command.userId} refunded order ${order.id} (refund ${refund.id}): ${command.reason}`,
      );
    }

    return Result.ok({
      refundId: refund.id,
      status: refund.status,
    });
  }

  /** Marks the claim FAILED so a later attempt can claim the order again. */
  private async releaseClaim(refund: RefundEntity): Promise<void> {
    refund.markAsFailed();
    try {
      await this.refundRepository.save(refund);
    } catch (error) {
      this.logger.error(`Failed to release refund claim ${refund.id}: ${error}`);
    }
  }
}
