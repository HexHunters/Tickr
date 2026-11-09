import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * At most one open (PENDING) or COMPLETED refund per order. The refund
 * handler inserts its PENDING claim against this index before calling the
 * gateway, so concurrent refund requests cannot both refund the buyer.
 * FAILED refunds are excluded so a declined refund can be retried.
 */
export class AddRefundOpenClaimIndex1794182400000 implements MigrationInterface {
  name = 'AddRefundOpenClaimIndex1794182400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_refunds_order_open"
      ON "payments"."refunds" ("order_id")
      WHERE "status" IN ('PENDING', 'COMPLETED')`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "payments"."UQ_refunds_order_open"`);
  }
}
