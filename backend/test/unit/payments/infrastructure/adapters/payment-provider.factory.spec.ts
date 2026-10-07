import { PaymentMethod } from '@modules/payments/domain/value-objects/payment-method.vo';
import { KonnectAdapter } from '@modules/payments/infrastructure/adapters/konnect.adapter';
import { PaymeeAdapter } from '@modules/payments/infrastructure/adapters/paymee.adapter';
import { PaymentProviderFactoryAdapter } from '@modules/payments/infrastructure/adapters/payment-provider-factory.adapter';
import { StripeAdapter } from '@modules/payments/infrastructure/adapters/stripe.adapter';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

describe('PaymentProviderFactoryAdapter', () => {
  let factory: PaymentProviderFactoryAdapter;
  let mockStripeAdapter: jest.Mocked<StripeAdapter>;
  let mockKonnectAdapter: jest.Mocked<KonnectAdapter>;
  let mockPaymeeAdapter: jest.Mocked<PaymeeAdapter>;

  beforeEach(() => {
    mockStripeAdapter = {} as any;
    mockKonnectAdapter = {} as any;
    mockPaymeeAdapter = {} as any;

    factory = new PaymentProviderFactoryAdapter(
      mockStripeAdapter,
      mockKonnectAdapter,
      mockPaymeeAdapter,
      new ConfigService({ payments: { gateways: { enabled: true } } }),
    );
  });

  it.each([false, undefined, 'false', 'true'])(
    'fails closed for gateways.enabled=%s even when offline policy is enabled',
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

  it.each([false, true])('never exposes OFFLINE with offline.enabled=%s', (enabled) => {
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
});
