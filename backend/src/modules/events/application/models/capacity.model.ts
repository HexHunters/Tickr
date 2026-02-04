// ============================================
// Capacity Info Interface
// ============================================

/**
 * Capacity information for an event
 */
export interface EventCapacityInfo {
  /**
   * Event ID
   */
  eventId: string;

  /**
   * Total capacity across all ticket types
   */
  totalCapacity: number;

  /**
   * Total tickets sold across all ticket types
   */
  soldTickets: number;

  /**
   * Available tickets (totalCapacity - soldTickets)
   */
  availableTickets: number;

  /**
   * Sales progress as percentage (0-100)
   */
  salesProgress: number;

  /**
   * Whether the event is sold out
   */
  isSoldOut: boolean;

  /**
   * Breakdown by ticket type
   */
  ticketTypes: TicketTypeCapacityInfo[];
}

/**
 * Capacity information for a ticket type
 */
export interface TicketTypeCapacityInfo {
  /**
   * Ticket type ID
   */
  ticketTypeId: string;

  /**
   * Ticket type name
   */
  name: string;

  /**
   * Total quantity available
   */
  quantity: number;

  /**
   * Quantity sold
   */
  soldQuantity: number;

  /**
   * Available quantity
   */
  availableQuantity: number;

  /**
   * Sales progress as percentage (0-100)
   */
  salesProgress: number;

  /**
   * Whether this ticket type is sold out
   */
  isSoldOut: boolean;

  /**
   * Whether tickets are currently on sale
   */
  isOnSale: boolean;

  /**
   * Whether this ticket type is active
   */
  isActive: boolean;
}

// ============================================
// Capacity Validation Result
// ============================================

/**
 * Result of capacity validation
 */
export interface CapacityValidationResult {
  /**
   * Whether the capacity change is valid
   */
  isValid: boolean;

  /**
   * Error message if invalid
   */
  errorMessage?: string;

  /**
   * New total capacity if valid
   */
  newTotalCapacity?: number;

  /**
   * Impact on available tickets
   */
  availableTicketsChange?: number;
}
