import { Injectable, Logger } from '@nestjs/common';

import { CacheService } from '@shared/infrastructure/cache/cache.service';

import type { EventDto } from '../../application/dtos/event.dto';
import type { PaginatedEventListDto } from '../../application/dtos/event-list.dto';

/**
 * Cache Key Prefixes
 */
const CACHE_PREFIXES = {
  EVENT: 'events:event',
  PUBLISHED_LIST: 'events:published',
  CATEGORY_LIST: 'events:category',
  ORGANIZER_LIST: 'events:organizer',
  SEARCH: 'events:search',
  UPCOMING: 'events:upcoming',
} as const;

/**
 * Cache TTL values (in seconds)
 */
const CACHE_TTL = {
  EVENT_DETAIL: 300, // 5 minutes
  LIST: 60, // 1 minute (lists change more frequently)
  SEARCH: 30, // 30 seconds (search results are more dynamic)
} as const;

/**
 * Event Cache Service
 *
 * Provides Redis caching specifically for the Events module.
 * Handles cache invalidation on event updates.
 *
 * Caching Strategy:
 * - Single event by ID: Cached for 5 minutes
 * - List queries: Cached for 1 minute
 * - Search results: Cached for 30 seconds
 *
 * Invalidation:
 * - On event update/create: Invalidate event + related lists
 * - On event publish: Invalidate all public lists
 * - On event cancel: Invalidate all related caches
 */
@Injectable()
export class EventCacheService {
  private readonly logger = new Logger(EventCacheService.name);

  constructor(private readonly cacheService: CacheService) {}

  // ============================================
  // Single Event Caching
  // ============================================

  /**
   * Get cached event by ID
   */
  async getEvent(eventId: string): Promise<EventDto | null> {
    const key = this.getEventKey(eventId);
    return this.cacheService.get<EventDto>(key);
  }

  /**
   * Cache a single event
   */
  async setEvent(eventId: string, event: EventDto): Promise<void> {
    const key = this.getEventKey(eventId);
    await this.cacheService.set(key, event, CACHE_TTL.EVENT_DETAIL);
    this.logger.debug(`Cached event: ${eventId}`);
  }

  /**
   * Invalidate a single event cache
   */
  async invalidateEvent(eventId: string): Promise<void> {
    const key = this.getEventKey(eventId);
    await this.cacheService.delete(key);
    this.logger.debug(`Invalidated event cache: ${eventId}`);
  }

  // ============================================
  // List Caching
  // ============================================

  /**
   * Get cached published events list
   */
  async getPublishedList(
    page: number,
    limit: number,
    filters?: string,
  ): Promise<PaginatedEventListDto | null> {
    const key = this.getListKey(CACHE_PREFIXES.PUBLISHED_LIST, page, limit, filters);
    return this.cacheService.get<PaginatedEventListDto>(key);
  }

  /**
   * Cache published events list
   */
  async setPublishedList(
    page: number,
    limit: number,
    data: PaginatedEventListDto,
    filters?: string,
  ): Promise<void> {
    const key = this.getListKey(CACHE_PREFIXES.PUBLISHED_LIST, page, limit, filters);
    await this.cacheService.set(key, data, CACHE_TTL.LIST);
  }

  /**
   * Get cached events by category
   */
  async getCategoryList(
    category: string,
    page: number,
    limit: number,
  ): Promise<PaginatedEventListDto | null> {
    const key = this.getListKey(CACHE_PREFIXES.CATEGORY_LIST, page, limit, category);
    return this.cacheService.get<PaginatedEventListDto>(key);
  }

  /**
   * Cache events by category
   */
  async setCategoryList(
    category: string,
    page: number,
    limit: number,
    data: PaginatedEventListDto,
  ): Promise<void> {
    const key = this.getListKey(CACHE_PREFIXES.CATEGORY_LIST, page, limit, category);
    await this.cacheService.set(key, data, CACHE_TTL.LIST);
  }

