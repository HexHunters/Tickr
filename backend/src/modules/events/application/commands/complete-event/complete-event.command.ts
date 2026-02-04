// ============================================
// Complete Event Command
// ============================================

/**
 * Command to mark an event as completed
 *
 * This command is typically triggered by:
 * 1. The scheduler service (batch processing)
 * 2. Manual admin action (single event)
 *
 * Business Rules:
 * - Event status must be PUBLISHED
 * - Current date must be after event end date
 * - Terminal state - cannot be undone
 */
export class CompleteEventCommand {
  constructor(
    /**
     * Event ID (UUID)
     */
    public readonly eventId: string,
  ) {}
}

// ============================================
// Result Types
// ============================================

/**
 * Possible error types
 */
export type CompleteEventError =
  | { type: 'EVENT_NOT_FOUND'; message: string }
  | { type: 'INVALID_STATUS'; message: string }
  | { type: 'EVENT_NOT_ENDED'; message: string };
