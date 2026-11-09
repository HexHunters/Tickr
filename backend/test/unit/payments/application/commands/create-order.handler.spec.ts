

import { CreateOrderCommand } from '@modules/payments/application/commands/create-order/create-order.command';
import { CreateOrderHandler } from '@modules/payments/application/commands/create-order/create-order.handler';
import { PAYMENTS_DISABLED_MESSAGE } from '@modules/payments/application/constants/payment-method-disabled.constants';
import type { PaymentEventQueryPort } from '@modules/payments/application/ports/event-query.port';
import type { FraudDetectionPort } from '@modules/payments/application/ports/fraud-detection.port';
import type { OrderRepositoryPort } from '@modules/payments/application/ports/order.repository.port';
import type { TicketReservationPort } from '@modules/payments/application/ports/ticket-reservation.port';
import { InvalidOrderException } from '@modules/payments/domain/exceptions/invalid-order.exception';
import { ConfigService } from '@nestjs/config';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

describe('CreateOrderHandler', () => {
  let handler: CreateOrderHandler;
  let mockOrderRepo: jest.Mocked<OrderRepositoryPort>;
  let mockEventQuery: jest.Mocked<PaymentEventQueryPort>;
  let mockFraudDetection: jest.Mocked<FraudDetectionPort>;
  let mockTicketReservation: jest.Mocked<TicketReservationPort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let originalEnv: NodeJS.ProcessEnv;

  const validUserId = '550e8400-e29b-41d4-a716-446655440000';
  const validEventId = '550e8400-e29b-41d4-a716-446655440001';
  const validTicketTypeId = '550e8400-e29b-41d4-a716-446655440002';

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };

    mockOrderRepo = {
      save: jest.fn().mockImplementation((order) => Promise.resolve(order)),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByEventId: jest.fn(),
      findExpired: jest.fn(),
      countByUserIdSince: jest.fn(),
      findByGatewayPaymentRef: jest.fn(),
      findAll: jest.fn(),
      getStatusSummary: jest.fn(),
    };

    mockEventQuery = {
      getEventsByIds: jest.fn(),
      getEventById: jest.fn().mockResolvedValue({
        id: validEventId,
        title: 'Test Event',
        status: 'PUBLISHED',
        startDate: new Date('2026-07-01'),
        organizerId: '550e8400-e29b-41d4-a716-446655440010',
        commissionRateOverride: null,
      }),
      getTicketType: jest.fn().mockResolvedValue({
        id: validTicketTypeId,
        eventId: validEventId,
        name: 'Standard',
        price: 50,
        currency: 'TND',
        available: 100,
      }),
    };

    mockFraudDetection = {
      checkRateLimit: jest.fn().mockResolvedValue(true),
      checkTicketLimit: jest.fn().mockResolvedValue(true),
      isHighValueOrder: jest.fn().mockReturnValue(false),
    };

    mockTicketReservation = {
      reserveTickets: jest.fn().mockResolvedValue({
        ticketIds: ['t1', 't2'],
        reservedUntil: new Date(),
      }),
      confirmTickets: jest.fn(),
      cancelReservations: jest.fn(),
    };

    mockEventPublisher = {
      publish: jest.fn(),
      publishMany: jest.fn(),
    } as any;

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue: any) => {
        if (key === 'payments.gateways.enabled') return true;
        if (key === 'PLATFORM_COMMISSION_RATE') return 0.04;
        if (key === 'ORDER_EXPIRATION_MINUTES') return 15;
        return defaultValue;
      }),
    } as any;

    handler = new CreateOrderHandler(
      mockOrderRepo,
      mockEventQuery,
      mockFraudDetection,
      mockTicketReservation,
      mockEventPublisher,
      mockConfigService,
    );
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function createValidCommand(): CreateOrderCommand {
    return new CreateOrderCommand(
      validUserId,
      validEventId,
      [
        {
          ticketTypeId: validTicketTypeId,
          quantity: 2,
          holders: [
            { name: 'John Doe', email: 'john@example.com' },
            { name: 'Jane Doe', email: 'jane@example.com' },
          ],
        },
      ],
      { holderFirstName: 'John', holderLastName: 'Doe', holderEmail: 'john@example.com' },
    );
  }

  it.each([false, undefined, 'false', 'true'])(
    'rejects creation without reservations or writes for gateways.enabled=%p',
    async (enabled) => {
      const config = new ConfigService({
        payments: { gateways: { enabled }, offline: { enabled: true } },
      });
      const disabledHandler = new CreateOrderHandler(
        mockOrderRepo, mockEventQuery, mockFraudDetection,
        mockTicketReservation, mockEventPublisher, config,
      );

      const result = await disabledHandler.execute(createValidCommand());

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('PAYMENT_METHOD_DISABLED');
      expect(result.error.message).toBe(PAYMENTS_DISABLED_MESSAGE);
      expect(mockFraudDetection.checkRateLimit).not.toHaveBeenCalled();
      expect(mockFraudDetection.checkTicketLimit).not.toHaveBeenCalled();
      expect(mockEventQuery.getEventById).toHaveBeenCalledTimes(1);
      expect(mockEventQuery.getTicketType).toHaveBeenCalledTimes(1);
      expect(mockOrderRepo.save).not.toHaveBeenCalled();
      expect(mockTicketReservation.reserveTickets).not.toHaveBeenCalled();
      expect(mockTicketReservation.confirmTickets).not.toHaveBeenCalled();
      expect(mockTicketReservation.cancelReservations).not.toHaveBeenCalled();
      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
      expect(mockEventPublisher.publishMany).not.toHaveBeenCalled();
    },
  );

  it('creates the order after fraud checks for gateways.enabled=true from a real ConfigService', async () => {
    // Without a configured rate the handler reads process.env before its 0.06 default.
    delete process.env.PLATFORM_COMMISSION_RATE;
    const config = new ConfigService({ payments: { gateways: { enabled: true } } });
    const enabledHandler = new CreateOrderHandler(
      mockOrderRepo, mockEventQuery, mockFraudDetection,
      mockTicketReservation, mockEventPublisher, config,
    );

    const result = await enabledHandler.execute(createValidCommand());

    expect(result.isSuccess).toBe(true);
    expect(mockFraudDetection.checkRateLimit).toHaveBeenCalledTimes(1);
    expect(mockFraudDetection.checkRateLimit).toHaveBeenCalledWith(validUserId);
    expect(mockFraudDetection.checkTicketLimit).toHaveBeenCalledWith(validUserId, validEventId, 2);
    expect(result.value.platformFee).toBe(6); // 100 × 0.06 default rate
    expect(result.value.total).toBe(106);
  });

  it('should create order successfully', async () => {
    const result = await handler.execute(createValidCommand());

    expect(result.isSuccess).toBe(true);
    expect(result.value.requiresPayment).toBe(true);
    expect(result.value.status).toBe('PENDING');
  });

  describe('free and mixed bookings', () => {
    function configure(globalEnabled: boolean, override: boolean | null, gatewaysEnabled = false) {
      handler = new CreateOrderHandler(mockOrderRepo, mockEventQuery, mockFraudDetection,
        mockTicketReservation, mockEventPublisher,
        new ConfigService({ payments: { freeTickets: { enabled: globalEnabled }, gateways: { enabled: gatewaysEnabled } } }));
      mockEventQuery.getEventById.mockResolvedValue({
        id: validEventId, title: 'Mixed event', status: 'PUBLISHED', startDate: new Date(),
        organizerId: validUserId, commissionRateOverride: null, freeTicketsEnabledOverride: override,
      });
      mockEventQuery.getTicketType.mockResolvedValue({
        id: validTicketTypeId, eventId: validEventId, name: 'Basic', price: 0, currency: 'TND', available: 20,
      });
    }

    it.each([[false, true, true], [true, false, false], [true, null, true], [false, null, false]])(
      'resolves global=%s override=%s to allowed=%s', async (globalEnabled, override, allowed) => {
        configure(globalEnabled === true, override, false);
        const result = await handler.execute(createValidCommand());
        expect(result.isSuccess).toBe(allowed);
        if (allowed) {
          expect(result.value).toMatchObject({ total: 0, platformFee: 0, status: 'PAID', requiresPayment: false });
          expect(mockTicketReservation.confirmTickets).toHaveBeenCalledWith(['t1', 't2'], result.value.orderId);
          const order = mockOrderRepo.save.mock.calls.at(-1)?.[0];
          expect(order?.paymentMethod).toBeNull();
          expect(order?.transactionId).toBeNull();
          expect(order?.canBeRefunded()).toBe(false);
          expect(mockEventPublisher.publishMany).toHaveBeenCalledTimes(1);
        } else {
          expect(result.error.type).toBe('FREE_TICKETS_DISABLED');
          expect(mockTicketReservation.reserveTickets).not.toHaveBeenCalled();
        }
      },
    );

    it.each([true, false])('mixed basket requires a gateway (enabled=%s)', async (enabled) => {
      configure(true, null, enabled);
      const command = createValidCommand();
      const vipId = '550e8400-e29b-41d4-a716-446655440003';
      mockEventQuery.getTicketType.mockResolvedValueOnce({
        id: validTicketTypeId, eventId: validEventId, name: 'Basic', price: 0, currency: 'TND', available: 20,
      }).mockResolvedValueOnce({
        id: vipId, eventId: validEventId, name: 'VIP', price: 50, currency: 'TND', available: 20,
      });
      const mixed = new CreateOrderCommand(command.userId, command.eventId,
        [...command.items, { ...command.items[0], ticketTypeId: vipId }], command.metadata);
      const result = await handler.execute(mixed);
      expect(result.isSuccess).toBe(enabled);
      expect(mockTicketReservation.confirmTickets).not.toHaveBeenCalled();
      if (enabled) {
        expect(result.value).toMatchObject({ subtotal: 100, status: 'PENDING', requiresPayment: true });
        expect(mockFraudDetection.checkTicketLimit).toHaveBeenCalledTimes(1);
        expect(mockFraudDetection.checkTicketLimit).toHaveBeenCalledWith(validUserId, validEventId, 4);
      } else {
        expect(result.error.type).toBe('PAYMENT_METHOD_DISABLED');
        expect(mockTicketReservation.reserveTickets).not.toHaveBeenCalled();
      }
    });

    it('compensates and reports failure when free confirmation fails', async () => {
      configure(true, null);
      mockTicketReservation.confirmTickets.mockRejectedValue(new Error('database unavailable'));
      const result = await handler.execute(createValidCommand());
      expect(result.error.type).toBe('PERSISTENCE_ERROR');
      expect(mockTicketReservation.cancelReservations).toHaveBeenCalledWith(['t1', 't2']);
      expect(mockEventPublisher.publishMany).not.toHaveBeenCalled();
    });

    it('compensates when the fulfilled order cannot be saved', async () => {
      configure(true, null);
      mockOrderRepo.save.mockResolvedValueOnce(expect.anything()).mockRejectedValueOnce(new Error('save failed'));
      const result = await handler.execute(createValidCommand());
      expect(result.error.type).toBe('PERSISTENCE_ERROR');
      expect(mockTicketReservation.cancelReservations).toHaveBeenCalledWith(['t1', 't2']);
    });

    it('rejects ticket types belonging to a different event', async () => {
      configure(true, null);
      mockEventQuery.getTicketType.mockResolvedValue({
        id: validTicketTypeId, eventId: validUserId, name: 'Wrong event', price: 0, currency: 'TND', available: 20,
      });
      expect((await handler.execute(createValidCommand())).error.type).toBe('TICKET_TYPE_NOT_FOUND');
      expect(mockTicketReservation.reserveTickets).not.toHaveBeenCalled();
    });

    it('rejects duplicate tiers and holder/quantity mismatches before reserving', async () => {
      configure(true, null);
      const command = createValidCommand();
      for (const items of [[...command.items, ...command.items], [{ ...command.items[0], quantity: 1 }]]) {
        const invalid = new CreateOrderCommand(command.userId, command.eventId, items, command.metadata);
        expect((await handler.execute(invalid)).error.type).toBe('VALIDATION_ERROR');
      }
      expect(mockTicketReservation.reserveTickets).not.toHaveBeenCalled();
    });
  });

  it('should calculate paid order totals', async () => {
    const result = await handler.execute(createValidCommand());

    expect(result.isSuccess).toBe(true);
    expect(result.value.orderId).toBeDefined();
    expect(result.value.subtotal).toBe(100); // 50 × 2
    expect(result.value.platformFee).toBe(4); // 100 × 0.04
    expect(result.value.total).toBe(104);
    expect(result.value.currency).toBe('TND');
    expect(result.value.expiresAt).toBeInstanceOf(Date);
  });

  it('should prefer the registered payments commission rate', async () => {
    mockConfigService.get.mockImplementation((key: string, defaultValue: any) => {
      if (key === 'payments.gateways.enabled') return true;
      if (key === 'payments.commission.rate') return 0.06;
      if (key === 'PLATFORM_COMMISSION_RATE') return 0.04;
      if (key === 'ORDER_EXPIRATION_MINUTES') return 15;
      return defaultValue;
    });
    handler = new CreateOrderHandler(
      mockOrderRepo,
      mockEventQuery,
      mockFraudDetection,
      mockTicketReservation,
      mockEventPublisher,
      mockConfigService,
    );

    const result = await handler.execute(createValidCommand());

    expect(result.value.platformFee).toBe(6);
    expect(result.value.total).toBe(106);
  });

  it('should prefer the event commission override over the global rate', async () => {
    mockEventQuery.getEventById.mockResolvedValue({
      id: validEventId,
      title: 'Test Event',
      status: 'PUBLISHED',
      startDate: new Date('2026-07-01'),
      organizerId: '550e8400-e29b-41d4-a716-446655440010',
      commissionRateOverride: 0.03,
    });

    const result = await handler.execute(createValidCommand());

    expect(result.value.subtotal).toBe(100);
    expect(result.value.platformFee).toBe(3);
    expect(result.value.total).toBe(103);
  });

  it('should save order to repository', async () => {
    await handler.execute(createValidCommand());

    expect(mockOrderRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should publish domain events', async () => {
    await handler.execute(createValidCommand());

    expect(mockEventPublisher.publishMany).toHaveBeenCalledTimes(1);
  });

  it('should reserve tickets via port', async () => {
    await handler.execute(createValidCommand());

    expect(mockTicketReservation.reserveTickets).toHaveBeenCalledWith(
      validEventId,
      validTicketTypeId,
      validUserId,
      2,
      [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Doe', email: 'jane@example.com' },
      ],
    );
  });

  it('should fail when rate limited', async () => {
    mockFraudDetection.checkRateLimit.mockResolvedValue(false);

    const result = await handler.execute(createValidCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error!.type).toBe('RATE_LIMITED');
  });

  it('should fail when event not found', async () => {
    mockEventQuery.getEventById.mockResolvedValue(null);

    const result = await handler.execute(createValidCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error!.type).toBe('EVENT_NOT_FOUND');
  });

  it('should fail when event not published', async () => {
    mockEventQuery.getEventById.mockResolvedValue({
      id: validEventId,
      title: 'Draft Event',
      status: 'DRAFT',
      startDate: new Date(),
      organizerId: 'org-1',
      commissionRateOverride: null,
    });

    const result = await handler.execute(createValidCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error!.type).toBe('EVENT_NOT_PUBLISHED');
  });

  it('should fail when ticket type not found', async () => {
    mockEventQuery.getTicketType.mockResolvedValue(null);

    const result = await handler.execute(createValidCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error!.type).toBe('TICKET_TYPE_NOT_FOUND');
  });

  it('should fail when insufficient availability', async () => {
    mockEventQuery.getTicketType.mockResolvedValue({
      id: validTicketTypeId,
      eventId: validEventId,
      name: 'Standard',
      price: 50,
      currency: 'TND',
      available: 1, // only 1 available, requesting 2
    });

    const result = await handler.execute(createValidCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error!.type).toBe('INSUFFICIENT_AVAILABILITY');
  });

  it('should fail when ticket limit exceeded', async () => {
    mockFraudDetection.checkTicketLimit.mockResolvedValue(false);

    const result = await handler.execute(createValidCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error!.type).toBe('TICKET_LIMIT_EXCEEDED');
  });

  it('should fail with VALIDATION_ERROR before reserving when the order aggregate rejects the input', async () => {
    const valid = createValidCommand();
    const command = new CreateOrderCommand('not-a-uuid', valid.eventId, valid.items, valid.metadata);

    const result = await handler.execute(command);

    expect(result.isFailure).toBe(true);
    expect(result.error!.type).toBe('VALIDATION_ERROR');
    expect(result.error!.message).toBe(InvalidOrderException.invalidUserId().message);
    expect(mockTicketReservation.reserveTickets).not.toHaveBeenCalled();
    expect(mockOrderRepo.save).not.toHaveBeenCalled();
    expect(mockEventPublisher.publishMany).not.toHaveBeenCalled();
  });

  it('should fail when ticket reservation fails', async () => {
    mockTicketReservation.reserveTickets.mockRejectedValue(new Error('Reservation failed'));

    const result = await handler.execute(createValidCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error!.type).toBe('INSUFFICIENT_AVAILABILITY');
  });

  it('should fail when persistence fails', async () => {
    mockOrderRepo.save.mockRejectedValue(new Error('DB error'));

    const result = await handler.execute(createValidCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error!.type).toBe('PERSISTENCE_ERROR');
  });
});
