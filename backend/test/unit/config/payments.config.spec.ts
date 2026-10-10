import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
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

  it.each(['', '1', '0', 'yes', 'TRUE', 'False', ' true', 'true '])(
    'rejects malformed flag %p',
    (value) => {
      for (const key of Object.keys(paymentFeatureFlagsSchema)) {
        expect(schema.validate({ [key]: value }).error).toBeDefined();
      }
    },
  );

  // Fails closed when Joi is bypassed, e.g. a test module that loads the factory without a schema.
  it.each(['TRUE', ' true', 'true ', '1', 'yes', ''])(
    'keeps both flags off for %p when the factory runs without Joi',
    (value) => {
      process.env.PAYMENT_GATEWAYS_ENABLED = value;
      process.env.OFFLINE_PAYMENT_ENABLED = value;

      expect(paymentsConfig()).toMatchObject({
        gateways: { enabled: false }, offline: { enabled: false },
      });
    },
  );

  describe('ConfigModule wiring', () => {
    let envSnapshot: NodeJS.ProcessEnv;

    beforeEach(() => {
      // ConfigModule.forRoot writes the validated defaults back into process.env.
      envSnapshot = { ...process.env };
      delete process.env.PAYMENT_GATEWAYS_ENABLED;
      delete process.env.OFFLINE_PAYMENT_ENABLED;
    });

    afterEach(() => {
      for (const key of Object.keys(process.env)) {
        if (!(key in envSnapshot)) delete process.env[key];
      }
      Object.assign(process.env, envSnapshot);
    });

    const loadConfig = async (): Promise<ConfigService> => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          await ConfigModule.forRoot({
            ignoreEnvFile: true,
            load: [paymentsConfig],
            validationSchema: Joi.object(paymentFeatureFlagsSchema),
          }),
        ],
      }).compile();
      return moduleRef.get(ConfigService);
    };

    it('serves the defaults under the payments namespace when both flags are unset', async () => {
      const config = await loadConfig();

      expect(config.get('payments.gateways.enabled')).toBe(false);
      expect(config.get('payments.offline.enabled')).toBe(true);
    });

    it('enables gateways for an exact "true"', async () => {
      process.env.PAYMENT_GATEWAYS_ENABLED = 'true';

      const config = await loadConfig();

      expect(config.get('payments.gateways.enabled')).toBe(true);
    });

    it('fails the boot on a malformed flag', async () => {
      process.env.PAYMENT_GATEWAYS_ENABLED = 'TRUE';

      await expect(loadConfig()).rejects.toThrow(
        /Config validation error: "PAYMENT_GATEWAYS_ENABLED" must be one of/,
      );
    });
  });
});
