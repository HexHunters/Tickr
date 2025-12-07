import { DomainException } from '@shared/domain/domain-exception.base';
import { EventCategory } from '../value-objects/event-category.vo';

/**
 * Exception thrown when event category validation fails
 *
 * Used when an invalid category value is provided
 */
export class InvalidEventCategoryException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_EVENT_CATEGORY');
  }

  /**
   * Factory method for invalid category value
   */
  static invalidValue(value: string): InvalidEventCategoryException {
    const validCategories = Object.values(EventCategory).join(', ');
    return new InvalidEventCategoryException(
      `Invalid category: ${value}. Must be one of: ${validCategories}`,
    );
  }

  /**
   * Factory method for empty category
   */
  static empty(): InvalidEventCategoryException {
    return new InvalidEventCategoryException('Event category is required');
  }
}
