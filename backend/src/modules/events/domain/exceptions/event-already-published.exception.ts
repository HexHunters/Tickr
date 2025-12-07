import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when trying to publish an already published event
 */
export class EventAlreadyPublishedException extends DomainException {
  constructor(eventId: string) {
    super(`Event ${eventId} is already published`, 'EVENT_ALREADY_PUBLISHED');
  }

  /**
   * Factory method
   */
  static withId(eventId: string): EventAlreadyPublishedException {
    return new EventAlreadyPublishedException(eventId);
  }
}
