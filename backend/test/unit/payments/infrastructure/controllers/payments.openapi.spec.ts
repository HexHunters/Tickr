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
import { PaymentMethod } from '@modules/payments/domain/value-objects/payment-method.vo';
import { OrdersController } from '@modules/payments/infrastructure/controllers/orders.controller';
import { PublicConfigController } from '@modules/payments/infrastructure/controllers/public-config.controller';
import { WebhooksController } from '@modules/payments/infrastructure/controllers/webhooks.controller';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';

// The OpenAPI contract clients read for the payment launch. Built like main.ts builds it
// (global 'api' prefix, default createDocument options), over the payment controllers only.
describe('Payments OpenAPI document', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [OrdersController, WebhooksController, PublicConfigController],
      providers: [
        { provide: ConfigService, useValue: new ConfigService({}) },
        { provide: CreateOrderHandler, useValue: { execute: jest.fn() } },
        { provide: ProcessPaymentHandler, useValue: { execute: jest.fn() } },
        { provide: RequestRefundHandler, useValue: { execute: jest.fn() } },
        { provide: GetOrderByIdHandler, useValue: { execute: jest.fn() } },
        { provide: GetOrdersByUserHandler, useValue: { execute: jest.fn() } },
        { provide: ConfirmPaymentHandler, useValue: { execute: jest.fn() } },
        { provide: FailPaymentHandler, useValue: { execute: jest.fn() } },
        {
          provide: PAYMENT_PROVIDER_FACTORY,
          useValue: { getProvider: jest.fn(), getSupportedMethods: jest.fn() },
        },
        {
          provide: WEBHOOK_EVENT_STORE,
          useValue: { tryMarkAsProcessed: jest.fn(), isProcessed: jest.fn() },
        },
        {
          provide: PAYMENT_EVENT_QUERY_PORT,
          useValue: { getEventById: jest.fn(), getTicketType: jest.fn() },
        },
      ],
    }).compile();

    app = module.createNestApplication({ logger: false });
    // main.ts prefixes every route with app.apiPrefix, which defaults to 'api'.
    app.setGlobalPrefix('api');
    document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
  });

  afterAll(async () => {
    await app?.close();
  });

  it('documents availablePaymentMethods as a required array of PaymentMethod values', () => {
    const schema = document.components?.schemas?.PublicConfigResponse;

    expect(document.paths['/api/config/public']?.get?.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/PublicConfigResponse' },
        },
      },
    });
    expect(schema).toMatchObject({
      properties: {
        availablePaymentMethods: {
          type: 'array',
          items: { type: 'string', enum: Object.values(PaymentMethod) },
        },
      },
    });
    expect(schema).toHaveProperty(
      'required',
      expect.arrayContaining(['availablePaymentMethods']),
    );
  });

  it.each(['/api/orders', '/api/orders/{id}/pay', '/api/orders/{id}/refund'])(
    'documents the PAYMENT_METHOD_DISABLED 403 on POST %s',
    (path) => {
      expect(document.paths[path]?.post?.responses['403']).toMatchObject({
        description: expect.stringContaining('PAYMENT_METHOD_DISABLED'),
      });
    },
  );

  it('documents the per-user rate limit as 429 on POST /api/orders', () => {
    expect(document.paths['/api/orders']?.post?.responses['429']).toMatchObject({
      description: expect.stringMatching(/rate limit/i),
    });
    // 403 should only mention PAYMENT_METHOD_DISABLED, not rate limit
    const response403 = document.paths['/api/orders']?.post?.responses['403'] as { description?: string } | undefined;
    expect(response403?.description).not.toMatch(/rate limit/i);
  });

  it('keeps the gateway webhook endpoints out of the document', () => {
    // The controller is registered, so an empty list means its endpoints are excluded.
    expect(app.get(WebhooksController)).toBeInstanceOf(WebhooksController);
    expect(
      Object.keys(document.paths).filter((path) => path.includes('/payments/webhooks')),
    ).toEqual([]);
  });
});
