import { PAYMENT_PROVIDER_FACTORY } from '@modules/payments/application/ports/payment-provider.port';
import type { PaymentProviderFactoryPort } from '@modules/payments/application/ports/payment-provider.port';
import { PaymentMethod } from '@modules/payments/domain/value-objects/payment-method.vo';
import { KonnectAdapter } from '@modules/payments/infrastructure/adapters/konnect.adapter';
import { PaymeeAdapter } from '@modules/payments/infrastructure/adapters/paymee.adapter';
import { PaymentProviderFactoryAdapter } from '@modules/payments/infrastructure/adapters/payment-provider-factory.adapter';
import { StripeAdapter } from '@modules/payments/infrastructure/adapters/stripe.adapter';
import { ForbiddenException, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import * as Joi from 'joi';
import Stripe from 'stripe';

import paymentsConfig, { paymentFeatureFlagsSchema } from '@/config/payments.config';

jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

// Mirrors PaymentsModule: adapters resolve ConfigService through the bare ConfigModule.
@Module({
  imports: [ConfigModule],
  providers: [
    StripeAdapter,
    KonnectAdapter,
    PaymeeAdapter,
    { provide: PAYMENT_PROVIDER_FACTORY, useClass: PaymentProviderFactoryAdapter },
  ],
})
class GatewayAdaptersTestModule {}

describe('PaymentProviderFactoryAdapter', () => {
  let factory: PaymentProviderFactoryAdapter;
  let mockStripeAdapter: jest.Mocked<StripeAdapter>;
  let mockKonnectAdapter: jest.Mocked<KonnectAdapter>;
  let mockPaymeeAdapter: jest.Mocked<PaymeeAdapter>;

  beforeEach(() => {
    mockStripeAdapter = { isConfigured: jest.fn().mockReturnValue(true) } as any;
    mockKonnectAdapter = { isConfigured: jest.fn().mockReturnValue(true) } as any;
    mockPaymeeAdapter = { isConfigured: jest.fn().mockReturnValue(true) } as any;

    factory = new PaymentProviderFactoryAdapter(
      mockStripeAdapter,
      mockKonnectAdapter,
      mockPaymeeAdapter,
      new ConfigService({ payments: { gateways: { enabled: true } } }),
    );
  });

  it.each([false, undefined, 'false', 'true'])(
    'fails closed for gateways.enabled=%p even when offline policy is enabled',
    (enabled) => {
      const disabledFactory = new PaymentProviderFactoryAdapter(
        mockStripeAdapter,
        mockKonnectAdapter,
        mockPaymeeAdapter,
        new ConfigService({ payments: { gateways: { enabled }, offline: { enabled: true } } }),
      );

      expect(disabledFactory.getSupportedMethods()).toEqual([]);
      for (const method of Object.values(PaymentMethod)) {
        expect(() => disabledFactory.getProvider(method)).toThrow(ForbiddenException);
        try {
          disabledFactory.getProvider(method);
        } catch (error: unknown) {
          expect(error).toBeInstanceOf(ForbiddenException);
          if (error instanceof ForbiddenException) {
            expect(error.getStatus()).toBe(403);
            expect(error.getResponse()).toEqual(expect.objectContaining({
              code: 'PAYMENT_METHOD_DISABLED',
            }));
          }
        }
      }
    },
  );

  it.each([false, true])('never exposes OFFLINE with offline.enabled=%p', (enabled) => {
    const enabledFactory = new PaymentProviderFactoryAdapter(
      mockStripeAdapter,
      mockKonnectAdapter,
      mockPaymeeAdapter,
      new ConfigService({ payments: { gateways: { enabled: true }, offline: { enabled } } }),
    );

    expect(enabledFactory.getSupportedMethods()).toEqual([
      PaymentMethod.STRIPE, PaymentMethod.KONNECT, PaymentMethod.PAYMEE,
    ]);
    expect(enabledFactory.getSupportedMethods()).not.toContain('OFFLINE');
  });

  describe('getProvider', () => {
    it('should return Stripe adapter for STRIPE method', () => {
      const provider = factory.getProvider(PaymentMethod.STRIPE);
      expect(provider).toBe(mockStripeAdapter);
    });

    it('should return Konnect adapter for KONNECT method', () => {
      const provider = factory.getProvider(PaymentMethod.KONNECT);
      expect(provider).toBe(mockKonnectAdapter);
    });

    it('should return Paymee adapter for PAYMEE method', () => {
      const provider = factory.getProvider(PaymentMethod.PAYMEE);
      expect(provider).toBe(mockPaymeeAdapter);
    });

    it('should throw for unsupported payment method', () => {
      expect(() => factory.getProvider('INVALID' as PaymentMethod)).toThrow(
        'Unsupported payment method: INVALID',
      );
    });

    it('should reject an unsupported method as disabled when gateways are disabled', () => {
      const disabledFactory = new PaymentProviderFactoryAdapter(
        mockStripeAdapter,
        mockKonnectAdapter,
        mockPaymeeAdapter,
        new ConfigService({ payments: { gateways: { enabled: false } } }),
      );

      // The gateway gate runs before the provider lookup.
      expect(() => disabledFactory.getProvider('INVALID' as PaymentMethod)).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getSupportedMethods', () => {
    it('should return all supported payment methods', () => {
      const methods = factory.getSupportedMethods();

      expect(methods).toContain(PaymentMethod.STRIPE);
      expect(methods).toContain(PaymentMethod.KONNECT);
      expect(methods).toContain(PaymentMethod.PAYMEE);
      expect(methods).toHaveLength(3);
    });
  });

  describe('with the payments config loaded through Nest DI', () => {
    // Every gateway is fully credentialed, so only PAYMENT_GATEWAYS_ENABLED decides what is exposed.
    const gatewayCredentials = {
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_456',
      KONNECT_API_KEY: 'test_key',
      KONNECT_WALLET_ID: 'wallet_123',
      KONNECT_WEBHOOK_SECRET: 'secret_123',
      PAYMEE_API_KEY: 'test_api_key',
    };
    let originalEnv: NodeJS.ProcessEnv;
    let moduleRef: TestingModule | undefined;

    beforeEach(() => {
      originalEnv = process.env;
      process.env = { ...originalEnv, ...gatewayCredentials };
      delete process.env.PAYMENT_GATEWAYS_ENABLED;
      delete process.env.OFFLINE_PAYMENT_ENABLED;
      jest.clearAllMocks();
    });

    afterEach(async () => {
      await moduleRef?.close();
      moduleRef = undefined;
      process.env = originalEnv;
    });

    async function compileFactory(): Promise<PaymentProviderFactoryPort> {
      moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            ignoreEnvFile: true,
            load: [paymentsConfig],
            validationSchema: Joi.object(paymentFeatureFlagsSchema),
          }),
          GatewayAdaptersTestModule,
        ],
      }).compile();
      return moduleRef.get<PaymentProviderFactoryPort>(PAYMENT_PROVIDER_FACTORY);
    }

    it('builds the Stripe client at boot and lists every gateway for PAYMENT_GATEWAYS_ENABLED="true"', async () => {
      process.env.PAYMENT_GATEWAYS_ENABLED = 'true';

      const providerFactory = await compileFactory();

      expect(Stripe).toHaveBeenCalledTimes(1);
      expect(Stripe).toHaveBeenCalledWith('sk_test_123', expect.anything());
      expect(providerFactory.getSupportedMethods()).toEqual([
        PaymentMethod.STRIPE, PaymentMethod.KONNECT, PaymentMethod.PAYMEE,
      ]);
    });

    it.each(['false', undefined])(
      'skips the Stripe client and lists no gateway for PAYMENT_GATEWAYS_ENABLED=%p',
      async (flag) => {
        if (flag !== undefined) {
          process.env.PAYMENT_GATEWAYS_ENABLED = flag;
        }

        const providerFactory = await compileFactory();

        expect(Stripe).not.toHaveBeenCalled();
        expect(providerFactory.getSupportedMethods()).toEqual([]);
      },
    );
  });
});
