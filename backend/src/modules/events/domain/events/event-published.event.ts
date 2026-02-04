import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Domain Event: EventPublished
 *
 * Published when an event transitions from DRAFT to PUBLISHED status.
 * This event can be used to:
 * - Notify followers of the organizer
 * - Index event for public search
 * - Start marketing campaigns
 * - Enable ticket sales
 */
export class EventPublishedEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly organizerId: string,
    public readonly title: string,
    public readonly publishedAt: Date,
    public readonly ticketTypeCount: number,
    public readonly totalCapacity: number,
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
      publishedAt: this.publishedAt.toISOString(),
      ticketTypeCount: this.ticketTypeCount,
      totalCapacity: this.totalCapacity,
    };
  }
}
