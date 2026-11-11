import { BaseCommand } from '@shared/application/interfaces/command.interface';

/**
 * Second sign-in step: a code from the authenticator app or a recovery code
 */
export class VerifyMfaCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly code?: string,
    public readonly recoveryCode?: string,
  ) {
    super();
    Object.freeze(this);
  }
}
