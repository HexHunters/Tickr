import { Inject, Injectable } from '@nestjs/common';

import { ORDER_REPOSITORY } from '../../ports/order.repository.port';
import type { OrderRepositoryPort, OrderStatusSummary } from '../../ports/order.repository.port';

import { GetOrderStatusSummaryQuery } from './get-order-status-summary.query';

/**
 * Handler for GetOrderStatusSummaryQuery
 */
@Injectable()
export class GetOrderStatusSummaryHandler {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepositoryPort,
  ) {}

  async execute(_query: GetOrderStatusSummaryQuery): Promise<OrderStatusSummary[]> {
    return this.orderRepository.getStatusSummary();
  }
}
