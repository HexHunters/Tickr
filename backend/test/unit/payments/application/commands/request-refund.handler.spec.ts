
import { RequestRefundCommand } from '@modules/payments/application/commands/request-refund/request-refund.command';
import { RequestRefundHandler } from '@modules/payments/application/commands/request-refund/request-refund.handler';
import {
  PAYMENT_METHOD_DISABLED_MESSAGE,
  PAYMENTS_DISABLED_MESSAGE,
} from '@modules/payments/application/constants/payment-method-disabled.constants';
import type { OrderRepositoryPort } from '@modules/payments/application/ports/order.repository.port';
import type { PaymentProviderFactoryPort, PaymentProviderPort } from '@modules/payments/application/ports/payment-provider.port';
import type { RefundRepositoryPort } from '@modules/payments/application/ports/refund.repository.port';
import type { TicketReservationPort } from '@modules/payments/application/ports/ticket-reservation.port';
import { OrderEntity } from '@modules/payments/domain/entities/order.entity';
import type { OrderProps } from '@modules/payments/domain/entities/order.entity';
import { InvalidOrderStatusException } from '@modules/payments/domain/exceptions/invalid-order-status.exception';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';
import { PaymentMethod } from '@modules/payments/domain/value-objects/payment-method.vo';
import { RefundStatus } from '@modules/payments/domain/value-objects/refund-status.vo';
import { Result } from '@shared/domain/result';
import { Money } from '@shared/domain/value-objects/money.vo';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

