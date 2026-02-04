import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { EventCategory } from '../../../domain/value-objects/event-category.vo';
import type { PaginatedEventListDto } from '../../dtos/event-list.dto';

// ============================================
// Types for GetEventsByCategory operation
// ============================================

/**
 * Error types for GetEventsByCategory operation
 */
export type GetEventsByCategoryErrorQuery =
  | { type: 'INVALID_CATEGORY'; message: string };

/**
 * Result type for GetEventsByCategory operation
 */
export type GetEventsByCategoryResultQuery = PaginatedEventListDto;

/**
 * Query to get events by category
 *
 * Immutable query object following CQRS pattern.
 *
 * Used for:
 * - Category pages
 * - Filtered navigation
 */
export class GetEventsByCategoryQuery extends BaseQuery<GetEventsByCategoryResultQuery> {
  constructor(
    /** Event category */
    public readonly category: EventCategory,
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
    category: EventCategory;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): GetEventsByCategoryQuery {
    return new GetEventsByCategoryQuery(
      data.category,
      data.page ?? 1,
      data.limit ?? 20,
      data.sortBy ?? 'startDate',
      data.sortOrder ?? 'ASC',
    );
  }
}
