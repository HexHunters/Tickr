# 🏛️ Architecture Hexagonale - Principes

**Version:** 1.0  
**Pattern:** Ports & Adapters (Hexagonal Architecture)  
**Temps lecture:** 15 minutes

---

## 🎯 Pourquoi Hexagonal ?

### Problèmes Architectures Classiques

**Architecture en couches traditionnelle:**
```
❌ Couplage fort framework
❌ Logique métier mélangée avec infrastructure
❌ Tests difficiles (dépendances BDD, API externes)
❌ Migration impossible (monolithe → microservices)
```

**Solution Hexagonale:**
```
✅ Domain isolé (logique métier pure)
✅ Infrastructure interchangeable
✅ Tests unitaires simples (pas de mocks)
✅ Migration progressive possible
```

---

## 🔷 Principes Fondamentaux

### 1. Domain au Centre

```
      ┌─────────────────────────┐
      │       DOMAIN            │
      │  (Business Logic)       │
      │                         │
      │  - Entities             │
      │  - Value Objects        │
      │  - Domain Events        │
      │  - Business Rules       │
      │                         │
      │  PAS DE DÉPENDANCES     │
      │  EXTERNES !             │
      └─────────────────────────┘
```

**Règles:**
- Aucun import NestJS, TypeORM, Express
- Aucun décorateur framework
- TypeScript pur
- Logique métier uniquement

### 2. Application Layer

```
      ┌─────────────────────────┐
      │    APPLICATION          │
      │  (Use Cases / CQRS)     │
      │                         │
      │  - Commands             │
      │  - Queries              │
      │  - Handlers             │
      │  - Ports (Interfaces)   │
      │                         │
      │  Dépend: DOMAIN seul    │
      └─────────────────────────┘
```

**Responsabilités:**
- Orchestration use cases
- Définit interfaces (Ports)
- Ne sait PAS comment implémenter

### 3. Infrastructure Layer

```
      ┌─────────────────────────┐
      │   INFRASTRUCTURE        │
      │  (Adapters)             │
      │                         │
      │  - Controllers (HTTP)   │
      │  - Repositories (DB)    │
      │  - Adapters (S3, SES)   │
      │  - Config (NestJS)      │
      │                         │
      │  Implémente PORTS       │
      └─────────────────────────┘
```

**Responsabilités:**
- Implémente les Ports
- Gère framework (NestJS, TypeORM)
- Adapte données externes

---

## 🔌 Ports & Adapters

### Port (Interface)

**Défini dans Application Layer:**
```typescript
// src/modules/events/application/ports/event.repository.port.ts

export interface EventRepositoryPort {
  save(event: Event): Promise<Event>;
  findById(id: string): Promise<Event | null>;
  findBySlug(slug: string): Promise<Event | null>;
  search(criteria: SearchCriteria): Promise<Event[]>;
  delete(id: string): Promise<void>;
}
```

### Adapter (Implémentation)

**Implémenté dans Infrastructure Layer:**
```typescript
// src/modules/events/infrastructure/repositories/event.repository.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventRepositoryPort } from '../../application/ports/event.repository.port';
import { Event } from '../../domain/entities/event.entity';

@Injectable()
export class EventRepository implements EventRepositoryPort {
  constructor(
    @InjectRepository(EventEntity)
    private readonly repo: Repository<EventEntity>,
  ) {}

  async save(event: Event): Promise<Event> {
    const entity = this.toEntity(event);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Event | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  // Mapping TypeORM ↔ Domain
  private toDomain(entity: EventEntity): Event {
    return Event.create({
      id: entity.id,
      name: entity.name,
      // ...
    });
  }

  private toEntity(event: Event): EventEntity {
    const entity = new EventEntity();
    entity.id = event.id;
    entity.name = event.name;
    // ...
    return entity;
  }
}
```

---

## 📦 Structure Module Type

```
src/modules/events/
├── domain/
│   ├── entities/
│   │   └── event.entity.ts          # Pure TypeScript
│   ├── value-objects/
│   │   └── location.vo.ts           # Immutable objects
│   ├── events/
│   │   └── event-created.event.ts   # Domain events
│   └── exceptions/
│       └── event.exceptions.ts      # Business exceptions
│
├── application/
│   ├── commands/
│   │   ├── create-event/
│   │   │   ├── create-event.command.ts
│   │   │   └── create-event.handler.ts
│   │   └── publish-event/
│   │       ├── publish-event.command.ts
│   │       └── publish-event.handler.ts
│   ├── queries/
│   │   ├── get-event/
│   │   │   ├── get-event.query.ts
│   │   │   └── get-event.handler.ts
│   │   └── search-events/
│   │       ├── search-events.query.ts
│   │       └── search-events.handler.ts
│   └── ports/
│       ├── event.repository.port.ts
│       └── storage.port.ts
│
└── infrastructure/
    ├── controllers/
    │   └── event.controller.ts      # REST API
    ├── repositories/
    │   └── event.repository.ts      # TypeORM
    ├── adapters/
    │   └── s3-storage.adapter.ts    # AWS S3
    └── events.module.ts             # NestJS Module
```

---

## 🎬 Flow Complet (Exemple)

### Créer Événement

