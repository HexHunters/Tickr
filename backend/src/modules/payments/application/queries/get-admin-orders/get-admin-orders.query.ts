import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { PaginatedAdminOrdersDto } from '../../dtos/order.dto';
import type { OrderSearchFilters } from '../../ports/order.repository.port';

/**
 * Back-office query: every order matching the filters, newest first
 */
export class GetAdminOrdersQuery extends BaseQuery<PaginatedAdminOrdersDto> {
  constructor(
    public readonly filters: OrderSearchFilters,
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {
    super();
    Object.freeze(this);
  }
}
