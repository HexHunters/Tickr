import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Domain Event: EventUpdated
 *
 * Published when event details are modified.
 * This event can be used to:
 * - Update search index
 * - Notify attendees of changes
 * - Track event modifications
 * - Trigger re-indexing
 */
export class EventUpdatedEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly organizerId: string,
    public readonly changes: Record<string, unknown>,
    public readonly updatedAt: Date,
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
      changes: this.changes,
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Check if a specific field was changed
   */
  hasFieldChanged(field: string): boolean {
    return field in this.changes;
  }

  /**
   * Get the old value of a changed field
   */
  getOldValue<T>(field: string): T | undefined {
    const change = this.changes[field] as { old: T; new: T } | undefined;
    return change?.old;
  }

  /**
   * Get the new value of a changed field
   */
  getNewValue<T>(field: string): T | undefined {
    const change = this.changes[field] as { old: T; new: T } | undefined;
    return change?.new;
  }
}
