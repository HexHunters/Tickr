import { ConfirmMfaEnrollmentCommand } from '@modules/users/application/commands/confirm-mfa-enrollment.command';
import { ConfirmMfaEnrollmentHandler } from '@modules/users/application/commands/confirm-mfa-enrollment.handler';
import { RegenerateRecoveryCodesCommand } from '@modules/users/application/commands/regenerate-recovery-codes.command';
import { RegenerateRecoveryCodesHandler } from '@modules/users/application/commands/regenerate-recovery-codes.handler';
import { StartMfaEnrollmentCommand } from '@modules/users/application/commands/start-mfa-enrollment.command';
import { StartMfaEnrollmentHandler } from '@modules/users/application/commands/start-mfa-enrollment.handler';
import { VerifyMfaCommand } from '@modules/users/application/commands/verify-mfa.command';
import { VerifyMfaHandler } from '@modules/users/application/commands/verify-mfa.handler';
import { GetMfaStatusHandler } from '@modules/users/application/queries/get-mfa-status.handler';
import { GetMfaStatusQuery } from '@modules/users/application/queries/get-mfa-status.query';
import {
  MFA_LOCK_SECONDS,
  MFA_MAX_FAILED_ATTEMPTS,
  MfaCodeVerifier,
} from '@modules/users/application/services/mfa-code-verifier.service';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';
import {
  base32Decode,
  hotp,
  MfaCryptoService,
} from '@modules/users/infrastructure/services/mfa-crypto.service';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { InMemoryMfaRepository } from '../../../../helpers/in-memory-mfa.repository';


