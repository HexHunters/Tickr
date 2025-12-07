import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when an event cannot be published
 *
 * Used when publishing validation fails
 */
export class EventNotPublishableException extends DomainException {
  constructor(message: string) {
    super(message, 'EVENT_NOT_PUBLISHABLE');
  }

  /**
   * Factory method for wrong status
   */
  static wrongStatus(currentStatus: string): EventNotPublishableException {
    return new EventNotPublishableException(
      `Event cannot be published from ${currentStatus} status. Only DRAFT events can be published.`,
    );
  }

  /**
   * Factory method for missing ticket types
   */
  static missingTicketTypes(): EventNotPublishableException {
    return new EventNotPublishableException(
      'Event must have at least one active ticket type to be published',
    );
  }

  /**
   * Factory method for missing location
   */
  static missingLocation(): EventNotPublishableException {
    return new EventNotPublishableException('Event must have a valid location to be published');
  }

  /**
   * Factory method for invalid date range
   */
  static invalidDateRange(): EventNotPublishableException {
    return new EventNotPublishableException('Event must have a valid date range to be published');
  }

  /**
   * Factory method for missing title
   */
  static missingTitle(): EventNotPublishableException {
    return new EventNotPublishableException('Event must have a title to be published');
  }

  /**
   * Factory method for event date in past
   */
  static eventDateInPast(): EventNotPublishableException {
    return new EventNotPublishableException(
      'Event cannot be published if start date is in the past',
    );
  }

  /**
   * Factory method for generic validation failure
   */
  static validationFailed(reasons: string[]): EventNotPublishableException {
    return new EventNotPublishableException(
      `Event cannot be published: ${reasons.join(', ')}`,
    );
  }
}
