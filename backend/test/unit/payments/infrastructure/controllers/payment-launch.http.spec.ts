import type { Server } from 'http';

import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConfirmPaymentHandler } from '@modules/payments/application/commands/confirm-payment/confirm-payment.handler';
import { CreateOrderCommand } from '@modules/payments/application/commands/create-order/create-order.command';
import { CreateOrderHandler } from '@modules/payments/application/commands/create-order/create-order.handler';
import { FailPaymentHandler } from '@modules/payments/application/commands/fail-payment/fail-payment.handler';
import { ProcessPaymentCommand } from '@modules/payments/application/commands/process-payment/process-payment.command';
import { ProcessPaymentHandler } from '@modules/payments/application/commands/process-payment/process-payment.handler';
import { RequestRefundCommand } from '@modules/payments/application/commands/request-refund/request-refund.command';
import { RequestRefundHandler } from '@modules/payments/application/commands/request-refund/request-refund.handler';
import {
  PAYMENT_METHOD_DISABLED,
  PAYMENTS_DISABLED_MESSAGE,
} from '@modules/payments/application/constants/payment-method-disabled.constants';
import { PAYMENT_EVENT_QUERY_PORT } from '@modules/payments/application/ports/event-query.port';
import type { PaymentEventQueryPort } from '@modules/payments/application/ports/event-query.port';
import { FRAUD_DETECTION_PORT } from '@modules/payments/application/ports/fraud-detection.port';
import type { FraudDetectionPort } from '@modules/payments/application/ports/fraud-detection.port';
import { ORDER_REPOSITORY } from '@modules/payments/application/ports/order.repository.port';
import type { OrderRepositoryPort } from '@modules/payments/application/ports/order.repository.port';
import { PAYMENT_PROVIDER_FACTORY } from '@modules/payments/application/ports/payment-provider.port';
import { PAYMENT_REPOSITORY } from '@modules/payments/application/ports/payment.repository.port';
import type { PaymentRepositoryPort } from '@modules/payments/application/ports/payment.repository.port';
import { REFUND_REPOSITORY } from '@modules/payments/application/ports/refund.repository.port';
import type { RefundRepositoryPort } from '@modules/payments/application/ports/refund.repository.port';
import { TICKET_RESERVATION_PORT } from '@modules/payments/application/ports/ticket-reservation.port';
import type { TicketReservationPort } from '@modules/payments/application/ports/ticket-reservation.port';
import { WEBHOOK_EVENT_STORE } from '@modules/payments/application/ports/webhook-event-store.port';
import type { WebhookEventStorePort } from '@modules/payments/application/ports/webhook-event-store.port';
import { GetOrderByIdHandler } from '@modules/payments/application/queries/get-order-by-id/get-order-by-id.handler';
import { GetOrdersByUserHandler } from '@modules/payments/application/queries/get-orders-by-user/get-orders-by-user.handler';
import { OrderEntity } from '@modules/payments/domain/entities/order.entity';
import { PaymentMethod } from '@modules/payments/domain/value-objects/payment-method.vo';
import { KonnectAdapter } from '@modules/payments/infrastructure/adapters/konnect.adapter';
import { PaymeeAdapter } from '@modules/payments/infrastructure/adapters/paymee.adapter';
import { PaymentProviderFactoryAdapter } from '@modules/payments/infrastructure/adapters/payment-provider-factory.adapter';
import { StripeAdapter } from '@modules/payments/infrastructure/adapters/stripe.adapter';
import { OrdersController } from '@modules/payments/infrastructure/controllers/orders.controller';
import { PublicConfigController } from '@modules/payments/infrastructure/controllers/public-config.controller';
import { WebhooksController } from '@modules/payments/infrastructure/controllers/webhooks.controller';
import { JwtAuthGuard } from '@modules/users/infrastructure/guards/jwt-auth.guard';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import type { ExecutionContext, INestApplication, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Result } from '@shared/domain/result';
import { Money } from '@shared/domain/value-objects/money.vo';
import { AllExceptionsFilter } from '@shared/infrastructure/common/filters/all-exceptions.filter';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';
import request from 'supertest';

