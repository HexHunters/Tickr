import { OrderOrmEntity } from '@modules/payments/infrastructure/persistence/entities/order.orm-entity';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { OrderQueryPort, OrderInfoInterface } from '../../application/ports/order-query.port';

/**
 * Order Query Adapter
 *
 * Infrastructure adapter that implements the OrderQueryPort.
 * Acts as an anti-corruption layer between Tickets and Payments bounded contexts.
 *
 * Design Decisions:
 * - Uses direct TypeORM access to payments.orders table for read-only queries
 * - Only exposes minimal order info needed for ticket confirmation verification
 * - Follows the same pattern as EventQueryAdapter (cross-module TypeORM access)
 */
@Injectable()
export class OrderQueryAdapter implements OrderQueryPort {
  private readonly logger = new Logger(OrderQueryAdapter.name);

  constructor(
    @InjectRepository(OrderOrmEntity)
    private readonly orderRepository: Repository<OrderOrmEntity>,
  ) {}

  async findById(orderId: string): Promise<OrderInfoInterface | null> {
    this.logger.debug(`Querying order: ${orderId}`);

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      select: { id: true, userId: true, status: true },
    });

    if (!order) {
      return null;
    }

    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
    };
  }
}