  /**
   * Get cached organizer events
   */
  async getOrganizerList(
    organizerId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedEventListDto | null> {
    const key = this.getListKey(CACHE_PREFIXES.ORGANIZER_LIST, page, limit, organizerId);
    return this.cacheService.get<PaginatedEventListDto>(key);
  }

  /**
   * Cache organizer events
   */
  async setOrganizerList(
    organizerId: string,
    page: number,
    limit: number,
    data: PaginatedEventListDto,
  ): Promise<void> {
    const key = this.getListKey(CACHE_PREFIXES.ORGANIZER_LIST, page, limit, organizerId);
    await this.cacheService.set(key, data, CACHE_TTL.LIST);
  }

  /**
   * Get cached upcoming events
   */
  async getUpcomingList(
    page: number,
    limit: number,
  ): Promise<PaginatedEventListDto | null> {
    const key = this.getListKey(CACHE_PREFIXES.UPCOMING, page, limit);
    return this.cacheService.get<PaginatedEventListDto>(key);
  }

  /**
   * Cache upcoming events
   */
  async setUpcomingList(
    page: number,
    limit: number,
    data: PaginatedEventListDto,
  ): Promise<void> {
    const key = this.getListKey(CACHE_PREFIXES.UPCOMING, page, limit);
    await this.cacheService.set(key, data, CACHE_TTL.LIST);
  }

  // ============================================
  // Search Caching
  // ============================================

  /**
   * Generate search cache key from query params
   */
  private getSearchKey(params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');
    return `${CACHE_PREFIXES.SEARCH}:${sortedParams}`;
  }

  /**
   * Get cached search results
   */
  async getSearchResults(
    params: Record<string, unknown>,
  ): Promise<PaginatedEventListDto | null> {
    const key = this.getSearchKey(params);
    return this.cacheService.get<PaginatedEventListDto>(key);
  }

  /**
   * Cache search results
   */
  async setSearchResults(
    params: Record<string, unknown>,
    data: PaginatedEventListDto,
  ): Promise<void> {
    const key = this.getSearchKey(params);
    await this.cacheService.set(key, data, CACHE_TTL.SEARCH);
  }

  // ============================================
  // Invalidation
  // ============================================

  /**
   * Invalidate all caches for a specific event
   * Called when an event is updated
   */
  async invalidateEventCaches(eventId: string, organizerId: string): Promise<void> {
    this.logger.debug(`Invalidating caches for event: ${eventId}`);

    // Invalidate single event
    await this.invalidateEvent(eventId);

    // Invalidate organizer's list
    await this.cacheService.invalidatePattern(
      `${CACHE_PREFIXES.ORGANIZER_LIST}:*:${organizerId}`,
    );
  }

  /**
   * Invalidate all public list caches
   * Called when an event is published or cancelled
   */
  async invalidatePublicCaches(): Promise<void> {
    this.logger.debug('Invalidating all public event caches');

    await Promise.all([
      this.cacheService.invalidatePattern(`${CACHE_PREFIXES.PUBLISHED_LIST}:*`),
      this.cacheService.invalidatePattern(`${CACHE_PREFIXES.CATEGORY_LIST}:*`),
      this.cacheService.invalidatePattern(`${CACHE_PREFIXES.UPCOMING}:*`),
      this.cacheService.invalidatePattern(`${CACHE_PREFIXES.SEARCH}:*`),
    ]);
  }

  /**
   * Full cache invalidation for an event
   * Called on publish/cancel/major changes
   */
  async invalidateAllForEvent(eventId: string, organizerId: string): Promise<void> {
    await this.invalidateEventCaches(eventId, organizerId);
    await this.invalidatePublicCaches();
  }

  // ============================================
  // Key Generation Helpers
  // ============================================

  private getEventKey(eventId: string): string {
    return `${CACHE_PREFIXES.EVENT}:${eventId}`;
  }

  private getListKey(
    prefix: string,
    page: number,
    limit: number,
    extra?: string,
  ): string {
    const base = `${prefix}:p${page}:l${limit}`;
    return extra ? `${base}:${extra}` : base;
  }
}