// HTTP contract of the payment launch gate, driven through supertest.
// Real in every section: OrdersController, WebhooksController, PublicConfigController, the Stripe,
// Konnect and Paymee adapters, PaymentProviderFactoryAdapter and AllExceptionsFilter, booted with
// a copy of the src/main.ts setup (global prefix 'api' and the same global ValidationPipe options).
// Stubbed in every section: JwtAuthGuard (it attaches a fixed JWT principal), the order queries,
// the webhook commands (ConfirmPayment, FailPayment), the webhook dedupe store and the event
// query port. The first section also stubs CreateOrder, ProcessPayment and RequestRefund to pin
// the HTTP mapping. The other sections run those three real handlers on an in-memory order store
// and jest-mocked payment, refund, fraud, ticket and domain-event ports.
// Nothing reaches a database or Redis. The global fetch used by the Konnect and Paymee adapters
// rejects, so a request that slips past a gate fails fast instead of calling a gateway API.

const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const EVENT_ID = '550e8400-e29b-41d4-a716-446655440002';
const TICKET_TYPE_ID = '550e8400-e29b-41d4-a716-446655440010';
const ORDER_ID = '550e8400-e29b-41d4-a716-446655440000';
const IDEMPOTENCY_KEY = '550e8400-e29b-41d4-a716-446655440099';
// What JwtStrategy.validate() attaches to the request.
const PRINCIPAL = { userId: USER_ID, email: 'amira@tick-r.tn', role: 'PARTICIPANT' };

// Valid bodies for CreateOrderRequestDto, ProcessPaymentRequestDto and RequestRefundRequestDto.
const HOLDERS = [
  { name: 'Amira Ben Salah', email: 'amira@tick-r.tn' },
  { name: 'Youssef Ben Salah', email: 'youssef@tick-r.tn' },
];
const CREATE_ORDER_BODY = {
  eventId: EVENT_ID,
  items: [{ ticketTypeId: TICKET_TYPE_ID, quantity: 2, holders: HOLDERS }],
  holder: { firstName: 'Amira', lastName: 'Ben Salah', email: 'amira@tick-r.tn' },
};
const PAY_BODY = { paymentMethod: PaymentMethod.STRIPE, idempotencyKey: IDEMPOTENCY_KEY };
const REFUND_BODY = { reason: 'Event cancelled by organizer' };

const PUBLISHED_EVENT = {
  id: EVENT_ID,
  title: 'Festival de Carthage',
  status: 'PUBLISHED',
  startDate: new Date(Date.now() + 86_400_000),
  organizerId: '550e8400-e29b-41d4-a716-446655440003',
  commissionRateOverride: null,
};
const STANDARD_TICKET = { id: TICKET_TYPE_ID, name: 'Standard', price: 50, currency: 'TND', available: 100 };

// Every provider gets credentials when gateways are on, so listing all three methods never
// relies on a provider that has none.
const GATEWAY_CREDENTIALS = {
  STRIPE_SECRET_KEY: 'sk_test_launch',
  STRIPE_WEBHOOK_SECRET: 'whsec_launch',
  KONNECT_API_KEY: 'konnect-api-key',
  KONNECT_WALLET_ID: 'konnect-wallet',
  KONNECT_WEBHOOK_SECRET: 'konnect-webhook-secret',
  PAYMEE_API_KEY: 'paymee-api-key',
};
const NO_CREDENTIALS = Object.fromEntries(Object.keys(GATEWAY_CREDENTIALS).map((key) => [key, '']));

// One callback per webhook that fails the controller's own input check: no Stripe signature,
// no Konnect payment_ref, no Paymee token or check_sum.
const MALFORMED_CALLBACKS = [
  {
    endpoint: 'POST /payments/webhooks/stripe',
    send: (server: Server) => request(server).post('/api/payments/webhooks/stripe').send({}),
    inputError: 'Missing signature or body',
  },
  {
    endpoint: 'GET /payments/webhooks/konnect',
    send: (server: Server) => request(server).get('/api/payments/webhooks/konnect'),
    inputError: 'Missing payment_ref',
  },
  {
    endpoint: 'POST /payments/webhooks/paymee',
    send: (server: Server) => request(server).post('/api/payments/webhooks/paymee').send({}),
    inputError: 'Missing token or check_sum',
  },
];

function launchConfig(gatewaysEnabled: boolean): ConfigService {
  return new ConfigService({
    // Offline keeps its production default. No code reads the flag yet, so one case is enough.
    payments: { gateways: { enabled: gatewaysEnabled }, offline: { enabled: true } },
    ...(gatewaysEnabled ? GATEWAY_CREDENTIALS : NO_CREDENTIALS),
  });
}

