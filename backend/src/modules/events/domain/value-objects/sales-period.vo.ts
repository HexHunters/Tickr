import { ValueObject } from '@shared/domain/value-object.base';
import { InvalidDateRangeException } from '../exceptions/invalid-date-range.exception';

/**
 * Sales Period Value Object properties
 */
interface SalesPeriodProps {
  startDate: Date;
  endDate: Date;
}

/**
 * Sales Period Value Object
 *
 * Represents the time period when tickets can be purchased.
 *
 * Validation rules:
 * - Start date must be before end date
 * - Dates must be valid Date objects
 * - Used for ticket type sales windows
 */
export class SalesPeriodVO extends ValueObject<SalesPeriodProps> {
  /**
   * Get sales start date (returns a copy to maintain immutability)
   */
  get startDate(): Date {
    return new Date(this.props.startDate);
  }

  /**
   * Get sales end date (returns a copy to maintain immutability)
   */
  get endDate(): Date {
    return new Date(this.props.endDate);
  }

  /**
   * Get duration in hours
   */
  get durationInHours(): number {
    const diffMs = this.props.endDate.getTime() - this.props.startDate.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60));
  }

  /**
   * Get duration in days
   */
  get durationInDays(): number {
    const diffMs = this.props.endDate.getTime() - this.props.startDate.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Create a new SalesPeriodVO
   */
  static create(startDate: Date, endDate: Date): SalesPeriodVO {
    return new SalesPeriodVO({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
  }

  /**
   * Create a sales period that starts now
   */
  static startingNow(endDate: Date): SalesPeriodVO {
    return SalesPeriodVO.create(new Date(), endDate);
  }

  /**
   * Create a sales period with duration from start date
   */
  static withDuration(startDate: Date, durationDays: number): SalesPeriodVO {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);
    return SalesPeriodVO.create(startDate, endDate);
  }

  /**
   * Check if sales are currently active
   */
  isOnSale(): boolean {
    const now = new Date();
    return now >= this.props.startDate && now <= this.props.endDate;
  }

  /**
   * Check if sales haven't started yet
   */
  isPending(): boolean {
    return new Date() < this.props.startDate;
  }

  /**
   * Check if sales have ended
   */
  hasEnded(): boolean {
    return new Date() > this.props.endDate;
  }

  /**
   * Get time until sales start in milliseconds
   * Returns negative if already started
   */
  getTimeUntilStart(): number {
    return this.props.startDate.getTime() - new Date().getTime();
  }

  /**
   * Get time until sales end in milliseconds
   * Returns negative if already ended
   */
  getTimeUntilEnd(): number {
    return this.props.endDate.getTime() - new Date().getTime();
  }

  /**
   * Check if this period contains a specific date
   */
  contains(date: Date): boolean {
    return date >= this.props.startDate && date <= this.props.endDate;
  }

  /**
   * Check if this period overlaps with another
   */
  overlaps(other: SalesPeriodVO): boolean {
    return this.props.startDate <= other.endDate && this.props.endDate >= other.startDate;
  }

  /**
   * Validate that this sales period ends before the event starts
   */
  validateForEvent(eventStartDate: Date): boolean {
    return this.props.endDate < eventStartDate;
  }

  /**
   * Get formatted range string
   */
  getFormattedRange(locale: string = 'en-US'): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    const startStr = this.props.startDate.toLocaleDateString(locale, options);
    const endStr = this.props.endDate.toLocaleDateString(locale, options);
    return `${startStr} - ${endStr}`;
  }

  /**
   * Get sales status as string
   */
  getStatus(): 'pending' | 'active' | 'ended' {
    if (this.isPending()) return 'pending';
    if (this.hasEnded()) return 'ended';
    return 'active';
  }

  /**
   * Convert to ISO string range
   */
  toISOStrings(): { startDate: string; endDate: string } {
    return {
      startDate: this.props.startDate.toISOString(),
      endDate: this.props.endDate.toISOString(),
    };
  }

  protected validate(props: SalesPeriodProps): void {
    // Validate start date
    if (!(props.startDate instanceof Date) || isNaN(props.startDate.getTime())) {
      throw new InvalidDateRangeException('Sales start date must be a valid date');
    }

    // Validate end date
    if (!(props.endDate instanceof Date) || isNaN(props.endDate.getTime())) {
      throw new InvalidDateRangeException('Sales end date must be a valid date');
    }

    // End date must be after start date
    if (props.endDate <= props.startDate) {
      throw new InvalidDateRangeException('Sales end date must be after sales start date');
    }
  }
}
