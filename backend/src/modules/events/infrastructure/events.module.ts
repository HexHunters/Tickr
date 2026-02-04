import { Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

// ============================================
// Shared Infrastructure
// ============================================
import { CacheModule } from '@shared/infrastructure/cache/cache.module';

// ============================================
// Cross-Module Import (Users Module)
// ============================================
import { UsersModule } from '@modules/users/infrastructure/users.module';

// ============================================
// Application Layer - Command Handlers
// ============================================
import { CreateEventHandler } from '../application/commands/create-event/create-event.handler';
import { UpdateEventHandler } from '../application/commands/update-event/update-event.handler';
import { PublishEventHandler } from '../application/commands/publish-event/publish-event.handler';
import { CancelEventHandler } from '../application/commands/cancel-event/cancel-event.handler';
import { AddTicketTypeHandler } from '../application/commands/add-ticket-type/add-ticket-type.handler';
import { UpdateTicketTypeHandler } from '../application/commands/update-ticket-type/update-ticket-type.handler';
import { RemoveTicketTypeHandler } from '../application/commands/remove-ticket-type/remove-ticket-type.handler';
import { UploadEventImageHandler } from '../application/commands/upload-event-image/upload-event-image.handler';
import { CompleteEventHandler } from '../application/commands/complete-event/complete-event.handler';

// ============================================
// Application Layer - Query Handlers
// ============================================
import { GetEventByIdHandler } from '../application/queries/get-event-by-id/get-event-by-id.handler';
import { GetPublishedEventsHandler } from '../application/queries/get-published-events/get-published-events.handler';
import { SearchEventsHandler } from '../application/queries/search-events/search-events.handler';
import { GetEventsByCategoryHandler } from '../application/queries/get-events-by-category/get-events-by-category.handler';
import { GetUpcomingEventsHandler } from '../application/queries/get-upcoming-events/get-upcoming-events.handler';
import { GetOrganizerEventsHandler } from '../application/queries/get-organizer-events/get-organizer-events.handler';

// ============================================
// Application Layer - Event Handlers (Cross-Module)
// ============================================
import { EventPublishedEventHandler } from '../application/event-handlers/event-published.handler';
import { EventCancelledEventHandler } from '../application/event-handlers/event-cancelled.handler';
import { TicketTypeSoldOutEventHandler } from '../application/event-handlers/ticket-type-sold-out.handler';

// ============================================
// Application Layer - Ports & Services
// ============================================
import { EVENT_REPOSITORY } from '../application/ports/event.repository.port';
import { USER_VALIDATION_SERVICE } from '../application/ports/user-validation.service.port';
import { EventSchedulerService } from '../application/services/event-scheduler.service';

// ============================================
// Infrastructure Layer - Persistence
// ============================================
import { EventOrmEntity } from './persistence/entities/event.orm-entity';
import { TicketTypeOrmEntity } from './persistence/entities/ticket-type.orm-entity';
import { EventMapper } from './persistence/mappers/event.mapper';
import { TicketTypeMapper } from './persistence/mappers/ticket-type.mapper';

// ============================================
// Infrastructure Layer - Repositories
// ============================================
import { EventTypeOrmRepository } from './repositories/event.repository';
import { TicketTypeTypeOrmRepository } from './repositories/ticket-type.repository';

// ============================================
// Infrastructure Layer - Adapters
// ============================================
import { UserValidationServiceAdapter } from './adapters/user-validation.service.adapter';

// ============================================
// Infrastructure Layer - Services
// ============================================
import { S3StorageService } from './services/s3-storage.service';
import { EventCacheService } from './services/event-cache.service';

// ============================================
// Infrastructure Layer - Controllers
// ============================================
import { EventsController } from './controllers/events.controller';

// ============================================
// Infrastructure Layer - Guards
// ============================================
import { IsEventOwnerGuard } from './guards/is-event-owner.guard';

// ============================================
// Command Handlers Collection
// ============================================
const CommandHandlers = [
  CreateEventHandler,
  UpdateEventHandler,
  PublishEventHandler,
  CancelEventHandler,
  AddTicketTypeHandler,
  UpdateTicketTypeHandler,
  RemoveTicketTypeHandler,
  UploadEventImageHandler,
  CompleteEventHandler,
];

// ============================================
// Query Handlers Collection
// ============================================
const QueryHandlers = [
  GetEventByIdHandler,
  GetPublishedEventsHandler,
  SearchEventsHandler,
  GetEventsByCategoryHandler,
  GetUpcomingEventsHandler,
  GetOrganizerEventsHandler,
];

// ============================================
// Event Handlers Collection (Cross-Module Communication)
// ============================================
const EventHandlers = [
  EventPublishedEventHandler,
  EventCancelledEventHandler,
  TicketTypeSoldOutEventHandler,
];

// ============================================
// Repository Provider
// ============================================
const repositoryProvider: Provider = {
  provide: EVENT_REPOSITORY,
  useClass: EventTypeOrmRepository,
};

// ============================================
// User Validation Service Provider
// ============================================
const userValidationServiceProvider: Provider = {
  provide: USER_VALIDATION_SERVICE,
  useClass: UserValidationServiceAdapter,
};

/**
 * Events Module
 *
 * Bounded context for event management including:
 * - Event creation and lifecycle management
 * - Ticket type configuration
 * - Image upload and storage
 * - Event publishing workflow
 * - Capacity management
 * - Scheduled tasks (event completion)
 *
 * Architecture:
 * - Follows Hexagonal Architecture (Ports & Adapters)
 * - Uses CQRS pattern for command/query separation
 * - Event-driven for cross-module communication
 * - Repository pattern abstracts persistence
 *
 * Cross-Module Dependencies:
 * - UsersModule: For organizer validation
 *
 * Future Integrations (via Event Handlers):
 * - NotificationsModule: Event publishing, cancellation, sold out alerts
 * - PaymentsModule: Refunds on event cancellation
 * - AnalyticsModule: Event metrics and recommendations
 */
@Module({
  imports: [
    // TypeORM for persistence
    TypeOrmModule.forFeature([EventOrmEntity, TicketTypeOrmEntity]),

    // CQRS for command/query separation
    CqrsModule,

    // Config module for S3 and scheduler configuration
    ConfigModule,

    // Schedule module for cron jobs (event completion)
    ScheduleModule.forRoot(),

    // Cache module for Redis caching
    CacheModule,

    // Users module for organizer validation
    UsersModule,
  ],
  controllers: [EventsController],
  providers: [
    // Mappers
    EventMapper,
    TicketTypeMapper,

    // Repository
    repositoryProvider,
    TicketTypeTypeOrmRepository,

    // User validation service (cross-module adapter)
    userValidationServiceProvider,

    // S3 Storage service
    S3StorageService,

    // Cache service
    EventCacheService,

    // Scheduler service
    EventSchedulerService,

    // Guards
    IsEventOwnerGuard,

    // CQRS Handlers
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
  ],
  exports: [
    // Export repository token for potential use by other modules
    EVENT_REPOSITORY,

    // Export event mapper for DTO transformations
    EventMapper,

    // Export cache service for cross-module use
    EventCacheService,
  ],
})
export class EventsModule {}
