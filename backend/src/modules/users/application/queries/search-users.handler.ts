import { Injectable, Inject } from '@nestjs/common';
import { PaginatedResult } from '@shared/application/interfaces/repository.interface';

import { UserProfileDto } from '../dtos/user-profile.dto';
import { UserMapper } from '../mappers/user.mapper';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';

import { SearchUsersQuery } from './search-users.query';

/**
 * Handler for SearchUsersQuery
 *
 * Follows CQRS pattern - read-only operation with pagination
 */
@Injectable()
export class SearchUsersHandler {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(query: SearchUsersQuery): Promise<PaginatedResult<UserProfileDto>> {
    const result = await this.userRepository.search(query.filters, {
      page: query.page,
      limit: query.limit,
    });

    return {
      ...result,
      data: result.data.map((user) => UserMapper.toProfileDto(user)),
    };
  }
}
