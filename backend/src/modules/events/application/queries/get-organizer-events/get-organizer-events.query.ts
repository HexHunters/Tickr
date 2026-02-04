import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { EventStatus } from '../../../domain/value-objects/event-status.vo';
import type { PaginatedEventListDto } from '../../dtos/event-list.dto';

// ============================================
// Types for GetOrganizerEvents operation
// ============================================

/**
 * Error types for GetOrganizerEvents operation
 */
export type GetOrganizerEventsErrorQuery =
  | { type: 'INVALID_ORGANIZER_ID'; message: string };

/**
 * Result type for GetOrganizerEvents operation
 */
export type GetOrganizerEventsResultQuery = PaginatedEventListDto;

/**
 * Query to get events for a specific organizer
 *
 * Immutable query object following CQRS pattern.
 *
 * Used for:
 * - Organizer dashboard "My Events" page
 * - Admin viewing organizer's events
 */
export class GetOrganizerEventsQuery extends BaseQuery<GetOrganizerEventsResultQuery> {
  constructor(
    /** The ID of the organizer */
    public readonly organizerId: string,
    /** Optional status filter */
    public readonly status?: EventStatus,
    /** Page number (1-based) */
    public readonly page: number = 1,
    /** Items per page */
    public readonly limit: number = 20,
    /** Sort field */
    public readonly sortBy: string = 'createdAt',
    /** Sort direction */
    public readonly sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    super();
    Object.freeze(this);
  }

  /**
   * Create query from plain object
   */
  static fromObject(data: {
    organizerId: string;
    status?: EventStatus;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): GetOrganizerEventsQuery {
    return new GetOrganizerEventsQuery(
      data.organizerId,
      data.status,
      data.page ?? 1,
      data.limit ?? 20,
      data.sortBy ?? 'createdAt',
      data.sortOrder ?? 'DESC',
    );
  }
}
