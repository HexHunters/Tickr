import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import { ConfigModule } from '@nestjs/config';
import type { ConfigModuleOptions } from '@nestjs/config';
import * as Joi from 'joi';

import paymentsConfig from '@/config/payments.config';

// AppModule passes its ConfigModule.forRoot() options while src/app.module is imported.
// forRoot is stubbed for that import only, so nothing boots: no .env file, database or Redis.
describe('AppModule environment validation', () => {
  // JWT_SECRET is the only required key; every other key in the schema has a default.
  const BASE_ENV = { JWT_SECRET: 'unit-test-only-secret' };
  let options: ConfigModuleOptions;

  beforeAll(() => {
    const forRoot = jest
      .spyOn(ConfigModule, 'forRoot')
      .mockResolvedValue({ module: ConfigModule });
    try {
      jest.requireActual('@/app.module');
      // Imported modules are evaluated first, so the last call is AppModule's own.
      options = forRoot.mock.lastCall?.[0] ?? {};
    } finally {
      forRoot.mockRestore();
    }
  });

  const validate = (env: Record<string, string>): Joi.ValidationResult => {
    const schema: unknown = options.validationSchema;
    if (!Joi.isSchema(schema)) {
      throw new Error('AppModule passed no Joi validationSchema');
    }
    return schema.validate(env, options.validationOptions);
  };

  it('loads the payments config namespace', () => {
    expect(options.load).toContain(paymentsConfig);
  });

  it('defaults the payment flags to gateways off and offline on', () => {
    const { error, value } = validate(BASE_ENV);

    expect(error).toBeUndefined();
    expect(value).toMatchObject({
      PAYMENT_GATEWAYS_ENABLED: 'false',
      OFFLINE_PAYMENT_ENABLED: 'false',
    });
  });

  it('accepts gateways on and offline off at boot', () => {
    const { error, value } = validate({
      ...BASE_ENV,
      PAYMENT_GATEWAYS_ENABLED: 'true',
      OFFLINE_PAYMENT_ENABLED: 'false',
    });

    expect(error).toBeUndefined();
    expect(value).toMatchObject({
      PAYMENT_GATEWAYS_ENABLED: 'true',
      OFFLINE_PAYMENT_ENABLED: 'false',
    });
  });

  it.each([
    ['PAYMENT_GATEWAYS_ENABLED', 'TRUE'],
    ['PAYMENT_GATEWAYS_ENABLED', ' true'],
    ['OFFLINE_PAYMENT_ENABLED', 'yes'],
  ])('rejects %s=%p at boot', (key, value) => {
    const { error } = validate({ ...BASE_ENV, [key]: value });

    expect(error?.details).toEqual([
      expect.objectContaining({ path: [key], type: 'any.only' }),
    ]);
  });
});
