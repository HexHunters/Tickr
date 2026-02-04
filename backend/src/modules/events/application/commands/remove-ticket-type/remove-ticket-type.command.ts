import { BaseCommand } from '@shared/application/interfaces/command.interface';

// ============================================
// Types for RemoveTicketType operation
// ============================================

/**
 * Error types for RemoveTicketType operation
 */
export type RemoveTicketTypeErrorCommand =
  | { type: 'EVENT_NOT_FOUND'; message: string }
  | { type: 'TICKET_TYPE_NOT_FOUND'; message: string }
  | { type: 'NOT_OWNER'; message: string }
  | { type: 'EVENT_NOT_DRAFT'; message: string }
  | { type: 'HAS_SALES'; message: string }
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Result type for RemoveTicketType operation - returns void on success
 */
export type RemoveTicketTypeResultCommand = void;

/**
 * Command to remove a ticket type from an event
 *
 * Immutable command object following CQRS pattern.
 *
 * Business Rules:
 * - Event must exist
 * - User must be the organizer
 * - Event status must be DRAFT
 * - Ticket type must exist
 * - Ticket type must have no sales
 */
export class RemoveTicketTypeCommand extends BaseCommand {
  constructor(
    /** The ID of the event containing the ticket type */
    public readonly eventId: string,
    /** The ID of the ticket type to remove */
    public readonly ticketTypeId: string,
    /** The ID of the user (must be the organizer) */
    public readonly userId: string,
  ) {
    super();
    Object.freeze(this);
  }

  /**
   * Create command from plain object (useful for testing)
   */
  static fromObject(data: {
    eventId: string;
    ticketTypeId: string;
    userId: string;
  }): RemoveTicketTypeCommand {
    return new RemoveTicketTypeCommand(
      data.eventId,
      data.ticketTypeId,
      data.userId,
    );
  }
}
