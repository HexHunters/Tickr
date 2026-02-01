import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { PaginatedEventListDto } from '../../dtos/event-list.dto';

// ============================================
// Types for GetUpcomingEvents operation
// ============================================

/**
 * Result type for GetUpcomingEvents operation
 */
export type GetUpcomingEventsResultQuery = PaginatedEventListDto;

/**
 * Query to get upcoming events
 *
 * Immutable query object following CQRS pattern.
 *
 * Used for:
 * - Homepage upcoming events section
 * - Event discovery with optional location filter
 */
export class GetUpcomingEventsQuery extends BaseQuery<GetUpcomingEventsResultQuery> {
  constructor(
    /** Optional city filter */
    public readonly city?: string,
    /** Optional country filter */
    public readonly country?: string,
    /** Page number (1-based) */
    public readonly page: number = 1,
    /** Items per page */
    public readonly limit: number = 20,
  ) {
    super();
    Object.freeze(this);
  }

  /**
   * Create query from plain object
   */
  static fromObject(data: {
    city?: string;
    country?: string;
    page?: number;
    limit?: number;
  }): GetUpcomingEventsQuery {
    return new GetUpcomingEventsQuery(
      data.city,
      data.country,
      data.page ?? 1,
      data.limit ?? 20,
    );
  }
}
