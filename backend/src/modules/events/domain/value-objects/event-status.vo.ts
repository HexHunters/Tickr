/**
 * Event Status Enum
 *
 * Represents the lifecycle states of an event:
 * - DRAFT: Event is being created/edited by organizer
 * - PUBLISHED: Event is live and visible to the public
 * - CANCELLED: Event has been cancelled by organizer
 * - COMPLETED: Event has finished (past end date)
 */
export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

/**
 * Status metadata for UI display (not exported to comply with architecture)
 */
interface StatusMetadata {
  displayName: string;
  displayNameFr: string;
  description: string;
  color: string;
  bgColor: string;
}

/**
 * Status metadata mapping
 */
export const EVENT_STATUS_METADATA: Record<EventStatus, StatusMetadata> = {
  [EventStatus.DRAFT]: {
    displayName: 'Draft',
    displayNameFr: 'Brouillon',
    description: 'Event is being prepared',
    color: '#757575',
    bgColor: '#F5F5F5',
  },
  [EventStatus.PUBLISHED]: {
    displayName: 'Published',
    displayNameFr: 'Publié',
    description: 'Event is live and accepting registrations',
    color: '#4CAF50',
    bgColor: '#E8F5E9',
  },
  [EventStatus.CANCELLED]: {
    displayName: 'Cancelled',
    displayNameFr: 'Annulé',
    description: 'Event has been cancelled',
    color: '#F44336',
    bgColor: '#FFEBEE',
  },
  [EventStatus.COMPLETED]: {
    displayName: 'Completed',
    displayNameFr: 'Terminé',
    description: 'Event has finished',
    color: '#2196F3',
    bgColor: '#E3F2FD',
  },
};

/**
 * Valid state transitions for events
 * Maps current status to allowed next statuses
 */
export const EVENT_STATUS_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  [EventStatus.DRAFT]: [EventStatus.PUBLISHED, EventStatus.CANCELLED],
  [EventStatus.PUBLISHED]: [EventStatus.CANCELLED, EventStatus.COMPLETED],
  [EventStatus.CANCELLED]: [], // Terminal state
  [EventStatus.COMPLETED]: [], // Terminal state
};

/**
 * EventStatus Value Object
 *
 * Provides status validation and state machine utilities
 */
export class EventStatusVO {
  private constructor(private readonly status: EventStatus) {}

  /**
   * Get the status value
   */
  get value(): EventStatus {
    return this.status;
  }

  /**
   * Create an EventStatusVO from string
   */
  static create(status: string): EventStatusVO {
    const normalized = status.toUpperCase().trim();
    if (!Object.values(EventStatus).includes(normalized as EventStatus)) {
      throw new Error(
        `Invalid status: ${status}. Must be one of: ${Object.values(EventStatus).join(', ')}`,
      );
    }
    return new EventStatusVO(normalized as EventStatus);
  }

  /**
   * Create from enum directly
   */
  static fromEnum(status: EventStatus): EventStatusVO {
    return new EventStatusVO(status);
  }

  /**
   * Create a DRAFT status (default for new events)
   */
  static draft(): EventStatusVO {
    return new EventStatusVO(EventStatus.DRAFT);
  }

  /**
   * Get status metadata
   */
  getMetadata(): StatusMetadata {
    return EVENT_STATUS_METADATA[this.status];
  }

  /**
   * Get display name for status
   */
  getDisplayName(locale: 'en' | 'fr' = 'en'): string {
    const metadata = EVENT_STATUS_METADATA[this.status];
    return locale === 'fr' ? metadata.displayNameFr : metadata.displayName;
  }

  /**
   * Get color for UI
   */
  getColor(): string {
    return EVENT_STATUS_METADATA[this.status].color;
  }

  /**
   * Get background color for UI
   */
  getBgColor(): string {
    return EVENT_STATUS_METADATA[this.status].bgColor;
  }

  /**
   * Check if transition to another status is allowed
   */
  canTransitionTo(targetStatus: EventStatus): boolean {
    return EVENT_STATUS_TRANSITIONS[this.status].includes(targetStatus);
  }

  /**
   * Get allowed transitions from current status
   */
  getAllowedTransitions(): EventStatus[] {
    return EVENT_STATUS_TRANSITIONS[this.status];
  }

  /**
   * Check if the event is publicly visible
   */
  isPublic(): boolean {
    return this.status === EventStatus.PUBLISHED;
  }

  /**
   * Check if the event can be cancelled
   */
  isCancellable(): boolean {
    return this.status === EventStatus.DRAFT || this.status === EventStatus.PUBLISHED;
  }

  /**
   * Check if the event can be modified (edited)
   */
  isModifiable(): boolean {
    return this.status === EventStatus.DRAFT;
  }

  /**
   * Check if the event is in a terminal state
   */
  isTerminal(): boolean {
    return this.status === EventStatus.CANCELLED || this.status === EventStatus.COMPLETED;
  }

  /**
   * Check if tickets can be purchased
   */
  canPurchaseTickets(): boolean {
    return this.status === EventStatus.PUBLISHED;
  }

  /**
   * Check if status is DRAFT
   */
  isDraft(): boolean {
    return this.status === EventStatus.DRAFT;
  }

  /**
   * Check if status is PUBLISHED
   */
  isPublished(): boolean {
    return this.status === EventStatus.PUBLISHED;
  }

  /**
   * Check if status is CANCELLED
   */
  isCancelled(): boolean {
    return this.status === EventStatus.CANCELLED;
  }

  /**
   * Check if status is COMPLETED
   */
  isCompleted(): boolean {
    return this.status === EventStatus.COMPLETED;
  }

  /**
   * Compare with another status
   */
  equals(other: EventStatusVO): boolean {
    return this.status === other.status;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.status;
  }

  // Static utility methods

  /**
   * Get all available statuses
   */
  static getAllStatuses(): EventStatus[] {
    return Object.values(EventStatus);
  }

  /**
   * Check if a value is a valid status
   */
  static isValidStatus(value: string): value is EventStatus {
    return Object.values(EventStatus).includes(value.toUpperCase() as EventStatus);
  }

  /**
   * Check if transition from one status to another is allowed
   */
  static canTransition(from: EventStatus, to: EventStatus): boolean {
    return EVENT_STATUS_TRANSITIONS[from].includes(to);
  }

  /**
   * Get allowed transitions for a status
   */
  static getAllowedTransitionsFor(status: EventStatus): EventStatus[] {
    return EVENT_STATUS_TRANSITIONS[status];
  }

  /**
   * Parse status from string (case-insensitive), returns null if invalid
   */
  static fromString(value: string): EventStatusVO | null {
    try {
      return EventStatusVO.create(value);
    } catch {
      return null;
    }
  }
}
