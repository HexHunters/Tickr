import { Inject, Injectable, Logger } from '@nestjs/common';
import { DOMAIN_EVENT_PUBLISHER } from '@shared/application/interfaces/domain-event-publisher.port';
import type { DomainEventPublisherPort } from '@shared/application/interfaces/domain-event-publisher.port';
import { Result } from '@shared/domain/result';

import { ORDER_QUERY_PORT } from '../../ports/order-query.port';
import type { OrderQueryPort } from '../../ports/order-query.port';
import { TICKET_REPOSITORY } from '../../ports/ticket.repository.port';
import type { TicketRepositoryPort } from '../../ports/ticket.repository.port';

import {
  ConfirmTicketsCommand,
  type ConfirmTicketsErrorCommand,
  type ConfirmTicketsResultCommand,
} from './confirm-tickets.command';

// Re-export types for external use
export type ConfirmTicketsResult = ConfirmTicketsResultCommand;
export type ConfirmTicketsError = ConfirmTicketsErrorCommand;

/**
 * Handler for ConfirmTicketsCommand
 *
 * Transitions tickets from RESERVED to CONFIRMED after payment.
 *
 * Responsibilities:
 * 1. Load all tickets by IDs
 * 2. Confirm each ticket with the order ID
 * 3. Collect errors for tickets that cannot be confirmed
 * 4. Save all successfully confirmed tickets
 * 5. Publish domain events
 */
@Injectable()
export class ConfirmTicketsHandler {
  private readonly logger = new Logger(ConfirmTicketsHandler.name);

  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepositoryPort,
    @Inject(ORDER_QUERY_PORT)
    private readonly orderQuery: OrderQueryPort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisherPort,
  ) {}

  async execute(
    command: ConfirmTicketsCommand,
  ): Promise<Result<ConfirmTicketsResult, ConfirmTicketsError>> {
    this.logger.debug(
      `Confirming ${command.ticketIds.length} ticket(s) for order ${command.orderId}`,
    );

    // ============================================
    // 1. Load all tickets
    // ============================================
    const tickets = await Promise.all(
      command.ticketIds.map((id) => this.ticketRepository.findById(id)),
    );

    const missingIds = command.ticketIds.filter(
      (id, i) => tickets[i] === null,
    );
    if (missingIds.length > 0) {
      return Result.fail({
        type: 'TICKETS_NOT_FOUND',
        message: `Tickets not found: ${missingIds.join(', ')}`,
      });
    }

    // ============================================
    // 2. Verify ownership (when userId provided — HTTP flow)
    // ============================================
    if (command.userId) {
      const notOwned = tickets.filter((t) => t!.userId !== command.userId);
      if (notOwned.length > 0) {
        return Result.fail({
          type: 'NOT_TICKET_OWNER',
          message: 'You do not own all the tickets being confirmed',
        });
      }
    }

    // ============================================
    // 3. Verify order is PAID (when userId provided — HTTP flow)
    // ============================================
    if (command.userId) {
      const order = await this.orderQuery.findById(command.orderId);
      if (!order) {
        return Result.fail({
          type: 'INVALID_ORDER',
          message: `Order ${command.orderId} not found`,
        });
      }
      if (order.userId !== command.userId) {
        return Result.fail({
          type: 'INVALID_ORDER',
          message: `Order ${command.orderId} not found`,
        });
      }
      if (order.status !== 'PAID') {
        return Result.fail({
          type: 'INVALID_ORDER',
          message: 'Order must be paid before confirming tickets',
        });
      }
    }

    // ============================================
    // 4. Confirm each ticket
    // ============================================
    const errors: string[] = [];
    const confirmed = [];

    for (const ticket of tickets) {
      const result = ticket!.confirm(command.orderId);
      if (result.isFailure) {
        errors.push(`Ticket ${ticket!.id}: ${result.error.message}`);
      } else {
        confirmed.push(ticket!);
      }
    }

    if (errors.length > 0 && confirmed.length === 0) {
      return Result.fail({
        type: 'CONFIRMATION_FAILED',
        message: errors.join('; '),
      });
    }

    // ============================================
    // 5. Save confirmed tickets
    // ============================================
    try {
      await this.ticketRepository.saveAll(confirmed);

      // ============================================
      // 6. Publish domain events
      // ============================================
      for (const ticket of confirmed) {
        await this.eventPublisher.publishFromAggregate(ticket);
      }

      const confirmedIds = confirmed.map((t) => t.id);
      this.logger.log(
        `Confirmed ${confirmedIds.length} ticket(s) for order ${command.orderId}`,
      );

      return Result.ok({ confirmedIds });
    } catch (error) {
      this.logger.error(`Failed to save confirmed tickets: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to confirm tickets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
