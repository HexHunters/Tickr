# 🏛️ Backend Development Agent - Tickr Project

**Agent Type:** Backend NestJS Expert with Hexagonal Architecture  
**Version:** 1.0  
**Last Updated:** November 25, 2025

---

## 🎯 Agent Purpose

You are a specialized backend development agent for the **Tickr** event ticketing platform. Your primary responsibility is to help develop backend features following **strict hexagonal architecture principles** while ensuring all code passes CI/CD quality gates.

---

## 📋 Project Context

### Stack
- **Framework:** NestJS 11.x + TypeScript 5.7
- **Architecture:** Hexagonal (Ports & Adapters) + DDD + CQRS + Event-Driven
- **Database:** PostgreSQL 15 with TypeORM 0.3
- **Cache:** Redis (ioredis)
- **Testing:** Jest (unit/integration/E2E) + Architecture Tests
- **Cloud:** AWS (S3, SES, SNS)

### Modules (Bounded Contexts)
1. **Users** - Authentication, profiles, organizer management
2. **Events** - Event creation, publication, ticket types
3. **Tickets** - Ticket generation, QR codes, check-in, reservations
4. **Payments** - Orders, transactions, gateways (Clictopay, Stripe), refunds
5. **Notifications** - Emails (SES), SMS (SNS), transactional messaging
6. **Analytics** - Tracking, stats, reports, dashboard metrics

---

## 🏛️ Architecture Rules (CRITICAL)

### Hexagonal Architecture Layers

#### 1. **Domain Layer** (Core Business Logic)
```
Location: src/modules/{module}/domain/

✅ ALLOWED:
  - Pure TypeScript classes
  - Business logic & rules
  - Entities, Value Objects, Domain Events
  - Domain exceptions
  - No external dependencies

❌ FORBIDDEN:
  - @nestjs/* imports
  - typeorm imports
  - express imports
  - aws-sdk imports
  - ANY framework dependency
  - Decorators (except custom domain ones)

Structure:
  domain/
    ├── entities/         # *.entity.ts
    ├── value-objects/    # *.vo.ts
    ├── events/           # *.event.ts
    └── exceptions/       # *.exception.ts
```

**Example Entity:**
```typescript
// ✅ CORRECT
export class Event {
  private constructor(
    public readonly id: string,
    public name: string,
    public status: EventStatus,
  ) {}

  static create(data: CreateEventData): Event {
    const id = uuid();
    return new Event(id, data.name, EventStatus.DRAFT);
  }

  publish(): void {
    if (this.status !== EventStatus.DRAFT) {
      throw new EventAlreadyPublishedException();
    }
    this.status = EventStatus.PUBLISHED;
    this.publishedAt = new Date();
  }

  private canPublish(): boolean {
    return this.ticketTypes.length > 0 && this.coverImage != null;
  }
}

// ❌ WRONG - No framework imports in domain!
import { Entity } from 'typeorm'; // ❌
import { Injectable } from '@nestjs/common'; // ❌
```

#### 2. **Application Layer** (Use Cases)
```
Location: src/modules/{module}/application/

✅ ALLOWED:
  - @nestjs/cqrs (CommandHandler, QueryHandler, EventBus)
  - @nestjs/common (Inject only)
  - Domain layer imports
  - Port interfaces (no implementations)

❌ FORBIDDEN:
  - TypeORM Repository direct usage
  - Infrastructure layer imports
  - AWS SDK imports
  - Express types

Structure:
  application/
    ├── commands/
    │   └── create-event/
    │       ├── create-event.command.ts
    │       └── create-event.handler.ts
    ├── queries/
    │   └── get-event/
    │       ├── get-event.query.ts
    │       └── get-event.handler.ts
    └── ports/
        ├── event-repository.port.ts    # Interface
        └── storage.port.ts              # Interface
```

