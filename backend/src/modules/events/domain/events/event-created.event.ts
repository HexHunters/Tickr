import { DomainEvent } from '@shared/domain/domain-event.base';

import { EventCategory } from '../value-objects/event-category.vo';

/**
 * Domain Event: EventCreated
 *
 * Published when a new event is created.
 * This event can be used to:
 * - Send confirmation to the organizer
 * - Index event for search
 * - Initialize analytics tracking
 */
export class EventCreatedEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly organizerId: string,
    public readonly title: string,
    public readonly category: EventCategory,
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
      category: this.category,
    };
  }
}
