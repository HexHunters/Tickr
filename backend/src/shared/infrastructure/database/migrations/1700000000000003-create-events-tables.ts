import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create Events Tables Migration
 *
 * Creates the events.events and events.ticket_types tables with all required
 * columns, constraints, and indexes per the database schema.
 *
 * Schema: events
 * Tables:
 * - events: Main event aggregate table
 * - ticket_types: Ticket type sub-entity table
 *
 * @see docs/02-technique/03-database-schema.md
 */
export class CreateEventsTables1700000000000003 implements MigrationInterface {
  name = 'CreateEventsTables1700000000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // Create events schema
    // ============================================
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "events"`);

    // ============================================
    // Enable pg_trgm extension for full-text search
    // ============================================
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    // ============================================
    // Create events table
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "events"."events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizer_id" uuid NOT NULL,
        "title" character varying(200) NOT NULL,
        "description" text,
        "category" character varying(50) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'DRAFT',
        "image_url" character varying(500),
        
        -- Location fields (embedded)
        "location_address" text,
        "location_city" character varying(100) NOT NULL,
        "location_country" character varying(100) NOT NULL,
        "location_postal_code" character varying(20),
        "location_lat" decimal(10, 8),
        "location_lng" decimal(11, 8),
        
        -- Date fields
        "start_date" timestamp NOT NULL,
        "end_date" timestamp NOT NULL,
        "is_multi_day" boolean NOT NULL DEFAULT false,
        
        -- Capacity and revenue tracking
        "total_capacity" integer NOT NULL DEFAULT 0,
        "sold_tickets" integer NOT NULL DEFAULT 0,
        "revenue_amount" decimal(12, 3) NOT NULL DEFAULT 0,
        "revenue_currency" character varying(3) NOT NULL DEFAULT 'TND',
        
        -- Timestamps
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "published_at" timestamp,
        "cancelled_at" timestamp,
        "cancellation_reason" text,
        
        CONSTRAINT "PK_events_id" PRIMARY KEY ("id")
      )
    `);

    // ============================================
    // Add check constraints for events
    // ============================================
    
    // Status enum constraint
    await queryRunner.query(`
      ALTER TABLE "events"."events" 
      ADD CONSTRAINT "CHK_events_status" 
      CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'))
    `);

    // Category enum constraint
    await queryRunner.query(`
      ALTER TABLE "events"."events" 
      ADD CONSTRAINT "CHK_events_category" 
      CHECK ("category" IN ('CONCERT', 'CONFERENCE', 'SPORT', 'THEATER', 'WORKSHOP', 'FESTIVAL', 'EXHIBITION', 'NETWORKING', 'COMEDY', 'OTHER'))
    `);

    // Currency enum constraint
    await queryRunner.query(`
      ALTER TABLE "events"."events" 
      ADD CONSTRAINT "CHK_events_currency" 
      CHECK ("revenue_currency" IN ('TND', 'EUR', 'USD'))
    `);

    // Date validation: end date must be after start date
    await queryRunner.query(`
      ALTER TABLE "events"."events" 
      ADD CONSTRAINT "CHK_events_date_range" 
      CHECK ("end_date" > "start_date")
    `);

    // Capacity validation: must be non-negative
    await queryRunner.query(`
      ALTER TABLE "events"."events" 
      ADD CONSTRAINT "CHK_events_capacity" 
      CHECK ("total_capacity" >= 0)
    `);

    // Sold tickets validation: cannot exceed capacity and must be non-negative
    await queryRunner.query(`
      ALTER TABLE "events"."events" 
      ADD CONSTRAINT "CHK_events_sold_tickets" 
      CHECK ("sold_tickets" >= 0 AND "sold_tickets" <= "total_capacity")
    `);

    // Revenue validation: must be non-negative
    await queryRunner.query(`
      ALTER TABLE "events"."events" 
      ADD CONSTRAINT "CHK_events_revenue" 
      CHECK ("revenue_amount" >= 0)
    `);

    // ============================================
    // Create indexes for events table
    // ============================================
    
    // Index for organizer's events (My Events page)
    await queryRunner.query(`
      CREATE INDEX "idx_events_organizer" ON "events"."events" ("organizer_id")
    `);

    // Index for status filtering (common query pattern)
    await queryRunner.query(`
      CREATE INDEX "idx_events_status" ON "events"."events" ("status")
    `);

    // Index for category filtering (browse by category)
    await queryRunner.query(`
      CREATE INDEX "idx_events_category" ON "events"."events" ("category")
    `);

    // Composite index for date-based queries (upcoming events, calendar)
    await queryRunner.query(`
      CREATE INDEX "idx_events_dates" ON "events"."events" ("start_date", "end_date")
    `);

    // Composite index for location-based queries (city + country)
    await queryRunner.query(`
      CREATE INDEX "idx_events_location" ON "events"."events" ("location_city", "location_country")
    `);

    // Index for coordinates (geo-search - future)
    await queryRunner.query(`
      CREATE INDEX "idx_events_coords" ON "events"."events" ("location_lat", "location_lng")
      WHERE "location_lat" IS NOT NULL AND "location_lng" IS NOT NULL
    `);

    // Full-text search index on title using trigram
    await queryRunner.query(`
      CREATE INDEX "idx_events_title_search" ON "events"."events" 
      USING gin("title" gin_trgm_ops)
    `);

    // Composite index for published events queries (most common)
    await queryRunner.query(`
      CREATE INDEX "idx_events_published" ON "events"."events" ("status", "start_date")
      WHERE "status" = 'PUBLISHED'
    `);

    // ============================================
    // Create ticket_types table
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "events"."ticket_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "event_id" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "description" text,
        "price_amount" decimal(10, 3) NOT NULL,
        "price_currency" character varying(3) NOT NULL DEFAULT 'TND',
        "quantity" integer NOT NULL,
        "sold_quantity" integer NOT NULL DEFAULT 0,
        "sales_start" timestamp NOT NULL,
        "sales_end" timestamp NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        
        CONSTRAINT "PK_ticket_types_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ticket_types_event" FOREIGN KEY ("event_id") 
          REFERENCES "events"."events"("id") ON DELETE CASCADE
      )
    `);

    // ============================================
    // Add check constraints for ticket_types
    // ============================================
    
    // Price validation: must be positive
    await queryRunner.query(`
      ALTER TABLE "events"."ticket_types" 
      ADD CONSTRAINT "CHK_ticket_types_price" 
      CHECK ("price_amount" > 0)
    `);

    // Currency enum constraint
    await queryRunner.query(`
      ALTER TABLE "events"."ticket_types" 
      ADD CONSTRAINT "CHK_ticket_types_currency" 
      CHECK ("price_currency" IN ('TND', 'EUR', 'USD'))
    `);

    // Quantity validation: must be positive
    await queryRunner.query(`
      ALTER TABLE "events"."ticket_types" 
      ADD CONSTRAINT "CHK_ticket_types_quantity" 
      CHECK ("quantity" > 0)
    `);

    // Sold quantity validation: must be non-negative and not exceed quantity
    await queryRunner.query(`
      ALTER TABLE "events"."ticket_types" 
      ADD CONSTRAINT "CHK_ticket_types_sold" 
      CHECK ("sold_quantity" >= 0 AND "sold_quantity" <= "quantity")
    `);

    // Sales period validation: end must be after start
    await queryRunner.query(`
      ALTER TABLE "events"."ticket_types" 
      ADD CONSTRAINT "CHK_ticket_types_sales_period" 
      CHECK ("sales_end" > "sales_start")
    `);

    // ============================================
    // Create indexes for ticket_types table
    // ============================================
    
    // Index for event's ticket types (frequent join)
    await queryRunner.query(`
      CREATE INDEX "idx_ticket_types_event" ON "events"."ticket_types" ("event_id")
    `);

    // Composite index for active ticket types on sale
    await queryRunner.query(`
      CREATE INDEX "idx_ticket_types_active" ON "events"."ticket_types" 
      ("event_id", "is_active", "sales_start", "sales_end")
      WHERE "is_active" = true
    `);

    // Index for finding ticket types by sales period
    await queryRunner.query(`
      CREATE INDEX "idx_ticket_types_sales" ON "events"."ticket_types" 
      ("sales_start", "sales_end")
    `);

    // ============================================
    // Add unique constraint: ticket type name per event
    // ============================================
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_ticket_types_name_unique" 
      ON "events"."ticket_types" ("event_id", "name")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // Drop ticket_types table indexes
    // ============================================
    await queryRunner.query(`DROP INDEX IF EXISTS "events"."idx_ticket_types_name_unique"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "events"."idx_ticket_types_sales"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "events"."idx_ticket_types_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "events"."idx_ticket_types_event"`);

    // ============================================
    // Drop ticket_types table constraints
    // ============================================
    await queryRunner.query(`
      ALTER TABLE "events"."ticket_types" 
      DROP CONSTRAINT IF EXISTS "CHK_ticket_types_sales_period"
    `);
    await queryRunner.query(`
      ALTER TABLE "events"."ticket_types" 
      DROP CONSTRAINT IF EXISTS "CHK_ticket_types_sold"
    `);
    await queryRunner.query(`
      ALTER TABLE "events"."ticket_types" 
      DROP CONSTRAINT IF EXISTS "CHK_ticket_types_quantity"
    `);
    await queryRunner.query(`
      ALTER TABLE "events"."ticket_types" 
      DROP CONSTRAINT IF EXISTS "CHK_ticket_types_currency"
    `);
    await queryRunner.query(`
      ALTER TABLE "events"."ticket_types" 
      DROP CONSTRAINT IF EXISTS "CHK_ticket_types_price"
    `);

    // ============================================
    // Drop ticket_types table
    // ============================================
    await queryRunner.query(`DROP TABLE IF EXISTS "events"."ticket_types"`);

    // ============================================
    // Drop events table indexes
    // ============================================
    await queryRunner.query(`DROP INDEX IF EXISTS "events"."idx_events_published"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "events"."idx_events_title_search"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "events"."idx_events_coords"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "events"."idx_events_location"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "events"."idx_events_dates"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "events"."idx_events_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "events"."idx_events_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "events"."idx_events_organizer"`);

    // ============================================
    // Drop events table constraints
    // ============================================
    await queryRunner.query(`
      ALTER TABLE "events"."events" 
      DROP CONSTRAINT IF EXISTS "CHK_events_revenue"
    `);
    await queryRunner.query(`
      ALTER TABLE "events"."events" 
      DROP CONSTRAINT IF EXISTS "CHK_events_sold_tickets"
    `);
    await queryRunner.query(`
      ALTER TABLE "events"."events" 
      DROP CONSTRAINT IF EXISTS "CHK_events_capacity"
    `);
    await queryRunner.query(`
      ALTER TABLE "events"."events" 
      DROP CONSTRAINT IF EXISTS "CHK_events_date_range"
    `);
    await queryRunner.query(`
      ALTER TABLE "events"."events" 
      DROP CONSTRAINT IF EXISTS "CHK_events_currency"
    `);
    await queryRunner.query(`
      ALTER TABLE "events"."events" 
      DROP CONSTRAINT IF EXISTS "CHK_events_category"
    `);
    await queryRunner.query(`
      ALTER TABLE "events"."events" 
      DROP CONSTRAINT IF EXISTS "CHK_events_status"
    `);

    // ============================================
    // Drop events table
    // ============================================
    await queryRunner.query(`DROP TABLE IF EXISTS "events"."events"`);

    // Note: We don't drop the schema or pg_trgm extension
    // as they may be used by other modules
  }
}
