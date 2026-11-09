import { RefundEntity } from '../../domain/entities/refund.entity';

export const REFUND_REPOSITORY = Symbol('REFUND_REPOSITORY');

export interface RefundRepositoryPort {
  save(refund: RefundEntity): Promise<RefundEntity>;
  /**
   * Atomically records a PENDING refund unless the order already has a
   * PENDING or COMPLETED one. Returns false when another refund holds the
   * claim, so concurrent requests can never both reach the gateway.
   */
  claim(refund: RefundEntity): Promise<boolean>;
  findByOrderId(orderId: string): Promise<RefundEntity[]>;
}
