import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when ticket type validation fails
 */
export class InvalidTicketTypeException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_TICKET_TYPE');
  }

  /**
   * Factory method for missing name
   */
  static missingName(): InvalidTicketTypeException {
    return new InvalidTicketTypeException('Ticket type name is required');
  }

  /**
   * Factory method for name too long
   */
  static nameTooLong(maxLength: number): InvalidTicketTypeException {
    return new InvalidTicketTypeException(
      `Ticket type name must be at most ${maxLength} characters`,
    );
  }

  /**
   * Factory method for invalid quantity
   */
  static invalidQuantity(): InvalidTicketTypeException {
    return new InvalidTicketTypeException('Ticket quantity must be greater than 0');
  }

  /**
   * Factory method for sold quantity exceeds quantity
   */
  static soldExceedsQuantity(): InvalidTicketTypeException {
    return new InvalidTicketTypeException('Sold quantity cannot exceed total quantity');
  }

  /**
   * Factory method for cannot reduce quantity below sold
   */
  static cannotReduceQuantity(sold: number): InvalidTicketTypeException {
    return new InvalidTicketTypeException(
      `Cannot reduce quantity below ${sold} (already sold)`,
    );
  }

  /**
   * Factory method for cannot modify after sales started
   */
  static cannotModifyAfterSales(): InvalidTicketTypeException {
    return new InvalidTicketTypeException(
      'Cannot modify ticket type price or quantity after sales have started',
    );
  }

  /**
   * Factory method for maximum ticket types reached
   */
  static maximumReached(max: number): InvalidTicketTypeException {
    return new InvalidTicketTypeException(
      `Maximum number of ticket types (${max}) has been reached`,
    );
  }

  /**
   * Factory method for duplicate ticket type name
   */
  static duplicateName(name: string): InvalidTicketTypeException {
    return new InvalidTicketTypeException(
      `A ticket type with name "${name}" already exists for this event`,
    );
  }

  /**
   * Factory method for invalid sales period
   */
  static invalidSalesPeriod(): InvalidTicketTypeException {
    return new InvalidTicketTypeException(
      'Sales end date must be before event start date',
    );
  }
}
