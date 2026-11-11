import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { MFA_CRYPTO } from '../ports/mfa-crypto.port';
import type { MfaCryptoPort } from '../ports/mfa-crypto.port';
import { MFA_REPOSITORY } from '../ports/mfa.repository.port';
import type { MfaRepositoryPort } from '../ports/mfa.repository.port';
import { MFA_RECOVERY_CODE_COUNT, MfaCodeVerifier } from '../services/mfa-code-verifier.service';
import type { MfaCodeError } from '../services/mfa-code-verifier.service';

import { RegenerateRecoveryCodesCommand } from './regenerate-recovery-codes.command';


/**
 * Handler for RegenerateRecoveryCodesCommand
 *
 * Requires a code from the authenticator app (not a recovery code): whoever
 * replaces the codes must hold the actual second factor. Previous codes stop
 * working immediately.
 */
@Injectable()
export class RegenerateRecoveryCodesHandler {
  private readonly logger = new Logger(RegenerateRecoveryCodesHandler.name);

  constructor(
    @Inject(MFA_REPOSITORY) private readonly repository: MfaRepositoryPort,
    @Inject(MFA_CRYPTO) private readonly crypto: MfaCryptoPort,
    private readonly verifier: MfaCodeVerifier,
  ) {}

  async execute(
    command: RegenerateRecoveryCodesCommand,
    now: Date = new Date(),
  ): Promise<Result<{ recoveryCodes: string[] }, MfaCodeError>> {
    const verified = await this.verifier.verify(
      command.userId,
      { code: command.code, allowRecoveryCode: false },
      now,
    );
    if (verified.isFailure) return Result.fail(verified.error);

    const recoveryCodes = this.crypto.generateRecoveryCodes(MFA_RECOVERY_CODE_COUNT);
    await this.repository.replaceRecoveryCodes(
      command.userId,
      recoveryCodes.map((code) => this.crypto.hashRecoveryCode(code)!),
    );
    this.logger.log(`Recovery codes regenerated for user ${command.userId}`);
    return Result.ok({ recoveryCodes });
  }
}
