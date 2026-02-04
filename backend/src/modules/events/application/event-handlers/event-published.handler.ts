import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { EventPublishedEvent } from '../../domain/events/event-published.event';

/**
 * Event Handler: EventPublished
 *
 * Handles the EventPublishedEvent domain event for cross-module communication.
 * This handler is triggered when an event transitions from DRAFT to PUBLISHED.
 *
 * Cross-Module Integrations (prepared for future):
 * - Notifications Module: Notify followers/subscribers about new event
 * - Analytics Module: Update recommendation engine
 * - Search Module: Index event for public search
 *
 * @implements {IEventHandler<EventPublishedEvent>}
 */
@Injectable()
@EventsHandler(EventPublishedEvent)
export class EventPublishedEventHandler
  implements IEventHandler<EventPublishedEvent>
{
  private readonly logger = new Logger(EventPublishedEventHandler.name);

  /**
   * Handle the EventPublished domain event
   *
   * @param event - The domain event containing event publication details
   */
  async handle(event: EventPublishedEvent): Promise<void> {
    this.logger.log(
      `Event published: "${event.title}" (ID: ${event.aggregateId})`,
    );
    this.logger.debug(
      `Event details: organizer=${event.organizerId}, ` +
        `ticketTypes=${event.ticketTypeCount}, capacity=${event.totalCapacity}`,
    );

    // ============================================
    // TODO: Notifications Module Integration
    // ============================================
    // Notify followers/subscribers about new event
    //
    // await this.notificationService.notifyFollowers({
    //   type: 'EVENT_PUBLISHED',
    //   organizerId: event.organizerId,
    //   eventId: event.aggregateId,
    //   eventTitle: event.title,
    //   publishedAt: event.publishedAt,
    // });

    // ============================================
    // TODO: Analytics Module Integration
    // ============================================
    // Update analytics/recommendation engine
    //
    // await this.analyticsService.trackEventPublished({
    //   eventId: event.aggregateId,
    //   organizerId: event.organizerId,
    //   ticketTypeCount: event.ticketTypeCount,
    //   totalCapacity: event.totalCapacity,
    //   publishedAt: event.publishedAt,
    // });

    // ============================================
    // TODO: Search Module Integration
    // ============================================
    // Index event for public search
    //
    // await this.searchService.indexEvent({
    //   eventId: event.aggregateId,
    //   title: event.title,
    //   // ... other searchable fields
    // });

    this.logger.log(
      `Successfully processed EventPublished for event ${event.aggregateId}`,
    );
  }
}
