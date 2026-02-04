import { BaseCommand } from '@shared/application/interfaces/command.interface';

import type { EventCategory } from '../../../domain/value-objects/event-category.vo';

// ============================================
// Types for UpdateEvent operation
// ============================================

/**
 * Error types for UpdateEvent operation
 */
export type UpdateEventErrorCommand =
  | { type: 'EVENT_NOT_FOUND'; message: string }
  | { type: 'NOT_OWNER'; message: string }
  | { type: 'NO_CHANGES'; message: string }
  | { type: 'CANNOT_MODIFY'; message: string }
  | { type: 'INVALID_LOCATION'; message: string }
  | { type: 'INVALID_DATE_RANGE'; message: string }
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Result type for UpdateEvent operation
 */
export interface UpdateEventResultCommand {
  event: Record<string, unknown>;
}

/**
 * Location update data
 */
interface UpdateEventLocationData {
  readonly address?: string | null;
  readonly city: string;
  readonly country: string;
  readonly postalCode?: string | null;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
}

/**
 * Command to update an existing event
 *
 * Immutable command object following CQRS pattern.
 * All fields except eventId and userId are optional.
 *
 * Business Rules:
 * - DRAFT events: all fields can be updated
 * - PUBLISHED events: only title, description, category can be updated
 * - CANCELLED/COMPLETED events: no updates allowed
 */
export class UpdateEventCommand extends BaseCommand {
  constructor(
    /** The ID of the event to update */
    public readonly eventId: string,
    /** The ID of the user making the update (must be the organizer) */
    public readonly userId: string,
    /** Updated event title */
    public readonly title?: string,
    /** Updated event description */
    public readonly description?: string | null,
    /** Updated event category */
    public readonly category?: EventCategory,
    /** Updated event location (only for DRAFT events) */
    public readonly location?: UpdateEventLocationData,
    /** Updated start date (only for DRAFT events) */
    public readonly startDate?: Date,
    /** Updated end date (only for DRAFT events) */
    public readonly endDate?: Date,
  ) {
    super();
    Object.freeze(this);
  }

  /**
   * Check if command has any changes
   */
  hasChanges(): boolean {
    return (
      this.title !== undefined ||
      this.description !== undefined ||
      this.category !== undefined ||
      this.location !== undefined ||
      this.startDate !== undefined ||
      this.endDate !== undefined
    );
  }

  /**
   * Create command from plain object (useful for testing)
   */
  static fromObject(data: {
    eventId: string;
    userId: string;
    title?: string;
    description?: string | null;
    category?: EventCategory | string;
    location?: UpdateEventLocationData;
    startDate?: Date | string;
    endDate?: Date | string;
  }): UpdateEventCommand {
    return new UpdateEventCommand(
      data.eventId,
      data.userId,
      data.title,
      data.description,
      data.category as EventCategory | undefined,
      data.location,
      data.startDate ? (data.startDate instanceof Date ? data.startDate : new Date(data.startDate)) : undefined,
      data.endDate ? (data.endDate instanceof Date ? data.endDate : new Date(data.endDate)) : undefined,
    );
  }
}
