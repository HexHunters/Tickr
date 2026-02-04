import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Domain Event: TicketTypeAdded
 *
 * Published when a new ticket type is added to an event.
 * This event can be used to:
 * - Update event capacity metrics
 * - Notify interested users of new ticket options
 * - Update search index with pricing information
 */
export class TicketTypeAddedEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly ticketTypeId: string,
    public readonly name: string,
    public readonly price: { amount: number; currency: string },
    public readonly quantity: number,
    public readonly salesStartDate: Date,
    public readonly salesEndDate: Date,
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
      name: this.name,
      price: this.price,
      quantity: this.quantity,
      salesStartDate: this.salesStartDate.toISOString(),
      salesEndDate: this.salesEndDate.toISOString(),
    };
  }
}
