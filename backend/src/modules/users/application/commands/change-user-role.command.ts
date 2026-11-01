import { BaseCommand } from '@shared/application/interfaces/command.interface';

import { UserRole } from '../../domain/value-objects/user-role.vo';

/**
 * Command for an administrator to change another user's role
 *
 * Immutable command object following CQRS pattern
 */
export class ChangeUserRoleCommand extends BaseCommand {
  constructor(
    public readonly adminId: string,
    public readonly userId: string,
    public readonly role: UserRole,
  ) {
    super();
    Object.freeze(this);
  }
}
