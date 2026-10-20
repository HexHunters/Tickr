import { assertDemoTarget } from '@shared/infrastructure/database/seeds/demo-target';

describe('demo seed target', () => {
  const local = {
    nodeEnv: 'development',
    host: '127.0.0.1',
    database: 'tickr_demo',
  };
  it('allows the explicit local demo database', () => {
    expect(() => assertDemoTarget(local)).not.toThrow();
  });
  it.each([
    { ...local, nodeEnv: 'production' },
    { ...local, nodeEnv: 'test' },
    { ...local, host: 'db.example.com' },
    { ...local, database: 'tickr' },
    { ...local, databaseUrl: 'postgres://localhost/tickr_demo' },
  ])('rejects other database targets', (target) => {
    expect(() => assertDemoTarget(target)).toThrow('Demo seed requires');
  });
});
