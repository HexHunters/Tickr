import { BaseCommand } from '@shared/application/interfaces/command.interface';

/**
 * Starts authenticator enrollment (first sign-in of an account that requires MFA)
 */
export class StartMfaEnrollmentCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    /** Shown in the authenticator app next to "Tickr" */
    public readonly accountName: string,
  ) {
    super();
    Object.freeze(this);
  }
}
