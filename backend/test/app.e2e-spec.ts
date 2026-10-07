import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { getTestDatabaseOptions } from './helpers/test-database.config';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const database = getTestDatabaseOptions();
    if (database.type !== 'postgres') throw new Error('PostgreSQL test database required');
    const redisHost = process.env.TEST_REDIS_HOST;
    const redisPort = Number(process.env.TEST_REDIS_PORT);
    if (!redisHost || !['localhost', '127.0.0.1', '::1'].includes(redisHost)
      || !Number.isInteger(redisPort) || redisPort < 1 || redisPort > 65535) {
      throw new Error('Explicit local TEST_REDIS_HOST and TEST_REDIS_PORT are required (disposable Redis)');
    }
    // Validate before importing AppModule: its configuration is evaluated at import time.
    Object.assign(process.env, {
      DB_HOST: database.host, DB_PORT: String(database.port),
      DB_USERNAME: database.username, DB_PASSWORD: database.password,
      DB_DATABASE: database.database, DATABASE_URL: process.env.TEST_DATABASE_URL,
      REDIS_HOST: redisHost, REDIS_PORT: String(redisPort),
      REDIS_PASSWORD: process.env.TEST_REDIS_PASSWORD ?? '',
      JWT_SECRET: 'app-e2e-test-only-secret-not-for-production',
      PAYMENT_GATEWAYS_ENABLED: 'false', OFFLINE_PAYMENT_ENABLED: 'false',
    });
    const { AppModule } = await import('../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('timestamp');
      });
  });
});
