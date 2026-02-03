// Events Module - Infrastructure Layer

// ============================================
// Controllers
// ============================================
export { EventsController } from './controllers/events.controller';

// ============================================
// Guards
// ============================================
export * from './guards';

// ============================================
// Repositories
// ============================================
export { EventTypeOrmRepository } from './repositories/event.repository';
export { TicketTypeTypeOrmRepository } from './repositories/ticket-type.repository';

// ============================================
// Services (External Adapters)
// ============================================
export * from './services';

// ============================================
// Persistence (TypeORM Entities)
// ============================================
export * from './persistence';
