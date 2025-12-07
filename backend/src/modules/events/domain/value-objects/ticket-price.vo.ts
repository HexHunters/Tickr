import { ValueObject } from '@shared/domain/value-object.base';
import { InvalidPriceException } from '../exceptions/invalid-price.exception';
import { Currency, CurrencyVO, CURRENCY_METADATA } from './currency.vo';

/**
 * Ticket Price Value Object properties
 */
interface TicketPriceProps {
  amount: number;
  currency: Currency;
}

/**
 * Ticket Price Value Object
 *
 * Represents the price of a ticket with currency.
 * Specialized version of Money for event tickets with additional validation.
 *
 * Validation rules:
 * - Amount must be greater than 0
 * - Currency must be a supported currency
 * - Amount is rounded to currency's decimal places
 */
export class TicketPriceVO extends ValueObject<TicketPriceProps> {
  /**
   * Get the amount
   */
  get amount(): number {
    return this.props.amount;
  }

  /**
   * Get the currency
   */
  get currency(): Currency {
    return this.props.currency;
  }

  /**
   * Get formatted price string
   */
  get formatted(): string {
    return CurrencyVO.formatAmount(this.props.amount, this.props.currency);
  }

  /**
   * Get symbol for currency
   */
  get symbol(): string {
    return CurrencyVO.getSymbolFor(this.props.currency);
  }

  /**
   * Create a new TicketPriceVO value object
   */
  static create(amount: number, currency: Currency = Currency.TND): TicketPriceVO {
    // Validate currency first
    if (!CurrencyVO.isValidCurrency(currency)) {
      throw new InvalidPriceException(
        `Invalid currency: ${currency}. Supported currencies: ${CurrencyVO.getAllCurrencies().join(', ')}`,
      );
    }
    // Round to currency's decimal places
    const roundedAmount = CurrencyVO.roundAmountFor(amount, currency);
    return new TicketPriceVO({
      amount: roundedAmount,
      currency,
    });
  }

  /**
   * Create a ticket price in TND
   */
  static inTND(amount: number): TicketPriceVO {
    return TicketPriceVO.create(amount, Currency.TND);
  }

  /**
   * Create a ticket price in EUR
   */
  static inEUR(amount: number): TicketPriceVO {
    return TicketPriceVO.create(amount, Currency.EUR);
  }

  /**
   * Create a ticket price in USD
   */
  static inUSD(amount: number): TicketPriceVO {
    return TicketPriceVO.create(amount, Currency.USD);
  }

  /**
   * Add to this price (same currency required)
   */
  add(other: TicketPriceVO): TicketPriceVO {
    this.assertSameCurrency(other);
    return TicketPriceVO.create(this.amount + other.amount, this.currency);
  }

  /**
   * Subtract from this price (same currency required)
   */
  subtract(other: TicketPriceVO): TicketPriceVO {
    this.assertSameCurrency(other);
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new InvalidPriceException('Result of subtraction cannot be negative');
    }
    return TicketPriceVO.create(result, this.currency);
  }

  /**
   * Multiply by a factor
   */
  multiply(factor: number): TicketPriceVO {
    if (factor < 0) {
      throw new InvalidPriceException('Multiplication factor cannot be negative');
    }
    return TicketPriceVO.create(this.amount * factor, this.currency);
  }

  /**
   * Check if this price is greater than another
   */
  isGreaterThan(other: TicketPriceVO): boolean {
    this.assertSameCurrency(other);
    return this.amount > other.amount;
  }

  /**
   * Check if this price is less than another
   */
  isLessThan(other: TicketPriceVO): boolean {
    this.assertSameCurrency(other);
    return this.amount < other.amount;
  }

  /**
   * Check if this price equals another
   */
  isEqualTo(other: TicketPriceVO): boolean {
    this.assertSameCurrency(other);
    return this.amount === other.amount;
  }

  /**
   * Calculate percentage of this price
   */
  percentage(percent: number): TicketPriceVO {
    if (percent < 0 || percent > 100) {
      throw new InvalidPriceException('Percentage must be between 0 and 100');
    }
    return TicketPriceVO.create((this.amount * percent) / 100, this.currency);
  }

  /**
   * Apply discount to this price
   */
  applyDiscount(discountPercent: number): TicketPriceVO {
    if (discountPercent < 0 || discountPercent > 100) {
      throw new InvalidPriceException('Discount percentage must be between 0 and 100');
    }
    const discountAmount = (this.amount * discountPercent) / 100;
    return TicketPriceVO.create(this.amount - discountAmount, this.currency);
  }

  /**
   * Convert to plain object for serialization
   */
  toObject(): { amount: number; currency: string } {
    return {
      amount: this.amount,
      currency: this.currency,
    };
  }

  private assertSameCurrency(other: TicketPriceVO): void {
    if (this.currency !== other.currency) {
      throw new InvalidPriceException(
        `Cannot operate on different currencies: ${this.currency} vs ${other.currency}`,
      );
    }
  }

  protected validate(props: TicketPriceProps): void {
    // Validate amount is a number
    if (typeof props.amount !== 'number' || isNaN(props.amount)) {
      throw new InvalidPriceException('Price amount must be a valid number');
    }

    // Amount must be positive for ticket prices
    if (props.amount <= 0) {
      throw new InvalidPriceException('Ticket price must be greater than 0');
    }

    // Validate currency
    if (!CurrencyVO.isValidCurrency(props.currency)) {
      throw new InvalidPriceException(
        `Invalid currency: ${props.currency}. Supported currencies: ${CurrencyVO.getAllCurrencies().join(', ')}`,
      );
    }
  }
}
