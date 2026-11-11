import { BaseCommand } from '@shared/application/interfaces/command.interface';

/**
 * Replaces all recovery codes; requires a current authenticator code
 */
export class RegenerateRecoveryCodesCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly code: string,
  ) {
    super();
    Object.freeze(this);
  }
}
