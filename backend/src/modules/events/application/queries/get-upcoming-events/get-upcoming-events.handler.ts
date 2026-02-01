import { Injectable, Inject, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { EVENT_REPOSITORY } from '../../ports/event.repository.port';

import type { EventEntity } from '../../../domain/entities/event.entity';
import type { EventRepositoryPort, EventPaginationOptions, EventFilters } from '../../ports/event.repository.port';
import type { EventListDto, PaginatedEventListDto } from '../../dtos/event-list.dto';
import type { TicketTypeSummaryDto } from '../../dtos/ticket-type.dto';

import {
  GetUpcomingEventsQuery,
  type GetUpcomingEventsResultQuery,
} from './get-upcoming-events.query';

// Re-export types for external use
export type GetUpcomingEventsResult = GetUpcomingEventsResultQuery;

// ============================================
// Handler
// ============================================

/**
 * Handler for GetUpcomingEventsQuery
 *
 * Follows CQRS pattern - retrieves upcoming published events.
 *
 * Responsibilities:
 * 1. Build pagination options
 * 2. Query repository for upcoming events
 * 3. Apply optional location filters
 * 4. Map to EventListDto
 * 5. Return paginated result (sorted by startDate ASC)
 */
@Injectable()
export class GetUpcomingEventsHandler {
  private readonly logger = new Logger(GetUpcomingEventsHandler.name);

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
  ) {}

  /**
   * Execute the get upcoming events query
   */
  async execute(
    query: GetUpcomingEventsQuery,
  ): Promise<Result<GetUpcomingEventsResult, never>> {
    this.logger.debug('Getting upcoming events', {
      city: query.city,
      country: query.country,
    });

    // ============================================
    // 1. Build pagination options
    // ============================================
    const options: EventPaginationOptions = {
      page: query.page,
      limit: query.limit,
      sortBy: 'startDate',
      sortOrder: 'ASC',
    };

    // ============================================
    // 2. Query repository for upcoming events
    // ============================================
    // Note: If location filters are provided, we use findPublished with filters
    // Otherwise, we use the optimized findUpcoming method
    let result;

    if (query.city || query.country) {
      // Use findPublished with location filters
      const filters: EventFilters = {
        city: query.city,
        country: query.country,
        dateFrom: new Date(), // Only future events
      };
      result = await this.eventRepository.findPublished(filters, options);
    } else {
      // Use optimized findUpcoming method
      result = await this.eventRepository.findUpcoming(options);
    }

    // ============================================
    // 3. Map to EventListDto
    // ============================================
    const eventDtos = result.data.map(event => this.mapToEventListDto(event));

    // ============================================
    // 4. Build paginated response
    // ============================================
    const totalPages = Math.ceil(result.total / query.limit);

    const paginatedResult: PaginatedEventListDto = {
      data: eventDtos,
      total: result.total,
      page: query.page,
      limit: query.limit,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    };

    this.logger.debug(`Found ${result.total} upcoming events`);

    return Result.ok(paginatedResult);
  }

  /**
   * Map EventEntity to EventListDto
   */
  private mapToEventListDto(event: EventEntity): EventListDto {
    const availableCapacity = event.getAvailableCapacity();
    const salesProgress = event.totalCapacity > 0
      ? Math.round((event.soldTickets / event.totalCapacity) * 100)
      : 0;

    const now = new Date();
    const isSoldOut = availableCapacity === 0 && event.totalCapacity > 0;
    const isOnSale = event.ticketTypes.some(tt => {
      const salesStart = tt.salesPeriod.startDate;
      const salesEnd = tt.salesPeriod.endDate;
      return tt.isActive && now >= salesStart && now <= salesEnd && !tt.isSoldOut();
    });

    // Truncate description for list view
    const truncatedDescription = event.description
      ? event.description.length > 200
        ? event.description.substring(0, 200) + '...'
        : event.description
      : null;

    return {
      id: event.id,
      title: event.title,
      description: truncatedDescription,
      category: event.category,
      location: {
        city: event.location.city,
        country: event.location.country,
      },
      startDate: event.dateRange.startDate,
      endDate: event.dateRange.endDate,
      imageUrl: event.imageUrl,
      status: event.status,
      organizer: {
        id: event.organizerId,
        displayName: 'Event Organizer', // TODO: Fetch from Users module
      },
      ticketSummary: this.buildTicketSummary(event),
      totalCapacity: event.totalCapacity,
      availableCapacity,
      salesProgress,
      isSoldOut,
      isOnSale,
      createdAt: event.createdAt,
      publishedAt: event.publishedAt,
    };
  }

  /**
   * Build ticket type summary
   */
  private buildTicketSummary(event: EventEntity): TicketTypeSummaryDto {
    const ticketTypes = event.ticketTypes;
    
    if (ticketTypes.length === 0) {
      return {
        minPrice: 0,
        maxPrice: 0,
        currency: event.getRevenueCurrency(),
        totalCapacity: 0,
        totalSold: 0,
        totalAvailable: 0,
        ticketTypeCount: 0,
        hasAvailableTickets: false,
      };
    }

    const prices = ticketTypes.map(tt => tt.price.amount);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const totalCapacity = ticketTypes.reduce((sum, tt) => sum + tt.quantity, 0);
    const totalSold = ticketTypes.reduce((sum, tt) => sum + tt.soldQuantity, 0);
    const totalAvailable = totalCapacity - totalSold;

    return {
      minPrice,
      maxPrice,
      currency: ticketTypes[0].price.currency,
      totalCapacity,
      totalSold,
      totalAvailable,
      ticketTypeCount: ticketTypes.length,
      hasAvailableTickets: totalAvailable > 0,
    };
  }
}
