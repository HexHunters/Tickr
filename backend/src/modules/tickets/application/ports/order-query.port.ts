/**
 * Order Query Port (Cross-module — Payments bounded context)
 *
 * Allows Tickets module to verify order status for ticket confirmation
 * without depending on Payments domain internals.
 */
export const ORDER_QUERY_PORT = Symbol('ORDER_QUERY_PORT');

/**
 * Minimal order info needed for ticket confirmation verification
 */
export interface OrderInfoInterface {
  id: string;
  userId: string;
  status: string;
}

export interface OrderQueryPort {
  /**
   * Find order by ID for verification purposes
   * Returns null if order does not exist
   */
  findById(orderId: string): Promise<OrderInfoInterface | null>;
}
