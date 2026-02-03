import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { EventCancelledEvent } from '../../domain/events/event-cancelled.event';

/**
 * Event Handler: EventCancelled
 *
 * Handles the EventCancelledEvent domain event for cross-module communication.
 * This handler is triggered when an organizer cancels a published event.
 *
 * Cross-Module Integrations (prepared for future):
 * - Payments Module: Trigger refund process for all tickets
 * - Notifications Module: Send cancellation notifications to ticket holders
 * - Analytics Module: Record cancellation metrics
 *
 * @implements {IEventHandler<EventCancelledEvent>}
 */
@Injectable()
@EventsHandler(EventCancelledEvent)
export class EventCancelledEventHandler
  implements IEventHandler<EventCancelledEvent>
{
  private readonly logger = new Logger(EventCancelledEventHandler.name);

  /**
   * Handle the EventCancelled domain event
   *
   * @param event - The domain event containing cancellation details
   */
  async handle(event: EventCancelledEvent): Promise<void> {
    this.logger.log(
      `Event cancelled: "${event.title}" (ID: ${event.aggregateId})`,
    );
    this.logger.log(
      `Cancellation reason: ${event.reason}`,
    );
    this.logger.debug(
      `Event details: organizer=${event.organizerId}, ` +
        `soldTickets=${event.soldTickets}, ` +
        `revenue=${event.totalRevenue.amount} ${event.totalRevenue.currency}`,
    );

    // Check if refunds are needed
    if (event.needsRefunds()) {
      this.logger.warn(
        `Refunds needed: ${event.soldTickets} tickets sold, ` +
          `total revenue: ${event.totalRevenue.amount} ${event.totalRevenue.currency}`,
      );

      // ============================================
      // TODO: Payments Module Integration
      // ============================================
      // Trigger refund process for all tickets
      //
      // await this.paymentsService.initiateRefunds({
      //   eventId: event.aggregateId,
      //   reason: event.reason,
      //   cancelledAt: event.cancelledAt,
      //   estimatedRefundAmount: event.totalRevenue,
      // });
    }

    // ============================================
    // TODO: Notifications Module Integration
    // ============================================
    // Send cancellation notifications to ticket holders
    //
    // await this.notificationService.notifyTicketHolders({
    //   type: 'EVENT_CANCELLED',
    //   eventId: event.aggregateId,
    //   eventTitle: event.title,
    //   reason: event.reason,
    //   cancelledAt: event.cancelledAt,
    //   refundStatus: event.needsRefunds() ? 'PENDING' : 'NOT_APPLICABLE',
    // });

    // ============================================
    // TODO: Analytics Module Integration
    // ============================================
    // Record cancellation for analytics
    //
    // await this.analyticsService.trackEventCancelled({
    //   eventId: event.aggregateId,
    //   organizerId: event.organizerId,
    //   reason: event.reason,
    //   soldTickets: event.soldTickets,
    //   lostRevenue: event.totalRevenue,
    //   cancelledAt: event.cancelledAt,
    // });

    this.logger.log(
      `Successfully processed EventCancelled for event ${event.aggregateId}`,
    );
  }
}
