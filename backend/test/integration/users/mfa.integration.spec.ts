import { ConfirmMfaEnrollmentCommand } from '@modules/users/application/commands/confirm-mfa-enrollment.command';
import { ConfirmMfaEnrollmentHandler } from '@modules/users/application/commands/confirm-mfa-enrollment.handler';
import { StartMfaEnrollmentCommand } from '@modules/users/application/commands/start-mfa-enrollment.command';
import { StartMfaEnrollmentHandler } from '@modules/users/application/commands/start-mfa-enrollment.handler';
import { VerifyMfaCommand } from '@modules/users/application/commands/verify-mfa.command';
import { VerifyMfaHandler } from '@modules/users/application/commands/verify-mfa.handler';
import { MfaCodeVerifier } from '@modules/users/application/services/mfa-code-verifier.service';
import { MfaTypeOrmRepository } from '@modules/users/infrastructure/persistence/repositories/mfa.typeorm-repository';
import { base32Decode, hotp, MfaCryptoService } from '@modules/users/infrastructure/services/mfa-crypto.service';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DataSource } from 'typeorm';

import { TestDatabaseHelper } from '../../helpers/test-database.helper';


/**
 * Two-factor persistence against a real PostgreSQL schema (migration, conditional
 * writes under concurrency). Needs a disposable database:
 *   NODE_ENV=test ALLOW_TEST_DATABASE_RESET=true \
 *   TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/tickr_test_mfa npm run test:integration
 */
const describeWithDatabase = process.env.TEST_DATABASE_URL ? describe : describe.skip;

const userId = '00000000-0000-4000-8000-0000000000a1';

