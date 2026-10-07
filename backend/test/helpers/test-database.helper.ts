import { DataSource } from 'typeorm';

import { getTestDatabaseOptions } from './test-database.config';

/** Suite-local connection; never reuse application credentials or connections. */
export class TestDatabaseHelper {
  private static dataSource: DataSource | undefined;

  static async setup(): Promise<void> {
    const options = getTestDatabaseOptions();
    if (this.dataSource?.isInitialized) return;
    const source = new DataSource(options);
    this.dataSource = source;
    try {
      await source.initialize();
      await this.assertTarget(source);
      await source.runMigrations();
    } catch (error) {
      // Preserve the setup failure even when connection teardown also fails.
      if (source.isInitialized) await source.destroy().catch(() => undefined);
      this.dataSource = undefined;
      throw error;
    }
  }

  private static async assertTarget(source: DataSource): Promise<void> {
    const expected = getTestDatabaseOptions();
    const rows: { database: string }[] = await source.query('SELECT current_database() AS database');
    if (source.options.type !== 'postgres' || rows[0]?.database !== expected.database
      || source.options.database !== expected.database) {
      throw new Error('Refusing test cleanup: connected database differs from the approved target');
    }
  }

  static async cleanup(): Promise<void> {
    const source = this.dataSource;
    if (!source?.isInitialized) return;
    await this.assertTarget(source);
    const quote = (identifier: string): string => `"${identifier.replace(/"/g, '""')}"`;
    const tables = [...new Set(source.entityMetadatas.map((entity) =>
      `${quote(entity.schema || 'public')}.${quote(entity.tableName)}`,
    ))];
    // One schema-qualified statement; no CASCADE into unknown tables.
    // Migration history is not an entity and remains intact.
    if (tables.length) await source.query(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY`);
  }

  static async teardown(): Promise<void> {
    const source = this.dataSource;
    this.dataSource = undefined;
    if (source?.isInitialized) await source.destroy();
  }

  static getDataSource(): DataSource {
    if (!this.dataSource?.isInitialized) throw new Error('Test database has not been initialized');
    return this.dataSource;
  }

  static async reset(): Promise<void> {
    if (!this.dataSource?.isInitialized) await this.setup();
    const source = this.getDataSource();
    await this.assertTarget(source);
    await source.dropDatabase();
    await source.runMigrations();
  }
}

// Call lifecycle methods inside each suite, not Jest globalSetup/globalTeardown:
// connections cannot be shared between Jest's setup process and test workers.