describe('RequestRefundHandler', () => {
  let handler: RequestRefundHandler;
  let mockOrderRepo: jest.Mocked<OrderRepositoryPort>;
  let mockRefundRepo: jest.Mocked<RefundRepositoryPort>;
  let mockProviderFactory: jest.Mocked<PaymentProviderFactoryPort>;
  let mockProvider: jest.Mocked<PaymentProviderPort>;
  let mockTicketReservation: jest.Mocked<TicketReservationPort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  const validOrderId = '550e8400-e29b-41d4-a716-446655440000';
  const validUserId = '550e8400-e29b-41d4-a716-446655440001';

  function createMockOrder(
    status: OrderStatus = OrderStatus.PAID,
    overrides: Partial<OrderProps> = {},
  ): OrderEntity {
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 15);

    return OrderEntity.reconstitute({
      id: validOrderId,
      userId: validUserId,
      eventId: '550e8400-e29b-41d4-a716-446655440002',
      items: [],
      status,
      subtotalAmount: 100,
      platformFeeAmount: 4,
      paymentFeesAmount: 2,
      totalAmount: 106,
      currency: 'TND',
      paymentMethod: PaymentMethod.STRIPE,
      paymentGatewayOrderId: null,
      paymentIntentId: 'pi_123',
      gatewayPaymentRef: 'pi_123',
      transactionId: 'txn_456',
      paidAt: new Date(),
      refundedAt: null,
      refundReason: null,
      expiresAt: futureDate,
      metadata: { ticketIds: ['ticket-1', 'ticket-2'] },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
  }

  beforeEach(() => {
    mockOrderRepo = {
      save: jest.fn().mockImplementation((order) => Promise.resolve(order)),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByEventId: jest.fn(),
      findExpired: jest.fn(),
      countByUserIdSince: jest.fn(),
      findByGatewayPaymentRef: jest.fn(),
    };

    mockRefundRepo = {
      save: jest.fn().mockImplementation((refund) => Promise.resolve(refund)),
      findByOrderId: jest.fn().mockResolvedValue([]),
    };

    mockProvider = {
      createPaymentIntent: jest.fn(),
      confirmPayment: jest.fn(),
      refund: jest.fn().mockResolvedValue({
        success: true,
        refundId: 're_789',
        amount: 102,
      }),
      verifyWebhook: jest.fn(),
      isConfigured: jest.fn().mockReturnValue(true),
    };

    mockProviderFactory = {
      getProvider: jest.fn().mockReturnValue(mockProvider),
      getSupportedMethods: jest.fn().mockReturnValue([PaymentMethod.STRIPE]),
    };

    mockTicketReservation = {
      reserveTickets: jest.fn(),
      confirmTickets: jest.fn(),
      cancelReservations: jest.fn(),
    };

    mockEventPublisher = {
      publish: jest.fn(),
      publishMany: jest.fn(),
    } as any;

    handler = new RequestRefundHandler(
      mockOrderRepo,
      mockRefundRepo,
      mockProviderFactory,
      mockTicketReservation,
      mockEventPublisher,
    );
  });

  describe('execute', () => {
    it.each<{
      supportedMethods: PaymentMethod[];
      paymentMethod: PaymentMethod | null;
      message: string;
    }>([
      { supportedMethods: [], paymentMethod: PaymentMethod.STRIPE, message: PAYMENTS_DISABLED_MESSAGE },
      { supportedMethods: [], paymentMethod: null, message: PAYMENTS_DISABLED_MESSAGE },
      {
        supportedMethods: [PaymentMethod.KONNECT, PaymentMethod.PAYMEE],
        paymentMethod: PaymentMethod.STRIPE,
        message: PAYMENT_METHOD_DISABLED_MESSAGE,
      },
      {
        supportedMethods: [PaymentMethod.STRIPE, PaymentMethod.KONNECT, PaymentMethod.PAYMEE],
        // Unknown varchar value, cast exactly as OrderMapper.toDomain does.
        paymentMethod: 'CASH' as PaymentMethod,
        message: PAYMENT_METHOD_DISABLED_MESSAGE,
      },
    ])('keeps a paid order with payment method $paymentMethod unchanged when the enabled methods are $supportedMethods', async ({
      supportedMethods, paymentMethod, message,
    }) => {
      const order = createMockOrder(OrderStatus.PAID, { paymentMethod });
      mockOrderRepo.findById.mockResolvedValue(order);
      mockProviderFactory.getSupportedMethods.mockReturnValue(supportedMethods);

      const result = await handler.execute(new RequestRefundCommand(
        validOrderId, validUserId, 'Event cancelled',
      ));

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('PAYMENT_METHOD_DISABLED');
      expect(result.error.message).toBe(message);
      expect(order.status).toBe(OrderStatus.PAID);
      expect(order.refundedAt).toBeNull();
      expect(order.refundReason).toBeNull();
      expect(order.gatewayPaymentRef).toBe('pi_123');
      expect(order.pullDomainEvents()).toEqual([]);
      expect(mockOrderRepo.findById).toHaveBeenCalledTimes(supportedMethods.length === 0 ? 0 : 1);
      expect(mockOrderRepo.save).not.toHaveBeenCalled();
      expect(mockRefundRepo.save).not.toHaveBeenCalled();
      expect(mockProviderFactory.getProvider).not.toHaveBeenCalled();
      expect(mockProvider.refund).not.toHaveBeenCalled();
      expect(mockProvider.createPaymentIntent).not.toHaveBeenCalled();
      expect(mockProvider.confirmPayment).not.toHaveBeenCalled();
      expect(mockTicketReservation.cancelReservations).not.toHaveBeenCalled();
      expect(mockTicketReservation.reserveTickets).not.toHaveBeenCalled();
      expect(mockTicketReservation.confirmTickets).not.toHaveBeenCalled();
      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
      expect(mockEventPublisher.publishMany).not.toHaveBeenCalled();
    });

    it('checks the payment method before the refundable status', async () => {
      const order = createMockOrder(OrderStatus.PENDING);
      mockOrderRepo.findById.mockResolvedValue(order);
      mockProviderFactory.getSupportedMethods.mockReturnValue([PaymentMethod.KONNECT]);

      const result = await handler.execute(new RequestRefundCommand(
        validOrderId, validUserId, 'Changed my mind',
      ));

      expect(result.isFailure).toBe(true);
      expect(result.error).toEqual({
        type: 'PAYMENT_METHOD_DISABLED',
        message: PAYMENT_METHOD_DISABLED_MESSAGE,
      });
      expect(mockOrderRepo.findById).toHaveBeenCalledTimes(1);
      expect(mockProviderFactory.getProvider).not.toHaveBeenCalled();
      expect(mockRefundRepo.save).not.toHaveBeenCalled();
      expect(mockOrderRepo.save).not.toHaveBeenCalled();
    });

    it('refunds an order without a payment method without calling a gateway', async () => {
      const order = createMockOrder(OrderStatus.PAID, { paymentMethod: null });
      mockOrderRepo.findById.mockResolvedValue(order);

      const result = await handler.execute(new RequestRefundCommand(
        validOrderId, validUserId, 'Event cancelled',
      ));

      expect(result.isSuccess).toBe(true);
      expect(result.value.status).toBe(RefundStatus.PENDING);
      expect(mockProviderFactory.getProvider).not.toHaveBeenCalled();
      expect(mockProvider.refund).not.toHaveBeenCalled();
    });

    it('should process refund successfully', async () => {
      const order = createMockOrder(OrderStatus.PAID);
      mockOrderRepo.findById.mockResolvedValue(order);

      const command = new RequestRefundCommand(
        validOrderId,
        validUserId,
        'Event cancelled',
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.refundId).toBeDefined();
      expect(mockProvider.refund).toHaveBeenCalled();
      expect(mockTicketReservation.cancelReservations).toHaveBeenCalled();
      expect(mockRefundRepo.save).toHaveBeenCalled();
      expect(mockOrderRepo.save).toHaveBeenCalled();
      expect(mockEventPublisher.publishMany).toHaveBeenCalled();
    });

    it('refunds a PAYMEE order through the PAYMEE provider when it is enabled', async () => {
      const order = createMockOrder(OrderStatus.PAID, {
        paymentMethod: PaymentMethod.PAYMEE,
        gatewayPaymentRef: 'paymee_token_123',
      });
      mockOrderRepo.findById.mockResolvedValue(order);
      mockProviderFactory.getSupportedMethods.mockReturnValue([PaymentMethod.STRIPE, PaymentMethod.PAYMEE]);
      mockProvider.refund.mockResolvedValue({ success: true, refundId: 'paymee_refund_789', amount: 102 });

      const result = await handler.execute(new RequestRefundCommand(
        validOrderId, validUserId, 'Event cancelled',
      ));

      expect(result.isSuccess).toBe(true);
      expect(mockProviderFactory.getProvider).toHaveBeenCalledTimes(1);
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith(PaymentMethod.PAYMEE);
      // Subtotal 100 + payment fees 2: the platform fee is not refunded.
      expect(mockProvider.refund).toHaveBeenCalledWith('paymee_token_123', Money.create(102, 'TND'));
      expect(mockRefundRepo.save).toHaveBeenCalledTimes(1);
      const savedRefund = mockRefundRepo.save.mock.calls[0][0];
      expect(savedRefund.gatewayRefundId).toBe('paymee_refund_789');
      expect(result.value).toEqual({ refundId: savedRefund.id, status: RefundStatus.COMPLETED });
    });

    it('should fail if order not found', async () => {
      mockOrderRepo.findById.mockResolvedValue(null);

      const command = new RequestRefundCommand(
        validOrderId,
        validUserId,
        'Event cancelled',
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('ORDER_NOT_FOUND');
    });

    it('should fail if order is not in PAID status', async () => {
      const order = createMockOrder(OrderStatus.PENDING);
      mockOrderRepo.findById.mockResolvedValue(order);

      const command = new RequestRefundCommand(
        validOrderId,
        validUserId,
        'Changed my mind',
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('INVALID_STATUS');
    });

    it('returns INVALID_STATUS without persisting when the order rejects the refunded transition', async () => {
      const order = createMockOrder(OrderStatus.PAID);
      mockOrderRepo.findById.mockResolvedValue(order);
      jest.spyOn(order, 'markAsRefunded').mockReturnValue(Result.fail(
        InvalidOrderStatusException.invalidTransition(OrderStatus.PAID, OrderStatus.REFUNDED),
      ));

      const result = await handler.execute(new RequestRefundCommand(
        validOrderId, validUserId, 'Event cancelled',
      ));

      expect(result.isFailure).toBe(true);
      expect(result.error).toEqual({
        type: 'INVALID_STATUS',
        message: 'Cannot transition order from PAID to REFUNDED',
      });
      expect(mockTicketReservation.cancelReservations).not.toHaveBeenCalled();
      expect(mockRefundRepo.save).not.toHaveBeenCalled();
      expect(mockOrderRepo.save).not.toHaveBeenCalled();
      expect(mockEventPublisher.publishMany).not.toHaveBeenCalled();
    });

    it('should return GATEWAY_ERROR when gateway throws', async () => {
      const order = createMockOrder(OrderStatus.PAID);
      mockOrderRepo.findById.mockResolvedValue(order);
      mockProvider.refund.mockRejectedValue(new Error('Gateway error'));

      const command = new RequestRefundCommand(
        validOrderId,
        validUserId,
        'Event cancelled',
      );

      const result = await handler.execute(command);

      // Should fail with GATEWAY_ERROR — order stays PAID, no refund processed
      expect(result.isFailure).toBe(true);
      expect(result.error?.type).toBe('GATEWAY_ERROR');
      expect(mockOrderRepo.save).not.toHaveBeenCalled();
    });

    it('returns GATEWAY_ERROR and does not save when gateway declines', async () => {
      const order = createMockOrder(OrderStatus.PAID, {
        paymentMethod: PaymentMethod.KONNECT,
        gatewayPaymentRef: 'konnect_pay_123',
      });
      mockOrderRepo.findById.mockResolvedValue(order);
      mockProviderFactory.getSupportedMethods.mockReturnValue([PaymentMethod.KONNECT]);
      // What KonnectAdapter.refund returns: Konnect refunds are manual.
      mockProvider.refund.mockResolvedValue({ success: false, amount: 102 });

      const result = await handler.execute(new RequestRefundCommand(
        validOrderId, validUserId, 'Event cancelled',
      ));

      // Should fail with GATEWAY_ERROR — order stays PAID, nothing saved
      expect(result.isFailure).toBe(true);
      expect(result.error?.type).toBe('GATEWAY_ERROR');
      expect(mockProvider.refund).toHaveBeenCalledTimes(1);
      expect(mockRefundRepo.save).not.toHaveBeenCalled();
      expect(mockOrderRepo.save).not.toHaveBeenCalled();
    });

    it('should handle ticket cancellation failure gracefully', async () => {
      const order = createMockOrder(OrderStatus.PAID);
      mockOrderRepo.findById.mockResolvedValue(order);
      mockTicketReservation.cancelReservations.mockRejectedValue(new Error('Ticket service down'));

      const command = new RequestRefundCommand(
        validOrderId,
        validUserId,
        'Event cancelled',
      );

      const result = await handler.execute(command);

      // Should still succeed — refund processed
      expect(result.isSuccess).toBe(true);
    });

    it('should fail if persistence fails', async () => {
      const order = createMockOrder(OrderStatus.PAID);
      mockOrderRepo.findById.mockResolvedValue(order);
      mockRefundRepo.save.mockRejectedValue(new Error('DB error'));

      const command = new RequestRefundCommand(
        validOrderId,
        validUserId,
        'Event cancelled',
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('PERSISTENCE_ERROR');
    });
  });
});
