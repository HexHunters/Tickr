import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { OrderStatusSummary } from '../../ports/order.repository.port';

/**
 * Back-office query: order counts and amounts per status
 */
export class GetOrderStatusSummaryQuery extends BaseQuery<OrderStatusSummary[]> {
  constructor() {
    super();
    Object.freeze(this);
  }
}
