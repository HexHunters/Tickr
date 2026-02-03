// Events Module - Infrastructure Layer

// ============================================
// Module
// ============================================
export { EventsModule } from './events.module';

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
// Adapters
// ============================================
export * from './adapters';

// ============================================
// Services (External Adapters)
// ============================================
export * from './services';

// ============================================
// Persistence (TypeORM Entities)
// ============================================
export * from './persistence';
