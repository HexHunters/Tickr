import { resolve } from 'path';

import { getTestDatabaseOptions } from '../../helpers/test-database.config';

const BACKEND_ROOT = resolve(__dirname, '../../..');
const ENTITIES_GLOB = 'src/modules/**/infrastructure/persistence/entities/*orm-entity.ts';
const MIGRATIONS_GLOB = 'src/shared/infrastructure/database/migrations/*.ts';
const APPROVED_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  ALLOW_TEST_DATABASE_RESET: 'true',
  TEST_DATABASE_URL: 'postgresql://tickr:secret@localhost:5432/tickr_test_unit',
};
const OPT_IN_REQUIRED = 'Test database requires NODE_ENV=test and ALLOW_TEST_DATABASE_RESET=true';
const URL_REQUIRED = 'An explicit local TEST_DATABASE_URL is required';
const UNSAFE_TARGET =
  'Test database must be local PostgreSQL named tickr_test_<suffix>, without URL options';

describe('getTestDatabaseOptions', () => {
  describe('reset opt-in', () => {
    it.each<NodeJS.ProcessEnv>([
      { NODE_ENV: 'development' },
      { NODE_ENV: undefined },
      { ALLOW_TEST_DATABASE_RESET: undefined },
      { ALLOW_TEST_DATABASE_RESET: 'TRUE' },
      { ALLOW_TEST_DATABASE_RESET: '1' },
    ])('refuses a valid local URL with %p', (overrides) => {
      expect(() => getTestDatabaseOptions({ ...APPROVED_ENV, ...overrides })).toThrow(
        OPT_IN_REQUIRED,
      );
    });
  });

  describe('connection URL', () => {
    it('never falls back to DATABASE_URL or DB_* settings', () => {
      const env: NodeJS.ProcessEnv = {
        NODE_ENV: 'test',
        ALLOW_TEST_DATABASE_RESET: 'true',
        DATABASE_URL: 'postgresql://p:p@localhost:5432/tickr_test_x',
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_USERNAME: 'p',
        DB_PASSWORD: 'p',
        DB_DATABASE: 'tickr_test_x',
      };

      expect(() => getTestDatabaseOptions(env)).toThrow(URL_REQUIRED);
    });

    it.each(['', 'tickr_test_x'])('requires an absolute URL, not %p', (url) => {
      expect(() => getTestDatabaseOptions({ ...APPROVED_ENV, TEST_DATABASE_URL: url })).toThrow(
        URL_REQUIRED,
      );
    });

    it.each([
      ['a remote host', 'postgresql://u:p@db.prod.internal:5432/tickr_test_x'],
      ['a localhost lookalike host', 'postgresql://u:p@localhost.example.com/tickr_test_x'],
      ['a non-PostgreSQL protocol', 'mysql://u:p@localhost:5432/tickr_test_x'],
      ['the application database', 'postgresql://u:p@localhost:5432/tickr'],
      ['a name without a suffix', 'postgresql://u:p@localhost:5432/tickr_test'],
      ['an empty suffix', 'postgresql://u:p@localhost:5432/tickr_test_'],
      ['an uppercase suffix', 'postgresql://u:p@localhost:5432/tickr_test_X'],
      ['a prefixed name', 'postgresql://u:p@localhost:5432/prod_tickr_test_x'],
      ['a suffix with other characters', 'postgresql://u:p@localhost:5432/tickr_test_x-y'],
      ['URL query options', 'postgresql://u:p@localhost:5432/tickr_test_x?sslmode=disable'],
      ['a URL fragment', 'postgresql://u:p@localhost:5432/tickr_test_x#a'],
    ])('rejects %s', (_case, url) => {
      expect(() => getTestDatabaseOptions({ ...APPROVED_ENV, TEST_DATABASE_URL: url })).toThrow(
        UNSAFE_TARGET,
      );
    });
  });

  describe('accepted targets', () => {
    it('maps an IPv6 loopback URL with percent-encoded credentials', () => {
      const options = getTestDatabaseOptions({
        ...APPROVED_ENV,
        TEST_DATABASE_URL: 'postgresql://ci%40tickr:p%40ss@[::1]:5433/tickr_test_ci',
      });

      expect(options).toMatchObject({
        type: 'postgres',
        host: '::1',
        port: 5433,
        username: 'ci@tickr',
        password: 'p@ss',
        database: 'tickr_test_ci',
      });
    });

    it.each([
      ['localhost', 'postgresql://u:p@localhost/tickr_test_ci'],
      ['127.0.0.1', 'postgres://u:p@127.0.0.1/tickr_test_ci'],
    ])('accepts %s and defaults to port 5432', (host, url) => {
      expect(getTestDatabaseOptions({ ...APPROVED_ENV, TEST_DATABASE_URL: url })).toMatchObject({
        host,
        port: 5432,
        database: 'tickr_test_ci',
      });
    });

    it('prefers TEST_DATABASE_URL over the application database settings', () => {
      const options = getTestDatabaseOptions({
        ...APPROVED_ENV,
        DATABASE_URL: 'postgresql://app:app-secret@db.prod.internal:5432/tickr',
        DB_HOST: 'db.prod.internal',
        DB_PORT: '6543',
        DB_USERNAME: 'app',
        DB_PASSWORD: 'app-secret',
        DB_DATABASE: 'tickr',
      });

      expect(options).toMatchObject({
        host: 'localhost',
        port: 5432,
        username: 'tickr',
        password: 'secret',
        database: 'tickr_test_unit',
      });
    });

    it('never synchronizes or drops the schema and builds it from the source migrations', () => {
      expect(getTestDatabaseOptions(APPROVED_ENV)).toMatchObject({
        synchronize: false,
        dropSchema: false,
        migrationsTableName: 'migrations',
        entities: [resolve(BACKEND_ROOT, ENTITIES_GLOB)],
        migrations: [resolve(BACKEND_ROOT, MIGRATIONS_GLOB)],
      });
    });
  });

  describe('default environment', () => {
    const ENV_KEYS = ['NODE_ENV', 'ALLOW_TEST_DATABASE_RESET', 'TEST_DATABASE_URL'];
    let savedEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      savedEnv = { ...process.env };
    });

    afterEach(() => {
      for (const key of ENV_KEYS) {
        const value = savedEnv[key];
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    });

    it('reads process.env when no environment is passed', () => {
      Object.assign(process.env, APPROVED_ENV);

      expect(getTestDatabaseOptions()).toMatchObject({ database: 'tickr_test_unit' });
    });
  });
});
