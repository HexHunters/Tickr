import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when price validation fails
 *
 * Used for ticket price and money-related validation
 */
export class InvalidPriceException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_PRICE');
  }

  /**
   * Factory method for non-positive price
   */
  static mustBePositive(): InvalidPriceException {
    return new InvalidPriceException('Price must be greater than 0');
  }

  /**
   * Factory method for invalid amount
   */
  static invalidAmount(): InvalidPriceException {
    return new InvalidPriceException('Price amount must be a valid number');
  }

  /**
   * Factory method for currency mismatch
   */
  static currencyMismatch(currency1: string, currency2: string): InvalidPriceException {
    return new InvalidPriceException(
      `Cannot operate on different currencies: ${currency1} vs ${currency2}`,
    );
  }

  /**
   * Factory method for unsupported currency
   */
  static unsupportedCurrency(currency: string): InvalidPriceException {
    return new InvalidPriceException(`Unsupported currency: ${currency}`);
  }

  /**
   * Factory method for negative result
   */
  static negativeResult(): InvalidPriceException {
    return new InvalidPriceException('Result of operation cannot be negative');
  }

  /**
   * Factory method for invalid percentage
   */
  static invalidPercentage(): InvalidPriceException {
    return new InvalidPriceException('Percentage must be between 0 and 100');
  }
}
