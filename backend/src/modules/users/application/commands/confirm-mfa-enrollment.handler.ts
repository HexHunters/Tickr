import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { MFA_CRYPTO } from '../ports/mfa-crypto.port';
import type { MfaCryptoPort } from '../ports/mfa-crypto.port';
import { MFA_REPOSITORY } from '../ports/mfa.repository.port';
import type { MfaRepositoryPort } from '../ports/mfa.repository.port';
import { lockedError, MFA_RECOVERY_CODE_COUNT, MfaCodeVerifier } from '../services/mfa-code-verifier.service';
import type { MfaCodeError } from '../services/mfa-code-verifier.service';

import { ConfirmMfaEnrollmentCommand } from './confirm-mfa-enrollment.command';


export type ConfirmMfaEnrollmentError =
  | { type: 'MFA_ALREADY_ENROLLED'; message: string }
  | { type: 'MFA_ENROLLMENT_NOT_STARTED'; message: string }
  | MfaCodeError;

/**
 * Handler for ConfirmMfaEnrollmentCommand
 *
 * Enables MFA only when the code matches the pending secret, then returns
 * the one-time recovery codes. They are shown once; only keyed hashes are kept.
 */
@Injectable()
export class ConfirmMfaEnrollmentHandler {
  private readonly logger = new Logger(ConfirmMfaEnrollmentHandler.name);

  constructor(
    @Inject(MFA_REPOSITORY) private readonly repository: MfaRepositoryPort,
    @Inject(MFA_CRYPTO) private readonly crypto: MfaCryptoPort,
    private readonly verifier: MfaCodeVerifier,
  ) {}

  async execute(
    command: ConfirmMfaEnrollmentCommand,
    now: Date = new Date(),
  ): Promise<Result<{ recoveryCodes: string[] }, ConfirmMfaEnrollmentError>> {
    const state = await this.repository.getState(command.userId);
    if (state?.enabledAt) {
      return Result.fail({ type: 'MFA_ALREADY_ENROLLED', message: 'Two-factor authentication is already set up' });
    }
    if (!state?.pendingSecretEncrypted) {
      return Result.fail({ type: 'MFA_ENROLLMENT_NOT_STARTED', message: 'Start the enrollment first' });
    }
    if (state.lockedUntil && state.lockedUntil > now) {
      return Result.fail(lockedError(state.lockedUntil));
    }

    const step = this.crypto.matchTotp(
      this.crypto.decryptSecret(state.pendingSecretEncrypted),
      command.code,
      now,
    );
    if (step === null) {
      return Result.fail(await this.verifier.registerFailure(command.userId, now));
    }

    const recoveryCodes = this.crypto.generateRecoveryCodes(MFA_RECOVERY_CODE_COUNT);
    const enabled = await this.repository.enable(
      command.userId,
      state.pendingSecretEncrypted,
      step,
      recoveryCodes.map((code) => this.crypto.hashRecoveryCode(code)!),
    );
    if (!enabled) {
      return Result.fail({ type: 'MFA_ALREADY_ENROLLED', message: 'Two-factor authentication is already set up' });
    }

    this.logger.log(`Two-factor authentication enabled for user ${command.userId}`);
    return Result.ok({ recoveryCodes });
  }
}
