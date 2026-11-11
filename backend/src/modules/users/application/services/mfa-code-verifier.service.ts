import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { MFA_CRYPTO } from '../ports/mfa-crypto.port';
import type { MfaCryptoPort } from '../ports/mfa-crypto.port';
import { MFA_REPOSITORY } from '../ports/mfa.repository.port';
import type { MfaRepositoryPort } from '../ports/mfa.repository.port';

/** Consecutive wrong codes before the factor locks. */
export const MFA_MAX_FAILED_ATTEMPTS = 5;
/** Lock duration after too many wrong codes. */
export const MFA_LOCK_SECONDS = 15 * 60;
export const MFA_RECOVERY_CODE_COUNT = 10;

export type MfaMethod = 'TOTP' | 'RECOVERY_CODE';

export type MfaCodeError =
  | { type: 'MFA_NOT_ENROLLED'; message: string }
  | { type: 'INVALID_MFA_CODE'; message: string; attemptsRemaining: number }
  | { type: 'MFA_LOCKED'; message: string; retryAt: Date };

export function lockedError(retryAt: Date): MfaCodeError {
  return {
    type: 'MFA_LOCKED',
    message: 'Too many invalid codes. Try again later.',
    retryAt,
  };
}

/**
 * Checks a second-factor code for an enrolled account.
 *
 * - TOTP codes are accepted once: the step must be newer than the last one,
 *   enforced by a conditional write (no replay, even concurrently).
 * - Recovery codes are single-use (conditional write).
 * - Every wrong code counts; after MFA_MAX_FAILED_ATTEMPTS the factor locks
 *   for MFA_LOCK_SECONDS. A success resets the counter.
 */
@Injectable()
export class MfaCodeVerifier {
  constructor(
    @Inject(MFA_REPOSITORY) private readonly repository: MfaRepositoryPort,
    @Inject(MFA_CRYPTO) private readonly crypto: MfaCryptoPort,
  ) {}

  async verify(
    userId: string,
    input: { code?: string; recoveryCode?: string; allowRecoveryCode?: boolean },
    now: Date = new Date(),
  ): Promise<Result<MfaMethod, MfaCodeError>> {
    const state = await this.repository.getState(userId);
    if (!state?.enabledAt || !state.secretEncrypted) {
      return Result.fail({ type: 'MFA_NOT_ENROLLED', message: 'Two-factor authentication is not set up' });
    }
    if (state.lockedUntil && state.lockedUntil > now) {
      return Result.fail(lockedError(state.lockedUntil));
    }

    let method: MfaMethod | null = null;
    if (input.code) {
      const step = this.crypto.matchTotp(this.crypto.decryptSecret(state.secretEncrypted), input.code, now);
      const isFresh = step !== null && (state.lastUsedStep === null || step > state.lastUsedStep);
      if (isFresh && (await this.repository.recordTotpSuccess(userId, step))) method = 'TOTP';
    } else if (input.recoveryCode && input.allowRecoveryCode !== false) {
      const hash = this.crypto.hashRecoveryCode(input.recoveryCode);
      if (hash && (await this.repository.consumeRecoveryCode(userId, hash))) {
        await this.repository.clearFailures(userId);
        method = 'RECOVERY_CODE';
      }
    }
    if (method) return Result.ok(method);

    return Result.fail(await this.registerFailure(userId, now));
  }

  async registerFailure(userId: string, now: Date = new Date()): Promise<MfaCodeError> {
    const failure = await this.repository.recordFailure(userId, MFA_MAX_FAILED_ATTEMPTS, MFA_LOCK_SECONDS);
    if (failure.lockedUntil && failure.lockedUntil > now) return lockedError(failure.lockedUntil);
    return {
      type: 'INVALID_MFA_CODE',
      message: 'Invalid code',
      attemptsRemaining: Math.max(MFA_MAX_FAILED_ATTEMPTS - failure.failedAttempts, 0),
    };
  }
}
