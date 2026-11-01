import { Injectable, Inject, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { UserProfileDto } from '../dtos/user-profile.dto';
import { UserMapper } from '../mappers/user.mapper';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';

import { ChangeUserRoleCommand } from './change-user-role.command';

/**
 * Error types for ChangeUserRole operation
 */
export type ChangeUserRoleError =
  | { type: 'USER_NOT_FOUND'; message: string }
  | { type: 'SELF_MODIFICATION'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Handler for ChangeUserRoleCommand
 *
 * An administrator cannot change their own role, which also guarantees the
 * platform always keeps at least one administrator.
 */
@Injectable()
export class ChangeUserRoleHandler {
  private readonly logger = new Logger(ChangeUserRoleHandler.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
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

    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      return Result.fail({
        type: 'USER_NOT_FOUND',
        message: `User with id '${command.userId}' not found`,
      });
    }

    try {
      if (user.role !== command.role) {
        await this.userRepository.updateRole(user.id, command.role);
        this.logger.log(
          `Admin ${command.adminId} changed role of user ${user.id}: ${user.role} -> ${command.role}`,
        );
      }

      const updated = await this.userRepository.findById(user.id);
      return Result.ok(UserMapper.toProfileDto(updated ?? { ...user, role: command.role }));
    } catch (error) {
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to change user role: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
