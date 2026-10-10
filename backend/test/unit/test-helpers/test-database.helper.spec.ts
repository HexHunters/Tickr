import type { DataSourceOptions } from 'typeorm';

import { getTestDatabaseOptions } from '../../helpers/test-database.config';
import { TestDatabaseHelper } from '../../helpers/test-database.helper';

interface EntityMetadataStub {
  schema?: string;
  tableName: string;
}

interface PgTableRow {
  schemaname: string;
  tablename: string;
}

interface FakeDataSource {
  readonly options: DataSourceOptions;
  readonly isInitialized: boolean;
  readonly entityMetadatas: EntityMetadataStub[];
  readonly initialize: jest.Mock<Promise<void>, []>;
  readonly destroy: jest.Mock<Promise<void>, []>;
  readonly query: jest.Mock<Promise<unknown[]>, [string]>;
  readonly runMigrations: jest.Mock<Promise<unknown[]>, []>;
  readonly dropDatabase: jest.Mock<Promise<void>, []>;
}

interface MockDatabaseState {
  /** What the server answers to SELECT current_database(). */
  currentDatabase: string;
  /** Rows of pg_catalog.pg_tables. */
  tables: PgTableRow[];
  entities: EntityMetadataStub[];
  /** When set, destroy() rejects and the connection stays open. */
  destroyError: Error | undefined;
  /** Every DataSource the helper constructed, in order. */
  sources: FakeDataSource[];
}

const mockDb: MockDatabaseState = {
  currentDatabase: '',
  tables: [],
  entities: [],
  destroyError: undefined,
  sources: [],
};

jest.mock('typeorm', () => ({
  DataSource: class implements FakeDataSource {
    isInitialized = false;

    readonly initialize = jest.fn(async (): Promise<void> => {
      this.isInitialized = true;
    });

    readonly destroy = jest.fn(async (): Promise<void> => {
      if (mockDb.destroyError) throw mockDb.destroyError;
      this.isInitialized = false;
    });

    readonly query = jest.fn(async (sql: string): Promise<unknown[]> => {
      if (sql.includes('current_database()')) return [{ database: mockDb.currentDatabase }];
      if (sql.includes('pg_catalog.pg_tables')) return mockDb.tables;
      return [];
    });

    readonly runMigrations = jest.fn(async (): Promise<unknown[]> => []);

    readonly dropDatabase = jest.fn(async (): Promise<void> => undefined);

    constructor(readonly options: DataSourceOptions) {
      mockDb.sources.push(this);
    }

    get entityMetadatas(): EntityMetadataStub[] {
      return mockDb.entities;
    }
  },
}));

const ENV_KEYS = ['NODE_ENV', 'ALLOW_TEST_DATABASE_RESET', 'TEST_DATABASE_URL'];
const OPT_IN_REQUIRED = 'Test database requires NODE_ENV=test and ALLOW_TEST_DATABASE_RESET=true';
const REFUSED = 'Refusing test cleanup: connected database differs from the approved target';
const NOT_INITIALIZED = 'Test database has not been initialized';

function onlySource(): FakeDataSource {
  expect(mockDb.sources).toHaveLength(1);
  return mockDb.sources[0];
}

function truncates(source: FakeDataSource): string[] {
  return source.query.mock.calls.map(([sql]) => sql).filter((sql) => sql.startsWith('TRUNCATE'));
}

