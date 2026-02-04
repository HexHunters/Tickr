import { ValueObject } from '@shared/domain/value-object.base';

import { InvalidLocationException } from '../exceptions/invalid-location.exception';

/**
 * Location Value Object properties
 */
interface LocationProps {
  address: string | null;
  city: string;
  country: string;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Location Value Object
 *
 * Represents a physical location for an event with address details
 * and optional geographic coordinates.
 *
 * Validation rules:
 * - City is required
 * - Country is required
 * - Latitude must be between -90 and 90
 * - Longitude must be between -180 and 180
 * - Address and postal code are optional
 */
export class LocationVO extends ValueObject<LocationProps> {
  // Valid latitude range
  private static readonly MIN_LATITUDE = -90;
  private static readonly MAX_LATITUDE = 90;

  // Valid longitude range
  private static readonly MIN_LONGITUDE = -180;
  private static readonly MAX_LONGITUDE = 180;

  // Common Tunisian cities for validation (optional enhancement)
  private static readonly TUNISIAN_CITIES = [
    'Tunis',
    'Sfax',
    'Sousse',
    'Kairouan',
    'Bizerte',
    'Gabès',
    'Ariana',
    'Gafsa',
    'Monastir',
    'Ben Arous',
    'Kasserine',
    'Médenine',
    'Nabeul',
    'Tataouine',
    'Béja',
    'Kef',
    'Mahdia',
    'Sidi Bouzid',
    'Jendouba',
    'Tozeur',
    'Siliana',
    'Zaghouan',
    'Kebili',
    'Manouba',
  ];

  /**
   * Get address
   */
  get address(): string | null {
    return this.props.address;
  }

  /**
   * Get city
   */
  get city(): string {
    return this.props.city;
  }

  /**
   * Get country
   */
  get country(): string {
    return this.props.country;
  }

  /**
   * Get postal code
   */
  get postalCode(): string | null {
    return this.props.postalCode;
  }

  /**
   * Get latitude
   */
  get latitude(): number | null {
    return this.props.latitude;
  }

  /**
   * Get longitude
   */
  get longitude(): number | null {
    return this.props.longitude;
  }

  /**
   * Check if coordinates are available
   */
  get hasCoordinates(): boolean {
    return this.props.latitude !== null && this.props.longitude !== null;
  }

  /**
   * Get coordinates as object if available
   */
  get coordinates(): { latitude: number; longitude: number } | null {
    if (!this.hasCoordinates) {
      return null;
    }
    return {
      latitude: this.props.latitude!,
      longitude: this.props.longitude!,
    };
  }

  /**
   * Get full address as a formatted string
   */
  get fullAddress(): string {
    const parts: string[] = [];

    if (this.props.address) {
      parts.push(this.props.address);
    }

    if (this.props.postalCode) {
      parts.push(`${this.props.postalCode} ${this.props.city}`);
    } else {
      parts.push(this.props.city);
    }

    parts.push(this.props.country);

    return parts.join(', ');
  }

  /**
   * Get short location (City, Country)
   */
  get shortLocation(): string {
    return `${this.props.city}, ${this.props.country}`;
  }

  /**
   * Create a new Location value object
   */
  static create(props: {
    address?: string | null;
    city: string;
    country: string;
    postalCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }): LocationVO {
    return new LocationVO({
      address: props.address?.trim() || null,
      city: props.city.trim(),
      country: props.country.trim(),
      postalCode: props.postalCode?.trim() || null,
      latitude: props.latitude ?? null,
      longitude: props.longitude ?? null,
    });
  }

  /**
   * Create a Tunisia-specific location
   */
  static createTunisian(props: {
    address?: string | null;
    city: string;
    postalCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }): LocationVO {
    return LocationVO.create({
      ...props,
      country: 'Tunisia',
    });
  }

  /**
   * Check if location is in Tunisia
   */
  isTunisian(): boolean {
    return (
      this.props.country.toLowerCase() === 'tunisia' ||
      this.props.country.toLowerCase() === 'tunisie'
    );
  }

