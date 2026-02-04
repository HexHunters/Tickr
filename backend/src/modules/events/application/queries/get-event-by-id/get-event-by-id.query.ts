import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { EventDto } from '../../dtos/event.dto';

// ============================================
// Types for GetEventById operation
// ============================================

/**
 * Error types for GetEventById operation
 */
export type GetEventByIdErrorQuery =
  | { type: 'EVENT_NOT_FOUND'; message: string }
  | { type: 'ACCESS_DENIED'; message: string };

/**
 * Result type for GetEventById operation
 */
export type GetEventByIdResultQuery = EventDto;

/**
 * Query to get a single event by ID
 *
 * Immutable query object following CQRS pattern.
 *
 * Access Rules:
 * - Published events: visible to everyone
 * - Draft/Cancelled events: only visible to the organizer
 */
export class GetEventByIdQuery extends BaseQuery<GetEventByIdResultQuery> {
  constructor(
    /** The ID of the event to retrieve */
    public readonly eventId: string,
    /** Optional: The ID of the requesting user (for access control) */
    public readonly requestingUserId?: string,
  ) {
    super();
    Object.freeze(this);
  }

  /**
   * Create query from plain object
   */
  static fromObject(data: {
    eventId: string;
    requestingUserId?: string;
  }): GetEventByIdQuery {
    return new GetEventByIdQuery(data.eventId, data.requestingUserId);
  }
}
