import type { Server } from 'http';

import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConfirmPaymentHandler } from '@modules/payments/application/commands/confirm-payment/confirm-payment.handler';
import { CreateOrderHandler } from '@modules/payments/application/commands/create-order/create-order.handler';
import { FailPaymentHandler } from '@modules/payments/application/commands/fail-payment/fail-payment.handler';
import { ProcessPaymentHandler } from '@modules/payments/application/commands/process-payment/process-payment.handler';
import { RequestRefundHandler } from '@modules/payments/application/commands/request-refund/request-refund.handler';
import { PAYMENT_EVENT_QUERY_PORT } from '@modules/payments/application/ports/event-query.port';
import { PAYMENT_PROVIDER_FACTORY } from '@modules/payments/application/ports/payment-provider.port';
import { WEBHOOK_EVENT_STORE } from '@modules/payments/application/ports/webhook-event-store.port';
import { GetOrderByIdHandler } from '@modules/payments/application/queries/get-order-by-id/get-order-by-id.handler';
import { GetOrdersByUserHandler } from '@modules/payments/application/queries/get-orders-by-user/get-orders-by-user.handler';
import { KonnectAdapter } from '@modules/payments/infrastructure/adapters/konnect.adapter';
import { PaymeeAdapter } from '@modules/payments/infrastructure/adapters/paymee.adapter';
import { PaymentProviderFactoryAdapter } from '@modules/payments/infrastructure/adapters/payment-provider-factory.adapter';
import { StripeAdapter } from '@modules/payments/infrastructure/adapters/stripe.adapter';
import { OrdersController } from '@modules/payments/infrastructure/controllers/orders.controller';
import { PublicConfigController } from '@modules/payments/infrastructure/controllers/public-config.controller';
import { WebhooksController } from '@modules/payments/infrastructure/controllers/webhooks.controller';
import { JwtAuthGuard } from '@modules/users/infrastructure/guards/jwt-auth.guard';
import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Result } from '@shared/domain/result';
import { AllExceptionsFilter } from '@shared/infrastructure/common/filters/all-exceptions.filter';
import request from 'supertest';

// HTTP contract test with real factory/adapters/filter, isolated from DB/external services.
// Command business behavior is tested separately; authentication is a controlled fixture.
describe.each([false, true])('Disabled gateway HTTP profile (offline policy=%s)', (offline) => {
  let app: INestApplication;
  let server: Server;
  const orderId = '550e8400-e29b-41d4-a716-446655440000';
  const confirm = { execute: jest.fn() };
  const fail = { execute: jest.fn() };
  const dedupe = { tryMarkAsProcessed: jest.fn() };
  const disabled = { execute: jest.fn(() => Promise.resolve(Result.fail({
    type: 'PAYMENT_METHOD_DISABLED', message: 'Ce moyen de paiement est désactivé.',
  }))) };

  beforeAll(async () => {
    const config = new ConfigService({
      payments: { gateways: { enabled: false }, offline: { enabled: offline } },
      STRIPE_SECRET_KEY: '',
      STRIPE_WEBHOOK_SECRET: '',
      KONNECT_API_KEY: '',
      KONNECT_WALLET_ID: '',
      KONNECT_WEBHOOK_SECRET: '',
      PAYMEE_API_KEY: '',
    });
    const module = await Test.createTestingModule({
      controllers: [OrdersController, WebhooksController, PublicConfigController],
      providers: [
        { provide: ConfigService, useValue: config },
        StripeAdapter, KonnectAdapter, PaymeeAdapter,
        { provide: PAYMENT_PROVIDER_FACTORY, useClass: PaymentProviderFactoryAdapter },
        { provide: CreateOrderHandler, useValue: disabled },
        { provide: ProcessPaymentHandler, useValue: disabled },
        { provide: RequestRefundHandler, useValue: disabled },
        { provide: GetOrderByIdHandler, useValue: { execute: jest.fn() } },
        { provide: GetOrdersByUserHandler, useValue: { execute: jest.fn() } },
        { provide: ConfirmPaymentHandler, useValue: confirm },
        { provide: FailPaymentHandler, useValue: fail },
        { provide: WEBHOOK_EVENT_STORE, useValue: dedupe },
        { provide: PAYMENT_EVENT_QUERY_PORT, useValue: { getEventById: jest.fn() } },
      ],
    }).overrideGuard(JwtAuthGuard).useValue({
      canActivate(context: ExecutionContext): boolean {
        context.switchToHttp().getRequest<{ user: { userId: string; role: string } }>().user = {
          userId: orderId, role: 'PARTICIPANT',
        };
        return true;
      },
    }).compile();
    app = module.createNestApplication();
    app.useLogger(false);
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  it('boots without gateway credentials and advertises no unfinished offline method', async () => {
    const response = await request(server).get('/api/config/public').expect(200);
    expect(response.body).toMatchObject({ availablePaymentMethods: [] });
  });

  it.each(['stripe', 'konnect', 'paymee'])('rejects %s callbacks before dedupe or commands', async (method) => {
    const url = `/api/payments/webhooks/${method}`;
    const response = method === 'konnect'
      ? await request(server).get(url).query({ payment_ref: 'existing-ref' }).expect(403)
      : await request(server).post(url).send({ token: 'ref', check_sum: 'sum', payment_status: true }).expect(403);
    expect(response.body).toMatchObject({ statusCode: 403, code: 'PAYMENT_METHOD_DISABLED' });
    expect(confirm.execute).not.toHaveBeenCalled();
    expect(fail.execute).not.toHaveBeenCalled();
    expect(dedupe.tryMarkAsProcessed).not.toHaveBeenCalled();
  });

  it.each(['', `/${orderId}/pay`, `/${orderId}/refund`])('preserves disabled code on POST /orders%s', async (suffix) => {
    const response = await request(server).post(`/api/orders${suffix}`).send({
      eventId: orderId, items: [], holder: { firstName: 'Test', lastName: 'User', email: 'test@example.com' },
      paymentMethod: 'STRIPE', reason: 'Test',
    }).expect(403);
    expect(response.body).toMatchObject({ statusCode: 403, code: 'PAYMENT_METHOD_DISABLED' });
  });
});