describe('TestDatabaseHelper', () => {
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    savedEnv = { ...process.env };
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_TEST_DATABASE_RESET = 'true';
    process.env.TEST_DATABASE_URL = 'postgresql://tickr:secret@localhost:5432/tickr_test_unit';
    mockDb.currentDatabase = 'tickr_test_unit';
    mockDb.tables = [];
    mockDb.entities = [];
    mockDb.destroyError = undefined;
    mockDb.sources = [];
  });

  afterEach(async () => {
    mockDb.destroyError = undefined;
    await TestDatabaseHelper.teardown();
    for (const key of ENV_KEYS) {
      const value = savedEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  describe('setup', () => {
    it('connects with the approved test options, checks the target, then migrates', async () => {
      await TestDatabaseHelper.setup();

      const source = onlySource();
      expect(source.options).toEqual(getTestDatabaseOptions());
      expect(source.query).toHaveBeenCalledWith(expect.stringContaining('current_database()'));
      const [connected] = source.initialize.mock.invocationCallOrder;
      const [checked] = source.query.mock.invocationCallOrder;
      const [migrated] = source.runMigrations.mock.invocationCallOrder;
      expect(connected).toBeLessThan(checked);
      expect(checked).toBeLessThan(migrated);
      expect(TestDatabaseHelper.getDataSource()).toBe(source);
    });

    it('refuses and closes a connection to another database without migrating it', async () => {
      mockDb.currentDatabase = 'tickr_dev';

      await expect(TestDatabaseHelper.setup()).rejects.toThrow(REFUSED);

      const source = onlySource();
      expect(source.destroy).toHaveBeenCalledTimes(1);
      expect(source.runMigrations).not.toHaveBeenCalled();
      expect(() => TestDatabaseHelper.getDataSource()).toThrow(NOT_INITIALIZED);
    });

    it('keeps the refusal and hands out nothing when closing also fails', async () => {
      mockDb.currentDatabase = 'tickr_dev';
      mockDb.destroyError = new Error('connection reset');

      await expect(TestDatabaseHelper.setup()).rejects.toThrow(REFUSED);

      const source = onlySource();
      expect(source.destroy).toHaveBeenCalledTimes(1);
      expect(source.isInitialized).toBe(true);
      expect(() => TestDatabaseHelper.getDataSource()).toThrow(NOT_INITIALIZED);
    });

    it('opens no connection without the reset opt-in', async () => {
      delete process.env.ALLOW_TEST_DATABASE_RESET;

      await expect(TestDatabaseHelper.setup()).rejects.toThrow(OPT_IN_REQUIRED);
      expect(mockDb.sources).toHaveLength(0);
    });

    it('reuses an open connection', async () => {
      await TestDatabaseHelper.setup();
      await TestDatabaseHelper.setup();

      const source = onlySource();
      expect(source.initialize).toHaveBeenCalledTimes(1);
      expect(source.runMigrations).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('does nothing before setup', async () => {
      await expect(TestDatabaseHelper.cleanup()).resolves.toBeUndefined();
      expect(mockDb.sources).toHaveLength(0);
    });

    it('does nothing once the connection was closed outside the helper', async () => {
      mockDb.entities = [{ schema: 'users', tableName: 'users' }];
      mockDb.tables = [{ schemaname: 'users', tablename: 'users' }];
      await TestDatabaseHelper.setup();
      const source = onlySource();
      await source.destroy();
      source.query.mockClear();

      await expect(TestDatabaseHelper.cleanup()).resolves.toBeUndefined();
      expect(source.query).not.toHaveBeenCalled();
    });

    it('truncates existing entity tables in one quoted statement without CASCADE', async () => {
      mockDb.entities = [
        { schema: 'users', tableName: 'users' },
        { schema: 'users', tableName: 'users' },
        { tableName: 'we"ird' },
        { schema: 'payments', tableName: 'orders' }, // no migration yet
        { tableName: 'events' }, // only exists in another schema
      ];
      mockDb.tables = [
        { schemaname: 'users', tablename: 'users' },
        { schemaname: 'public', tablename: 'we"ird' },
        { schemaname: 'public', tablename: 'migrations' }, // not an entity
        { schemaname: 'analytics', tablename: 'events' },
      ];
      await TestDatabaseHelper.setup();

      await TestDatabaseHelper.cleanup();

      expect(truncates(onlySource())).toEqual([
        'TRUNCATE TABLE "users"."users", "public"."we""ird" RESTART IDENTITY',
      ]);
    });

    it('issues no TRUNCATE when no entity table exists yet', async () => {
      mockDb.entities = [{ schema: 'payments', tableName: 'orders' }];
      mockDb.tables = [{ schemaname: 'public', tablename: 'migrations' }];
      await TestDatabaseHelper.setup();

      await TestDatabaseHelper.cleanup();

      const source = onlySource();
      expect(source.query).toHaveBeenCalledWith(expect.stringContaining('pg_catalog.pg_tables'));
      expect(truncates(source)).toEqual([]);
    });

    it('refuses to truncate once the connection reports another database', async () => {
      mockDb.entities = [{ schema: 'users', tableName: 'users' }];
      mockDb.tables = [{ schemaname: 'users', tablename: 'users' }];
      await TestDatabaseHelper.setup();
      mockDb.currentDatabase = 'tickr_dev';

      await expect(TestDatabaseHelper.cleanup()).rejects.toThrow(REFUSED);
      expect(truncates(onlySource())).toEqual([]);
    });
  });

  describe('teardown', () => {
    it('closes the connection', async () => {
      await TestDatabaseHelper.setup();
      const source = onlySource();

      await TestDatabaseHelper.teardown();

      expect(source.destroy).toHaveBeenCalledTimes(1);
      expect(() => TestDatabaseHelper.getDataSource()).toThrow(NOT_INITIALIZED);
    });

    it('forgets the connection even when closing it fails', async () => {
      await TestDatabaseHelper.setup();
      const source = onlySource();
      mockDb.destroyError = new Error('connection reset');

      await expect(TestDatabaseHelper.teardown()).rejects.toThrow('connection reset');

      expect(source.isInitialized).toBe(true);
      expect(() => TestDatabaseHelper.getDataSource()).toThrow(NOT_INITIALIZED);
    });
  });

  describe('getDataSource', () => {
    it('throws once the connection was closed outside the helper', async () => {
      await TestDatabaseHelper.setup();
      await onlySource().destroy();

      expect(() => TestDatabaseHelper.getDataSource()).toThrow(NOT_INITIALIZED);
    });
  });

  describe('reset', () => {
    it('re-checks the target, drops the schema, then migrates again', async () => {
      await TestDatabaseHelper.setup();
      const source = onlySource();
      source.query.mockClear();
      source.runMigrations.mockClear();

      await TestDatabaseHelper.reset();

      expect(source.query).toHaveBeenCalledWith(expect.stringContaining('current_database()'));
      expect(source.dropDatabase).toHaveBeenCalledTimes(1);
      expect(source.runMigrations).toHaveBeenCalledTimes(1);
      const [checked] = source.query.mock.invocationCallOrder;
      const [dropped] = source.dropDatabase.mock.invocationCallOrder;
      const [migrated] = source.runMigrations.mock.invocationCallOrder;
      expect(checked).toBeLessThan(dropped);
      expect(dropped).toBeLessThan(migrated);
    });

    it('refuses to drop a database other than the approved target', async () => {
      await TestDatabaseHelper.setup();
      mockDb.currentDatabase = 'tickr_dev';

      await expect(TestDatabaseHelper.reset()).rejects.toThrow(REFUSED);
      expect(onlySource().dropDatabase).not.toHaveBeenCalled();
    });

    it('refuses to drop once the reset opt-in is withdrawn', async () => {
      await TestDatabaseHelper.setup();
      delete process.env.ALLOW_TEST_DATABASE_RESET;

      await expect(TestDatabaseHelper.reset()).rejects.toThrow(OPT_IN_REQUIRED);
      expect(onlySource().dropDatabase).not.toHaveBeenCalled();
    });

    it('connects first when no connection is open', async () => {
      await TestDatabaseHelper.reset();

      const source = onlySource();
      expect(source.dropDatabase).toHaveBeenCalledTimes(1);
      const [dropped] = source.dropDatabase.mock.invocationCallOrder;
      expect(Math.max(...source.runMigrations.mock.invocationCallOrder)).toBeGreaterThan(dropped);
      expect(TestDatabaseHelper.getDataSource()).toBe(source);
    });
  });
});
