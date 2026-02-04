import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Domain Event: EventCancelled
 *
 * Published when an event is cancelled by the organizer.
 * This event can be used to:
 * - Trigger refund process for all ticket holders
 * - Send cancellation notifications to attendees
 * - Update search index
 * - Stop marketing campaigns
 * - Record cancellation for analytics
 */
export class EventCancelledEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly organizerId: string,
    public readonly title: string,
    public readonly reason: string,
    public readonly cancelledAt: Date,
    public readonly soldTickets: number,
    public readonly totalRevenue: { amount: number; currency: string },
  ) {
    super();
  }

  /**
   * Get event data for serialization
   */
  protected getData(): Record<string, unknown> {
    return {
      aggregateId: this.aggregateId,
      organizerId: this.organizerId,
      title: this.title,
      reason: this.reason,
      cancelledAt: this.cancelledAt.toISOString(),
      soldTickets: this.soldTickets,
      totalRevenue: this.totalRevenue,
    };
  }

  /**
   * Check if refunds are needed
   */
  needsRefunds(): boolean {
    return this.soldTickets > 0;
  }
}
