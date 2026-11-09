import { BaseQuery } from '@shared/application/interfaces/query.interface';
import { PaginatedResult } from '@shared/application/interfaces/repository.interface';

import { UserProfileDto } from '../dtos/user-profile.dto';
import { UserSearchFilters } from '../ports/user.repository.port';

/**
 * Back-office query: search users by name/email, role and status
 *
 * Immutable query object following CQRS pattern
 */
export class SearchUsersQuery extends BaseQuery<PaginatedResult<UserProfileDto>> {
  constructor(
    public readonly filters: UserSearchFilters,
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {
    super();
    Object.freeze(this);
  }
}
