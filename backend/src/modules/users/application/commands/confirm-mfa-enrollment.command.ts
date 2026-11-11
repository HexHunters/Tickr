import { BaseCommand } from '@shared/application/interfaces/command.interface';

/**
 * Confirms authenticator enrollment with a code from the newly added app
 */
export class ConfirmMfaEnrollmentCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly code: string,
  ) {
    super();
    Object.freeze(this);
  }
}
