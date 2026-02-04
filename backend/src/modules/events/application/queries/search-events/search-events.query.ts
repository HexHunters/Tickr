import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { PaginatedEventListDto } from '../../dtos/event-list.dto';

// ============================================
// Types for SearchEvents operation
// ============================================

/**
 * Error types for SearchEvents operation
 */
export type SearchEventsErrorQuery =
  | { type: 'INVALID_SEARCH_TERM'; message: string };

/**
 * Result type for SearchEvents operation
 */
export type SearchEventsResultQuery = PaginatedEventListDto;

/**
 * Query to search events by text
 *
 * Immutable query object following CQRS pattern.
 *
 * Used for:
 * - Search bar functionality
 * - Full-text search in title and description
 */
export class SearchEventsQuery extends BaseQuery<SearchEventsResultQuery> {
  constructor(
    /** Search term */
    public readonly searchTerm: string,
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
    searchTerm: string;
    page?: number;
    limit?: number;
  }): SearchEventsQuery {
    return new SearchEventsQuery(
      data.searchTerm,
      data.page ?? 1,
      data.limit ?? 20,
    );
  }
}