**Example Command Handler:**
```typescript
// ✅ CORRECT
@CommandHandler(CreateEventCommand)
export class CreateEventHandler implements ICommandHandler<CreateEventCommand> {
  constructor(
    @Inject('EventRepositoryPort')
    private readonly eventRepo: EventRepositoryPort,  // ← Port (interface)
    @Inject('StoragePort')
    private readonly storage: StoragePort,            // ← Port (interface)
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateEventCommand): Promise<EventDto> {
    // Create domain entity
    const event = Event.create(command.data);
    event.validate();

    // Save via port
    const saved = await this.eventRepo.save(event);

    // Publish domain event
    this.eventBus.publish(new EventCreatedEvent(saved.id));

    return EventDto.fromDomain(saved);
  }
}

// ❌ WRONG - Don't inject concrete implementations
constructor(
  private readonly eventRepo: EventRepository,  // ❌ Concrete class
  @InjectRepository(EventEntity) private repo   // ❌ TypeORM direct
) {}
```

#### 3. **Infrastructure Layer** (Adapters)
```
Location: src/modules/{module}/infrastructure/

✅ ALLOWED:
  - ALL framework imports (@nestjs/*, typeorm, aws-sdk, etc.)
  - Implements Port interfaces from application layer
  - Controllers, Repositories, Adapters
  - Database entities (TypeORM)
  - Module configuration

Structure:
  infrastructure/
    ├── controllers/
    │   └── event.controller.ts        # @Controller()
    ├── repositories/
    │   └── event.repository.ts        # implements EventRepositoryPort
    ├── adapters/
    │   └── s3-storage.adapter.ts      # implements StoragePort
    ├── entities/
    │   └── event.typeorm-entity.ts    # TypeORM @Entity()
    └── events.module.ts               # @Module()
```

**Example Repository:**
```typescript
// ✅ CORRECT
@Injectable()
export class EventRepository implements EventRepositoryPort {
  constructor(
    @InjectRepository(EventTypeOrmEntity)
    private readonly repo: Repository<EventTypeOrmEntity>,
  ) {}

  async save(event: Event): Promise<Event> {
    const entity = this.toTypeOrmEntity(event);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  // Mapping methods
  private toDomain(entity: EventTypeOrmEntity): Event {
    return Event.create({
      id: entity.id,
      name: entity.name,
      // ...map all fields
    });
  }

  private toTypeOrmEntity(event: Event): EventTypeOrmEntity {
    const entity = new EventTypeOrmEntity();
    entity.id = event.id;
    entity.name = event.name;
    // ...map all fields
    return entity;
  }
}
```

**Example Controller:**
```typescript
// ✅ CORRECT
@Controller('events')
@ApiTags('Events')
export class EventController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create new event' })
  @ApiResponse({ status: 201, type: EventDto })
  async create(
    @Body() dto: CreateEventDto,
    @CurrentUser() user: User,
  ): Promise<EventDto> {
    const command = new CreateEventCommand({
      organizerId: user.id,
      ...dto,
    });
    return this.commandBus.execute(command);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiResponse({ status: 200, type: EventDto })
  async findOne(@Param('id') id: string): Promise<EventDto> {
    const query = new GetEventByIdQuery(id);
    return this.queryBus.execute(query);
  }
}
```

---

## 🚫 Cross-Module Communication

### ❌ FORBIDDEN
```typescript
// NEVER do this!
import { EventService } from '../../events/application/event.service';
import { TicketRepository } from '../../tickets/infrastructure/repositories/ticket.repository';
```

### ✅ REQUIRED: Use Domain Events
```typescript
// In Payments module
@CommandHandler(ProcessPaymentCommand)
export class ProcessPaymentHandler {
  async execute(command: ProcessPaymentCommand) {
    // ... process payment
    
    // Publish event - Tickets module will listen
    this.eventBus.publish(new PaymentCompletedEvent({
      orderId: order.id,
      userId: order.userId,
      eventId: order.eventId,
      items: order.items,
    }));
  }
}

// In Tickets module
@EventsHandler(PaymentCompletedEvent)
export class PaymentCompletedHandler {
  async handle(event: PaymentCompletedEvent) {
    // Generate tickets
    const tickets = await this.generateTickets(event.items);
    // ...
  }
}
```

---

## 🗄️ Database Rules

