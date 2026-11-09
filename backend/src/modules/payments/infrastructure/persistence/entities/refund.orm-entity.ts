import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

import { RefundStatus } from '../../../domain/value-objects/refund-status.vo';

/**
 * Refund TypeORM Entity
 *
 * Maps to the payments.refunds table in PostgreSQL.
 *
 * @see RefundEntity for domain logic
 */
@Entity({ name: 'refunds', schema: 'payments' })
// One open or completed refund per order (see migration AddRefundOpenClaimIndex).
@Index('UQ_refunds_order_open', ['orderId'], {
  unique: true,
  where: `"status" IN ('PENDING', 'COMPLETED')`,
})
export class RefundOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  @Index('idx_refunds_order_id')
  orderId!: string;

  @Column({ name: 'amount_value', type: 'decimal', precision: 12, scale: 3 })
  amountValue!: number;

  @Column({ name: 'amount_currency', type: 'varchar', length: 3 })
  amountCurrency!: string;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'varchar', length: 20, default: RefundStatus.PENDING })
  status!: RefundStatus;

  @Column({ name: 'gateway_refund_id', type: 'varchar', length: 255, nullable: true })
  gatewayRefundId!: string | null;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