describe('Two-factor authentication handlers', () => {
  const userId = 'admin-1';
  const crypto = new MfaCryptoService({
    get: () => undefined,
    getOrThrow: () => 'unit-test-jwt-secret',
  } as unknown as ConfigService);
  let repository: InMemoryMfaRepository;
  let clock: Date;
  let start: StartMfaEnrollmentHandler;
  let confirm: ConfirmMfaEnrollmentHandler;
  let verify: VerifyMfaHandler;
  let regenerate: RegenerateRecoveryCodesHandler;

  const step = (at: Date) => Math.floor(at.getTime() / 30000);
  const codeFor = (secret: string, at: Date = clock, offset = 0) =>
    hotp(base32Decode(secret), step(at) + offset);
  const later = (seconds: number) => {
    clock = new Date(clock.getTime() + seconds * 1000);
  };

  async function enroll(): Promise<{ secret: string; recoveryCodes: string[] }> {
    const setup = await start.execute(new StartMfaEnrollmentCommand(userId, 'admin@tickr.tn'));
    const confirmed = await confirm.execute(
      new ConfirmMfaEnrollmentCommand(userId, codeFor(setup.value.secret)),
      clock,
    );
    expect(confirmed.isSuccess).toBe(true);
    return { secret: setup.value.secret, recoveryCodes: confirmed.value.recoveryCodes };
  }

  beforeEach(() => {
    clock = new Date('2026-11-11T09:00:00Z');
    repository = new InMemoryMfaRepository();
    repository.now = () => clock;
    const verifier = new MfaCodeVerifier(repository, crypto);
    start = new StartMfaEnrollmentHandler(repository, crypto);
    confirm = new ConfirmMfaEnrollmentHandler(repository, crypto, verifier);
    verify = new VerifyMfaHandler(repository, verifier);
    regenerate = new RegenerateRecoveryCodesHandler(repository, crypto, verifier);
    for (const level of ['log', 'warn'] as const) jest.spyOn(Logger.prototype, level).mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  describe('enrollment', () => {
    it('returns a QR code and key, and stores the secret encrypted and pending', async () => {
      const setup = await start.execute(new StartMfaEnrollmentCommand(userId, 'admin@tickr.tn'));

      expect(setup.isSuccess).toBe(true);
      expect(setup.value.secret).toMatch(/^[A-Z2-7]{32}$/);
      expect(setup.value.otpauthUri).toContain(`secret=${setup.value.secret}`);
      expect(setup.value.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
      const state = repository.states.get(userId)!;
      expect(state.enabledAt).toBeNull();
      expect(state.pendingSecretEncrypted).not.toContain(setup.value.secret);
      expect(crypto.decryptSecret(state.pendingSecretEncrypted!)).toBe(setup.value.secret);
    });

    it('enables MFA with the first valid code and returns 10 one-time recovery codes', async () => {
      const { recoveryCodes } = await enroll();

      expect(recoveryCodes).toHaveLength(10);
      const state = repository.states.get(userId)!;
      expect(state.enabledAt).toEqual(clock);
      expect(state.pendingSecretEncrypted).toBeNull();
      // Only keyed hashes are stored.
      const stored = repository.codes.get(userId)!.map((c) => c.hash);
      expect(stored).toEqual(recoveryCodes.map((code) => crypto.hashRecoveryCode(code)));
      expect(stored.some((hash) => recoveryCodes.includes(hash))).toBe(false);
    });

    it('refuses a wrong code and counts it', async () => {
      await start.execute(new StartMfaEnrollmentCommand(userId, 'admin@tickr.tn'));

      const result = await confirm.execute(new ConfirmMfaEnrollmentCommand(userId, '000000'), clock);

      expect(result.error).toMatchObject({ type: 'INVALID_MFA_CODE', attemptsRemaining: MFA_MAX_FAILED_ATTEMPTS - 1 });
      expect(repository.states.get(userId)!.enabledAt).toBeNull();
    });

    it('only accepts the latest pending secret after a restart', async () => {
      const first = await start.execute(new StartMfaEnrollmentCommand(userId, 'admin@tickr.tn'));
      await start.execute(new StartMfaEnrollmentCommand(userId, 'admin@tickr.tn'));

      const result = await confirm.execute(new ConfirmMfaEnrollmentCommand(userId, codeFor(first.value.secret)), clock);

      expect(result.error!.type).toBe('INVALID_MFA_CODE');
    });

    it('can never replace an enrolled authenticator from the sign-in flow', async () => {
      await enroll();

      const restart = await start.execute(new StartMfaEnrollmentCommand(userId, 'admin@tickr.tn'));
      const reconfirm = await confirm.execute(new ConfirmMfaEnrollmentCommand(userId, '123456'), clock);

      expect(restart.error!.type).toBe('MFA_ALREADY_ENROLLED');
      expect(reconfirm.error!.type).toBe('MFA_ALREADY_ENROLLED');
    });

    it('requires a started enrollment', async () => {
      const result = await confirm.execute(new ConfirmMfaEnrollmentCommand(userId, '123456'), clock);
      expect(result.error!.type).toBe('MFA_ENROLLMENT_NOT_STARTED');
    });
  });

  describe('sign-in verification', () => {
    it('accepts a current code once, and refuses replays and older codes', async () => {
      const { secret } = await enroll();
      later(60);
      const code = codeFor(secret);

      const first = await verify.execute(new VerifyMfaCommand(userId, code), clock);
      const replay = await verify.execute(new VerifyMfaCommand(userId, code), clock);
      const older = await verify.execute(new VerifyMfaCommand(userId, codeFor(secret, clock, -1)), clock);

      expect(first.value).toEqual({ method: 'TOTP', remainingRecoveryCodes: 10 });
      expect(replay.error!.type).toBe('INVALID_MFA_CODE');
      expect(older.error!.type).toBe('INVALID_MFA_CODE');
    });

    it('refuses the code used to confirm enrollment', async () => {
      const { secret } = await enroll();

      const result = await verify.execute(new VerifyMfaCommand(userId, codeFor(secret)), clock);

      expect(result.error!.type).toBe('INVALID_MFA_CODE');
    });

    it('tolerates one step of clock drift', async () => {
      const { secret } = await enroll();
      later(90);

      const result = await verify.execute(new VerifyMfaCommand(userId, codeFor(secret, clock, 1)), clock);

      expect(result.isSuccess).toBe(true);
    });

    it('accepts each recovery code once, in any case or format', async () => {
      const { recoveryCodes } = await enroll();
      const code = recoveryCodes[3];

      const first = await verify.execute(new VerifyMfaCommand(userId, undefined, code.toLowerCase().replace('-', ' ')), clock);
      const reuse = await verify.execute(new VerifyMfaCommand(userId, undefined, code), clock);

      expect(first.value).toEqual({ method: 'RECOVERY_CODE', remainingRecoveryCodes: 9 });
      expect(reuse.error!.type).toBe('INVALID_MFA_CODE');
    });

    it('locks after too many wrong codes, even for the right code, then recovers', async () => {
      const { secret } = await enroll();
      later(60);
      for (let attempt = 1; attempt < MFA_MAX_FAILED_ATTEMPTS; attempt += 1) {
        const result = await verify.execute(new VerifyMfaCommand(userId, '000000'), clock);
        expect(result.error).toMatchObject({ type: 'INVALID_MFA_CODE', attemptsRemaining: MFA_MAX_FAILED_ATTEMPTS - attempt });
      }
      const locking = await verify.execute(new VerifyMfaCommand(userId, 'ABCDE-FGHJK'.slice(0, 6)), clock);
      expect(locking.error!.type).toBe('MFA_LOCKED');

      const rightButLocked = await verify.execute(new VerifyMfaCommand(userId, codeFor(secret)), clock);
      const recoveryButLocked = await verify.execute(new VerifyMfaCommand(userId, undefined, 'ABCDE-FGHJK'), clock);
      expect(rightButLocked.error!.type).toBe('MFA_LOCKED');
      expect(recoveryButLocked.error!.type).toBe('MFA_LOCKED');

      later(MFA_LOCK_SECONDS + 1);
      const afterLock = await verify.execute(new VerifyMfaCommand(userId, codeFor(secret)), clock);
      expect(afterLock.isSuccess).toBe(true);
      expect(repository.states.get(userId)!.failedAttempts).toBe(0);
    });

    it('locks again on the first failure after a lock expires without a success', async () => {
      await enroll();
      for (let attempt = 0; attempt < MFA_MAX_FAILED_ATTEMPTS; attempt += 1) {
        await verify.execute(new VerifyMfaCommand(userId, '000000'), clock);
      }
      later(MFA_LOCK_SECONDS + 1);

      const result = await verify.execute(new VerifyMfaCommand(userId, '000000'), clock);

      expect(result.error!.type).toBe('MFA_LOCKED');
    });

    it('refuses an account without an enrolled factor', async () => {
      const result = await verify.execute(new VerifyMfaCommand(userId, '123456'), clock);
      expect(result.error!.type).toBe('MFA_NOT_ENROLLED');
    });
  });

  describe('recovery code regeneration', () => {
    it('requires an authenticator code and invalidates the previous codes', async () => {
      const { secret, recoveryCodes } = await enroll();
      later(60);

      const result = await regenerate.execute(new RegenerateRecoveryCodesCommand(userId, codeFor(secret)), clock);
      const oldCode = await verify.execute(new VerifyMfaCommand(userId, undefined, recoveryCodes[0]), clock);
      const newCode = await verify.execute(new VerifyMfaCommand(userId, undefined, result.value.recoveryCodes[0]), clock);

      expect(result.value.recoveryCodes).toHaveLength(10);
      expect(result.value.recoveryCodes).not.toEqual(expect.arrayContaining([recoveryCodes[0]]));
      expect(oldCode.error!.type).toBe('INVALID_MFA_CODE');
      expect(newCode.isSuccess).toBe(true);
    });

    it('does not accept a recovery code as proof', async () => {
      const { recoveryCodes } = await enroll();

      const result = await regenerate.execute(new RegenerateRecoveryCodesCommand(userId, recoveryCodes[0]), clock);

      expect(result.error!.type).toBe('INVALID_MFA_CODE');
      expect(await repository.countRemainingRecoveryCodes(userId)).toBe(10);
    });
  });

  describe('status', () => {
    it('reports enrollment, requirement and remaining codes', async () => {
      const status = new GetMfaStatusHandler(repository);
      expect(await status.execute(new GetMfaStatusQuery(userId, UserRole.ADMIN))).toEqual({
        enabled: false,
        enabledAt: null,
        required: true,
        remainingRecoveryCodes: 0,
      });

      const { recoveryCodes } = await enroll();
      await verify.execute(new VerifyMfaCommand(userId, undefined, recoveryCodes[0]), clock);

      expect(await status.execute(new GetMfaStatusQuery(userId, UserRole.ADMIN))).toMatchObject({
        enabled: true,
        required: true,
        remainingRecoveryCodes: 9,
      });
      expect((await status.execute(new GetMfaStatusQuery(userId, UserRole.PARTICIPANT))).required).toBe(false);
    });
  });
});
