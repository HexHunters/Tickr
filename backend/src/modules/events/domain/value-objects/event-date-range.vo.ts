import { ValueObject } from '@shared/domain/value-object.base';
import { InvalidDateRangeException } from '../exceptions/invalid-date-range.exception';

/**
 * Event Date Range Value Object properties
 */
interface EventDateRangeProps {
  startDate: Date;
  endDate: Date;
}

/**
 * Event Date Range Value Object
 *
 * Represents the time period for an event with event-specific validation.
 *
 * Validation rules:
 * - Start date must be before end date
 * - For new events, start date must be in the future
 * - Dates must be valid Date objects
 */
export class EventDateRangeVO extends ValueObject<EventDateRangeProps> {
  // Minimum hours before event start for creation
  private static readonly MIN_ADVANCE_HOURS = 1;

  /**
   * Get start date (returns a copy to maintain immutability)
   */
  get startDate(): Date {
    return new Date(this.props.startDate);
  }

  /**
   * Get end date (returns a copy to maintain immutability)
   */
  get endDate(): Date {
    return new Date(this.props.endDate);
  }

  /**
   * Get duration in milliseconds
   */
  get durationMs(): number {
    return this.props.endDate.getTime() - this.props.startDate.getTime();
  }

  /**
   * Get duration in minutes
   */
  get durationInMinutes(): number {
    return Math.ceil(this.durationMs / (1000 * 60));
  }

  /**
   * Get duration in hours
   */
  get durationInHours(): number {
    return Math.ceil(this.durationMs / (1000 * 60 * 60));
  }

  /**
   * Get duration in days
   */
  get durationInDays(): number {
    return Math.ceil(this.durationMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if this is a multi-day event
   */
  get isMultiDay(): boolean {
    const startDay = this.props.startDate.toDateString();
    const endDay = this.props.endDate.toDateString();
    return startDay !== endDay;
  }

  /**
   * Create a new EventDateRange
   * @param startDate - Event start date
   * @param endDate - Event end date
   * @param validateFuture - If true, validates that start date is in the future (default: true)
   */
  static create(startDate: Date, endDate: Date, validateFuture: boolean = true): EventDateRangeVO {
    const props: EventDateRangeProps = {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };

    // Additional future validation if required
    if (validateFuture) {
      const now = new Date();
      const minStartTime = new Date(
        now.getTime() + EventDateRangeVO.MIN_ADVANCE_HOURS * 60 * 60 * 1000,
      );

      if (props.startDate < minStartTime) {
        throw new InvalidDateRangeException(
          `Event start date must be at least ${EventDateRangeVO.MIN_ADVANCE_HOURS} hour(s) in the future`,
        );
      }
    }

    return new EventDateRangeVO(props);
  }

  /**
   * Create from existing event (no future validation)
   * Used when reconstituting events from database
   */
  static createFromExisting(startDate: Date, endDate: Date): EventDateRangeVO {
    return EventDateRangeVO.create(startDate, endDate, false);
  }

  /**
   * Check if a specific date is within this range
   */
  contains(date: Date): boolean {
    const timestamp = date.getTime();
    return timestamp >= this.props.startDate.getTime() && timestamp <= this.props.endDate.getTime();
  }

  /**
   * Check if this range overlaps with another
   */
  overlaps(other: EventDateRangeVO): boolean {
    return (
      this.props.startDate <= other.endDate && this.props.endDate >= other.startDate
    );
  }

  /**
   * Check if the event start date is in the future
   */
  isInFuture(): boolean {
    return this.props.startDate > new Date();
  }

  /**
   * Check if the event has ended
   */
  isInPast(): boolean {
    return this.props.endDate < new Date();
  }

  /**
   * Check if the event is currently ongoing
   */
  isOngoing(): boolean {
    const now = new Date();
    return this.props.startDate <= now && this.props.endDate >= now;
  }

  /**
   * Check if the event has started
   */
  hasStarted(): boolean {
    return this.props.startDate <= new Date();
  }

  /**
   * Get time until event starts in milliseconds
   * Returns negative if already started
   */
  getTimeUntilStart(): number {
    return this.props.startDate.getTime() - new Date().getTime();
  }

  /**
   * Get time until event ends in milliseconds
   * Returns negative if already ended
   */
  getTimeUntilEnd(): number {
    return this.props.endDate.getTime() - new Date().getTime();
  }

  /**
   * Get formatted date string for display
   */
  getFormattedRange(locale: string = 'en-US'): string {
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
    };

    const startDateStr = this.props.startDate.toLocaleDateString(locale, dateOptions);
    const startTimeStr = this.props.startDate.toLocaleTimeString(locale, timeOptions);
    const endDateStr = this.props.endDate.toLocaleDateString(locale, dateOptions);
    const endTimeStr = this.props.endDate.toLocaleTimeString(locale, timeOptions);

    if (this.isMultiDay) {
      return `${startDateStr} ${startTimeStr} - ${endDateStr} ${endTimeStr}`;
    }
    return `${startDateStr}, ${startTimeStr} - ${endTimeStr}`;
  }

  /**
   * Check if a sales period is valid for this event
   * Sales must end before event starts
   */
  isValidSalesPeriod(salesStartDate: Date, salesEndDate: Date): boolean {
    return salesEndDate < this.props.startDate && salesStartDate < salesEndDate;
  }

  /**
   * Get the maximum allowed sales end date (event start)
   */
  getMaxSalesEndDate(): Date {
    return new Date(this.props.startDate);
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

  protected validate(props: EventDateRangeProps): void {
    // Validate start date
    if (!(props.startDate instanceof Date) || isNaN(props.startDate.getTime())) {
      throw new InvalidDateRangeException('Start date must be a valid date');
    }

    // Validate end date
    if (!(props.endDate instanceof Date) || isNaN(props.endDate.getTime())) {
      throw new InvalidDateRangeException('End date must be a valid date');
    }

    // End date must be after start date
    if (props.endDate <= props.startDate) {
      throw new InvalidDateRangeException('End date must be after start date');
    }
  }
}
