import type { PaymentEventQueryPort } from '@modules/payments/application/ports/event-query.port';
import type { OrderRepositoryPort } from '@modules/payments/application/ports/order.repository.port';
import { GetAdminOrdersHandler } from '@modules/payments/application/queries/get-admin-orders/get-admin-orders.handler';
import { GetAdminOrdersQuery } from '@modules/payments/application/queries/get-admin-orders/get-admin-orders.query';
import { OrderEntity } from '@modules/payments/domain/entities/order.entity';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';

describe('GetAdminOrdersHandler', () => {
  const eventId = '550e8400-e29b-41d4-a716-446655440002';
  let mockOrderRepo: jest.Mocked<Pick<OrderRepositoryPort, 'findAll'>>;
  let mockEventQuery: jest.Mocked<PaymentEventQueryPort>;
  let handler: GetAdminOrdersHandler;

  function createOrder(id: string, metadata: Record<string, unknown> | null): OrderEntity {
    return OrderEntity.reconstitute({
      id,
      userId: '550e8400-e29b-41d4-a716-446655440001',
      eventId,
      items: [],
      status: OrderStatus.PAID,
      subtotalAmount: 50,
      platformFeeAmount: 3,
      paymentFeesAmount: 1,
      totalAmount: 54,
      currency: 'TND',
      paymentMethod: null,
      paymentGatewayOrderId: null,
      paymentIntentId: null,
      gatewayPaymentRef: null,
      transactionId: null,
      paidAt: new Date('2026-10-01'),
      refundedAt: null,
      refundReason: null,
      expiresAt: new Date(),
      metadata,
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    });
  }

  beforeEach(() => {
    mockOrderRepo = { findAll: jest.fn() };
    mockEventQuery = { getEventById: jest.fn(), getTicketType: jest.fn() };
    handler = new GetAdminOrdersHandler(
      mockOrderRepo as unknown as OrderRepositoryPort,
      mockEventQuery,
    );
  });

  it('lists orders with buyer identity and a single lookup per event', async () => {
    mockOrderRepo.findAll.mockResolvedValue({
      data: [
        createOrder('o-1', {
          holderFirstName: 'Amal',
          holderLastName: 'Démo',
          holderEmail: 'amal@example.com',
        }),
        createOrder('o-2', null),
      ],
      total: 41,
    });
    mockEventQuery.getEventById.mockResolvedValue({
      id: eventId,
      title: 'Nuit du jazz',
      status: 'PUBLISHED',
      startDate: new Date(),
      organizerId: 'org-1',
      commissionRateOverride: null,
    });

    const result = await handler.execute(
      new GetAdminOrdersQuery({ status: OrderStatus.PAID }, 2, 20),
    );

    expect(mockOrderRepo.findAll).toHaveBeenCalledWith({ status: OrderStatus.PAID }, 2, 20);
    expect(mockEventQuery.getEventById).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ total: 41, page: 2, limit: 20, totalPages: 3 });
    expect(result.data[0]).toMatchObject({
      id: 'o-1',
      eventTitle: 'Nuit du jazz',
      buyerName: 'Amal Démo',
      buyerEmail: 'amal@example.com',
      total: 54,
      platformFee: 3,
    });
    expect(result.data[1]).toMatchObject({ buyerName: null, buyerEmail: null });
  });

  it('keeps listing orders when an event can no longer be resolved', async () => {
    mockOrderRepo.findAll.mockResolvedValue({ data: [createOrder('o-1', null)], total: 1 });
    mockEventQuery.getEventById.mockRejectedValue(new Error('events down'));

    const result = await handler.execute(new GetAdminOrdersQuery({}, 1, 20));

    expect(result.data[0].eventTitle).toBeNull();
  });
});
