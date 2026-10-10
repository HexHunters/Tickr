import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrencyVO, Currency } from '@shared/domain/value-objects/currency.vo';
import { Money } from '@shared/domain/value-objects/money.vo';
import Stripe from 'stripe';


import type {
  PaymentProviderPort,
  PaymentIntent,
  PaymentResult,
  RefundResult,
} from '../../application/ports/payment-provider.port';
import { OrderEntity } from '../../domain/entities/order.entity';
import {
  arePaymentGatewaysEnabled,
  assertPaymentGatewaysEnabled,
} from '../config/payment-gateway.policy';

/**
 * Stripe Payment Gateway Adapter
 *
 * Handles international payments (EUR, USD).
 * Uses Stripe PaymentIntents API.
 *
 * Amount conversion: Stripe expects amounts in smallest currency unit (cents).
 */
@Injectable()
export class StripeAdapter implements PaymentProviderPort {
  private readonly logger = new Logger(StripeAdapter.name);
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    if (!arePaymentGatewaysEnabled(this.configService)) {
      this.stripe = null;
      this.webhookSecret = '';
      return;
    }
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY', '');
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');

    if (secretKey) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-11-17.clover',
      });
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not configured - Stripe payments will not work');
      this.stripe = null;
    }
  }

  async createPaymentIntent(order: OrderEntity): Promise<PaymentIntent> {
    const stripe = this.getClient();
    this.logger.debug(`Creating Stripe PaymentIntent for order ${order.id}`);

    const amountInSmallestUnit = CurrencyVO.toSmallestUnit(
      order.totalAmount,
      order.currency as Currency,
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSmallestUnit,
      currency: order.currency.toLowerCase(),
      metadata: {
        orderId: order.id,
        eventId: order.eventId,
        userId: order.userId,
      },
      automatic_payment_methods: { enabled: true },
    });

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret ?? undefined,
      status: paymentIntent.status,
    };
  }

  async confirmPayment(paymentIntentId: string): Promise<PaymentResult> {
    const stripe = this.getClient();
    this.logger.debug(`Confirming Stripe payment: ${paymentIntentId}`);

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      success: paymentIntent.status === 'succeeded',
      transactionId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  }

  async refund(paymentIntentId: string, amount: Money): Promise<RefundResult> {
    const stripe = this.getClient();
    this.logger.debug(`Refunding Stripe payment: ${paymentIntentId}`);

    const amountInSmallestUnit = CurrencyVO.toSmallestUnit(
      amount.amount,
      amount.currency as Currency,
    );

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amountInSmallestUnit,
    });

    return {
      success: refund.status === 'succeeded',
      refundId: refund.id,
      amount: refund.amount ?? amountInSmallestUnit,
    };
  }

  verifyWebhook(signature: string, body: unknown): boolean {
    if (!arePaymentGatewaysEnabled(this.configService) || !this.stripe) {
      return false;
    }
    try {
      this.stripe.webhooks.constructEvent(
        body as string | Buffer,
        signature,
        this.webhookSecret,
      );
      return true;
    } catch {
      this.logger.warn('Invalid Stripe webhook signature');
      return false;
    }
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  private getClient(): Stripe {
    assertPaymentGatewaysEnabled(this.configService);
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }
    return this.stripe;
  }
}
