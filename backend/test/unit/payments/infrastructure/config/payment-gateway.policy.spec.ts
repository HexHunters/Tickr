import { PAYMENTS_DISABLED_MESSAGE } from '@modules/payments/application/constants/payment-method-disabled.constants';
import {
  arePaymentGatewaysEnabled,
  assertPaymentGatewaysEnabled,
} from '@modules/payments/infrastructure/config/payment-gateway.policy';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

describe('Payment gateway policy', () => {
  function configWithGateways(enabled: unknown): ConfigService {
    return new ConfigService({ payments: { gateways: { enabled } } });
  }

  function catchForbidden(act: () => void): ForbiddenException {
    try {
      act();
    } catch (error: unknown) {
      if (error instanceof ForbiddenException) {
        return error;
      }
      throw error;
    }
    throw new Error('Expected a ForbiddenException to be thrown');
  }

  describe('arePaymentGatewaysEnabled', () => {
    it('should report gateways as enabled for boolean true', () => {
      expect(arePaymentGatewaysEnabled(configWithGateways(true))).toBe(true);
    });

    it.each([false, undefined, null, 'true', 'false', 1])(
      'should fail closed for gateways.enabled=%p',
      (enabled) => {
        expect(arePaymentGatewaysEnabled(configWithGateways(enabled))).toBe(false);
      },
    );

    it('should fail closed when the payments config is not loaded', () => {
      expect(arePaymentGatewaysEnabled(new ConfigService({}))).toBe(false);
    });
  });

  describe('assertPaymentGatewaysEnabled', () => {
    it('should not throw when gateways are enabled', () => {
      expect(() => assertPaymentGatewaysEnabled(configWithGateways(true))).not.toThrow();
    });

    it.each([false, undefined, 'true', 1])(
      'should throw a 403 PAYMENT_METHOD_DISABLED error for gateways.enabled=%p',
      (enabled) => {
        const error = catchForbidden(() =>
          assertPaymentGatewaysEnabled(configWithGateways(enabled)),
        );

        expect(error.getStatus()).toBe(403);
        expect(error.getResponse()).toEqual({
          code: 'PAYMENT_METHOD_DISABLED',
          message: PAYMENTS_DISABLED_MESSAGE,
        });
      },
    );
  });
});
