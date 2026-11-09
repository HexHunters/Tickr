import { Injectable, Inject, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { UserRole } from '../../domain/value-objects/user-role.vo';
import { UserProfileDto } from '../dtos/user-profile.dto';
import { UserMapper } from '../mappers/user.mapper';
import { ADMIN_ACCOUNT_UNIT_OF_WORK } from '../ports/admin-account-unit-of-work.port';
import type { AdminAccountUnitOfWorkPort } from '../ports/admin-account-unit-of-work.port';
import type { UserEntityPort } from '../ports/user.repository.port';

import { SetUserActiveStatusCommand } from './set-user-active-status.command';

/**
 * Error types for SetUserActiveStatus operation
 */
export type SetUserActiveStatusError =
  | { type: 'ACTOR_NOT_AUTHORIZED'; message: string }
  | { type: 'SELF_MODIFICATION'; message: string }
  | { type: 'USER_NOT_FOUND'; message: string }
  | { type: 'LAST_ACTIVE_ADMIN'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Handler for SetUserActiveStatusCommand
 *
 * Suspended accounts can no longer log in or refresh their session. Suspension
 * is an emergency measure: it applies even when the account owns open events,
 * whose handling stays with administrators.
 *
 * Shares the admin account unit of work with role changes: the actor is
 * re-validated inside the lock and the last active administrator can never be
 * suspended, even by concurrent or stale-token requests. Idempotent.
 */
@Injectable()
export class SetUserActiveStatusHandler {
  private readonly logger = new Logger(SetUserActiveStatusHandler.name);

  constructor(
    @Inject(ADMIN_ACCOUNT_UNIT_OF_WORK)
    private readonly unitOfWork: AdminAccountUnitOfWorkPort,
  ) {}

  async execute(
    command: SetUserActiveStatusCommand,
  ): Promise<Result<UserProfileDto, SetUserActiveStatusError>> {
    if (command.adminId === command.userId) {
      return Result.fail({
        type: 'SELF_MODIFICATION',
        message: 'Administrators cannot suspend their own account',
      });
    }

    try {
      return await this.unitOfWork.run(async (tx) => {
        const actor = await tx.findUser(command.adminId);
        if (!isActiveAdmin(actor)) {
          return Result.fail({
            type: 'ACTOR_NOT_AUTHORIZED',
            message: 'Only an active administrator can change account status',
          });
        }

        const target = await tx.findUser(command.userId);
        if (!target) {
          return Result.fail({
            type: 'USER_NOT_FOUND',
            message: `User with id '${command.userId}' not found`,
          });
        }
        if (target.isActive === command.isActive) {
          return Result.ok(UserMapper.toProfileDto(target));
        }

        if (!command.isActive && isActiveAdmin(target) && (await tx.countActiveAdmins()) <= 1) {
          return Result.fail({
            type: 'LAST_ACTIVE_ADMIN',
            message: 'At least one active administrator must remain',
          });
        }

        await tx.updateActiveStatus(target.id, command.isActive);
        this.logger.log(
          `Admin ${command.adminId} ${command.isActive ? 'reactivated' : 'suspended'} user ${target.id}`,
        );
        return Result.ok(
          UserMapper.toProfileDto({ ...target, isActive: command.isActive, updatedAt: new Date() }),
        );
      });
    } catch (error) {
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to update account status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}

function isActiveAdmin(user: UserEntityPort | null): user is UserEntityPort {
  return Boolean(user && user.isActive && user.role === UserRole.ADMIN);
}
