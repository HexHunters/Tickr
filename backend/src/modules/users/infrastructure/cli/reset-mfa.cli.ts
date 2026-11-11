import { Logger } from '@nestjs/common';
import { AppDataSource } from '@shared/infrastructure/database/data-source';

/**
 * Operator recovery for an account that lost both its authenticator and its
 * recovery codes: removes the second factor so the next sign-in enrolls a new
 * one. Requires database access; there is deliberately no HTTP route for it.
 *
 *   npm run mfa:reset -- admin@example.com
 *   node dist/modules/users/infrastructure/cli/reset-mfa.cli.js admin@example.com
 */
async function main(): Promise<void> {
  const logger = new Logger('MfaReset');
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    logger.error('Usage: npm run mfa:reset -- <email>');
    process.exitCode = 2;
    return;
  }

  await AppDataSource.initialize();
  try {
    const [user] = await AppDataSource.query(
      'SELECT "id", "role" FROM "users"."users" WHERE "email" = $1',
      [email],
    );
    if (!user) {
      logger.error(`No account for ${email}`);
      process.exitCode = 1;
      return;
    }
    await AppDataSource.transaction(async (manager) => {
      await manager.query('DELETE FROM "users"."mfa_recovery_codes" WHERE "user_id" = $1', [user.id]);
      await manager.query('DELETE FROM "users"."user_mfa" WHERE "user_id" = $1', [user.id]);
    });
    logger.warn(
      `Two-factor authentication reset for ${email} (${user.role}). The next sign-in will enroll a new authenticator.`,
    );
  } finally {
    await AppDataSource.destroy();
  }
}

void main();
