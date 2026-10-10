import { OrderEntity } from '@modules/payments/domain/entities/order.entity';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';
import { StripeAdapter } from '@modules/payments/infrastructure/adapters/stripe.adapter';
import { ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Money } from '@shared/domain/value-objects/money.vo';
import Stripe from 'stripe';


// Mock Stripe SDK
const mockPaymentIntentsCreate = jest.fn();
const mockPaymentIntentsRetrieve = jest.fn();
const mockRefundsCreate = jest.fn();
const mockWebhooksConstructEvent = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: mockPaymentIntentsCreate,
      retrieve: mockPaymentIntentsRetrieve,
    },
    refunds: {
      create: mockRefundsCreate,
    },
    webhooks: {
      constructEvent: mockWebhooksConstructEvent,
    },
  }));
});

describe('StripeAdapter', () => {
  let adapter: StripeAdapter;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          'payments.gateways.enabled': true,
          STRIPE_SECRET_KEY: 'sk_test_123',
          STRIPE_WEBHOOK_SECRET: 'whsec_test_456',
        };
        return config[key] ?? defaultValue;
      }),
    } as any;

    adapter = new StripeAdapter(mockConfigService);
    jest.clearAllMocks();
  });

  function createMockOrder(currency = 'EUR', totalAmount = 50): OrderEntity {
    return OrderEntity.reconstitute({
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      eventId: '550e8400-e29b-41d4-a716-446655440002',
      items: [],
      status: OrderStatus.PENDING,
      subtotalAmount: totalAmount - 2,
      platformFeeAmount: 2,
      paymentFeesAmount: 0,
      totalAmount,
      currency,
      paymentMethod: null,
      paymentGatewayOrderId: null,
      paymentIntentId: null,
      gatewayPaymentRef: null,
      transactionId: null,
      paidAt: null,
      refundedAt: null,
      refundReason: null,
      expiresAt: new Date(),
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  describe('disabled gateways', () => {
    it.each([false, undefined, 'false', 'true'])(
      'boots without credentials or SDK and blocks every method for flag=%p',
      async (enabled) => {
        const disabledAdapter = new StripeAdapter(new ConfigService({
          payments: { gateways: { enabled } },
        }));

        expect(Stripe).not.toHaveBeenCalled();
        const disabledError = { response: expect.objectContaining({ code: 'PAYMENT_METHOD_DISABLED' }) };
        await expect(disabledAdapter.createPaymentIntent(createMockOrder())).rejects.toMatchObject(disabledError);
        await expect(disabledAdapter.confirmPayment('pi_existing')).rejects.toMatchObject(disabledError);
        await expect(disabledAdapter.refund('pi_existing', Money.create(50, 'EUR'))).rejects.toMatchObject(disabledError);
        expect(disabledAdapter.verifyWebhook('valid_sig', 'body')).toBe(false);
        expect(mockPaymentIntentsCreate).not.toHaveBeenCalled();
        expect(mockPaymentIntentsRetrieve).not.toHaveBeenCalled();
        expect(mockRefundsCreate).not.toHaveBeenCalled();
        expect(mockWebhooksConstructEvent).not.toHaveBeenCalled();
      },
    );

    it.each([false, undefined, 'false', 'true'])(
      'skips SDK construction even when credentials are present for flag=%p',
      (enabled) => {
        mockWebhooksConstructEvent.mockReturnValue({ type: 'payment_intent.succeeded' });
        const disabledAdapter = new StripeAdapter(new ConfigService({
          payments: { gateways: { enabled } },
          STRIPE_SECRET_KEY: 'sk_test_123',
          STRIPE_WEBHOOK_SECRET: 'whsec_test_456',
        }));

        expect(Stripe).not.toHaveBeenCalled();
        expect(disabledAdapter.verifyWebhook('valid_sig', 'body')).toBe(false);
        expect(mockWebhooksConstructEvent).not.toHaveBeenCalled();
      },
    );

    it('blocks an initialized SDK when gateways are disabled after boot', async () => {
      mockConfigService.get.mockReturnValue(false);
      // The SDK would accept the signature, so only the gate can reject it.
      mockWebhooksConstructEvent.mockReturnValue({ type: 'payment_intent.succeeded' });
      const disabledError = { response: expect.objectContaining({ code: 'PAYMENT_METHOD_DISABLED' }) };

      await expect(adapter.createPaymentIntent(createMockOrder())).rejects.toMatchObject(disabledError);
      await expect(adapter.confirmPayment('pi_existing')).rejects.toMatchObject(disabledError);
      await expect(adapter.refund('pi_existing', Money.create(50, 'EUR'))).rejects.toMatchObject(disabledError);
      expect(adapter.verifyWebhook('valid_sig', 'body')).toBe(false);
      expect(mockPaymentIntentsCreate).not.toHaveBeenCalled();
      expect(mockPaymentIntentsRetrieve).not.toHaveBeenCalled();
      expect(mockRefundsCreate).not.toHaveBeenCalled();
      expect(mockWebhooksConstructEvent).not.toHaveBeenCalled();
    });
  });

  describe('SDK initialization', () => {
    it('constructs the client with the secret key and the pinned API version', () => {
      new StripeAdapter(mockConfigService);

      expect(Stripe).toHaveBeenCalledTimes(1);
      expect(Stripe).toHaveBeenCalledWith('sk_test_123', { apiVersion: '2025-11-17.clover' });
    });

    describe('when gateways are enabled without STRIPE_SECRET_KEY', () => {
      let unconfiguredAdapter: StripeAdapter;
      let warnSpy: jest.SpyInstance;

      async function expectNotConfigured(call: Promise<unknown>): Promise<void> {
        await expect(call).rejects.toThrow('Stripe is not configured');
        await expect(call).rejects.not.toBeInstanceOf(ForbiddenException);
      }

      beforeEach(() => {
        warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
        unconfiguredAdapter = new StripeAdapter(new ConfigService({
          payments: { gateways: { enabled: true } },
          STRIPE_SECRET_KEY: '',
        }));
      });

      afterEach(() => {
        warnSpy.mockRestore();
      });

      it('boots without a client and warns that Stripe payments will not work', () => {
        expect(Stripe).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('STRIPE_SECRET_KEY not configured'),
        );
      });

      it('rejects API calls as not configured instead of as a disabled 403', async () => {
        await expectNotConfigured(unconfiguredAdapter.createPaymentIntent(createMockOrder()));
        await expectNotConfigured(unconfiguredAdapter.confirmPayment('pi_existing'));
        await expectNotConfigured(
          unconfiguredAdapter.refund('pi_existing', Money.create(50, 'EUR')),
        );
        expect(mockPaymentIntentsCreate).not.toHaveBeenCalled();
        expect(mockPaymentIntentsRetrieve).not.toHaveBeenCalled();
        expect(mockRefundsCreate).not.toHaveBeenCalled();
      });

      it('rejects webhooks without calling the SDK', () => {
        mockWebhooksConstructEvent.mockReturnValue({ type: 'payment_intent.succeeded' });

        expect(unconfiguredAdapter.verifyWebhook('valid_sig', 'body')).toBe(false);
        expect(mockWebhooksConstructEvent).not.toHaveBeenCalled();
      });
    });
  });

  describe('createPaymentIntent', () => {
    it('should create PaymentIntent with correct amount in cents for EUR', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_abc',
        status: 'requires_payment_method',
      });

      const order = createMockOrder('EUR', 50);
      const result = await adapter.createPaymentIntent(order);

      expect(result.id).toBe('pi_test_123');
      expect(result.clientSecret).toBe('pi_test_123_secret_abc');
      expect(result.status).toBe('requires_payment_method');

      // EUR: 50 × 100 = 5000 cents
      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith({
        amount: 5000,
        currency: 'eur',
        metadata: {
          orderId: order.id,
          eventId: order.eventId,
          userId: order.userId,
        },
        automatic_payment_methods: { enabled: true },
      });
    });

    it('should create PaymentIntent with correct amount in cents for USD', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_usd_456',
        client_secret: 'pi_usd_456_secret',
        status: 'requires_payment_method',
      });

      const order = createMockOrder('USD', 25);
      const result = await adapter.createPaymentIntent(order);

      expect(result.id).toBe('pi_usd_456');
      // USD: 25 × 100 = 2500 cents
      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 2500, currency: 'usd' }),
      );
    });

    it('should handle null client_secret', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_no_secret',
        client_secret: null,
        status: 'requires_confirmation',
      });

      const order = createMockOrder();
      const result = await adapter.createPaymentIntent(order);

      expect(result.clientSecret).toBeUndefined();
    });

    it('should propagate Stripe API errors', async () => {
      mockPaymentIntentsCreate.mockRejectedValue(
        new Error('Your card was declined'),
      );

      const order = createMockOrder();
      await expect(adapter.createPaymentIntent(order)).rejects.toThrow(
        'Your card was declined',
      );
    });
  });

  describe('confirmPayment', () => {
    it('should return success for succeeded payment', async () => {
      mockPaymentIntentsRetrieve.mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 5000,
        currency: 'eur',
      });

      const result = await adapter.confirmPayment('pi_test_123');

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('pi_test_123');
      expect(result.amount).toBe(5000);
      expect(result.currency).toBe('eur');
    });

    it('should return failure for non-succeeded payment', async () => {
      mockPaymentIntentsRetrieve.mockResolvedValue({
        id: 'pi_test_456',
        status: 'requires_payment_method',
        amount: 2500,
        currency: 'usd',
      });

      const result = await adapter.confirmPayment('pi_test_456');

      expect(result.success).toBe(false);
      expect(result.transactionId).toBe('pi_test_456');
    });
  });

  describe('refund', () => {
    it('should create refund with correct amount', async () => {
      mockRefundsCreate.mockResolvedValue({
        id: 're_test_789',
        status: 'succeeded',
        amount: 3000,
      });

      const amount = Money.create(30, 'EUR');
      const result = await adapter.refund('pi_test_123', amount);

      expect(result.success).toBe(true);
      expect(result.refundId).toBe('re_test_789');
      expect(result.amount).toBe(3000);

      // EUR: 30 × 100 = 3000 cents
      expect(mockRefundsCreate).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        amount: 3000,
      });
    });

    it('should handle partial refund', async () => {
      mockRefundsCreate.mockResolvedValue({
        id: 're_partial_123',
        status: 'succeeded',
        amount: 1000,
      });

      const amount = Money.create(10, 'EUR');
      const result = await adapter.refund('pi_test_123', amount);

      expect(result.success).toBe(true);
      expect(result.amount).toBe(1000);
    });

    it('should handle refund with null amount in response', async () => {
      mockRefundsCreate.mockResolvedValue({
        id: 're_null_amt',
        status: 'succeeded',
        amount: null,
      });

      const amount = Money.create(20, 'EUR');
      const result = await adapter.refund('pi_test_123', amount);

      expect(result.success).toBe(true);
      // Falls back to calculated amount (20 × 100 = 2000)
      expect(result.amount).toBe(2000);
    });

    it('should return failure for failed refund', async () => {
      mockRefundsCreate.mockResolvedValue({
        id: 're_fail_123',
        status: 'failed',
        amount: 5000,
      });

      const amount = Money.create(50, 'EUR');
      const result = await adapter.refund('pi_test_123', amount);

      expect(result.success).toBe(false);
    });
  });

  describe('verifyWebhook', () => {
    it('should return true for valid signature', () => {
      mockWebhooksConstructEvent.mockReturnValue({ type: 'payment_intent.succeeded' });

      const result = adapter.verifyWebhook('valid_sig', 'body');
      expect(result).toBe(true);
    });

    it('should check the signature against STRIPE_WEBHOOK_SECRET', () => {
      mockWebhooksConstructEvent.mockReturnValue({ type: 'payment_intent.succeeded' });

      adapter.verifyWebhook('valid_sig', 'raw_body');

      expect(mockWebhooksConstructEvent).toHaveBeenCalledTimes(1);
      expect(mockWebhooksConstructEvent).toHaveBeenCalledWith('raw_body', 'valid_sig', 'whsec_test_456');
    });

    it('should return false for invalid signature', () => {
      mockWebhooksConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const result = adapter.verifyWebhook('invalid_sig', 'body');
      expect(result).toBe(false);
    });
  });
});