/** In-memory order store. `save` is a jest mock so a test can assert that nothing was written. */
class InMemoryOrderRepository implements OrderRepositoryPort {
  private readonly orders = new Map<string, OrderEntity>();

  readonly save = jest.fn(async (order: OrderEntity) => {
    this.orders.set(order.id, order);
    return order;
  });

  async findById(id: string): Promise<OrderEntity | null> {
    return this.orders.get(id) ?? null;
  }

  async findByUserId(userId: string) {
    const data = [...this.orders.values()].filter((order) => order.userId === userId);
    return { data, total: data.length };
  }

  async findByEventId(eventId: string) {
    const data = [...this.orders.values()].filter((order) => order.eventId === eventId);
    return { data, total: data.length };
  }

  async findExpired(): Promise<OrderEntity[]> {
    return [];
  }

  async countByUserIdSince(): Promise<number> {
    return 0;
  }

  async findByGatewayPaymentRef(ref: string): Promise<OrderEntity | null> {
    return [...this.orders.values()].find((o) => o.gatewayPaymentRef === ref) ?? null;
  }
}

function createPorts() {
  return {
    orders: new InMemoryOrderRepository(),
    payments: {
      save: jest.fn<PaymentRepositoryPort['save']>(async (payment) => payment),
      findByOrderId: jest.fn<PaymentRepositoryPort['findByOrderId']>(async () => []),
      countByOrderId: jest.fn<PaymentRepositoryPort['countByOrderId']>(async () => 0),
    },
    refunds: {
      save: jest.fn<RefundRepositoryPort['save']>(async (refund) => refund),
      findByOrderId: jest.fn<RefundRepositoryPort['findByOrderId']>(async () => []),
    },
    eventQuery: {
      getEventById: jest.fn<PaymentEventQueryPort['getEventById']>(async () => PUBLISHED_EVENT),
      getTicketType: jest.fn<PaymentEventQueryPort['getTicketType']>(async () => STANDARD_TICKET),
    },
    fraud: {
      checkRateLimit: jest.fn<FraudDetectionPort['checkRateLimit']>(async () => true),
      checkTicketLimit: jest.fn<FraudDetectionPort['checkTicketLimit']>(async () => true),
      isHighValueOrder: jest.fn<FraudDetectionPort['isHighValueOrder']>(() => false),
    },
    tickets: {
      reserveTickets: jest.fn<TicketReservationPort['reserveTickets']>(async () => ({
        ticketIds: ['ticket-1', 'ticket-2'],
        reservedUntil: new Date(Date.now() + 900_000),
      })),
      confirmTickets: jest.fn<TicketReservationPort['confirmTickets']>(async () => undefined),
      cancelReservations: jest.fn<TicketReservationPort['cancelReservations']>(async () => undefined),
    },
    publisher: {
      publish: jest.fn<DomainEventPublisher['publish']>(async () => undefined),
      publishMany: jest.fn<DomainEventPublisher['publishMany']>(async () => undefined),
    },
    dedupe: {
      tryMarkAsProcessed: jest.fn<WebhookEventStorePort['tryMarkAsProcessed']>(async () => true),
      isProcessed: jest.fn<WebhookEventStorePort['isProcessed']>(async () => false),
    },
    confirmPayment: { execute: jest.fn<ConfirmPaymentHandler['execute']>() },
    failPayment: { execute: jest.fn<FailPaymentHandler['execute']>() },
  };
}

type Ports = ReturnType<typeof createPorts>;

function realOrderHandlers(ports: Ports): Provider[] {
  return [
    CreateOrderHandler,
    ProcessPaymentHandler,
    RequestRefundHandler,
    { provide: ORDER_REPOSITORY, useValue: ports.orders },
    { provide: PAYMENT_REPOSITORY, useValue: ports.payments },
    { provide: REFUND_REPOSITORY, useValue: ports.refunds },
    { provide: FRAUD_DETECTION_PORT, useValue: ports.fraud },
    { provide: TICKET_RESERVATION_PORT, useValue: ports.tickets },
    { provide: DomainEventPublisher, useValue: ports.publisher },
  ];
}

