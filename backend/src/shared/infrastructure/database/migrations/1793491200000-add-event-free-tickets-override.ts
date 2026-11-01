import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventFreeTicketsOverride1793491200000
  implements MigrationInterface
{
  name = 'AddEventFreeTicketsOverride1793491200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "events"."ticket_types"
      DROP CONSTRAINT "CHK_ticket_types_price",
      ADD CONSTRAINT "CHK_ticket_types_price" CHECK ("price_amount" >= 0)`);
    await queryRunner.query(`ALTER TABLE "events"."events"
      ADD COLUMN "free_tickets_enabled_override" boolean`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "events"."ticket_types"
      DROP CONSTRAINT "CHK_ticket_types_price",
      ADD CONSTRAINT "CHK_ticket_types_price" CHECK ("price_amount" > 0)`);
    await queryRunner.query(`ALTER TABLE "events"."events"
      DROP COLUMN "free_tickets_enabled_override"`);
  }
}