```typescript
// 1. CONTROLLER (Infrastructure)
@Controller('events')
export class EventController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateEventDto, @CurrentUser() user: User) {
    const command = new CreateEventCommand({
      organizerId: user.id,
      name: dto.name,
      // ...
    });
    
    return this.commandBus.execute(command);
  }
}

// 2. COMMAND (Application)
export class CreateEventCommand {
  constructor(public readonly data: {
    organizerId: string;
    name: string;
    description: string;
    startDate: Date;
    // ...
  }) {}
}

// 3. HANDLER (Application)
@CommandHandler(CreateEventCommand)
export class CreateEventHandler implements ICommandHandler<CreateEventCommand> {
  constructor(
    @Inject('EventRepositoryPort')
    private readonly eventRepo: EventRepositoryPort,
    @Inject('StoragePort')
    private readonly storage: StoragePort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateEventCommand): Promise<EventDto> {
    // 3.1 Créer entité domaine
    const event = Event.create({
      organizerId: command.data.organizerId,
      name: command.data.name,
      // ...
    });

    // 3.2 Valider règles métier
    event.validate();

    // 3.3 Persister
    const saved = await this.eventRepo.save(event);

    // 3.4 Publier événement domaine
    this.eventBus.publish(new EventCreatedEvent(saved.id));

    return EventDto.fromDomain(saved);
  }
}

// 4. ENTITY (Domain)
export class Event {
  private constructor(
    public readonly id: string,
    public readonly organizerId: string,
    public name: string,
    public description: string,
    public status: EventStatus,
    // ...
  ) {}

  static create(data: CreateEventData): Event {
    const id = uuid();
    const slug = slugify(data.name);
    
    return new Event(
      id,
      data.organizerId,
      data.name,
      data.description,
      EventStatus.DRAFT,
      // ...
    );
  }

  validate(): void {
    if (this.name.length < 3) {
      throw new EventNameTooShortException();
    }
    if (this.endDate <= this.startDate) {
      throw new InvalidEventDatesException();
    }
  }

  publish(): void {
    if (this.status !== EventStatus.DRAFT) {
      throw new EventAlreadyPublishedException();
    }
    if (!this.hasValidTicketTypes()) {
      throw new CannotPublishWithoutTicketsException();
    }
    this.status = EventStatus.PUBLISHED;
    this.publishedAt = new Date();
  }
}

// 5. REPOSITORY ADAPTER (Infrastructure)
@Injectable()
export class EventRepository implements EventRepositoryPort {
  constructor(@InjectRepository(EventEntity) private repo: Repository<EventEntity>) {}

  async save(event: Event): Promise<Event> {
    const entity = this.toEntity(event);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }
  // ...
}
```

---

## 🧪 Tests Simplifiés

### Test Domain (Pure)

```typescript
describe('Event Entity', () => {
  it('should create event with valid data', () => {
    const event = Event.create({
      organizerId: 'org-123',
      name: 'Concert Test',
      startDate: new Date('2024-06-15'),
      endDate: new Date('2024-06-15'),
    });

    expect(event.status).toBe(EventStatus.DRAFT);
    expect(event.slug).toBe('concert-test');
  });

  it('should throw if name too short', () => {
    expect(() => {
      const event = Event.create({
        organizerId: 'org-123',
        name: 'Co',
        // ...
      });
      event.validate();
    }).toThrow(EventNameTooShortException);
  });

  it('should publish if valid', () => {
    const event = Event.create({ /* ... */ });
    event.addTicketType({ name: 'Standard', price: 50 });
    
    event.publish();
    
    expect(event.status).toBe(EventStatus.PUBLISHED);
    expect(event.publishedAt).toBeDefined();
  });
});
```

### Test Handler (Avec Mocks)

```typescript
describe('CreateEventHandler', () => {
  let handler: CreateEventHandler;
  let mockRepo: jest.Mocked<EventRepositoryPort>;
  let mockStorage: jest.Mocked<StoragePort>;

  beforeEach(() => {
    mockRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      // ...
    } as any;

    mockStorage = {
      upload: jest.fn(),
      // ...
    } as any;

    handler = new CreateEventHandler(mockRepo, mockStorage, eventBus);
  });

  it('should create event successfully', async () => {
    const command = new CreateEventCommand({
      organizerId: 'org-123',
      name: 'Concert Test',
      // ...
    });

    mockRepo.save.mockResolvedValue(/* mock event */);

    const result = await handler.execute(command);

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(result.name).toBe('Concert Test');
  });
});
```

---

## ✅ Checklist Architecture

```yaml
✅ Domain:
  - [ ] Entités pures TypeScript (pas de décorateurs)
  - [ ] Value Objects immutables
  - [ ] Règles métier dans entités
  - [ ] Exceptions métier spécifiques

✅ Application:
  - [ ] Commands/Queries séparés (CQRS)
  - [ ] Handlers orchestrent use cases
  - [ ] Ports définis (interfaces)
  - [ ] Pas de logique métier ici

✅ Infrastructure:
  - [ ] Controllers exposent REST API
  - [ ] Repositories implémentent Ports
  - [ ] Adapters pour services externes
  - [ ] Mapping Domain ↔ DB entities

✅ Dépendances:
  - [ ] Domain: 0 dépendance externe
  - [ ] Application: dépend Domain
  - [ ] Infrastructure: dépend Application + Domain
  - [ ] Inversion contrôle (DI)

✅ Tests:
  - [ ] Domain: tests unitaires purs
  - [ ] Application: tests avec mocks
  - [ ] Infrastructure: tests intégration
```

---

**Prochaine lecture:** `02-structure-modules.md` pour les 6 modules détaillés.
