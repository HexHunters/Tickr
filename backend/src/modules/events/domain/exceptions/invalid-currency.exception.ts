import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when currency validation fails
 */
export class InvalidCurrencyException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_CURRENCY');
  }

  /**
   * Factory method for unsupported currency
   */
  static unsupported(currency: string, supportedCurrencies: string[]): InvalidCurrencyException {
    return new InvalidCurrencyException(
      `Unsupported currency: ${currency}. Supported currencies: ${supportedCurrencies.join(', ')}`,
    );
  }

  /**
   * Factory method for currency mismatch
   */
  static mismatch(expected: string, actual: string): InvalidCurrencyException {
    return new InvalidCurrencyException(
      `Currency mismatch: expected ${expected}, got ${actual}`,
    );
  }
}