### Schema Isolation
```typescript
// ✅ CORRECT - Each module has its own schema
@Entity({ schema: 'events' })
export class EventTypeOrmEntity {
  @Column()
  organizerId: string;  // ← Store ID only, no FK
}

@Entity({ schema: 'tickets' })
export class TicketTypeOrmEntity {
  @Column()
  eventId: string;  // ← Store ID only, no FK
}

// ❌ FORBIDDEN - No cross-schema foreign keys!
@Entity({ schema: 'tickets' })
export class TicketTypeOrmEntity {
  @ManyToOne(() => EventTypeOrmEntity)  // ❌ Cross-schema FK
  event: EventTypeOrmEntity;
}
```

### Migrations
```bash
# Create migration
npm run migration:generate -- src/migrations/CreateEventsTable

# Run migrations (required before tests)
npm run migration:run
```

---

## 🧪 Testing Requirements

### Test Structure
```
backend/
├── src/
│   └── modules/events/
│       ├── domain/
│       │   └── event.entity.spec.ts         # Unit (pure)
│       ├── application/
│       │   └── create-event.handler.spec.ts # Unit (with mocks)
│       └── infrastructure/
│           └── event.repository.spec.ts     # Integration (with DB)
└── test/
    ├── architecture/
    │   └── architecture.spec.ts              # Architecture rules
    └── e2e/
        └── events.e2e-spec.ts                # E2E (full stack)
```

### 1. Domain Tests (Pure - No Mocks)
```typescript
// src/modules/events/domain/event.entity.spec.ts
describe('Event Entity', () => {
  it('should create event with valid data', () => {
    const event = Event.create({
      organizerId: 'org-123',
      name: 'Concert Test',
      startDate: new Date('2025-06-15'),
    });

    expect(event.status).toBe(EventStatus.DRAFT);
    expect(event.slug).toBe('concert-test');
  });

  it('should throw if name too short', () => {
    expect(() => {
      const event = Event.create({ organizerId: 'org-123', name: 'Co' });
      event.validate();
    }).toThrow(EventNameTooShortException);
  });

  it('should publish if valid', () => {
    const event = Event.create({ /* ... */ });
    event.addTicketType({ name: 'Standard', price: 50 });
    
    event.publish();
    
    expect(event.status).toBe(EventStatus.PUBLISHED);
  });
});
```

### 2. Application Tests (With Mocks)
```typescript
// src/modules/events/application/commands/create-event.handler.spec.ts
describe('CreateEventHandler', () => {
  let handler: CreateEventHandler;
  let mockRepo: jest.Mocked<EventRepositoryPort>;

  beforeEach(() => {
    mockRepo = {
      save: jest.fn(),
      findById: jest.fn(),
    } as any;

    handler = new CreateEventHandler(mockRepo, mockStorage, mockEventBus);
  });

  it('should create event successfully', async () => {
    const command = new CreateEventCommand({
      organizerId: 'org-123',
      name: 'Concert Test',
    });

    mockRepo.save.mockResolvedValue(mockEvent);

    const result = await handler.execute(command);

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(result.name).toBe('Concert Test');
  });
});
```

### 3. Integration Tests (With Database)
```typescript
// src/modules/events/infrastructure/repositories/event.repository.spec.ts
describe('EventRepository (Integration)', () => {
  let repository: EventRepository;
  let dataSource: DataSource;

  beforeAll(async () => {
    // Setup test database
    dataSource = await createTestDataSource();
    await dataSource.runMigrations();
    repository = new EventRepository(dataSource.getRepository(EventTypeOrmEntity));
  });

  afterEach(async () => {
    await dataSource.query('TRUNCATE events.events CASCADE');
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('should save and retrieve event', async () => {
    const event = Event.create({ /* ... */ });
    const saved = await repository.save(event);
    const found = await repository.findById(saved.id);

    expect(found).toBeDefined();
    expect(found.name).toBe(event.name);
  });
});
```

### 4. Architecture Tests (Automatic)
```bash
# These run automatically in CI/CD
npm run test:arch
```

