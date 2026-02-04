import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when location validation fails
 *
 * Used for event location and coordinate validation
 */
export class InvalidLocationException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_LOCATION');
  }

  /**
   * Factory method for missing city
   */
  static missingCity(): InvalidLocationException {
    return new InvalidLocationException('City is required');
  }

  /**
   * Factory method for missing country
   */
  static missingCountry(): InvalidLocationException {
    return new InvalidLocationException('Country is required');
  }

  /**
   * Factory method for invalid latitude
   */
  static invalidLatitude(): InvalidLocationException {
    return new InvalidLocationException('Latitude must be between -90 and 90');
  }

  /**
   * Factory method for invalid longitude
   */
  static invalidLongitude(): InvalidLocationException {
    return new InvalidLocationException('Longitude must be between -180 and 180');
  }

  /**
   * Factory method for incomplete coordinates
   */
  static incompleteCoordinates(): InvalidLocationException {
    return new InvalidLocationException('Both latitude and longitude must be provided together');
  }

  /**
   * Factory method for address too long
   */
  static addressTooLong(maxLength: number): InvalidLocationException {
    return new InvalidLocationException(`Address must be at most ${maxLength} characters`);
  }
}
