import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';

import type {
  MfaFailureInterface,
  MfaRepositoryPort,
  MfaStateInterface,
} from '../../../application/ports/mfa.repository.port';
import { UserMfaEntity } from '../entities/user-mfa.orm-entity';


type Row = Record<string, unknown>;

/** Rows returned by UPDATE/INSERT … RETURNING (pg driver: [rows, count] for UPDATE). */
function returnedRows(result: unknown): Row[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as Row[];
  return Array.isArray(result) ? (result as Row[]) : [];
}

/**
 * MFA TypeORM Repository
 *
 * Security decisions are single conditional statements (compare-and-set), so
 * two concurrent requests can never both consume the same code or enroll twice.
 * Timestamps that drive decisions are computed by the application and passed
 * as parameters, so they are read back exactly as written.
 */
@Injectable()
export class MfaTypeOrmRepository implements MfaRepositoryPort {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getState(userId: string): Promise<MfaStateInterface | null> {
    const entity = await this.dataSource.manager.findOne(UserMfaEntity, { where: { userId } });
    if (!entity) return null;
    return {
      userId: entity.userId,
      secretEncrypted: entity.secretEncrypted,
      pendingSecretEncrypted: entity.pendingSecretEncrypted,
      enabledAt: entity.enabledAt,
      lastUsedStep: entity.lastUsedStep,
      failedAttempts: entity.failedAttempts,
      lockedUntil: entity.lockedUntil,
    };
  }

  async savePendingSecret(userId: string, secretEncrypted: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `INSERT INTO "users"."user_mfa" ("user_id", "pending_secret_encrypted")
       VALUES ($1, $2)
       ON CONFLICT ("user_id") DO UPDATE
         SET "pending_secret_encrypted" = EXCLUDED."pending_secret_encrypted", "updated_at" = now()
         WHERE "user_mfa"."enabled_at" IS NULL
       RETURNING "user_id"`,
      [userId, secretEncrypted],
    );
    return returnedRows(result).length > 0;
  }

  enable(
    userId: string,
    expectedPendingSecret: string,
    acceptedStep: number,
    recoveryCodeHashes: string[],
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const result = await manager.query(
        `UPDATE "users"."user_mfa"
           SET "secret_encrypted" = "pending_secret_encrypted",
               "pending_secret_encrypted" = NULL,
               "enabled_at" = now(),
               "last_used_step" = $3,
               "failed_attempts" = 0,
               "locked_until" = NULL,
               "updated_at" = now()
         WHERE "user_id" = $1 AND "enabled_at" IS NULL AND "pending_secret_encrypted" = $2
         RETURNING "user_id"`,
        [userId, expectedPendingSecret, acceptedStep],
      );
      if (returnedRows(result).length === 0) return false;
      await this.writeRecoveryCodes(manager, userId, recoveryCodeHashes);
      return true;
    });
  }

  async recordTotpSuccess(userId: string, step: number): Promise<boolean> {
    const result = await this.dataSource.query(
      `UPDATE "users"."user_mfa"
         SET "last_used_step" = $2, "failed_attempts" = 0, "locked_until" = NULL, "updated_at" = now()
       WHERE "user_id" = $1 AND "enabled_at" IS NOT NULL
         AND ("last_used_step" IS NULL OR "last_used_step" < $2)
       RETURNING "user_id"`,
      [userId, step],
    );
    return returnedRows(result).length > 0;
  }

  async consumeRecoveryCode(userId: string, codeHash: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `UPDATE "users"."mfa_recovery_codes" SET "used_at" = now()
       WHERE "user_id" = $1 AND "code_hash" = $2 AND "used_at" IS NULL
       RETURNING "id"`,
      [userId, codeHash],
    );
    return returnedRows(result).length > 0;
  }

  async clearFailures(userId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE "users"."user_mfa" SET "failed_attempts" = 0, "locked_until" = NULL, "updated_at" = now()
       WHERE "user_id" = $1`,
      [userId],
    );
  }

  async recordFailure(
    userId: string,
    maxAttempts: number,
    lockSeconds: number,
  ): Promise<MfaFailureInterface> {
    const lockUntil = new Date(Date.now() + lockSeconds * 1000);
    const result = await this.dataSource.query(
      `UPDATE "users"."user_mfa"
         SET "failed_attempts" = "failed_attempts" + 1,
             "locked_until" = CASE WHEN "failed_attempts" + 1 >= $2 THEN $3 ELSE "locked_until" END,
             "updated_at" = now()
       WHERE "user_id" = $1
       RETURNING "failed_attempts", "locked_until"`,
      [userId, maxAttempts, lockUntil],
    );
    const [row] = returnedRows(result);
    return {
      failedAttempts: Number(row?.failed_attempts ?? 0),
      lockedUntil: row?.locked_until ? new Date(row.locked_until as string | Date) : null,
    };
  }

  replaceRecoveryCodes(userId: string, codeHashes: string[]): Promise<void> {
    return this.dataSource.transaction((manager) =>
      this.writeRecoveryCodes(manager, userId, codeHashes),
    );
  }

  async countRemainingRecoveryCodes(userId: string): Promise<number> {
    const [row] = await this.dataSource.query(
      `SELECT COUNT(*) AS "remaining" FROM "users"."mfa_recovery_codes"
       WHERE "user_id" = $1 AND "used_at" IS NULL`,
      [userId],
    );
    return Number(row?.remaining ?? 0);
  }

  async reset(userId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.query(`DELETE FROM "users"."mfa_recovery_codes" WHERE "user_id" = $1`, [userId]);
      await manager.query(`DELETE FROM "users"."user_mfa" WHERE "user_id" = $1`, [userId]);
    });
  }

  private async writeRecoveryCodes(
    manager: EntityManager,
    userId: string,
    codeHashes: string[],
  ): Promise<void> {
    await manager.query(`DELETE FROM "users"."mfa_recovery_codes" WHERE "user_id" = $1`, [userId]);
    for (const hash of codeHashes) {
      await manager.query(
        `INSERT INTO "users"."mfa_recovery_codes" ("user_id", "code_hash") VALUES ($1, $2)`,
        [userId, hash],
      );
    }
  }
}