describeWithDatabase('Two-factor authentication (PostgreSQL)', () => {
  let db: DataSource;
  let repository: MfaTypeOrmRepository;

  beforeAll(async () => {
    await TestDatabaseHelper.setup();
    db = TestDatabaseHelper.getDataSource();
    repository = new MfaTypeOrmRepository(db);
  });

  afterAll(async () => {
    await TestDatabaseHelper.cleanup();
    await TestDatabaseHelper.teardown();
  });

  beforeEach(async () => {
    await TestDatabaseHelper.cleanup();
    await db.query(
      "INSERT INTO users.users (id,email,password_hash,first_name,last_name,role,email_verified,is_active) VALUES ($1,'admin@test.tn','x','Ada','Admin','ADMIN',true,true)",
      [userId],
    );
  });

  async function enabledWithCodes(hashes = ['a'.repeat(64), 'b'.repeat(64)]): Promise<void> {
    await repository.savePendingSecret(userId, 'pending-1');
    expect(await repository.enable(userId, 'pending-1', 100, hashes)).toBe(true);
  }

  it('keeps one pending secret per account and never replaces an enabled one', async () => {
    expect(await repository.savePendingSecret(userId, 'pending-1')).toBe(true);
    expect(await repository.savePendingSecret(userId, 'pending-2')).toBe(true);
    expect((await repository.getState(userId))?.pendingSecretEncrypted).toBe('pending-2');

    expect(await repository.enable(userId, 'pending-1', 100, [])).toBe(false);
    expect(await repository.enable(userId, 'pending-2', 100, ['a'.repeat(64)])).toBe(true);
    expect(await repository.savePendingSecret(userId, 'attacker')).toBe(false);

    const state = await repository.getState(userId);
    expect(state).toMatchObject({ secretEncrypted: 'pending-2', pendingSecretEncrypted: null, lastUsedStep: 100 });
    expect(state?.enabledAt).toBeInstanceOf(Date);
  });

  it('enables exactly once under concurrent confirmations', async () => {
    await repository.savePendingSecret(userId, 'pending-1');

    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) => repository.enable(userId, 'pending-1', 100 + i, [`${i}`.repeat(64)])),
    );

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await repository.countRemainingRecoveryCodes(userId)).toBe(1);
  });

  it('accepts each TOTP step once, even concurrently, and never an older one', async () => {
    await enabledWithCodes();

    const results = await Promise.all(Array.from({ length: 8 }, () => repository.recordTotpSuccess(userId, 101)));

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await repository.recordTotpSuccess(userId, 101)).toBe(false);
    expect(await repository.recordTotpSuccess(userId, 100)).toBe(false);
    expect(await repository.recordTotpSuccess(userId, 102)).toBe(true);
  });

  it('consumes a recovery code once, even concurrently', async () => {
    await enabledWithCodes();

    const results = await Promise.all(Array.from({ length: 8 }, () => repository.consumeRecoveryCode(userId, 'a'.repeat(64))));

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await repository.countRemainingRecoveryCodes(userId)).toBe(1);
    expect(await repository.consumeRecoveryCode(userId, 'f'.repeat(64))).toBe(false);
  });

  it('counts concurrent failures exactly and locks at the limit', async () => {
    await enabledWithCodes();
    const before = Date.now();

    const results = await Promise.all(Array.from({ length: 7 }, () => repository.recordFailure(userId, 5, 900)));

    const state = await repository.getState(userId);
    expect(state?.failedAttempts).toBe(7);
    expect(results.filter((r) => r.lockedUntil !== null).length).toBeGreaterThanOrEqual(3);
    // Written and read back as the same instant (timezone-safe).
    expect(state!.lockedUntil!.getTime()).toBeGreaterThanOrEqual(before + 899_000);
    expect(state!.lockedUntil!.getTime()).toBeLessThanOrEqual(Date.now() + 900_000);

    await repository.clearFailures(userId);
    expect(await repository.getState(userId)).toMatchObject({ failedAttempts: 0, lockedUntil: null });
  });

  it('replaces recovery codes, resets the factor, and cascades on account deletion', async () => {
    await enabledWithCodes();
    await repository.replaceRecoveryCodes(userId, ['c'.repeat(64), 'd'.repeat(64), 'e'.repeat(64)]);
    expect(await repository.countRemainingRecoveryCodes(userId)).toBe(3);
    expect(await repository.consumeRecoveryCode(userId, 'a'.repeat(64))).toBe(false);

    await repository.reset(userId);
    expect(await repository.getState(userId)).toBeNull();
    expect(await repository.countRemainingRecoveryCodes(userId)).toBe(0);

    await enabledWithCodes();
    await db.query('DELETE FROM users.users WHERE id = $1', [userId]);
    expect(await repository.getState(userId)).toBeNull();
    const [{ n }] = await db.query('SELECT COUNT(*) AS n FROM users.mfa_recovery_codes WHERE user_id = $1', [userId]);
    expect(Number(n)).toBe(0);
  });

  it('runs enrollment and sign-in end to end with real crypto, storing no plaintext', async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const crypto = new MfaCryptoService({
      get: () => undefined,
      getOrThrow: () => 'integration-jwt-secret',
    } as unknown as ConfigService);
    const verifier = new MfaCodeVerifier(repository, crypto);
    const now = new Date();
    const code = (secret: string, offset = 0) => hotp(base32Decode(secret), Math.floor(now.getTime() / 30000) + offset);

    const setup = await new StartMfaEnrollmentHandler(repository, crypto).execute(
      new StartMfaEnrollmentCommand(userId, 'admin@test.tn'),
    );
    const confirmed = await new ConfirmMfaEnrollmentHandler(repository, crypto, verifier).execute(
      new ConfirmMfaEnrollmentCommand(userId, code(setup.value.secret, -1)),
      now,
    );
    const signIn = new VerifyMfaHandler(repository, verifier);
    const totp = await signIn.execute(new VerifyMfaCommand(userId, code(setup.value.secret)), now);
    const recovery = await signIn.execute(new VerifyMfaCommand(userId, undefined, confirmed.value.recoveryCodes[0]), now);

    expect(totp.value).toEqual({ method: 'TOTP', remainingRecoveryCodes: 10 });
    expect(recovery.value).toEqual({ method: 'RECOVERY_CODE', remainingRecoveryCodes: 9 });
    const rows = JSON.stringify(
      await db.query('SELECT m.*, r.code_hash FROM users.user_mfa m JOIN users.mfa_recovery_codes r USING (user_id)'),
    );
    expect(rows).not.toContain(setup.value.secret);
    for (const recoveryCode of confirmed.value.recoveryCodes) expect(rows).not.toContain(recoveryCode);
    jest.restoreAllMocks();
  });
});
