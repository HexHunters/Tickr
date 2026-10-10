import type { PaymentEventQueryPort } from '@modules/payments/application/ports/event-query.port';
import type { PaymentProviderFactoryPort } from '@modules/payments/application/ports/payment-provider.port';
import { PaymentMethod } from '@modules/payments/domain/value-objects/payment-method.vo';
import { KonnectAdapter } from '@modules/payments/infrastructure/adapters/konnect.adapter';
import { PaymeeAdapter } from '@modules/payments/infrastructure/adapters/paymee.adapter';
import { PaymentProviderFactoryAdapter } from '@modules/payments/infrastructure/adapters/payment-provider-factory.adapter';
import { StripeAdapter } from '@modules/payments/infrastructure/adapters/stripe.adapter';
import { PublicConfigController } from '@modules/payments/infrastructure/controllers/public-config.controller';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

describe('PublicConfigController', () => {
  const eventId = '550e8400-e29b-41d4-a716-446655440001';
  let eventQuery: jest.Mocked<PaymentEventQueryPort>;
  let providerFactory: jest.Mocked<PaymentProviderFactoryPort>;
  let controller: PublicConfigController;

  beforeEach(() => {
    const configService = {
      get: jest.fn((key: string, defaultValue?: number) => {
        if (key === 'payments.commission.rate') return 0.06;
        if (key === 'payments.order.expirationMinutes') return 15;
        return defaultValue;
      }),
    } as unknown as ConfigService;
    eventQuery = {
      getEventById: jest.fn(),
      getTicketType: jest.fn(),
    };
    providerFactory = {
      getProvider: jest.fn(),
      getSupportedMethods: jest.fn().mockReturnValue([
        PaymentMethod.STRIPE, PaymentMethod.KONNECT, PaymentMethod.PAYMEE,
      ]),
    };
    controller = new PublicConfigController(configService, eventQuery, providerFactory);
  });

  it('should return the global commission without an event', async () => {
    await expect(controller.getPublicConfig({})).resolves.toEqual({
      availablePaymentMethods: [PaymentMethod.STRIPE, PaymentMethod.KONNECT, PaymentMethod.PAYMEE],
      globalCommissionRate: 0.06,
      commissionRateOverride: null,
      effectiveCommissionRate: 0.06,
      currency: 'TND',
      reservationTtlMinutes: 15,
    });
  });

  it.each<{ methods: PaymentMethod[] }>([
    { methods: [] },
    { methods: [PaymentMethod.KONNECT] },
  ])('returns factory methods $methods without inventing offline availability', async ({ methods }) => {
    providerFactory.getSupportedMethods.mockReturnValue(methods);
    const config = new ConfigService({
      payments: {
        gateways: { enabled: true },
        offline: { enabled: true },
        commission: { rate: 0.06 },
        order: { expirationMinutes: 15 },
      },
    });
    controller = new PublicConfigController(config, eventQuery, providerFactory);

    const result = await controller.getPublicConfig({});

    expect(result.availablePaymentMethods).toEqual(methods);
    expect(result.availablePaymentMethods).not.toContain('OFFLINE');
    expect(result.effectiveCommissionRate).toBe(0.06);
    expect(result.currency).toBe('TND');
    expect(result.reservationTtlMinutes).toBe(15);
    expect(providerFactory.getSupportedMethods).toHaveBeenCalledTimes(1);
    expect(providerFactory.getProvider).not.toHaveBeenCalled();
  });

  it('should return the event commission override as the effective rate', async () => {
    eventQuery.getEventById.mockResolvedValue({
      id: eventId,
      title: 'Test Event',
      status: 'PUBLISHED',
      startDate: new Date(),
      organizerId: '550e8400-e29b-41d4-a716-446655440002',
      commissionRateOverride: 0.03,
    });

    const result = await controller.getPublicConfig({ eventId });

    expect(result.globalCommissionRate).toBe(0.06);
    expect(result.commissionRateOverride).toBe(0.03);
    expect(result.effectiveCommissionRate).toBe(0.03);
  });

  it('should reject an unknown event', async () => {
    eventQuery.getEventById.mockResolvedValue(null);

    await expect(controller.getPublicConfig({ eventId })).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('with the real provider factory and adapters', () => {
    // Every gateway has credentials, so all three are expected whether or not the
    // factory ever starts hiding unconfigured providers.
    const credentials = {
      STRIPE_SECRET_KEY: 'sk_test_unit',
      STRIPE_WEBHOOK_SECRET: 'whsec_unit',
      KONNECT_API_KEY: 'konnect-unit-key',
      KONNECT_WALLET_ID: 'konnect-unit-wallet',
      KONNECT_WEBHOOK_SECRET: 'konnect-unit-secret',
      PAYMEE_API_KEY: 'paymee-unit-key',
    };
    const allMethods = [PaymentMethod.STRIPE, PaymentMethod.KONNECT, PaymentMethod.PAYMEE];
    // ConfigService falls back to process.env for keys missing from its own config.
    const fallbackEnvKeys = ['PLATFORM_COMMISSION_RATE', 'ORDER_EXPIRATION_MINUTES'];
    let savedEnv: Record<string, string | undefined>;

    const createController = (settings: Record<string, unknown>) => {
      const configService = new ConfigService({
        ...credentials,
        payments: { gateways: { enabled: true } },
        ...settings,
      });
      const factory = new PaymentProviderFactoryAdapter(
        new StripeAdapter(configService),
        new KonnectAdapter(configService),
        new PaymeeAdapter(configService),
        configService,
      );
      return new PublicConfigController(configService, eventQuery, factory);
    };

    beforeEach(() => {
      savedEnv = Object.fromEntries(fallbackEnvKeys.map((key) => [key, process.env[key]]));
      for (const key of fallbackEnvKeys) delete process.env[key];
    });

    afterEach(() => {
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    });

    it('lists every enabled gateway and falls back to the default commission and TTL', async () => {
      const result = await createController({}).getPublicConfig({});

      expect(result).toEqual({
        availablePaymentMethods: allMethods,
        globalCommissionRate: 0.06,
        commissionRateOverride: null,
        effectiveCommissionRate: 0.06,
        currency: 'TND',
        reservationTtlMinutes: 15,
      });
    });

    it('lists every enabled gateway on the event override path', async () => {
      eventQuery.getEventById.mockResolvedValue({
        id: eventId,
        title: 'Test Event',
        status: 'PUBLISHED',
        startDate: new Date(),
        organizerId: '550e8400-e29b-41d4-a716-446655440002',
        commissionRateOverride: 0.03,
      });

      const result = await createController({}).getPublicConfig({ eventId });

      expect(eventQuery.getEventById).toHaveBeenCalledWith(eventId);
      expect(result).toEqual({
        availablePaymentMethods: allMethods,
        globalCommissionRate: 0.06,
        commissionRateOverride: 0.03,
        effectiveCommissionRate: 0.03,
        currency: 'TND',
        reservationTtlMinutes: 15,
      });
    });

    it.each([
      {
        source: 'the flat keys when the payments namespace has none',
        settings: { PLATFORM_COMMISSION_RATE: 0.1, ORDER_EXPIRATION_MINUTES: 30 },
        rate: 0.1,
        ttl: 30,
      },
      {
        source: 'the payments namespace over the flat keys',
        settings: {
          PLATFORM_COMMISSION_RATE: 0.1,
          ORDER_EXPIRATION_MINUTES: 30,
          payments: {
            gateways: { enabled: true },
            commission: { rate: 0.08 },
            order: { expirationMinutes: 20 },
          },
        },
        rate: 0.08,
        ttl: 20,
      },
    ])('reads the commission and TTL from $source', async ({ settings, rate, ttl }) => {
      const result = await createController(settings).getPublicConfig({});

      expect(result).toMatchObject({
        availablePaymentMethods: allMethods,
        globalCommissionRate: rate,
        effectiveCommissionRate: rate,
        reservationTtlMinutes: ttl,
      });
    });
  });
});