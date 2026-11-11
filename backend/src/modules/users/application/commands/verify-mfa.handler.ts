import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { MFA_REPOSITORY } from '../ports/mfa.repository.port';
import type { MfaRepositoryPort } from '../ports/mfa.repository.port';
import { MfaCodeVerifier } from '../services/mfa-code-verifier.service';
import type { MfaCodeError, MfaMethod } from '../services/mfa-code-verifier.service';

import { VerifyMfaCommand } from './verify-mfa.command';


export type VerifyMfaResult = {
  readonly method: MfaMethod;
  readonly remainingRecoveryCodes: number;
};

/**
 * Handler for VerifyMfaCommand
 */
@Injectable()
export class VerifyMfaHandler {
  private readonly logger = new Logger(VerifyMfaHandler.name);

  constructor(
    @Inject(MFA_REPOSITORY) private readonly repository: MfaRepositoryPort,
    private readonly verifier: MfaCodeVerifier,
  ) {}

  async execute(
    command: VerifyMfaCommand,
    now: Date = new Date(),
  ): Promise<Result<VerifyMfaResult, MfaCodeError>> {
    const result = await this.verifier.verify(
      command.userId,
      { code: command.code, recoveryCode: command.recoveryCode },
      now,
    );
    if (result.isFailure) {
      if (result.error.type === 'MFA_LOCKED') {
        this.logger.warn(`Two-factor sign-in locked for user ${command.userId}`);
      }
      return Result.fail(result.error);
    }

    const remainingRecoveryCodes = await this.repository.countRemainingRecoveryCodes(command.userId);
    if (result.value === 'RECOVERY_CODE') {
      this.logger.warn(
        `User ${command.userId} signed in with a recovery code (${remainingRecoveryCodes} left)`,
      );
    }
    return Result.ok({ method: result.value, remainingRecoveryCodes });
  }
}
