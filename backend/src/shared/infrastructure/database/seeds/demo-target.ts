export interface DemoTarget {
  nodeEnv?: string;
  host?: string;
  database?: string;
  databaseUrl?: string;
}

/** Fixtures are opt-in and may only be written to an isolated loopback database. */
export function assertDemoTarget(target: DemoTarget): void {
  if (
    target.nodeEnv !== 'development' ||
    target.databaseUrl ||
    !['localhost', '127.0.0.1', '::1'].includes(target.host ?? '') ||
    target.database !== 'tickr_demo'
  ) {
    throw new Error(
      'Demo seed requires NODE_ENV=development, a loopback DB_HOST and DB_DATABASE=tickr_demo without DATABASE_URL.',
    );
  }
}
