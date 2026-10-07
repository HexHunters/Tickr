import { afterEach, describe, expect, it } from '@jest/globals';
import * as Joi from 'joi';

import paymentsConfig, { paymentFeatureFlagsSchema } from '../../../src/config/payments.config';

describe('Payment launch configuration', () => {
  const schema = Joi.object(paymentFeatureFlagsSchema);
  const originalGateways = process.env.PAYMENT_GATEWAYS_ENABLED;
  const originalOffline = process.env.OFFLINE_PAYMENT_ENABLED;

  afterEach(() => {
    if (originalGateways === undefined) delete process.env.PAYMENT_GATEWAYS_ENABLED;
    else process.env.PAYMENT_GATEWAYS_ENABLED = originalGateways;
    if (originalOffline === undefined) delete process.env.OFFLINE_PAYMENT_ENABLED;
    else process.env.OFFLINE_PAYMENT_ENABLED = originalOffline;
  });

  it('defaults to disabled gateways and an offline policy flag only', () => {
    delete process.env.PAYMENT_GATEWAYS_ENABLED;
    delete process.env.OFFLINE_PAYMENT_ENABLED;
    expect(paymentsConfig()).toMatchObject({
      gateways: { enabled: false }, offline: { enabled: true },
    });
    expect(schema.validate({}).value).toEqual({
      PAYMENT_GATEWAYS_ENABLED: 'false', OFFLINE_PAYMENT_ENABLED: 'true',
    });
  });

  it.each([
    ['false', 'false', false, false],
    ['false', 'true', false, true],
    ['true', 'false', true, false],
    ['true', 'true', true, true],
  ])('parses gateway=%s offline=%s explicitly', (gateways, offline, gatewayValue, offlineValue) => {
    process.env.PAYMENT_GATEWAYS_ENABLED = String(gateways);
    process.env.OFFLINE_PAYMENT_ENABLED = String(offline);
    expect(schema.validate({
      PAYMENT_GATEWAYS_ENABLED: gateways, OFFLINE_PAYMENT_ENABLED: offline,
    }).error).toBeUndefined();
    expect(paymentsConfig()).toMatchObject({
      gateways: { enabled: gatewayValue }, offline: { enabled: offlineValue },
    });
  });

  it.each(['', '1', '0', 'yes', 'TRUE', 'False'])('rejects malformed flag %s', (value) => {
    for (const key of Object.keys(paymentFeatureFlagsSchema)) {
      expect(schema.validate({ [key]: value }).error).toBeDefined();
    }
  });
});