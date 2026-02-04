import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when sales period conflicts with event dates
 */
export class InvalidSalesPeriodException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_SALES_PERIOD');
  }

  /**
   * Factory method for sales end after event start
   */
  static salesEndAfterEventStart(): InvalidSalesPeriodException {
    return new InvalidSalesPeriodException(
      'Sales end date must be before the event start date',
    );
  }

  /**
   * Factory method for sales period validation
   */
  static invalidPeriod(reason: string): InvalidSalesPeriodException {
    return new InvalidSalesPeriodException(reason);
  }
}
