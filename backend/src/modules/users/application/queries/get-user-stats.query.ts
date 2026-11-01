import { BaseQuery } from '@shared/application/interfaces/query.interface';

import { UserStats } from '../ports/user.repository.port';

/**
 * Back-office query: aggregate user counters
 */
export class GetUserStatsQuery extends BaseQuery<UserStats> {
  constructor() {
    super();
    Object.freeze(this);
  }
}
