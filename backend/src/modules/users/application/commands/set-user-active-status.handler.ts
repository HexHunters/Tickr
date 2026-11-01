import { Injectable, Inject, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { UserProfileDto } from '../dtos/user-profile.dto';
import { UserMapper } from '../mappers/user.mapper';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';

import { SetUserActiveStatusCommand } from './set-user-active-status.command';

/**
 * Error types for SetUserActiveStatus operation
 */
export type SetUserActiveStatusError =
  | { type: 'USER_NOT_FOUND'; message: string }
  | { type: 'SELF_MODIFICATION'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Handler for SetUserActiveStatusCommand
 *
 * Suspended accounts can no longer log in or refresh their session.
 * The operation is idempotent.
 */
@Injectable()
export class SetUserActiveStatusHandler {
  private readonly logger = new Logger(SetUserActiveStatusHandler.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
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

    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      return Result.fail({
        type: 'USER_NOT_FOUND',
        message: `User with id '${command.userId}' not found`,
      });
    }

    try {
      if (user.isActive !== command.isActive) {
        await this.userRepository.updateActiveStatus(user.id, command.isActive);
        this.logger.log(
          `Admin ${command.adminId} ${command.isActive ? 'reactivated' : 'suspended'} user ${user.id}`,
        );
      }

      const updated = await this.userRepository.findById(user.id);
      return Result.ok(
        UserMapper.toProfileDto(updated ?? { ...user, isActive: command.isActive }),
      );
    } catch (error) {
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to update account status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
