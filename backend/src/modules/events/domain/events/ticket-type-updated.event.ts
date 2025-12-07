import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Domain Event: TicketTypeUpdated
 *
 * Published when a ticket type is modified.
 * This event can be used to:
 * - Notify users watching the event
 * - Update search index
 * - Track price/quantity changes for analytics
 */
export class TicketTypeUpdatedEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly ticketTypeId: string,
    public readonly ticketTypeName: string,
    public readonly changes: Record<string, { old: unknown; new: unknown }>,
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
      ticketTypeId: this.ticketTypeId,
      ticketTypeName: this.ticketTypeName,
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
   * Check if price was changed
   */
  isPriceChanged(): boolean {
    return this.hasFieldChanged('price');
  }

  /**
   * Check if quantity was changed
   */
  isQuantityChanged(): boolean {
    return this.hasFieldChanged('quantity');
  }
}
