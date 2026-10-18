import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnalyticsTables1792330000001 implements MigrationInterface {
  name = 'CreateAnalyticsTables1792330000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "analytics"`);

    await queryRunner.query(`
      CREATE TABLE "analytics"."metrics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "metric_type" character varying(30) NOT NULL,
        "entity_id" uuid NOT NULL,
        "entity_type" character varying(20) NOT NULL,
        "value" numeric(15,3) NOT NULL,
        "unit" character varying(20),
        "dimensions" jsonb,
        "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_analytics_metrics" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_metrics_metric_type" ON "analytics"."metrics" ("metric_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_metrics_entity_id" ON "analytics"."metrics" ("entity_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_metrics_timestamp" ON "analytics"."metrics" ("timestamp")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_metrics_metric_type_timestamp" ON "analytics"."metrics" ("metric_type", "timestamp")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_metrics_entity_id_type" ON "analytics"."metrics" ("entity_id", "entity_type")`,
    );

    await queryRunner.query(`
      CREATE TABLE "analytics"."event_analytics" (
        "event_id" uuid NOT NULL,
        "total_revenue" numeric(15,3) NOT NULL DEFAULT 0,
        "currency" character varying(3) NOT NULL DEFAULT 'TND',
        "total_tickets_sold" integer NOT NULL DEFAULT 0,
        "total_capacity" integer NOT NULL DEFAULT 0,
        "check_in_count" integer NOT NULL DEFAULT 0,
        "conversion_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "average_ticket_price" numeric(12,3) NOT NULL DEFAULT 0,
        "top_selling_ticket_type" character varying(255),
        "sales_by_day" jsonb NOT NULL DEFAULT '[]',
        "check_ins_by_hour" jsonb NOT NULL DEFAULT '[]',
        "last_updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_analytics_event_analytics" PRIMARY KEY ("event_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_event_analytics_last_updated" ON "analytics"."event_analytics" ("last_updated")`,
    );

    await queryRunner.query(`
      CREATE TABLE "analytics"."platform_analytics" (
        "id" character varying(100) NOT NULL,
        "period_start" TIMESTAMP WITH TIME ZONE NOT NULL,
        "period_end" TIMESTAMP WITH TIME ZONE NOT NULL,
        "total_revenue" numeric(15,3) NOT NULL DEFAULT 0,
        "currency" character varying(3) NOT NULL DEFAULT 'TND',
        "platform_commission" numeric(15,3) NOT NULL DEFAULT 0,
        "total_events" integer NOT NULL DEFAULT 0,
        "total_tickets_sold" integer NOT NULL DEFAULT 0,
        "active_users" integer NOT NULL DEFAULT 0,
        "conversion_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "revenue_by_category" jsonb NOT NULL DEFAULT '[]',
        "top_events" jsonb NOT NULL DEFAULT '[]',
        "last_updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_analytics_platform_analytics" PRIMARY KEY ("id"),
        CONSTRAINT "uq_platform_analytics_period" UNIQUE ("period_start", "period_end")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_platform_analytics_period" ON "analytics"."platform_analytics" ("period_start")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "analytics"."platform_analytics"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "analytics"."event_analytics"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "analytics"."metrics"`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS "analytics"`);
  }
}