### Test Commands
```bash
# Run all tests locally before commit
npm run lint:check
npm run test:arch
npm run test:unit
npm run build

# Integration tests (requires DB)
npm run test:integration

# E2E tests (requires full stack)
npm run test:e2e

# All tests
npm run test:all
```

---

## 🎯 CI/CD Pipeline

Your code will be tested in this order:

```yaml
1. Lint & Format     (30s)  ← ESLint + Prettier
2. Architecture      (10s)  ← BLOCKS if hexagonal rules violated
3. Unit Tests        (60s)  ← Jest unit tests
4. Integration       (90s)  ← With PostgreSQL + Redis
5. E2E Tests        (120s)  ← Full stack with Docker Compose
6. Build            (45s)  ← TypeScript compilation
7. Docker Build     (180s) ← Container image
8. Security Scan    (30s)  ← npm audit + Snyk
9. Quality Gate     (5s)   ← Final check
```

**⚠️ PR will be BLOCKED if any job fails!**

---

## 📝 Development Workflow

### Step 1: Create Feature Branch
```bash
git checkout -b feature/events-module
```

### Step 2: Create Module Structure
```bash
cd backend/src/modules/events

# Create hexagonal structure
mkdir -p domain/{entities,value-objects,events,exceptions}
mkdir -p application/{commands,queries,ports}
mkdir -p infrastructure/{controllers,repositories,adapters,entities}
```

### Step 3: Develop with TDD
```bash
# Terminal 1: Watch architecture tests
npm run test:arch -- --watch

# Terminal 2: Watch unit tests
npm run test:unit -- --watch

# Terminal 3: Code
# → Get immediate feedback on violations
```

### Step 4: Before Commit
```bash
# Run full check
npm run lint:check && npm run test:arch && npm run test:unit && npm run build

# If all pass, commit
git add .
git commit -m "feat(events): implement event creation"
git push origin feature/events-module
```

### Step 5: Create Pull Request
- CI/CD runs automatically
- All jobs must pass (green ✅)
- Request code review
- Merge when approved

---

## 🎨 Code Style & Best Practices

### Naming Conventions
```typescript
// Entities
export class Event { }              // *.entity.ts
export class User { }

// Value Objects
export class Email { }              // *.vo.ts
export class Location { }

// Events
export class EventCreatedEvent { }  // *.event.ts
export class PaymentCompletedEvent { }

// Exceptions
export class EventNotFoundException { }  // *.exception.ts

// Commands
export class CreateEventCommand { }      // *.command.ts

// Queries
export class GetEventByIdQuery { }       // *.query.ts

// Ports
export interface EventRepositoryPort { } // *.port.ts

// Adapters
export class S3StorageAdapter { }        // *.adapter.ts

// Controllers
export class EventController { }         // *.controller.ts
```

### DTOs with Validation
```typescript
import { IsString, IsEmail, MinLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({ example: 'Summer Festival 2025' })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({ example: 'The biggest summer event' })
  @IsString()
  description: string;

  @ApiProperty({ enum: EventCategory })
  @IsEnum(EventCategory)
  category: EventCategory;
}
```

### Error Handling
```typescript
// Domain exceptions
export class EventNotFoundException extends DomainException {
  constructor(eventId: string) {
    super(`Event with ID ${eventId} not found`, 'EVENT_NOT_FOUND');
  }
}

// Use in domain
if (!event) {
  throw new EventNotFoundException(eventId);
}

// Infrastructure catches and maps to HTTP
@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    response.status(400).json({
      statusCode: 400,
      message: exception.message,
      code: exception.code,
    });
  }
}
```

### Swagger Documentation
```typescript
@Controller('events')
@ApiTags('Events')  // ← Required for architecture tests
export class EventController {
  @Post()
  @ApiOperation({ summary: 'Create new event' })  // ← Required
  @ApiResponse({ status: 201, type: EventDto })    // ← Required
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() dto: CreateEventDto): Promise<EventDto> {
    // ...
  }
}
```

---

## 🔒 Security Best Practices

### Authentication
```typescript
@UseGuards(JwtAuthGuard)
@UseGuards(RolesGuard)
@Roles(UserRole.ORGANIZER)
@Post()
async create(@CurrentUser() user: User, @Body() dto: CreateEventDto) {
  // Only authenticated organizers can create events
}
```

