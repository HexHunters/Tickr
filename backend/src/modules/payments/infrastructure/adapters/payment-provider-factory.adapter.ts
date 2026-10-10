import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type {
  PaymentProviderPort,
  PaymentProviderFactoryPort,
} from '../../application/ports/payment-provider.port';
import { PaymentMethod } from '../../domain/value-objects/payment-method.vo';
import {
  arePaymentGatewaysEnabled,
  assertPaymentGatewaysEnabled,
} from '../config/payment-gateway.policy';

import { KonnectAdapter } from './konnect.adapter';
import { PaymeeAdapter } from './paymee.adapter';
import { StripeAdapter } from './stripe.adapter';

/**
 * Payment Provider Factory
 *
 * Returns the correct gateway adapter based on PaymentMethod.
 * Implements the Factory pattern for gateway selection.
 */
@Injectable()
export class PaymentProviderFactoryAdapter implements PaymentProviderFactoryPort {
  private readonly logger = new Logger(PaymentProviderFactoryAdapter.name);
  private readonly providers: Map<PaymentMethod, PaymentProviderPort>;

  constructor(
    private readonly stripeAdapter: StripeAdapter,
    private readonly konnectAdapter: KonnectAdapter,
    private readonly paymeeAdapter: PaymeeAdapter,
    private readonly configService: ConfigService,
  ) {
    this.providers = new Map<PaymentMethod, PaymentProviderPort>([
      [PaymentMethod.STRIPE, this.stripeAdapter],
      [PaymentMethod.KONNECT, this.konnectAdapter],
      [PaymentMethod.PAYMEE, this.paymeeAdapter],
    ]);
  }

  getProvider(method: PaymentMethod): PaymentProviderPort {
    assertPaymentGatewaysEnabled(this.configService);
    const provider = this.providers.get(method);

    if (!provider) {
      this.logger.error(`Unsupported payment method: ${method}`);
      throw new Error(`Unsupported payment method: ${method}`);
    }

    return provider;
  }

  getSupportedMethods(): PaymentMethod[] {
    if (!arePaymentGatewaysEnabled(this.configService)) {
      return [];
    }
    // Filter to only return methods with valid credentials configured
    return Array.from(this.providers.entries())
      .filter(([, provider]) => provider.isConfigured())
      .map(([method]) => method);
  }
}
