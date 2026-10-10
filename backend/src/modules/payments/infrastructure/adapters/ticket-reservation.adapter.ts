import {
  CancelTicketsCommand,
  CancelTicketsHandler,
  ConfirmTicketsCommand,
  ConfirmTicketsHandler,
  ReserveTicketsCommand,
  ReserveTicketsHandler,
} from '@modules/tickets/application';
import { Injectable, Logger } from '@nestjs/common';

import type {
  TicketReservationPort,
  TicketReservationResult,
} from '../../application/ports/ticket-reservation.port';

/**
 * Ticket Reservation Adapter (Cross-module: Payments → Tickets)
 *
 * Anti-corruption layer that delegates ticket operations
 * to the Tickets bounded context. This adapter bridges the
 * Payments module's port interface to the Tickets module's
 * command handlers.
 *
 * Architecture:
 * - Located in infrastructure/adapters/ (allowed to import cross-module)
 * - Injects handlers exported from TicketsModule
 * - Translates port method signatures to command objects
 * - Unwraps Result<T,E> and throws on failure (callers use try/catch)
 */
@Injectable()
export class TicketReservationAdapter implements TicketReservationPort {
  private readonly logger = new Logger(TicketReservationAdapter.name);

  constructor(
    private readonly reserveHandler: ReserveTicketsHandler,
    private readonly confirmHandler: ConfirmTicketsHandler,
    private readonly cancelHandler: CancelTicketsHandler,
  ) {}

  /**
   * Reserve tickets for an order
   *
   * Creates ticket reservations with a 15-minute TTL.
   * Returns the real ticket IDs which must be stored on the order.
   */
  async reserveTickets(
    eventId: string,
    ticketTypeId: string,
    userId: string,
    _quantity: number,
    holders: { name: string; email: string }[],
  ): Promise<TicketReservationResult> {
    this.logger.debug(
      `Reserving ${holders.length} tickets for event ${eventId}, type ${ticketTypeId}, user ${userId}`,
    );

    // Bridge port holders to command holders (add optional phone field)
    const commandHolders = holders.map((h) => ({
      name: h.name,
      email: h.email,
      phone: undefined,
    }));

    const command = new ReserveTicketsCommand(
      eventId,
      ticketTypeId,
      userId,
      commandHolders,
    );

    const result = await this.reserveHandler.execute(command);

    if (result.isFailure) {
      const error = result.error;
      this.logger.error(
        `Failed to reserve tickets: ${error.type} - ${error.message}`,
      );
      throw new Error(`Ticket reservation failed: ${error.message}`);
    }

    this.logger.debug(
      `Reserved ${result.value.ticketIds.length} tickets: ${result.value.ticketIds.join(', ')}`,
    );

    return {
      ticketIds: result.value.ticketIds,
      reservedUntil: result.value.reservedUntil,
    };
  }

  /**
   * Confirm ticket reservations after successful payment
   *
   * Transitions tickets from RESERVED to CONFIRMED status.
   * Called internally (no userId) — ownership was verified at reservation time.
   */
  async confirmTickets(ticketIds: string[], orderId: string): Promise<void> {
    if (ticketIds.length === 0) {
      this.logger.warn('confirmTickets called with empty ticketIds array');
      return;
    }

    this.logger.debug(
      `Confirming ${ticketIds.length} tickets for order ${orderId}`,
    );

    // No userId — internal call, skip ownership check
    const command = new ConfirmTicketsCommand(ticketIds, orderId);

    const result = await this.confirmHandler.execute(command);

    if (result.isFailure) {
      const error = result.error;
      this.logger.error(
        `Failed to confirm tickets: ${error.type} - ${error.message}`,
      );
      throw new Error(`Ticket confirmation failed: ${error.message}`);
    }

    this.logger.debug(`Confirmed ${result.value.confirmedIds.length} tickets`);
  }

  /**
   * Cancel ticket reservations
   *
   * Called when payment fails, order expires, or refund is processed.
   * Restores ticket availability to the pool.
   */
  async cancelReservations(ticketIds: string[]): Promise<void> {
    if (ticketIds.length === 0) {
      this.logger.warn('cancelReservations called with empty ticketIds array');
      return;
    }

    this.logger.debug(`Cancelling ${ticketIds.length} ticket reservations`);

    // No userId — internal call, skip ownership check
    // Provide a generic reason for internal cancellations
    const command = new CancelTicketsCommand(
      ticketIds,
      'Order cancelled, expired, or payment failed',
    );

    const result = await this.cancelHandler.execute(command);

    if (result.isFailure) {
      const error = result.error;
      this.logger.error(
        `Failed to cancel reservations: ${error.type} - ${error.message}`,
      );
      throw new Error(`Ticket cancellation failed: ${error.message}`);
    }

    this.logger.debug(`Cancelled ${ticketIds.length} ticket reservations`);
  }
}