/** A PENDING order owned by the signed-in user, or a PAID one when a payment method is given. */
function buildOrder(paidWith?: PaymentMethod): OrderEntity {
  const order = OrderEntity.create({
    userId: USER_ID,
    eventId: EVENT_ID,
    items: [{
      ticketTypeId: TICKET_TYPE_ID, ticketTypeName: 'Standard', price: Money.create(50, 'TND'), quantity: 1,
    }],
    currency: 'TND',
    commissionRate: 0.06,
    expirationMinutes: 15,
  }).value;
  if (paidWith) {
    const transitions = [order.markAsProcessing(paidWith, 'gateway-ref-launch'), order.markAsPaid('txn-launch')];
    if (transitions.some((transition) => transition.isFailure)) {
      throw new Error('The fixture order could not be marked as paid');
    }
  }
  order.pullDomainEvents();
  return order;
}

async function bootPaymentApi(
  gatewaysEnabled: boolean,
  ports: Ports,
  orderHandlers: Provider[],
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [OrdersController, WebhooksController, PublicConfigController],
    providers: [
      { provide: ConfigService, useValue: launchConfig(gatewaysEnabled) },
      StripeAdapter, KonnectAdapter, PaymeeAdapter,
      { provide: PAYMENT_PROVIDER_FACTORY, useClass: PaymentProviderFactoryAdapter },
      { provide: PAYMENT_EVENT_QUERY_PORT, useValue: ports.eventQuery },
      { provide: WEBHOOK_EVENT_STORE, useValue: ports.dedupe },
      { provide: ORDER_REPOSITORY, useValue: ports.orders },
      { provide: ConfirmPaymentHandler, useValue: ports.confirmPayment },
      { provide: FailPaymentHandler, useValue: ports.failPayment },
      { provide: GetOrderByIdHandler, useValue: { execute: jest.fn() } },
      { provide: GetOrdersByUserHandler, useValue: { execute: jest.fn() } },
      ...orderHandlers,
    ],
  }).overrideGuard(JwtAuthGuard).useValue({
    canActivate(context: ExecutionContext): boolean {
      context.switchToHttp().getRequest<{ user?: typeof PRINCIPAL }>().user = PRINCIPAL;
      return true;
    },
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useLogger(false);
  // Same bootstrap as src/main.ts: default API_PREFIX and the global ValidationPipe options.
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}

describe('Payment launch HTTP contract', () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeAll(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Gateway APIs are unreachable in this suite'));
  });

  afterAll(() => { fetchSpy.mockRestore(); });

  beforeEach(() => { jest.clearAllMocks(); });

  describe('gateways disabled, order handlers stubbed', () => {
    const ports = createPorts();
    const disabled = (_command: unknown) => Promise.resolve(Result.fail({
      type: PAYMENT_METHOD_DISABLED, message: PAYMENTS_DISABLED_MESSAGE,
    }));
    const createOrder = { execute: jest.fn(disabled) };
    const processPayment = { execute: jest.fn(disabled) };
    const requestRefund = { execute: jest.fn(disabled) };
    const stubs = [createOrder, processPayment, requestRefund];
    let app: INestApplication;
    let server: Server;

    beforeAll(async () => {
      app = await bootPaymentApi(false, ports, [
        { provide: CreateOrderHandler, useValue: createOrder },
        { provide: ProcessPaymentHandler, useValue: processPayment },
        { provide: RequestRefundHandler, useValue: requestRefund },
      ]);
      server = app.getHttpServer();
    });

    afterAll(async () => { await app?.close(); });

    it('boots without gateway credentials and advertises no payment method, offline included', async () => {
      const response = await request(server).get('/api/config/public').expect(200);

      expect(response.body).toMatchObject({ availablePaymentMethods: [] });
    });

    it.each([
      {
        route: 'POST /orders',
        path: '/api/orders',
        body: CREATE_ORDER_BODY,
        handler: createOrder,
        command: CreateOrderCommand,
        fields: {
          userId: USER_ID,
          eventId: EVENT_ID,
          items: [{ ticketTypeId: TICKET_TYPE_ID, quantity: 2, holders: HOLDERS }],
          metadata: { holderFirstName: 'Amira', holderLastName: 'Ben Salah', holderEmail: 'amira@tick-r.tn' },
        },
      },
      {
        route: 'POST /orders/:id/pay',
        path: `/api/orders/${ORDER_ID}/pay`,
        body: PAY_BODY,
        handler: processPayment,
        command: ProcessPaymentCommand,
        fields: {
          orderId: ORDER_ID,
          userId: USER_ID,
          paymentMethod: PaymentMethod.STRIPE,
          idempotencyKey: IDEMPOTENCY_KEY,
        },
      },
      {
        route: 'POST /orders/:id/refund',
        path: `/api/orders/${ORDER_ID}/refund`,
        body: REFUND_BODY,
        handler: requestRefund,
        command: RequestRefundCommand,
        fields: { orderId: ORDER_ID, userId: USER_ID, reason: REFUND_BODY.reason },
      },
    ])('$route answers 403 PAYMENT_METHOD_DISABLED after calling only its own handler', async ({
      path, body, handler, command, fields,
    }) => {
      const response = await request(server).post(path).send(body).expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403, code: PAYMENT_METHOD_DISABLED, message: PAYMENTS_DISABLED_MESSAGE,
      });
      expect(handler.execute).toHaveBeenCalledTimes(1);
      const [sent] = handler.execute.mock.calls[0];
      expect(sent).toBeInstanceOf(command);
      expect(sent).toMatchObject(fields);
      for (const other of stubs.filter((stub) => stub !== handler)) {
        expect(other.execute).not.toHaveBeenCalled();
      }
    });

    it.each([
      {
        route: 'POST /orders/:id/pay',
        problem: 'a lowercase paymentMethod',
        path: `/api/orders/${ORDER_ID}/pay`,
        body: { paymentMethod: 'stripe' },
        violation: 'paymentMethod must be one of the following values: STRIPE, KONNECT, PAYMEE',
      },
      {
        route: 'POST /orders',
        problem: 'a property CreateOrderRequestDto does not declare',
        path: '/api/orders',
        body: { ...CREATE_ORDER_BODY, paymentMethod: PaymentMethod.STRIPE },
        violation: 'property paymentMethod should not exist',
      },
      {
        route: 'POST /orders/:id/refund',
        problem: 'an empty reason',
        path: `/api/orders/${ORDER_ID}/refund`,
        body: { reason: '' },
        violation: 'reason should not be empty',
      },
    ])('$route rejects $problem with 400 before the disabled gate', async ({ path, body, violation }) => {
      const response = await request(server).post(path).send(body).expect(400);

      expect(response.body).toMatchObject({ statusCode: 400, code: 'Bad Request' });
      expect(response.body.message).toContain(violation);
      for (const stub of stubs) {
        expect(stub.execute).not.toHaveBeenCalled();
      }
    });
  });

  describe('gateways disabled, real order handlers', () => {
    const ports = createPorts();
    // Orders the real handlers would pay or refund if a gate let the request through.
    const pendingOrder = buildOrder();
    const paidOrder = buildOrder(PaymentMethod.KONNECT);
    let app: INestApplication;
    let server: Server;
    let factory: PaymentProviderFactoryAdapter;

    beforeAll(async () => {
      await ports.orders.save(pendingOrder);
      await ports.orders.save(paidOrder);
      app = await bootPaymentApi(false, ports, realOrderHandlers(ports));
      server = app.getHttpServer();
      factory = app.get<PaymentProviderFactoryAdapter>(PAYMENT_PROVIDER_FACTORY);
      jest.spyOn(factory, 'getProvider');
    });

    afterAll(async () => { await app?.close(); });

    it.each([
      {
        endpoint: 'POST /orders',
        call: () => request(server).post('/api/orders').send(CREATE_ORDER_BODY),
      },
      {
        endpoint: 'POST /orders/:id/pay',
        call: () => request(server).post(`/api/orders/${pendingOrder.id}/pay`)
          .send({ paymentMethod: PaymentMethod.KONNECT }),
      },
      {
        endpoint: 'POST /orders/:id/refund',
        call: () => request(server).post(`/api/orders/${paidOrder.id}/refund`).send(REFUND_BODY),
      },
      {
        endpoint: 'POST /payments/webhooks/stripe',
        call: () => request(server).post('/api/payments/webhooks/stripe')
          .set('stripe-signature', 't=1,v1=launch')
          .send({ id: 'evt_launch', type: 'payment_intent.succeeded' }),
      },
      {
        endpoint: 'GET /payments/webhooks/konnect',
        call: () => request(server).get('/api/payments/webhooks/konnect')
          .query({ payment_ref: 'konnect-ref' }),
      },
      {
        endpoint: 'POST /payments/webhooks/paymee',
        call: () => request(server).post('/api/payments/webhooks/paymee')
          .send({ token: 'paymee-token', check_sum: 'checksum', payment_status: true }),
      },
    ])('$endpoint answers the shared PAYMENT_METHOD_DISABLED body and changes nothing', async ({ call }) => {
      const response = await call().expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403, code: PAYMENT_METHOD_DISABLED, message: PAYMENTS_DISABLED_MESSAGE,
      });
      expect(factory.getProvider).not.toHaveBeenCalled();
      expect(ports.orders.save).not.toHaveBeenCalled();
      expect(ports.payments.save).not.toHaveBeenCalled();
      expect(ports.refunds.save).not.toHaveBeenCalled();
      expect(ports.tickets.reserveTickets).not.toHaveBeenCalled();
      expect(ports.tickets.cancelReservations).not.toHaveBeenCalled();
      expect(ports.publisher.publishMany).not.toHaveBeenCalled();
      expect(ports.dedupe.tryMarkAsProcessed).not.toHaveBeenCalled();
      expect(ports.confirmPayment.execute).not.toHaveBeenCalled();
      expect(ports.failPayment.execute).not.toHaveBeenCalled();
    });

    // The same requests answer 400 once gateways are enabled (see the last section).
    it.each(MALFORMED_CALLBACKS)('$endpoint answers 403 to a malformed callback before its own input check', async ({
      send,
    }) => {
      const response = await send(server).expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403, code: PAYMENT_METHOD_DISABLED, message: PAYMENTS_DISABLED_MESSAGE,
      });
      expect(factory.getProvider).not.toHaveBeenCalled();
    });
  });

  describe('gateways enabled with credentials for every provider', () => {
    const ports = createPorts();
    let app: INestApplication;
    let server: Server;

    beforeAll(async () => {
      ports.eventQuery.getEventById.mockResolvedValue(null);
      app = await bootPaymentApi(true, ports, realOrderHandlers(ports));
      server = app.getHttpServer();
    });

    afterAll(async () => { await app?.close(); });

    it('advertises STRIPE, KONNECT and PAYMEE', async () => {
      const response = await request(server).get('/api/config/public').expect(200);

      expect(response.body.availablePaymentMethods).toEqual([
        PaymentMethod.STRIPE, PaymentMethod.KONNECT, PaymentMethod.PAYMEE,
      ]);
    });

    it.each([
      {
        route: 'POST /orders',
        call: () => request(server).post('/api/orders').send(CREATE_ORDER_BODY),
        message: `Event ${EVENT_ID} not found`,
      },
      {
        route: 'POST /orders/:id/pay',
        call: () => request(server).post(`/api/orders/${ORDER_ID}/pay`).send(PAY_BODY),
        message: `Order ${ORDER_ID} not found`,
      },
      {
        route: 'POST /orders/:id/refund',
        call: () => request(server).post(`/api/orders/${ORDER_ID}/refund`).send(REFUND_BODY),
        message: `Order ${ORDER_ID} not found`,
      },
    ])('$route passes the gate and answers 404 from the handler lookup', async ({ call, message }) => {
      const response = await call().expect(404);

      expect(response.body).toMatchObject({ statusCode: 404, code: 'Not Found', message });
    });

    it.each(MALFORMED_CALLBACKS)('$endpoint passes the gate and answers 400 from its own input check', async ({
      send, inputError,
    }) => {
      const response = await send(server).expect(400);

      expect(response.body).toMatchObject({ statusCode: 400, code: 'Bad Request', message: inputError });
      expect(ports.dedupe.tryMarkAsProcessed).not.toHaveBeenCalled();
    });

    it('keeps a rate-limited order apart from PAYMENT_METHOD_DISABLED', async () => {
      ports.fraud.checkRateLimit.mockResolvedValueOnce(false);

      const response = await request(server).post('/api/orders').send(CREATE_ORDER_BODY);

      expect([HttpStatus.FORBIDDEN, HttpStatus.TOO_MANY_REQUESTS]).toContain(response.status);
      expect(response.body.code).not.toBe(PAYMENT_METHOD_DISABLED);
      // The rejection comes from the signed-in user's rate limit check, not from an earlier guard.
      expect(ports.fraud.checkRateLimit).toHaveBeenCalledWith(USER_ID);
      expect(ports.eventQuery.getEventById).not.toHaveBeenCalled();
    });
  });
});
