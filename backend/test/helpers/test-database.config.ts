import { resolve } from 'path';

import type { DataSourceOptions } from 'typeorm';

/** Local disposable services only. Never fall back to DATABASE_URL/DB_DATABASE. */
export function getTestDatabaseOptions(env: NodeJS.ProcessEnv = process.env): DataSourceOptions {
  if (env.NODE_ENV !== 'test' || env.ALLOW_TEST_DATABASE_RESET !== 'true') {
    throw new Error('Test database requires NODE_ENV=test and ALLOW_TEST_DATABASE_RESET=true');
  }
  let url: URL;
  try {
    url = new URL(env.TEST_DATABASE_URL ?? '');
  } catch {
    throw new Error('An explicit local TEST_DATABASE_URL is required');
  }
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
    || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || !/^tickr_test_[a-z0-9_]+$/.test(database)
    || url.search || url.hash) {
    throw new Error('Test database must be local PostgreSQL named tickr_test_<suffix>, without URL options');
  }
  return {
    type: 'postgres',
    host: url.hostname === '[::1]' ? '::1' : url.hostname,
    port: Number(url.port || 5432),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    entities: [resolve(__dirname, '../../src/modules/**/infrastructure/persistence/entities/*orm-entity.ts')],
    migrations: [resolve(__dirname, '../../src/shared/infrastructure/database/migrations/*.ts')],
    synchronize: false,
    dropSchema: false,
    logging: false,
    migrationsTableName: 'migrations',
  };
}