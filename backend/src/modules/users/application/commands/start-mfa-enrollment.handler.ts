import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { MFA_CRYPTO } from '../ports/mfa-crypto.port';
import type { MfaCryptoPort } from '../ports/mfa-crypto.port';
import { MFA_REPOSITORY } from '../ports/mfa.repository.port';
import type { MfaRepositoryPort } from '../ports/mfa.repository.port';

import { StartMfaEnrollmentCommand } from './start-mfa-enrollment.command';


export type MfaEnrollmentSetup = {
  /** Base32 key, for manual entry when the QR code cannot be scanned */
  readonly secret: string;
  readonly otpauthUri: string;
  readonly qrCodeDataUrl: string;
};

export type StartMfaEnrollmentError = { type: 'MFA_ALREADY_ENROLLED'; message: string };

/**
 * Handler for StartMfaEnrollmentCommand
 *
 * Generates a new secret and keeps it pending until the user proves it with a
 * code. Calling it again (page reload) replaces the pending secret. Once MFA
 * is enabled it can never be replaced from here: a password alone must not be
 * enough to swap an administrator's authenticator.
 */
@Injectable()
export class StartMfaEnrollmentHandler {
  constructor(
    @Inject(MFA_REPOSITORY) private readonly repository: MfaRepositoryPort,
    @Inject(MFA_CRYPTO) private readonly crypto: MfaCryptoPort,
  ) {}

  async execute(
    command: StartMfaEnrollmentCommand,
  ): Promise<Result<MfaEnrollmentSetup, StartMfaEnrollmentError>> {
    const alreadyEnrolled: StartMfaEnrollmentError = {
      type: 'MFA_ALREADY_ENROLLED',
      message: 'Two-factor authentication is already set up',
    };
    const state = await this.repository.getState(command.userId);
    if (state?.enabledAt) return Result.fail(alreadyEnrolled);

    const secret = this.crypto.generateSecret();
    const saved = await this.repository.savePendingSecret(
      command.userId,
      this.crypto.encryptSecret(secret),
    );
    if (!saved) return Result.fail(alreadyEnrolled);

    const otpauthUri = this.crypto.buildOtpauthUri(command.accountName, secret);
    return Result.ok({
      secret,
      otpauthUri,
      qrCodeDataUrl: await this.crypto.renderQrCode(otpauthUri),
    });
  }
}
