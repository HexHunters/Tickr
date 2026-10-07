import { ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

/** Fail closed when configuration is missing or has not been parsed. */
export function arePaymentGatewaysEnabled(config: ConfigService): boolean {
  return config.get<boolean>('payments.gateways.enabled', false) === true;
}

export function assertPaymentGatewaysEnabled(config: ConfigService): void {
  if (!arePaymentGatewaysEnabled(config)) {
    throw new ForbiddenException({
      code: 'PAYMENT_METHOD_DISABLED',
      message: 'Les paiements en ligne sont désactivés.',
    });
  }
}