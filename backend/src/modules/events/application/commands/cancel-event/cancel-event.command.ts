import { BaseCommand } from '@shared/application/interfaces/command.interface';

// ============================================
// Types for CancelEvent operation
// ============================================

/**
 * Error types for CancelEvent operation
 */
export type CancelEventErrorCommand =
  | { type: 'EVENT_NOT_FOUND'; message: string }
  | { type: 'NOT_OWNER'; message: string }
  | { type: 'ALREADY_CANCELLED'; message: string }
  | { type: 'ALREADY_COMPLETED'; message: string }
  | { type: 'ALREADY_STARTED'; message: string }
  | { type: 'WRONG_STATUS'; message: string }
  | { type: 'MISSING_REASON'; message: string }
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Result type for CancelEvent operation - returns void on success
 */
export type CancelEventResultCommand = void;

/**
 * Command to cancel an event
 *
 * Immutable command object following CQRS pattern.
 *
 * Business Rules:
 * - Event must exist
 * - User must be the organizer
 * - Event can be cancelled if:
 *   - Status is DRAFT or PUBLISHED
 *   - Event has not started yet
 * - Cannot cancel if:
 *   - Status is CANCELLED (already cancelled)
 *   - Status is COMPLETED (already finished)
 *   - Event has already started
 */
export class CancelEventCommand extends BaseCommand {
  constructor(
    /** The ID of the event to cancel */
    public readonly eventId: string,
    /** The ID of the user (must be the organizer) */
    public readonly userId: string,
    /** Reason for cancellation */
    public readonly reason: string,
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
    reason: string;
  }): CancelEventCommand {
    return new CancelEventCommand(data.eventId, data.userId, data.reason);
  }
}
