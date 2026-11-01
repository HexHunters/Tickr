import { Injectable, Inject } from '@nestjs/common';

import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort, UserStats } from '../ports/user.repository.port';

import { GetUserStatsQuery } from './get-user-stats.query';

/**
 * Handler for GetUserStatsQuery
 */
@Injectable()
export class GetUserStatsHandler {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(_query: GetUserStatsQuery): Promise<UserStats> {
    return this.userRepository.getStats();
  }
}
