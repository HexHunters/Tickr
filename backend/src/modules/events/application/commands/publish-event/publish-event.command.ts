import { BaseCommand } from '@shared/application/interfaces/command.interface';

// ============================================
// Types for PublishEvent operation
// ============================================

/**
 * Error types for PublishEvent operation
 */
export type PublishEventErrorCommand =
  | { type: 'EVENT_NOT_FOUND'; message: string }
  | { type: 'NOT_OWNER'; message: string }
  | { type: 'WRONG_STATUS'; message: string }
  | { type: 'MISSING_TITLE'; message: string }
  | { type: 'MISSING_LOCATION'; message: string }
  | { type: 'MISSING_TICKET_TYPES'; message: string }
  | { type: 'EVENT_DATE_IN_PAST'; message: string }
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Result type for PublishEvent operation - returns void on success
 */
export type PublishEventResultCommand = void;

/**
 * Command to publish an event
 *
 * Immutable command object following CQRS pattern.
 *
 * Business Rules:
 * - Event must exist
 * - User must be the organizer
 * - Event must be in DRAFT status
 * - Event must have at least one active ticket type
 * - Event start date must be in the future
 * - Event must have a valid title and location
 */
export class PublishEventCommand extends BaseCommand {
  constructor(
    /** The ID of the event to publish */
    public readonly eventId: string,
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
    userId: string;
  }): PublishEventCommand {
    return new PublishEventCommand(data.eventId, data.userId);
  }
}
