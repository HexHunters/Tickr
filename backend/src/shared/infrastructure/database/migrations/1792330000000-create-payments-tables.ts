import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentsTables1792330000000 implements MigrationInterface {
  name = 'CreatePaymentsTables1792330000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "payments"`);

    await queryRunner.query(`
      CREATE TABLE "payments"."orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "event_id" uuid NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'PENDING',
        "payment_method" character varying(20),
        "payment_gateway_order_id" character varying(255),
        "payment_intent_id" character varying(255),
        "gateway_payment_ref" character varying(255),
        "transaction_id" character varying(255),
        "subtotal_amount" numeric(12,3) NOT NULL,
        "platform_fee_amount" numeric(12,3) NOT NULL,
        "payment_fees_amount" numeric(12,3) NOT NULL DEFAULT 0,
        "total_amount" numeric(12,3) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'TND',
        "paid_at" TIMESTAMP,
        "refunded_at" TIMESTAMP,
        "refund_reason" text,
        "expires_at" TIMESTAMP NOT NULL,
        "metadata" jsonb,
        "status_history" jsonb NOT NULL DEFAULT '[]',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments_orders" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_orders_user_id" ON "payments"."orders" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_event_id" ON "payments"."orders" ("event_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_status" ON "payments"."orders" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_expires_at" ON "payments"."orders" ("expires_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "payments"."order_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "ticket_type_id" uuid NOT NULL,
        "ticket_type_name" character varying(200) NOT NULL,
        "price_amount" numeric(12,3) NOT NULL,
        "price_currency" character varying(3) NOT NULL,
        "quantity" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments_order_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_order_items_order" FOREIGN KEY ("order_id")
          REFERENCES "payments"."orders"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_order_items_order_id" ON "payments"."order_items" ("order_id")`,
    );

    // Payment attempts and refunds are financial records: deleting an order must not erase them.
    await queryRunner.query(`
      CREATE TABLE "payments"."payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "amount_value" numeric(12,3) NOT NULL,
        "amount_currency" character varying(3) NOT NULL,
        "provider" character varying(20) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'PENDING',
        "gateway_response" jsonb,
        "gateway_payment_ref" character varying(255),
        "payment_url" text,
        "client_secret" character varying(255),
        "error_code" character varying(100),
        "error_message" text,
        "attempt_number" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payments_order" FOREIGN KEY ("order_id")
          REFERENCES "payments"."orders"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_payments_order_id" ON "payments"."payments" ("order_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "payments"."refunds" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "amount_value" numeric(12,3) NOT NULL,
        "amount_currency" character varying(3) NOT NULL,
        "reason" text NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'PENDING',
        "gateway_refund_id" character varying(255),
        "processed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments_refunds" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refunds_order" FOREIGN KEY ("order_id")
          REFERENCES "payments"."orders"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_refunds_order_id" ON "payments"."refunds" ("order_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"."refunds"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"."payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"."order_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"."orders"`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS "payments"`);
  }
}
