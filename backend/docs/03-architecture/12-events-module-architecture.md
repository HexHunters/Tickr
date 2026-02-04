# Events Module - Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Domain Layer](#domain-layer)
4. [Application Layer](#application-layer)
5. [Infrastructure Layer](#infrastructure-layer)
6. [Caching Strategy](#caching-strategy)
7. [Cross-Module Communication](#cross-module-communication)
8. [API Reference](#api-reference)
9. [Testing](#testing)

---

## Overview

The Events Module is a bounded context within the Tickr ticketing system responsible for managing event lifecycle, including creation, publication, cancellation, and ticket type management.

### Key Features

- **Event CRUD Operations**: Create, update, view events
- **Event Publishing**: Draft → Published workflow with validation
- **Event Cancellation**: With reason tracking and domain events
- **Ticket Types**: Multiple ticket tiers per event with pricing and availability
- **Event Images**: S3-based image upload with Sharp resizing
- **Event Scheduling**: Automatic event completion via cron job
- **Caching**: Redis-based caching for read-heavy operations

### Technology Stack

- **NestJS**: Application framework
- **TypeORM**: ORM for PostgreSQL
- **Redis**: Caching layer (ioredis)
- **AWS S3**: Image storage
- **Sharp**: Image processing

---

## Architecture

The Events Module follows **Hexagonal Architecture** (Ports & Adapters) with **CQRS** pattern separation.

```
events/
├── domain/           # Core business logic (pure TypeScript)
│   ├── entities/     # Event, TicketType aggregates
│   ├── events/       # Domain events (EventPublished, etc.)
│   ├── exceptions/   # Business rule violations
│   └── value-objects/# EventCategory, EventStatus, Location, etc.
├── application/      # Use cases & orchestration
│   ├── commands/     # Write operations (CQRS)
│   ├── queries/      # Read operations (CQRS)
│   ├── ports/        # Repository & service interfaces
│   ├── dtos/         # Data Transfer Objects
│   └── event-handlers/ # Cross-module event handlers
└── infrastructure/   # External adapters
    ├── controllers/  # REST API
    ├── repositories/ # TypeORM implementations
    ├── services/     # S3, Cache services
    ├── adapters/     # Cross-module adapters
    └── persistence/  # ORM entities & mappers
```

### Dependency Flow

```
Controller → Handler → Port → Repository
                    → DomainEventPublisher
                    → CacheService
```

---

## Domain Layer

### Event Entity

The `EventEntity` is the aggregate root with the following lifecycle:

```
DRAFT → PUBLISHED → COMPLETED
         ↓
     CANCELLED
```

**Key Methods:**
- `updateDetails()`: Update event information (only in DRAFT/PUBLISHED)
- `publish()`: Transition to PUBLISHED (validates ticket types exist)
- `cancel(reason)`: Transition to CANCELLED
- `complete()`: Transition to COMPLETED

### Ticket Type Entity

Represents a pricing tier for an event with:
- Price (amount + currency)
- Quantity tracking (total/sold/available)
- Sales period (start/end dates)
- Active flag

### Value Objects

| Value Object | Purpose |
|-------------|---------|
| `EventCategory` | Enum: CONCERT, CONFERENCE, SPORT, etc. |
| `EventStatus` | Enum: DRAFT, PUBLISHED, CANCELLED, COMPLETED |
| `EventDateRangeVO` | Start/end date validation |
| `LocationVO` | Venue address with coordinates |
| `TicketPriceVO` | Amount + currency |
| `Currency` | Supported currencies (TND, EUR, USD) |
| `SalesPeriodVO` | Ticket sales window |

### Domain Events

| Event | Trigger | Purpose |
|-------|---------|---------|
| `EventCreatedEvent` | Event creation | Analytics, logging |
| `EventPublishedEvent` | Event published | Notifications, indexing |
| `EventCancelledEvent` | Event cancelled | Refund processing |
| `TicketTypeSoldOutEvent` | All tickets sold | Notifications |

---

## Application Layer

### Commands (Write Operations)

| Command | Handler | Description |
|---------|---------|-------------|
| `CreateEventCommand` | `CreateEventHandler` | Create new draft event |
| `UpdateEventCommand` | `UpdateEventHandler` | Update event details |
| `PublishEventCommand` | `PublishEventHandler` | Publish draft event |
| `CancelEventCommand` | `CancelEventHandler` | Cancel with reason |
| `AddTicketTypeCommand` | `AddTicketTypeHandler` | Add ticket tier |
| `UpdateTicketTypeCommand` | `UpdateTicketTypeHandler` | Update ticket tier |
| `RemoveTicketTypeCommand` | `RemoveTicketTypeHandler` | Remove ticket tier |
| `UploadEventImageCommand` | `UploadEventImageHandler` | Upload/resize image |
| `CompleteEventCommand` | `CompleteEventHandler` | Mark as completed |

### Queries (Read Operations)

| Query | Handler | Description |
|-------|---------|-------------|
| `GetEventByIdQuery` | `GetEventByIdHandler` | Single event with details |
| `GetPublishedEventsQuery` | `GetPublishedEventsHandler` | Paginated public events |
| `GetEventsByCategoryQuery` | `GetEventsByCategoryHandler` | Filter by category |
| `GetUpcomingEventsQuery` | `GetUpcomingEventsHandler` | Future events |
| `GetOrganizerEventsQuery` | `GetOrganizerEventsHandler` | Organizer's events |
| `SearchEventsQuery` | `SearchEventsHandler` | Full-text search |

### Ports (Interfaces)

```typescript
// Repository Port
interface EventRepositoryPort {
  findById(id: string): Promise<EventEntity | null>;
  findPublished(filters, options): Promise<PaginatedResult>;
  save(event: EventEntity): Promise<EventEntity>;
  // ... more methods
}

// User Validation Port (cross-module)
interface UserValidationServicePort {
  validateOrganizer(userId: string): Promise<OrganizerValidation>;
  userExists(userId: string): Promise<boolean>;
  isEventOwner(userId: string, organizerId: string): boolean;
}
```

---

## Infrastructure Layer

### Controllers

**EventsController** (`/events`):

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/events` | POST | Create event | Organizer |
| `/events` | GET | List published | Public |
| `/events/:id` | GET | Get by ID | Mixed |
| `/events/:id` | PATCH | Update event | Owner |
| `/events/:id/publish` | POST | Publish | Owner |
| `/events/:id/cancel` | POST | Cancel | Owner |
| `/events/:id/ticket-types` | POST | Add ticket type | Owner |
| `/events/:id/image` | POST | Upload image | Owner |
| `/events/category/:cat` | GET | By category | Public |
| `/events/search` | GET | Search | Public |
| `/events/upcoming` | GET | Upcoming | Public |
| `/events/organizer/:id` | GET | By organizer | Auth |

### Services

**S3StorageService**:
- Upload event images to AWS S3
- Resize to multiple sizes (thumbnail, medium, large)
- Delete images on event removal

**EventCacheService**:
- Redis-based caching for events
- Automatic invalidation on mutations
- TTL-based expiration

**EventSchedulerService**:
- Cron job for auto-completing past events
- Runs daily at midnight

### Adapters

**UserValidationServiceAdapter**:
- Implements `UserValidationServicePort`
- Calls Users module repository
- Anti-corruption layer for cross-module communication

---

## Caching Strategy

### Cache Architecture

```
┌─────────────────────────────────────────┐
│           EventCacheService             │
├─────────────────────────────────────────┤
│ get/setEvent(id)                        │
│ get/setPublishedList(page, limit)       │
│ get/setCategoryList(cat, page, limit)   │
│ get/setSearchResults(params)            │
│ invalidateEvent(id)                     │
│ invalidatePublicCaches()                │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│         CacheService (Redis)            │
├─────────────────────────────────────────┤
│ get<T>(key): T | null                   │
│ set<T>(key, value, ttl): void           │
│ delete(key): void                       │
│ invalidatePattern(pattern): void        │
└─────────────────────────────────────────┘
```

### Cache Keys

| Prefix | Example | TTL |
|--------|---------|-----|
| `events:event` | `events:event:evt-123` | 5 min |
| `events:published` | `events:published:p1:l10` | 1 min |
| `events:category` | `events:category:p1:l10:CONCERT` | 1 min |
| `events:search` | `events:search:query=rock&page=1` | 30 sec |
| `events:organizer` | `events:organizer:p1:l10:usr-456` | 1 min |
| `events:upcoming` | `events:upcoming:p1:l10` | 1 min |

### Invalidation Strategy

| Action | Invalidated |
|--------|-------------|
| Create Event | Organizer list |
| Update Event | Single event, organizer list |
| Publish Event | All public caches |
| Cancel Event | All public caches + single event |
| Ticket sold out | Single event |

---

## Cross-Module Communication

### Event-Driven Architecture

The Events module communicates with other modules through domain events:

```
Events Module                    Other Modules
     │                                │
     ├─── EventPublishedEvent ────────┼─→ Notifications
     │                                │    (send announcements)
     │                                │
     ├─── EventCancelledEvent ────────┼─→ Payments (refunds)
     │                                │    Notifications
     │                                │
     └─── TicketTypeSoldOutEvent ─────┼─→ Notifications
                                      │    (sold out alerts)
```

### Anti-Corruption Layer

Cross-module dependencies are handled through adapters:

```typescript
// Events module calls Users module through adapter
@Injectable()
export class UserValidationServiceAdapter implements UserValidationServicePort {
  constructor(
    @Inject(USER_REPOSITORY) 
    private readonly userRepository: UserRepositoryPort
  ) {}

  async validateOrganizer(userId: string): Promise<OrganizerValidation> {
    // Translate Users domain to Events domain expectations
  }
}
```

---

## API Reference

### Create Event

```http
POST /events
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Rock Festival 2026",
  "description": "Annual rock music festival",
  "category": "CONCERT",
  "startDate": "2026-07-15T18:00:00Z",
  "endDate": "2026-07-15T23:00:00Z",
  "location": {
    "city": "Tunis",
    "country": "Tunisia",
    "address": "Carthage Amphitheater",
    "postalCode": "1000"
  }
}
```

### Response

```json
{
  "id": "evt_abc123",
  "title": "Rock Festival 2026",
  "status": "DRAFT",
  "category": "CONCERT",
  "ticketTypes": [],
  "createdAt": "2026-01-15T10:00:00Z"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Not authorized (not owner) |
| 404 | Event not found |
| 409 | Business rule violation |

---

## Testing

### Test Coverage Requirements

| Type | Target | Current |
|------|--------|---------|
| Unit Tests | >85% | ~95% |
| Integration Tests | >75% | Scaffolded |
| E2E Tests | Core flows | Pending |

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm test -- --testPathPatterns="unit/events"

# With coverage
npm test -- --coverage --collectCoverageFrom="src/modules/events/**/*.ts"

# Architecture tests
npm test -- --testPathPatterns="architecture"
```

### Test Structure

```
test/
├── unit/events/
│   ├── domain/           # Entity & VO tests
│   ├── application/      # Handler tests
│   └── infrastructure/   # Service tests
├── integration/events/   # API integration tests
└── e2e/                  # End-to-end flows
```

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `REDIS_PASSWORD` | Redis password | - |
| `REDIS_TTL` | Default cache TTL | 300 |
| `AWS_S3_BUCKET` | S3 bucket name | tickr-event-images |
| `AWS_REGION` | AWS region | eu-west-1 |
| `AWS_ACCESS_KEY_ID` | S3 access key | - |
| `AWS_SECRET_ACCESS_KEY` | S3 secret key | - |

### Docker Compose

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --requirepass tickr123

  localstack:  # For S3 in development
    image: localstack/localstack
    ports:
      - "4566:4566"
    environment:
      - SERVICES=s3
```

---

## Troubleshooting

### Common Issues

1. **Event publish fails**: Ensure at least one ticket type exists
2. **Image upload fails**: Check S3 credentials and bucket permissions
3. **Cache not updating**: Verify Redis connection and invalidation calls
4. **Cross-module validation fails**: Check Users module is running

### Debug Logging

```bash
# Enable debug logs
LOG_LEVEL=debug npm start
```

---

## Future Improvements

1. **Performance**: Implement read replicas for high-traffic queries
2. **Search**: Add Elasticsearch for advanced event search
3. **Analytics**: Event views and popularity tracking
4. **Recommendations**: ML-based event suggestions
5. **Localization**: Multi-language event descriptions

---

*Last Updated: February 2026*
*Module Version: 1.0.0*
