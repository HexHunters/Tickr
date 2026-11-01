import { BaseCommand } from '@shared/application/interfaces/command.interface';

/**
 * Command for an administrator to suspend or reactivate a user account
 *
 * Immutable command object following CQRS pattern
 */
export class SetUserActiveStatusCommand extends BaseCommand {
  constructor(
    public readonly adminId: string,
    public readonly userId: string,
    public readonly isActive: boolean,
  ) {
    super();
    Object.freeze(this);
  }
}
