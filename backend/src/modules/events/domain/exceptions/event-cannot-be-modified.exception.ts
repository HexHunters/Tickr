import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when an event cannot be modified
 */
export class EventCannotBeModifiedException extends DomainException {
  constructor(message: string) {
    super(message, 'EVENT_CANNOT_BE_MODIFIED');
  }

  /**
   * Factory method for event already published
   */
  static alreadyPublished(): EventCannotBeModifiedException {
    return new EventCannotBeModifiedException(
      'Event cannot be modified after it has been published',
    );
  }

  /**
   * Factory method for event cancelled
   */
  static cancelled(): EventCannotBeModifiedException {
    return new EventCannotBeModifiedException('Event cannot be modified because it is cancelled');
  }

  /**
   * Factory method for event completed
   */
  static completed(): EventCannotBeModifiedException {
    return new EventCannotBeModifiedException('Event cannot be modified because it is completed');
  }

  /**
   * Factory method for dates after publishing
   */
  static cannotModifyDatesAfterPublishing(): EventCannotBeModifiedException {
    return new EventCannotBeModifiedException(
      'Event dates cannot be modified after the event has been published',
    );
  }

  /**
   * Factory method for location after publishing
   */
  static cannotModifyLocationAfterPublishing(): EventCannotBeModifiedException {
    return new EventCannotBeModifiedException(
      'Event location cannot be modified after the event has been published',
    );
  }

  /**
   * Factory method for ticket type with sales
   */
  static ticketTypeHasSales(ticketTypeName: string): EventCannotBeModifiedException {
    return new EventCannotBeModifiedException(
      `Ticket type "${ticketTypeName}" cannot be removed because tickets have been sold`,
    );
  }

  /**
   * Factory method for status transition
   */
  static invalidStatusTransition(
    currentStatus: string,
    targetStatus: string,
  ): EventCannotBeModifiedException {
    return new EventCannotBeModifiedException(
      `Cannot transition from ${currentStatus} to ${targetStatus}`,
    );
  }
}
