import { Injectable, Inject, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { EventStatus } from '../../../domain/value-objects/event-status.vo';
import { EVENT_REPOSITORY } from '../../ports/event.repository.port';

import type { EventEntity } from '../../../domain/entities/event.entity';
import type { TicketTypeEntity } from '../../../domain/entities/ticket-type.entity';
import type { EventRepositoryPort } from '../../ports/event.repository.port';
import type { EventDto, EventLocationDto, EventOrganizerDto } from '../../dtos/event.dto';
import type { TicketTypeDto } from '../../dtos/ticket-type.dto';

import {
  GetEventByIdQuery,
  type GetEventByIdResultQuery,
  type GetEventByIdErrorQuery,
} from './get-event-by-id.query';

// Re-export types for external use
export type GetEventByIdResult = GetEventByIdResultQuery;
export type GetEventByIdError = GetEventByIdErrorQuery;

// ============================================
// Handler
// ============================================

/**
 * Handler for GetEventByIdQuery
 *
 * Follows CQRS pattern - handles event retrieval with access control.
 *
 * Responsibilities:
 * 1. Find event by ID
 * 2. Check access permissions
 * 3. Map to EventDto
 * 4. Return result with full details
 */
@Injectable()
export class GetEventByIdHandler {
  private readonly logger = new Logger(GetEventByIdHandler.name);

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
  ) {}

  /**
   * Execute the get event by id query
   */
  async execute(
    query: GetEventByIdQuery,
  ): Promise<Result<GetEventByIdResult, GetEventByIdError>> {
    this.logger.debug(`Getting event by ID: ${query.eventId}`);

    // ============================================
    // 1. Find the event
    // ============================================
    const event = await this.eventRepository.findById(query.eventId);
    
    if (!event) {
      return Result.fail({
        type: 'EVENT_NOT_FOUND',
        message: `Event with id '${query.eventId}' not found`,
      });
    }

    // ============================================
    // 2. Check access permissions
    // ============================================
    const isOwner = query.requestingUserId === event.organizerId;
    const isPublished = event.status === EventStatus.PUBLISHED;

    // Non-published events are only visible to the organizer
    if (!isPublished && !isOwner) {
      return Result.fail({
        type: 'ACCESS_DENIED',
        message: 'You do not have permission to view this event',
      });
    }

    // ============================================
    // 3. Map to EventDto
    // ============================================
    const eventDto = this.mapToEventDto(event);

    this.logger.debug(`Event retrieved successfully: ${event.id}`);

    return Result.ok(eventDto);
  }

  /**
   * Map EventEntity to EventDto
   */
  private mapToEventDto(event: EventEntity): EventDto {
    const now = new Date();
    const availableCapacity = event.totalCapacity - event.soldTickets;
    const salesProgress = event.totalCapacity > 0 
      ? Math.round((event.soldTickets / event.totalCapacity) * 100) 
      : 0;

    // Check if any tickets are on sale
    const isOnSale = event.ticketTypes.some(tt => {
      const salesStart = tt.salesPeriod.startDate;
      const salesEnd = tt.salesPeriod.endDate;
      return tt.isActive && now >= salesStart && now <= salesEnd && !tt.isSoldOut;
    });

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      location: this.mapToLocationDto(event),
      startDate: event.dateRange.startDate,
      endDate: event.dateRange.endDate,
      imageUrl: event.imageUrl,
      status: event.status,
      organizer: this.mapToOrganizerDto(event),
      ticketTypes: event.ticketTypes.map(tt => this.mapToTicketTypeDto(tt)),
      totalCapacity: event.totalCapacity,
      soldTickets: event.soldTickets,
      availableCapacity,
      salesProgress,
      revenueAmount: event.getTotalRevenueAmount(),
      revenueCurrency: event.getRevenueCurrency(),
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      publishedAt: event.publishedAt,
      cancelledAt: event.cancelledAt,
      cancellationReason: event.cancellationReason,
      isSoldOut: availableCapacity === 0 && event.totalCapacity > 0,
      isOnSale,
      hasStarted: now >= event.dateRange.startDate,
      hasEnded: now > event.dateRange.endDate,
    };
  }

  /**
   * Map location to LocationDto
   */
  private mapToLocationDto(event: EventEntity): EventLocationDto {
    return {
      address: event.location.address,
      city: event.location.city,
      country: event.location.country,
      postalCode: event.location.postalCode,
      latitude: event.location.latitude,
      longitude: event.location.longitude,
    };
  }

  /**
   * Map organizer to OrganizerDto
   * Note: In a real implementation, this would fetch from Users module
   */
  private mapToOrganizerDto(event: EventEntity): EventOrganizerDto {
    // TODO: Fetch actual organizer info from Users module
    // For now, return placeholder with organizerId
    return {
      id: event.organizerId,
      firstName: 'Organizer',
      lastName: '',
      displayName: 'Event Organizer',
    };
  }

  /**
   * Map TicketTypeEntity to TicketTypeDto
   */
  private mapToTicketTypeDto(ticketType: TicketTypeEntity): TicketTypeDto {
    const now = new Date();
    const availableQuantity = ticketType.quantity - ticketType.soldQuantity;
    const salesProgress = ticketType.quantity > 0 
      ? Math.round((ticketType.soldQuantity / ticketType.quantity) * 100) 
      : 0;

    const salesStart = ticketType.salesPeriod.startDate;
    const salesEnd = ticketType.salesPeriod.endDate;
    const isOnSale = ticketType.isActive && now >= salesStart && now <= salesEnd && !ticketType.isSoldOut;

    return {
      id: ticketType.id,
      eventId: ticketType.eventId,
      name: ticketType.name,
      description: ticketType.description,
      priceAmount: ticketType.price.amount,
      priceCurrency: ticketType.price.currency,
      quantity: ticketType.quantity,
      soldQuantity: ticketType.soldQuantity,
      availableQuantity,
      salesStartDate: salesStart,
      salesEndDate: salesEnd,
      isActive: ticketType.isActive,
      isSoldOut: ticketType.isSoldOut(),
      isOnSale,
      salesProgress,
      createdAt: ticketType.createdAt,
      updatedAt: ticketType.updatedAt,
    };
  }
}
