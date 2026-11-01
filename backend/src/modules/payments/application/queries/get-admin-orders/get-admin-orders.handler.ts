import { Inject, Injectable } from '@nestjs/common';

import type { OrderEntity } from '../../../domain/entities/order.entity';
import type { AdminOrderDto, PaginatedAdminOrdersDto } from '../../dtos/order.dto';
import { PAYMENT_EVENT_QUERY_PORT } from '../../ports/event-query.port';
import type { PaymentEventQueryPort } from '../../ports/event-query.port';
import { ORDER_REPOSITORY } from '../../ports/order.repository.port';
import type { OrderRepositoryPort } from '../../ports/order.repository.port';

import { GetAdminOrdersQuery } from './get-admin-orders.query';


/**
 * Handler for GetAdminOrdersQuery
 *
 * Buyer identity comes from the holder captured at checkout; event titles
 * are resolved once per distinct event on the page.
 */
@Injectable()
export class GetAdminOrdersHandler {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepositoryPort,
    @Inject(PAYMENT_EVENT_QUERY_PORT)
    private readonly eventQuery: PaymentEventQueryPort,
  ) {}

  async execute(query: GetAdminOrdersQuery): Promise<PaginatedAdminOrdersDto> {
    const { data, total } = await this.orderRepository.findAll(
      query.filters,
      query.page,
      query.limit,
    );

    const eventIds = [...new Set(data.map((order) => order.eventId))];
    const events = await Promise.all(
      eventIds.map((id) => this.eventQuery.getEventById(id).catch(() => null)),
    );
    const titles = new Map(
      events.flatMap((event) => (event ? [[event.id, event.title] as const] : [])),
    );

    return {
      data: data.map((order) => this.toDto(order, titles.get(order.eventId) ?? null)),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  private toDto(order: OrderEntity, eventTitle: string | null): AdminOrderDto {
    const metadata = order.metadata ?? {};
    const text = (key: string) =>
      typeof metadata[key] === 'string' ? (metadata[key] as string) : null;
    const buyerName = [text('holderFirstName'), text('holderLastName')]
      .filter(Boolean)
      .join(' ');

    return {
      id: order.id,
      userId: order.userId,
      eventId: order.eventId,
      eventTitle,
      buyerName: buyerName || null,
      buyerEmail: text('holderEmail'),
      status: order.status,
      ticketCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: order.subtotalAmount,
      platformFee: order.platformFeeAmount,
      paymentFees: order.paymentFeesAmount,
      total: order.totalAmount,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      paidAt: order.paidAt,
      refundedAt: order.refundedAt,
      refundReason: order.refundReason,
      createdAt: order.createdAt,
    };
  }
}
