import { OrderEntity } from '../../domain/entities/order.entity';
import { OrderStatus } from '../../domain/value-objects/order-status.vo';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

/**
 * Back-office order filters
 */
export type OrderSearchFilters = {
  readonly status?: OrderStatus;
  readonly eventId?: string;
  readonly userId?: string;
};

/**
 * Back-office order totals for one status
 */
export type OrderStatusSummary = {
  readonly status: OrderStatus;
  readonly count: number;
  readonly totalAmount: number;
  readonly platformFeeAmount: number;
};

export interface OrderRepositoryPort {
  save(order: OrderEntity): Promise<OrderEntity>;
  findById(id: string): Promise<OrderEntity | null>;
  findByUserId(userId: string, page: number, limit: number): Promise<{ data: OrderEntity[]; total: number }>;
  findByEventId(eventId: string, page: number, limit: number): Promise<{ data: OrderEntity[]; total: number }>;
  findExpired(): Promise<OrderEntity[]>;
  countByUserIdSince(userId: string, since: Date): Promise<number>;
  /**
   * Find order by gateway payment reference (for webhook order lookup)
   * Used by Konnect/Paymee webhooks which receive a payment_ref instead of orderId
   */
  findByGatewayPaymentRef(ref: string): Promise<OrderEntity | null>;
  /**
   * List every order matching the filters, newest first (back office)
   */
  findAll(
    filters: OrderSearchFilters,
    page: number,
    limit: number,
  ): Promise<{ data: OrderEntity[]; total: number }>;
  /**
   * Count and sum orders per status (back office)
   */
  getStatusSummary(): Promise<OrderStatusSummary[]>;
}
