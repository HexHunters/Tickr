import { BaseCommand } from '@shared/application/interfaces/command.interface';

import type { Currency } from '../../../domain/value-objects/currency.vo';

// ============================================
// Types for UpdateTicketType operation
// ============================================

/**
 * Error types for UpdateTicketType operation
 */
export type UpdateTicketTypeErrorCommand =
  | { type: 'EVENT_NOT_FOUND'; message: string }
  | { type: 'TICKET_TYPE_NOT_FOUND'; message: string }
  | { type: 'NOT_OWNER'; message: string }
  | { type: 'NO_CHANGES'; message: string }
  | { type: 'INVALID_PRICE'; message: string }
  | { type: 'INVALID_QUANTITY'; message: string }
  | { type: 'INVALID_SALES_PERIOD'; message: string }
  | { type: 'CANNOT_MODIFY_AFTER_SALES'; message: string }
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Result type for UpdateTicketType operation - returns void on success
 */
export type UpdateTicketTypeResultCommand = void;

/**
 * Command to update an existing ticket type
 *
 * Immutable command object following CQRS pattern.
 * All fields except eventId, ticketTypeId, and userId are optional.
 *
 * Business Rules:
 * - Event must exist
 * - User must be the organizer
 * - Ticket type must exist
 * - Cannot modify price after first sale
 * - Cannot reduce quantity below sold quantity
 */
export class UpdateTicketTypeCommand extends BaseCommand {
  constructor(
    /** The ID of the event containing the ticket type */
    public readonly eventId: string,
    /** The ID of the ticket type to update */
    public readonly ticketTypeId: string,
    /** The ID of the user (must be the organizer) */
    public readonly userId: string,
    /** Updated ticket type name */
    public readonly name?: string,
    /** Updated description */
    public readonly description?: string | null,
    /** Updated price amount */
    public readonly price?: number,
    /** Updated price currency */
    public readonly currency?: Currency,
    /** Updated quantity (cannot be less than sold) */
    public readonly quantity?: number,
    /** Updated sales start date */
    public readonly salesStartDate?: Date,
    /** Updated sales end date */
    public readonly salesEndDate?: Date,
    /** Whether the ticket type is active */
    public readonly isActive?: boolean,
  ) {
    super();
    Object.freeze(this);
  }

  /**
   * Check if command has any changes
   */
  hasChanges(): boolean {
    return (
      this.name !== undefined ||
      this.description !== undefined ||
      this.price !== undefined ||
      this.quantity !== undefined ||
      this.salesStartDate !== undefined ||
      this.salesEndDate !== undefined ||
      this.isActive !== undefined
    );
  }

  /**
   * Create command from plain object (useful for testing)
   */
  static fromObject(data: {
    eventId: string;
    ticketTypeId: string;
    userId: string;
    name?: string;
    description?: string | null;
    price?: number;
    currency?: Currency | string;
    quantity?: number;
    salesStartDate?: Date | string;
    salesEndDate?: Date | string;
    isActive?: boolean;
  }): UpdateTicketTypeCommand {
    return new UpdateTicketTypeCommand(
      data.eventId,
      data.ticketTypeId,
      data.userId,
      data.name,
      data.description,
      data.price,
      data.currency as Currency | undefined,
      data.quantity,
      data.salesStartDate ? (data.salesStartDate instanceof Date ? data.salesStartDate : new Date(data.salesStartDate)) : undefined,
      data.salesEndDate ? (data.salesEndDate instanceof Date ? data.salesEndDate : new Date(data.salesEndDate)) : undefined,
      data.isActive,
    );
  }
}
