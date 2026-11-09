import { Injectable, Inject, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { UserRole } from '../../domain/value-objects/user-role.vo';
import { UserProfileDto } from '../dtos/user-profile.dto';
import { UserMapper } from '../mappers/user.mapper';
import { ADMIN_ACCOUNT_UNIT_OF_WORK } from '../ports/admin-account-unit-of-work.port';
import type {
  AdminAccountTransactionPort,
  AdminAccountUnitOfWorkPort,
} from '../ports/admin-account-unit-of-work.port';
import { hasOpenObligations } from '../ports/organizer-obligations.port';
import type { OrganizerObligationsInterface } from '../ports/organizer-obligations.port';
import type { UserEntityPort } from '../ports/user.repository.port';

import { ChangeUserRoleCommand } from './change-user-role.command';

/**
 * Error types for ChangeUserRole operation
 */
export type ChangeUserRoleError =
  | { type: 'ACTOR_NOT_AUTHORIZED'; message: string }
  | { type: 'SELF_MODIFICATION'; message: string }
  | { type: 'USER_NOT_FOUND'; message: string }
  | { type: 'LAST_ACTIVE_ADMIN'; message: string }
  | {
      type: 'ORGANIZER_HAS_OPEN_OBLIGATIONS';
      message: string;
      obligations: OrganizerObligationsInterface;
    }
  | { type: 'PERSISTENCE_ERROR'; message: string };

type RoleChange = { readonly previous: UserRole; readonly changed: boolean };

/** ORGANIZER and ADMIN can own events; PARTICIPANT cannot. */
function losesEventOwnership(from: UserRole, to: UserRole): boolean {
  return from !== UserRole.PARTICIPANT && to === UserRole.PARTICIPANT;
}

function obligationsError(
  obligations: OrganizerObligationsInterface,
): ChangeUserRoleError {
  return {
    type: 'ORGANIZER_HAS_OPEN_OBLIGATIONS',
    message:
      'This account still owns open events or unsettled orders/refunds. ' +
      'Close or settle them before removing the organizer role; suspension remains available.',
    obligations,
  };
}

/**
 * Handler for ChangeUserRoleCommand
 *
 * Runs inside the admin account unit of work, so the acting administrator is
 * re-validated against the current database state (not the JWT) and at least
 * one active administrator always remains, even under concurrent requests.
 *
 * Removing the ability to own events is refused while the account still has
 * open obligations. Event creation can run concurrently with this check, so
 * the demotion is verified again after commit and reverted if an obligation
 * appeared in between (event creation performs the mirror check).
 */
@Injectable()
export class ChangeUserRoleHandler {
  private readonly logger = new Logger(ChangeUserRoleHandler.name);

  constructor(
    @Inject(ADMIN_ACCOUNT_UNIT_OF_WORK)
    private readonly unitOfWork: AdminAccountUnitOfWorkPort,
  ) {}

  async execute(
    command: ChangeUserRoleCommand,
  ): Promise<Result<UserProfileDto, ChangeUserRoleError>> {
    if (command.adminId === command.userId) {
      return Result.fail({
        type: 'SELF_MODIFICATION',
        message: 'Administrators cannot change their own role',
      });
    }

    let change: Result<RoleChange, ChangeUserRoleError>;
    try {
      change = await this.unitOfWork.run((tx) => this.applyChange(tx, command));
    } catch (error) {
      return this.persistenceError(error);
    }
    if (change.isFailure) return Result.fail(change.error);

    const { previous, changed } = change.value;
    try {
      if (changed && losesEventOwnership(previous, command.role)) {
        const reverted = await this.revertIfObligationAppeared(command, previous);
        if (reverted) return Result.fail(obligationsError(reverted));
      }
      if (changed) {
        this.logger.log(
          `Admin ${command.adminId} changed role of user ${command.userId}: ${previous} -> ${command.role}`,
        );
      }

      const updated = await this.unitOfWork.run((tx) => tx.findUser(command.userId));
      if (!updated) {
        return Result.fail({
          type: 'USER_NOT_FOUND',
          message: `User with id '${command.userId}' not found`,
        });
      }
      return Result.ok(UserMapper.toProfileDto(updated));
    } catch (error) {
      return this.persistenceError(error);
    }
  }

  private async applyChange(
    tx: AdminAccountTransactionPort,
    command: ChangeUserRoleCommand,
  ): Promise<Result<RoleChange, ChangeUserRoleError>> {
    const actor = await tx.findUser(command.adminId);
    if (!isActiveAdmin(actor)) {
      return Result.fail({
        type: 'ACTOR_NOT_AUTHORIZED',
        message: 'Only an active administrator can change roles',
      });
    }

    const target = await tx.findUser(command.userId);
    if (!target) {
      return Result.fail({
        type: 'USER_NOT_FOUND',
        message: `User with id '${command.userId}' not found`,
      });
    }
    if (target.role === command.role) {
      return Result.ok({ previous: target.role, changed: false });
    }

    if (isActiveAdmin(target) && (await tx.countActiveAdmins()) <= 1) {
      return Result.fail({
        type: 'LAST_ACTIVE_ADMIN',
        message: 'At least one active administrator must remain',
      });
    }

    if (losesEventOwnership(target.role, command.role)) {
      const obligations = await tx.findOrganizerObligations(target.id);
      if (hasOpenObligations(obligations)) return Result.fail(obligationsError(obligations));
    }

    await tx.updateRole(target.id, command.role);
    return Result.ok({ previous: target.role, changed: true });
  }

  /**
   * Re-reads obligations after the demotion committed. If an event was created
   * between the check and the commit, restores the previous role (unless
   * another administrator has changed it since) and returns what was found.
   */
  private async revertIfObligationAppeared(
    command: ChangeUserRoleCommand,
    previous: UserRole,
  ): Promise<OrganizerObligationsInterface | null> {
    return this.unitOfWork.run(async (tx) => {
      const obligations = await tx.findOrganizerObligations(command.userId);
      if (!hasOpenObligations(obligations)) return null;

      const current = await tx.findUser(command.userId);
      if (current?.role === command.role) {
        await tx.updateRole(command.userId, previous);
      }
      this.logger.warn(
        `Demotion of user ${command.userId} reverted: an obligation appeared concurrently`,
      );
      return obligations;
    });
  }

  private persistenceError(error: unknown): Result<never, ChangeUserRoleError> {
    return Result.fail({
      type: 'PERSISTENCE_ERROR',
      message: `Failed to change user role: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

function isActiveAdmin(user: UserEntityPort | null): user is UserEntityPort {
  return Boolean(user && user.isActive && user.role === UserRole.ADMIN);
}
