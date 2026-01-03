import { BaseCommand } from '@shared/application/interfaces/command.interface';

import type { Currency } from '../../../domain/value-objects/currency.vo';

// ============================================
// Types for AddTicketType operation
// ============================================

/**
 * Error types for AddTicketType operation
 */
export type AddTicketTypeErrorCommand =
  | { type: 'EVENT_NOT_FOUND'; message: string }
  | { type: 'NOT_OWNER'; message: string }
  | { type: 'INVALID_PRICE'; message: string }
  | { type: 'INVALID_SALES_PERIOD'; message: string }
  | { type: 'INVALID_TICKET_TYPE'; message: string }
  | { type: 'MAX_TICKET_TYPES_REACHED'; message: string }
  | { type: 'DUPLICATE_NAME'; message: string }
  | { type: 'CANNOT_MODIFY'; message: string }
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Result type for AddTicketType operation
 */
export interface AddTicketTypeResultCommand {
  ticketTypeId: string;
}

/**
 * Command to add a ticket type to an event
 *
 * Immutable command object following CQRS pattern.
 *
 * Business Rules:
 * - Event must exist
 * - User must be the organizer
 * - Creates TicketType entity with price via Money VO
 * - Sales dates must be valid (start < end, end before event start)
 * - Max 10 ticket types per event
 */
export class AddTicketTypeCommand extends BaseCommand {
  constructor(
    /** The ID of the event to add ticket type to */
    public readonly eventId: string,
    /** The ID of the user (must be the organizer) */
    public readonly userId: string,
    /** Ticket type name (1-100 chars) */
    public readonly name: string,
    /** Ticket price amount (must be > 0) */
    public readonly price: number,
    /** Price currency (defaults to TND) */
    public readonly currency: Currency,
    /** Total quantity available */
    public readonly quantity: number,
    /** Sales period start date */
    public readonly salesStartDate: Date,
    /** Sales period end date (must be before event start) */
    public readonly salesEndDate: Date,
    /** Optional description (max 500 chars) */
    public readonly description?: string | null,
    /** Whether the ticket type is active (defaults to true) */
    public readonly isActive?: boolean,
  ) {
    super();
    Object.freeze(this);
  }

  /**
   * Create command from plain object (useful for testing)
   */
  static fromObject(data: {
    eventId: string;
    userId: string;
    name: string;
    price: number;
    currency: Currency | string;
    quantity: number;
    salesStartDate: Date | string;
    salesEndDate: Date | string;
    description?: string | null;
    isActive?: boolean;
  }): AddTicketTypeCommand {
    return new AddTicketTypeCommand(
      data.eventId,
      data.userId,
      data.name,
      data.price,
      data.currency as Currency,
      data.quantity,
      data.salesStartDate instanceof Date ? data.salesStartDate : new Date(data.salesStartDate),
      data.salesEndDate instanceof Date ? data.salesEndDate : new Date(data.salesEndDate),
      data.description,
      data.isActive,
    );
  }
}
