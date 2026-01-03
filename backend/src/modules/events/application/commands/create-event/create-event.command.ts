import { BaseCommand } from '@shared/application/interfaces/command.interface';

import { EventCategory } from '../../../domain/value-objects/event-category.vo';

// ============================================
// Types for CreateEvent operation
// ============================================

/**
 * Error types for CreateEvent operation
 */
export type CreateEventErrorCommand =
  | { type: 'USER_NOT_FOUND'; message: string }
  | { type: 'NOT_ORGANIZER'; message: string }
  | { type: 'INVALID_LOCATION'; message: string }
  | { type: 'INVALID_DATE_RANGE'; message: string }
  | { type: 'INVALID_CATEGORY'; message: string }
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Result type for CreateEvent operation
 */
export interface CreateEventResultCommand {
  eventId: string;
}

/**
 * Location data for creating an event
 */
interface CreateEventLocationData {
  readonly address?: string | null;
  readonly city: string;
  readonly country: string;
  readonly postalCode?: string | null;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
}

/**
 * Command to create a new event
 *
 * Immutable command object following CQRS pattern.
 * All validation is performed in the handler.
 */
export class CreateEventCommand extends BaseCommand {
  constructor(
    /** The ID of the organizer creating the event (must be ORGANIZER role) */
    public readonly organizerId: string,
    /** Event title (1-200 chars) */
    public readonly title: string,
    /** Event category */
    public readonly category: EventCategory,
    /** Event location */
    public readonly location: CreateEventLocationData,
    /** Event start date (must be in future) */
    public readonly startDate: Date,
    /** Event end date (must be after start date) */
    public readonly endDate: Date,
    /** Optional event description (max 5000 chars) */
    public readonly description?: string | null,
    /** Optional image URL */
    public readonly imageUrl?: string | null,
  ) {
    super();
    Object.freeze(this);
  }

  /**
   * Create command from plain object (useful for testing)
   */
  static fromObject(data: {
    organizerId: string;
    title: string;
    category: EventCategory | string;
    location: CreateEventLocationData;
    startDate: Date | string;
    endDate: Date | string;
    description?: string | null;
    imageUrl?: string | null;
  }): CreateEventCommand {
    return new CreateEventCommand(
      data.organizerId,
      data.title,
      (typeof data.category === 'string'
        ? data.category.toUpperCase()
        : data.category) as EventCategory,
      data.location,
      data.startDate instanceof Date ? data.startDate : new Date(data.startDate),
      data.endDate instanceof Date ? data.endDate : new Date(data.endDate),
      data.description,
      data.imageUrl,
    );
  }
}