  /**
   * Check if city is a known Tunisian city
   */
  isKnownTunisianCity(): boolean {
    if (!this.isTunisian()) {
      return false;
    }
    return LocationVO.TUNISIAN_CITIES.some(
      (city) => city.toLowerCase() === this.props.city.toLowerCase(),
    );
  }

  /**
   * Calculate distance to another location in kilometers
   * Uses Haversine formula
   */
  distanceTo(other: LocationVO): number | null {
    if (!this.hasCoordinates || !other.hasCoordinates) {
      return null;
    }

    const R = 6371; // Earth's radius in kilometers
    const lat1 = this.toRadians(this.props.latitude!);
    const lat2 = this.toRadians(other.latitude!);
    const deltaLat = this.toRadians(other.latitude! - this.props.latitude!);
    const deltaLon = this.toRadians(other.longitude! - this.props.longitude!);

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Create a copy with updated coordinates
   */
  withCoordinates(latitude: number, longitude: number): LocationVO {
    return LocationVO.create({
      address: this.props.address,
      city: this.props.city,
      country: this.props.country,
      postalCode: this.props.postalCode,
      latitude,
      longitude,
    });
  }

  /**
   * Create a copy with updated address
   */
  withAddress(address: string): LocationVO {
    return LocationVO.create({
      address,
      city: this.props.city,
      country: this.props.country,
      postalCode: this.props.postalCode,
      latitude: this.props.latitude,
      longitude: this.props.longitude,
    });
  }

  /**
   * Get Google Maps URL for this location
   */
  getGoogleMapsUrl(): string {
    if (this.hasCoordinates) {
      return `https://www.google.com/maps?q=${this.props.latitude},${this.props.longitude}`;
    }
    const query = encodeURIComponent(this.fullAddress);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  protected validate(props: LocationProps): void {
    // City is required
    if (!props.city || props.city.trim().length === 0) {
      throw new InvalidLocationException('City is required');
    }

    // City length validation
    if (props.city.trim().length > 100) {
      throw new InvalidLocationException('City name must be at most 100 characters');
    }

    // Country is required
    if (!props.country || props.country.trim().length === 0) {
      throw new InvalidLocationException('Country is required');
    }

    // Country length validation
    if (props.country.trim().length > 100) {
      throw new InvalidLocationException('Country name must be at most 100 characters');
    }

    // Address length validation (if provided)
    if (props.address && props.address.trim().length > 500) {
      throw new InvalidLocationException('Address must be at most 500 characters');
    }

    // Validate latitude if provided
    if (props.latitude !== null) {
      if (typeof props.latitude !== 'number' || isNaN(props.latitude)) {
        throw new InvalidLocationException('Latitude must be a valid number');
      }
      if (props.latitude < LocationVO.MIN_LATITUDE || props.latitude > LocationVO.MAX_LATITUDE) {
        throw new InvalidLocationException(
          `Latitude must be between ${LocationVO.MIN_LATITUDE} and ${LocationVO.MAX_LATITUDE}`,
        );
      }
    }

    // Validate longitude if provided
    if (props.longitude !== null) {
      if (typeof props.longitude !== 'number' || isNaN(props.longitude)) {
        throw new InvalidLocationException('Longitude must be a valid number');
      }
      if (props.longitude < LocationVO.MIN_LONGITUDE || props.longitude > LocationVO.MAX_LONGITUDE) {
        throw new InvalidLocationException(
          `Longitude must be between ${LocationVO.MIN_LONGITUDE} and ${LocationVO.MAX_LONGITUDE}`,
        );
      }
    }

    // If one coordinate is provided, both must be provided
    if (
      (props.latitude !== null && props.longitude === null) ||
      (props.latitude === null && props.longitude !== null)
    ) {
      throw new InvalidLocationException(
        'Both latitude and longitude must be provided together',
      );
    }
  }
}