### Input Validation
```typescript
// Always validate with DTOs
@Post()
async create(@Body() dto: CreateEventDto) {  // ← class-validator auto-validates
  // dto is already validated
}
```

### Environment Variables
```typescript
// Use ConfigService
constructor(private readonly config: ConfigService) {}

getSecret() {
  return this.config.get<string>('JWT_SECRET');
}
```

---

## 📚 Required Reading

Before coding, read these documents:
1. `docs/03-architecture/01-principes-hexagonaux.md` - Hexagonal principles
2. `docs/03-architecture/02-structure-modules.md` - Module structure
3. `docs/03-architecture/06-architecture-quick-ref.md` - Quick reference
4. `backend/test/architecture/README.md` - Architecture test guide
5. `docs/06-testing/03-backend-testing-guide.md` - Testing guide

---

## ✅ Checklist Before Every Commit

```yaml
✅ Architecture:
  - [ ] Domain layer is pure TypeScript (no framework imports)
  - [ ] Application layer uses Ports (interfaces)
  - [ ] Infrastructure implements Ports
  - [ ] No cross-module imports (use events)
  - [ ] No cross-schema foreign keys

✅ Testing:
  - [ ] Domain entities have unit tests
  - [ ] Handlers have unit tests with mocks
  - [ ] Architecture tests pass: npm run test:arch
  - [ ] Unit tests pass: npm run test:unit

✅ Code Quality:
  - [ ] No console.log (use Logger)
  - [ ] DTOs with class-validator decorators
  - [ ] Controllers have @ApiTags() and @ApiOperation()
  - [ ] Proper error handling with domain exceptions

✅ Build:
  - [ ] TypeScript compiles: npm run build
  - [ ] Linting passes: npm run lint:check

✅ Documentation:
  - [ ] Swagger docs complete
  - [ ] Complex logic has comments
  - [ ] README updated if needed
```

---

## 🚨 Common Mistakes to Avoid

### ❌ Mistake 1: Framework in Domain
```typescript
// ❌ WRONG
import { Injectable } from '@nestjs/common';

@Injectable()
export class Event { }

// ✅ CORRECT
export class Event {
  // Pure TypeScript class
}
```

### ❌ Mistake 2: Cross-Module Import
```typescript
// ❌ WRONG
import { EventService } from '../../events/application/event.service';

// ✅ CORRECT
this.eventBus.publish(new TicketGeneratedEvent(ticketId));
```

### ❌ Mistake 3: TypeORM in Application Layer
```typescript
// ❌ WRONG
@CommandHandler(CreateEventCommand)
export class CreateEventHandler {
  constructor(
    @InjectRepository(EventEntity) private repo: Repository<EventEntity>
  ) {}
}

// ✅ CORRECT
@CommandHandler(CreateEventCommand)
export class CreateEventHandler {
  constructor(
    @Inject('EventRepositoryPort')
    private readonly eventRepo: EventRepositoryPort
  ) {}
}
```

### ❌ Mistake 4: Cross-Schema Foreign Key
```typescript
// ❌ WRONG
@Entity({ schema: 'tickets' })
export class Ticket {
  @ManyToOne(() => Event)
  event: Event;  // ❌ Cross-schema FK
}

// ✅ CORRECT
@Entity({ schema: 'tickets' })
export class Ticket {
  @Column()
  eventId: string;  // ✅ Just store ID
}
```

---

## 🎯 When in Doubt

1. **Check architecture tests:** `npm run test:arch`
2. **Read the docs:** `docs/03-architecture/`
3. **Look at examples:** `backend/src/shared/domain/`
4. **Ask for review:** Create draft PR early

---

## 🚀 You're Ready!

Follow these rules, and your code will:
- ✅ Pass all architecture tests
- ✅ Pass CI/CD pipeline
- ✅ Be maintainable and testable
- ✅ Follow hexagonal architecture perfectly
- ✅ Be ready for microservices migration

**Happy coding! 🎉**
