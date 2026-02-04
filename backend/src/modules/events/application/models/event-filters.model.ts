import type { PaginationOptions } from '@shared/application/interfaces/repository.interface';

import type { EventCategory } from '../../domain/value-objects/event-category.vo';
import type { EventStatus } from '../../domain/value-objects/event-status.vo';

// ============================================
// Event Filters Interface
// ============================================

/**
 * Event Filters for search and filtering
 *
 * Used by repository methods to filter events based on various criteria.
 * All fields are optional - undefined fields are ignored in queries.
 */
export interface EventFilters {
  /**
   * Filter by event category
   */
  category?: EventCategory;

  /**
   * Filter by city (case-insensitive partial match)
   */
  city?: string;

  /**
   * Filter by country (case-insensitive partial match)
   */
  country?: string;

  /**
   * Filter events starting from this date
   */
  dateFrom?: Date;

  /**
   * Filter events starting until this date
   */
  dateTo?: Date;

  /**
   * Filter by event status
   */
  status?: EventStatus;

  /**
   * Filter by minimum ticket price (any ticket type)
   */
  minPrice?: number;

  /**
   * Filter by maximum ticket price (any ticket type)
   */
  maxPrice?: number;

  /**
   * Filter by organizer ID
   */
  organizerId?: string;

  /**
   * Search by title (case-insensitive partial match)
   */
  titleSearch?: string;

  /**
   * Filter only events with available tickets
   */
  hasAvailableTickets?: boolean;
}

// ============================================
// Event Sort Options
// ============================================

/**
 * Valid sort fields for events
 */
export type EventSortField =
  | 'createdAt'
  | 'updatedAt'
  | 'startDate'
  | 'endDate'
  | 'title'
  | 'totalCapacity'
  | 'soldTickets'
  | 'publishedAt';

/**
 * Extended pagination options with event-specific sorting
 */
export interface EventPaginationOptions extends PaginationOptions {
  sortBy?: EventSortField;
}
