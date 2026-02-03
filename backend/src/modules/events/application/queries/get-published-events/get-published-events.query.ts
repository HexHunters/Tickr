import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { EventCategory } from '../../../domain/value-objects/event-category.vo';
import type { PaginatedEventListDto } from '../../dtos/event-list.dto';

// ============================================
// Types for GetPublishedEvents operation
// ============================================

/**
 * Filters for published events query
 * Named with 'Query' suffix to comply with architecture naming conventions.
 */
export interface PublishedEventsFiltersQuery {
  category?: EventCategory;
  city?: string;
  country?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Result type for GetPublishedEvents operation
 */
export type GetPublishedEventsResultQuery = PaginatedEventListDto;

/**
 * Query to get published events with filters
 *
 * Immutable query object following CQRS pattern.
 *
 * Used for:
 * - Public event discovery
 * - Filtered event browsing
 * - Category pages
 */
export class GetPublishedEventsQuery extends BaseQuery<GetPublishedEventsResultQuery> {
  constructor(
    /** Optional filters */
    public readonly filters: PublishedEventsFiltersQuery = {},
    /** Page number (1-based) */
    public readonly page: number = 1,
    /** Items per page */
    public readonly limit: number = 20,
    /** Sort field */
    public readonly sortBy: string = 'startDate',
    /** Sort direction */
    public readonly sortOrder: 'ASC' | 'DESC' = 'ASC',
  ) {
    super();
    Object.freeze(this);
  }

  /**
   * Create query from plain object
   */
  static fromObject(data: {
    filters?: PublishedEventsFiltersQuery;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): GetPublishedEventsQuery {
    return new GetPublishedEventsQuery(
      data.filters ?? {},
      data.page ?? 1,
      data.limit ?? 20,
      data.sortBy ?? 'startDate',
      data.sortOrder ?? 'ASC',
    );
  }
}
