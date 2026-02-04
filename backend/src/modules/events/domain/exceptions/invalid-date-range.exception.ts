import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when date range validation fails
 *
 * Used for event date ranges and sales period validation
 */
export class InvalidDateRangeException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_DATE_RANGE');
  }

  /**
   * Factory method for end date before start date error
   */
  static endBeforeStart(): InvalidDateRangeException {
    return new InvalidDateRangeException('End date must be after start date');
  }

  /**
   * Factory method for invalid start date
   */
  static invalidStartDate(): InvalidDateRangeException {
    return new InvalidDateRangeException('Start date must be a valid date');
  }

  /**
   * Factory method for invalid end date
   */
  static invalidEndDate(): InvalidDateRangeException {
    return new InvalidDateRangeException('End date must be a valid date');
  }

  /**
   * Factory method for start date in past
   */
  static startDateInPast(): InvalidDateRangeException {
    return new InvalidDateRangeException('Start date must be in the future');
  }

  /**
   * Factory method for sales end after event start
   */
  static salesEndAfterEventStart(): InvalidDateRangeException {
    return new InvalidDateRangeException('Sales end date must be before event start date');
  }
}
