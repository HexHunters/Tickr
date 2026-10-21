# Database Migrations

This directory contains TypeORM migrations for the Tickr application.

## Commands

```bash
# Generate a new migration
npm run migration:generate -- src/shared/infrastructure/database/migrations/MigrationName

# Create an empty migration
npm run migration:create -- src/shared/infrastructure/database/migrations/MigrationName

# Run pending migrations
npm run migration:run

# Revert the last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

## Migration Naming Convention

Migrations are automatically prefixed with a timestamp when generated:
- `{timestamp}-InitialSchema.ts`
- `{timestamp}-AddUsersTable.ts`
- `{timestamp}-AddEventsTable.ts`

## Notes

- Migrations will be created as modules are developed
- Each module (users, events, tickets, etc.) will have its own migrations
- Run migrations before starting the application

## Local frontend fixtures

`npm run seed:demo` loads `.env.demo.example`, checks the isolated loopback
`tickr_demo` target, runs normal schema migrations and inserts development data in
one transaction with conflict-safe inserts. Repeated runs do not reset existing
records. The runner lives in the adjacent `seeds/` directory and is never discovered
as a schema migration. See [frontend setup](../../../../../../frontend/README.md)
for services and local accounts. Do not use the demo configuration in deployments.
