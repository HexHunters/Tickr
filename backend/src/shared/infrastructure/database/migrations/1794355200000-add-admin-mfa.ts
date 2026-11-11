import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Authenticator-app second factor (TOTP) and one-time recovery codes.
 * Secrets are stored encrypted (AES-256-GCM); recovery codes as keyed hashes.
 */
export class AddAdminMfa1794355200000 implements MigrationInterface {
  name = 'AddAdminMfa1794355200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users"."user_mfa" (
        "user_id" uuid NOT NULL,
        "secret_encrypted" text,
        "pending_secret_encrypted" text,
        "enabled_at" TIMESTAMP,
        "last_used_step" integer,
        "failed_attempts" integer NOT NULL DEFAULT 0,
        "locked_until" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_user_mfa" PRIMARY KEY ("user_id"),
        CONSTRAINT "FK_user_mfa_user" FOREIGN KEY ("user_id")
          REFERENCES "users"."users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "users"."mfa_recovery_codes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "code_hash" character varying(64) NOT NULL,
        "used_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_mfa_recovery_codes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_mfa_recovery_codes_user_code" UNIQUE ("user_id", "code_hash"),
        CONSTRAINT "FK_mfa_recovery_codes_user" FOREIGN KEY ("user_id")
          REFERENCES "users"."users"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"."mfa_recovery_codes"`);
    await queryRunner.query(`DROP TABLE "users"."user_mfa"`);
  }
}
