import { DomainEvent } from '@shared/domain/domain-event.base';

export class EventFreeTicketsOverrideUpdatedEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly adminId: string,
    public readonly previousValue: boolean | null,
    public readonly newValue: boolean | null,
    public readonly updatedAt: Date,
  ) {
    super();
  }

  protected getData(): Record<string, unknown> {
    return {
      aggregateId: this.aggregateId,
      adminId: this.adminId,
      previousValue: this.previousValue,
      newValue: this.newValue,
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
