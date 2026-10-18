import 'reflect-metadata';

import { readdirSync } from 'fs';
import { join, relative } from 'path';

import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@shared/infrastructure/database/database.module';
import { DataSource } from 'typeorm';
import type { DataSourceOptions } from 'typeorm';

const SRC_ROOT = join(__dirname, '../../../../src');

type EntityClass = abstract new (...args: never[]) => unknown;

class MetadataOnlyDataSource extends DataSource {
  async loadMetadata(): Promise<void> {
    await this.buildMetadatas();
  }
}

function findOrmEntityFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return findOrmEntityFiles(path);
    return entry.name.endsWith('.orm-entity.ts') ? [path] : [];
  });
}

function findMigrationFiles(): string[] {
  const dir = join(SRC_ROOT, 'shared/infrastructure/database/migrations');
  return readdirSync(dir).filter((name) => /^\d+-.+\.ts$/.test(name));
}

interface FactoryProvider {
  provide: unknown;
  useFactory: (config: ConfigService) => DataSourceOptions;
}

function getRootOptions(): DataSourceOptions {
  const [dynamicModule] = Reflect.getMetadata('imports', DatabaseModule) as Array<{
    imports: Array<{ providers?: FactoryProvider[] }>;
  }>;
  const core = dynamicModule.imports.find((entry) => entry.providers);
  const provider = core?.providers?.find(
    (entry) => entry.provide === 'TypeOrmModuleOptions',
  );
  if (!provider) throw new Error('TypeORM options provider not found');
  return provider.useFactory(new ConfigService({ NODE_ENV: 'production' }));
}

describe('DatabaseModule', () => {
  const options = getRootOptions();

  it('registers every ORM entity defined in the modules', () => {
    const registered = new Set(options.entities as EntityClass[]);
    const unregistered = findOrmEntityFiles(join(SRC_ROOT, 'modules')).flatMap(
      (file) =>
        Object.values(jest.requireActual<Record<string, unknown>>(file))
          .filter(
            (value): value is EntityClass =>
              typeof value === 'function' && !registered.has(value as EntityClass),
          )
          .map((value) => `${relative(SRC_ROOT, file)}#${value.name}`),
    );

    expect(unregistered).toEqual([]);
  });

  it('builds metadata for all six bounded-context schemas', async () => {
    const dataSource = new MetadataOnlyDataSource(options);
    await dataSource.loadMetadata();

    const schemas = new Set(dataSource.entityMetadatas.map((meta) => meta.schema));
    expect([...schemas].sort()).toEqual([
      'analytics',
      'events',
      'notifications',
      'payments',
      'tickets',
      'users',
    ]);
  });

  it('never synchronizes the schema outside development', () => {
    expect(options.synchronize).toBe(false);
  });

  it('loads migrations by the running file extension only', () => {
    const [pattern] = options.migrations as string[];
    expect(pattern).toMatch(/migrations\/\*-\*\.ts$/);
  });

  it('has a uniquely named migration for every migration file', () => {
    const files = findMigrationFiles();
    const timestamps = files.map((name) => name.split('-')[0]);

    expect(files.length).toBeGreaterThanOrEqual(9);
    expect(new Set(timestamps).size).toBe(timestamps.length);
  });
});
