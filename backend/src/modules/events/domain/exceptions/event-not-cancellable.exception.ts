import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when an event cannot be cancelled
 *
 * Used when cancellation validation fails
 */
export class EventNotCancellableException extends DomainException {
  constructor(message: string) {
    super(message, 'EVENT_NOT_CANCELLABLE');
  }

  /**
   * Factory method for wrong status
   */
  static wrongStatus(currentStatus: string): EventNotCancellableException {
    return new EventNotCancellableException(
      `Event cannot be cancelled from ${currentStatus} status. Only DRAFT or PUBLISHED events can be cancelled.`,
    );
  }

  /**
   * Factory method for event already started
   */
  static eventAlreadyStarted(): EventNotCancellableException {
    return new EventNotCancellableException(
      'Event cannot be cancelled after it has started',
    );
  }

  /**
   * Factory method for event already completed
   */
  static eventAlreadyCompleted(): EventNotCancellableException {
    return new EventNotCancellableException(
      'Event cannot be cancelled because it has already completed',
    );
  }

  /**
   * Factory method for event already cancelled
   */
  static eventAlreadyCancelled(): EventNotCancellableException {
    return new EventNotCancellableException('Event is already cancelled');
  }
}
