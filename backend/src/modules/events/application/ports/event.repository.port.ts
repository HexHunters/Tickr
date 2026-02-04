import {
  IRepository,
  PaginatedResult,
} from '@shared/application/interfaces/repository.interface';

import type { EventEntity } from '../../domain/entities/event.entity';
import type { TicketTypeEntity } from '../../domain/entities/ticket-type.entity';
import type { EventCategory } from '../../domain/value-objects/event-category.vo';
import type { EventStatus } from '../../domain/value-objects/event-status.vo';
import type { EventFilters, EventPaginationOptions } from '../models/event-filters.model';

// Re-export for convenience
export type { EventFilters, EventPaginationOptions };
export type { EventSortField } from '../models/event-filters.model';

// ============================================
// Event Repository Port
// ============================================

/**
 * Event Repository Port
 *
 * Defines the contract for event persistence operations.
 * Implementation is in infrastructure layer (TypeORM).
 *
 * Design Decisions:
 * - Extends IRepository for base CRUD operations
 * - Adds event-specific query methods
 * - All list methods return PaginatedResult for performance
 * - Filters are strongly typed for type safety
 * - Methods return domain entities (EventEntity)
 */
export interface EventRepositoryPort extends IRepository<EventEntity> {
  // ============================================
  // Query Methods
  // ============================================

  /**
   * Find events by organizer ID with pagination
   *
   * Used for "My Events" page in organizer dashboard.
   * Returns all events regardless of status.
   *
   * @param organizerId - The organizer's UUID
   * @param options - Pagination options
   */
  findByOrganizerId(
    organizerId: string,
    options?: EventPaginationOptions,
  ): Promise<PaginatedResult<EventEntity>>;

  /**
   * Find published events with filters
   *
   * Main method for public event discovery.
   * Only returns PUBLISHED events by default.
   *
   * @param filters - Event filters
   * @param options - Pagination options
   */
  findPublished(
    filters?: EventFilters,
    options?: EventPaginationOptions,
  ): Promise<PaginatedResult<EventEntity>>;

  /**
   * Find events by category
   *
   * Shortcut method for category-based filtering.
   * Only returns PUBLISHED events.
   *
   * @param category - Event category
   * @param options - Pagination options
   */
  findByCategory(
    category: EventCategory,
    options?: EventPaginationOptions,
  ): Promise<PaginatedResult<EventEntity>>;

  /**
   * Search events by title
   *
   * Full-text search on event titles.
   * Only searches PUBLISHED events.
   *
   * @param query - Search query string
   * @param options - Pagination options
   */
  searchByTitle(
    query: string,
    options?: EventPaginationOptions,
  ): Promise<PaginatedResult<EventEntity>>;

  /**
   * Find upcoming events
   *
   * Returns PUBLISHED events that haven't started yet.
   * Ordered by start date ascending (soonest first).
   *
   * @param options - Pagination options
   */
  findUpcoming(options?: EventPaginationOptions): Promise<PaginatedResult<EventEntity>>;

  /**
   * Find events within a date range
   *
   * Returns all events (any status) that overlap with the given date range.
   * Used for calendar views and availability checks.
   *
   * @param startDate - Range start date
   * @param endDate - Range end date
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<EventEntity[]>;

  /**
   * Find events ready for completion
   *
   * Returns PUBLISHED events that have ended (end date < now).
   * Used by the scheduler service to auto-complete events.
   *
   * @param beforeDate - Find events that ended before this date
   */
  findEventsToComplete(beforeDate: Date): Promise<EventEntity[]>;

  // ============================================
  // Count Methods
  // ============================================

  /**
   * Count events by organizer
   *
   * @param organizerId - The organizer's UUID
   * @param status - Optional status filter
   */
  countByOrganizer(organizerId: string, status?: EventStatus): Promise<number>;

  /**
   * Count published events by category
   *
   * @param category - Event category
   */
  countByCategory(category: EventCategory): Promise<number>;

  /**
   * Count total published events
   */
  countPublished(): Promise<number>;

  // ============================================
  // Existence Checks
  // ============================================

  /**
   * Check if event exists by ID
   * Inherited from IRepository, but documented here for clarity
   */
  exists(id: string): Promise<boolean>;

  /**
   * Check if organizer has any events
   *
   * @param organizerId - The organizer's UUID
   */
  existsByOrganizer(organizerId: string): Promise<boolean>;

  // ============================================
  // Slug Operations (Future Enhancement)
  // ============================================

  /**
   * Find event by URL slug
   *
   * For SEO-friendly URLs like /events/summer-music-festival-2024
   * Reserved for future implementation.
   *
   * @param slug - URL-friendly event identifier
   */
  findBySlug?(slug: string): Promise<EventEntity | null>;

  /**
   * Check if slug is available
   *
   * @param slug - URL-friendly event identifier
   * @param excludeEventId - Exclude this event from check (for updates)
   */
  isSlugAvailable?(slug: string, excludeEventId?: string): Promise<boolean>;
}

// ============================================
// Ticket Type Repository Port (Sub-entity)
// ============================================

/**
 * Ticket Type Repository Port
 *
 * Note: TicketType is a sub-entity of Event, so most operations
 * go through EventRepository. This port is for specialized queries
 * that need direct ticket type access.
 */
export interface TicketTypeRepositoryPort {
  /**
   * Find ticket type by ID
   */
  findById(id: string): Promise<TicketTypeEntity | null>;

  /**
   * Find all ticket types for an event
   *
   * @param eventId - Event UUID
   * @param activeOnly - If true, only return active ticket types
   */
  findByEventId(eventId: string, activeOnly?: boolean): Promise<TicketTypeEntity[]>;

  /**
   * Find ticket types that are currently on sale
   *
   * Returns ticket types where:
   * - isActive = true
   * - Current date is within sales period
   * - Not sold out
   *
   * @param eventId - Event UUID
   */
  findOnSale(eventId: string): Promise<TicketTypeEntity[]>;

  /**
   * Check if ticket type exists
   */
  exists(id: string): Promise<boolean>;
}

// ============================================
// Injection Tokens
// ============================================

/**
 * Injection token for EventRepository
 * Use with @Inject(EVENT_REPOSITORY)
 */
export const EVENT_REPOSITORY = Symbol('EventRepositoryPort');

/**
 * Injection token for TicketTypeRepository
 * Use with @Inject(TICKET_TYPE_REPOSITORY)
 */
export const TICKET_TYPE_REPOSITORY = Symbol('TicketTypeRepositoryPort');
