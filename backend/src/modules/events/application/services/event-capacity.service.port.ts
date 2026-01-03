import type { EventEntity } from '../../domain/entities/event.entity';
import type { TicketTypeEntity } from '../../domain/entities/ticket-type.entity';
import type {
  EventCapacityInfo,
  TicketTypeCapacityInfo,
  CapacityValidationResult,
} from '../models/capacity.model';

// Re-export for convenience
export type { EventCapacityInfo, TicketTypeCapacityInfo, CapacityValidationResult };

// ============================================
// Event Capacity Service Port
// ============================================

/**
 * Event Capacity Service Port
 *
 * Handles complex capacity calculations and validations.
 * This service is useful when capacity logic needs to be
 * shared across multiple use cases or when calculations
 * become complex.
 *
 * Note: Basic capacity tracking is handled by the EventEntity.
 * This service is for advanced scenarios like:
 * - Real-time availability checks with concurrency
 * - Capacity forecasting
 * - Waitlist management (future)
 */
export interface EventCapacityServicePort {
  /**
   * Get detailed capacity info for an event
   *
   * @param event - Event entity
   */
  getCapacityInfo(event: EventEntity): EventCapacityInfo;

  /**
   * Get capacity info for a specific ticket type
   *
   * @param ticketType - Ticket type entity
   */
  getTicketTypeCapacityInfo(ticketType: TicketTypeEntity): TicketTypeCapacityInfo;

  /**
   * Validate if a quantity change is allowed
   *
   * Checks if increasing/decreasing ticket type quantity
   * would violate any business rules.
   *
   * @param ticketType - Ticket type to modify
   * @param newQuantity - Proposed new quantity
   */
  validateQuantityChange(
    ticketType: TicketTypeEntity,
    newQuantity: number,
  ): CapacityValidationResult;

  /**
   * Check if tickets are available for purchase
   *
   * Atomic check that considers:
   * - Event status (must be PUBLISHED)
   * - Ticket type is active and on sale
   * - Sufficient quantity available
   *
   * @param event - Event entity
   * @param ticketTypeId - Ticket type ID
   * @param requestedQuantity - Quantity to purchase
   */
  checkAvailability(
    event: EventEntity,
    ticketTypeId: string,
    requestedQuantity: number,
  ): CapacityValidationResult;

  /**
   * Calculate total revenue potential
   *
   * Calculates maximum possible revenue if all tickets sell.
   *
   * @param event - Event entity
   */
  calculateRevenuePotential(event: EventEntity): {
    potential: number;
    realized: number;
    currency: string;
  };
}

// ============================================
// Injection Token
// ============================================

/**
 * Injection token for EventCapacityService
 */
export const EVENT_CAPACITY_SERVICE = Symbol('EventCapacityServicePort');
