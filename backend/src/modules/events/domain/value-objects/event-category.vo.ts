import { ValueObject } from '../../../../shared/domain/value-object.base';
import { InvalidEventCategoryException } from '../exceptions/invalid-event-category.exception';

/**
 * Event Category Enum
 *
 * Defines the available event categories in the system.
 * Each category represents a distinct type of event with specific characteristics.
 */
export enum EventCategory {
  CONCERT = 'CONCERT',
  CONFERENCE = 'CONFERENCE',
  SPORT = 'SPORT',
  THEATER = 'THEATER',
  WORKSHOP = 'WORKSHOP',
  FESTIVAL = 'FESTIVAL',
  EXHIBITION = 'EXHIBITION',
  NETWORKING = 'NETWORKING',
  COMEDY = 'COMEDY',
  OTHER = 'OTHER',
}

/**
 * Category metadata type (not exported to comply with architecture)
 */
interface CategoryMetadata {
  displayName: string;
  displayNameFr: string;
  description: string;
  icon: string;
  color: string;
}

/**
 * Category metadata mapping
 */
export const EVENT_CATEGORY_METADATA: Record<EventCategory, CategoryMetadata> = {
  [EventCategory.CONCERT]: {
    displayName: 'Concert',
    displayNameFr: 'Concert',
    description: 'Live music performances',
    icon: 'music',
    color: '#E91E63',
  },
  [EventCategory.CONFERENCE]: {
    displayName: 'Conference',
    displayNameFr: 'Conférence',
    description: 'Professional talks and presentations',
    icon: 'microphone',
    color: '#2196F3',
  },
  [EventCategory.SPORT]: {
    displayName: 'Sport',
    displayNameFr: 'Sport',
    description: 'Sports events and competitions',
    icon: 'trophy',
    color: '#4CAF50',
  },
  [EventCategory.THEATER]: {
    displayName: 'Theater',
    displayNameFr: 'Théâtre',
    description: 'Theatrical performances and plays',
    icon: 'masks-theater',
    color: '#9C27B0',
  },
  [EventCategory.WORKSHOP]: {
    displayName: 'Workshop',
    displayNameFr: 'Atelier',
    description: 'Interactive learning sessions',
    icon: 'tools',
    color: '#FF9800',
  },
  [EventCategory.FESTIVAL]: {
    displayName: 'Festival',
    displayNameFr: 'Festival',
    description: 'Multi-day celebration events',
    icon: 'party-horn',
    color: '#F44336',
  },
  [EventCategory.EXHIBITION]: {
    displayName: 'Exhibition',
    displayNameFr: 'Exposition',
    description: 'Art and cultural exhibitions',
    icon: 'palette',
    color: '#00BCD4',
  },
  [EventCategory.NETWORKING]: {
    displayName: 'Networking',
    displayNameFr: 'Réseautage',
    description: 'Professional networking events',
    icon: 'users',
    color: '#3F51B5',
  },
  [EventCategory.COMEDY]: {
    displayName: 'Comedy',
    displayNameFr: 'Comédie',
    description: 'Stand-up comedy and humor shows',
    icon: 'laugh',
    color: '#FFEB3B',
  },
  [EventCategory.OTHER]: {
    displayName: 'Other',
    displayNameFr: 'Autre',
    description: 'Other types of events',
    icon: 'calendar',
    color: '#607D8B',
  },
};

/**
 * EventCategory Value Object properties
 */
interface EventCategoryProps {
  category: EventCategory;
}

/**
 * EventCategory Value Object
 *
 * Provides category validation and utility methods.
 * Extends ValueObject base class for consistency with other VOs.
 */
export class EventCategoryVO extends ValueObject<EventCategoryProps> {
  /**
   * Get the category value
   */
  get value(): EventCategory {
    return this.props.category;
  }

  /**
   * Create an EventCategoryVO from string
   */
  static create(category: string): EventCategoryVO {
    const normalized = category.toUpperCase().trim();
    if (!Object.values(EventCategory).includes(normalized as EventCategory)) {
      throw InvalidEventCategoryException.invalidValue(category);
    }
    return new EventCategoryVO({ category: normalized as EventCategory });
  }

  /**
   * Create from enum directly
   */
  static fromEnum(category: EventCategory): EventCategoryVO {
    return new EventCategoryVO({ category });
  }

  /**
   * Get category metadata
   */
  getMetadata(): CategoryMetadata {
    return EVENT_CATEGORY_METADATA[this.props.category];
  }

  /**
   * Get display name for category
   */
  getDisplayName(locale: 'en' | 'fr' = 'en'): string {
    const metadata = EVENT_CATEGORY_METADATA[this.props.category];
    return locale === 'fr' ? metadata.displayNameFr : metadata.displayName;
  }

  /**
   * Get icon name for UI
   */
  getIcon(): string {
    return EVENT_CATEGORY_METADATA[this.props.category].icon;
  }

  /**
   * Get color for UI
   */
  getColor(): string {
    return EVENT_CATEGORY_METADATA[this.props.category].color;
  }

  /**
   * Compare with another category (override to use value comparison)
   */
  equals(other?: EventCategoryVO): boolean {
    if (!other) return false;
    return this.props.category === other.props.category;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.props.category;
  }

  // Static utility methods

  /**
   * Get all available categories
   */
  static getAllCategories(): EventCategory[] {
    return Object.values(EventCategory);
  }

  /**
   * Check if a value is a valid category
   */
  static isValidCategory(value: string): value is EventCategory {
    return Object.values(EventCategory).includes(value.toUpperCase() as EventCategory);
  }

  /**
   * Get metadata for a category enum value
   */
  static getMetadataFor(category: EventCategory): CategoryMetadata {
    return EVENT_CATEGORY_METADATA[category];
  }

  /**
   * Get display name for a category enum value
   */
  static getDisplayNameFor(category: EventCategory, locale: 'en' | 'fr' = 'en'): string {
    const metadata = EVENT_CATEGORY_METADATA[category];
    return locale === 'fr' ? metadata.displayNameFr : metadata.displayName;
  }

  /**
   * Parse category from string (case-insensitive), returns null if invalid
   */
  static fromString(value: string): EventCategoryVO | null {
    try {
      return EventCategoryVO.create(value);
    } catch {
      return null;
    }
  }

  /**
   * Validate the category props
   */
  protected validate(props: EventCategoryProps): void {
    if (!props.category) {
      throw InvalidEventCategoryException.empty();
    }

    if (!Object.values(EventCategory).includes(props.category)) {
      throw InvalidEventCategoryException.invalidValue(props.category);
    }
  }
}
