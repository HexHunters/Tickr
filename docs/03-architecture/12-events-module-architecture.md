# Events Module Architecture

## Overview

The Events module follows **Hexagonal Architecture** (Ports and Adapters) principles, serving as the core bounded context for event management in Tickr. It handles event creation, ticket type management, publishing workflow, and capacity management.

## Module Structure

```
src/modules/events/
├── domain/                           # Domain Layer (Core Business Logic)
│   ├── entities/                    # Aggregate Root & Entities
│   │   ├── event.entity.ts          # Event Aggregate Root
│   │   └── ticket-type.entity.ts    # TicketType Sub-Entity
│   ├── events/                      # Domain Events
│   │   ├── event-created.event.ts
│   │   ├── event-published.event.ts
│   │   ├── event-updated.event.ts
│   │   ├── event-cancelled.event.ts
│   │   ├── ticket-type-added.event.ts
│   │   ├── ticket-type-updated.event.ts
│   │   └── ticket-type-sold-out.event.ts
│   ├── exceptions/                  # Domain Exceptions
│   │   ├── invalid-event.exception.ts
│   │   ├── invalid-ticket-type.exception.ts
│   │   ├── invalid-location.exception.ts
│   │   ├── invalid-date-range.exception.ts
│   │   ├── invalid-price.exception.ts
│   │   ├── invalid-currency.exception.ts
│   │   ├── invalid-sales-period.exception.ts
│   │   ├── event-not-publishable.exception.ts
│   │   ├── event-not-cancellable.exception.ts
│   │   ├── event-already-published.exception.ts
│   │   ├── event-cannot-be-modified.exception.ts
│   │   ├── max-ticket-types-reached.exception.ts
│   │   └── duplicate-ticket-type-name.exception.ts
│   ├── value-objects/               # Value Objects
│   │   ├── event-category.vo.ts     # Event category enum & validation
│   │   ├── event-status.vo.ts       # Event lifecycle states
│   │   ├── location.vo.ts           # Location with geocoding
│   │   ├── event-date-range.vo.ts   # Date range validation
│   │   ├── sales-period.vo.ts       # Ticket sales window
│   │   ├── ticket-price.vo.ts       # Price with currency
│   │   └── currency.vo.ts           # Supported currencies (TND)
│   └── index.ts                     # Barrel exports
├── application/                      # Application Layer (Use Cases) - Future
│   ├── commands/
│   ├── queries/
│   ├── event-handlers/
│   ├── dtos/
│   └── ports/
└── infrastructure/                   # Infrastructure Layer - Future
    ├── controllers/
    ├── persistence/
    └── events.module.ts
```

---

## Architectural Decisions

### 1. Aggregate Root Pattern

**EventEntity** is the aggregate root, controlling all access to **TicketTypeEntity** sub-entities.

```typescript
// All ticket type operations go through the Event aggregate
event.addTicketType(ticketType);       // ✅ Correct
event.updateTicketType(id, updates);   // ✅ Correct
event.removeTicketType(id);            // ✅ Correct

// Direct manipulation is not allowed
ticketType.update(data);               // ❌ Wrong - use aggregate methods
```

### 2. Domain Event Naming

Domain events follow DDD patterns for proper event correlation:

| Event Type | ID Property | Reason |
|------------|-------------|--------|
| **Aggregate Events** | `aggregateId` | Event's own ID (it's the aggregate) |
| **Sub-Entity Events** | `ticketTypeId` + `eventId` | Need both for correlation |

**Example:**
```typescript
// EventPublishedEvent - aggregate event
new EventPublishedEvent(
  aggregateId: this._id,  // The event's ID
  organizerId: ...,
  ...
);

// TicketTypeSoldOutEvent - sub-entity event (on TicketTypeEntity)
new TicketTypeSoldOutEvent(
  ticketTypeId: this._id,  // Ticket type's ID
  eventId: this._eventId,  // Parent event's ID for correlation
  ...
);
```

### 3. UUID Validation

The `organizerId` is validated as UUID format in the domain layer:

```typescript
// Uses shared domain utility
import { isUUID } from '@shared/domain/utils';

if (!isUUID(props.organizerId.trim())) {
  return Result.fail(InvalidEventException.invalidOrganizerId(props.organizerId));
}
```

---

## Event Entity (Aggregate Root)

### Lifecycle States

```
┌─────────┐
│  DRAFT  │ ← Initial state
└────┬────┘
     │ publish()
     ▼
┌───────────┐
│ PUBLISHED │
└─────┬─────┘
      │
      ├───────────────┬─────────────────┐
      │               │                 │
      ▼               ▼                 ▼
┌───────────┐   ┌───────────┐   ┌───────────────┐
│ CANCELLED │   │ COMPLETED │   │ hasStarted()  │
│           │   │           │   │ (no cancel)   │
└───────────┘   └───────────┘   └───────────────┘
```

### Business Rules

#### Event Creation
| Rule | Validation |
|------|------------|
| Organizer ID | Required, must be valid UUID |
| Title | Required, 1-200 characters |
| Description | Optional, max 5000 characters |
| Category | Must be valid EventCategory enum |
| Location | Must be valid LocationVO |
| Date Range | Must be valid EventDateRangeVO |

#### Event Publishing
| Rule | Validation |
|------|------------|
| Status | Must be DRAFT |
| Ticket Types | At least one active ticket type required |
| Date | Event start date must be in future |
| Location | Must be defined |
| Title | Must be defined |

#### Event Cancellation

**Business Rule:** Both DRAFT and PUBLISHED events can be cancelled if they haven't started.

| Scenario | Can Cancel? | Reason |
|----------|-------------|--------|
| DRAFT, not started | ✅ Yes | Organizer can abandon incomplete event |
| PUBLISHED, not started | ✅ Yes | Organizer can cancel (triggers refunds) |
| PUBLISHED, has started | ❌ No | Event is in progress |
| CANCELLED | ❌ No | Already cancelled |
| COMPLETED | ❌ No | Event has finished |

```typescript
canBeCancelled(): boolean {
  return (
    (this._status === EventStatus.DRAFT || this._status === EventStatus.PUBLISHED) &&
    !this.hasStarted()
  );
}
```

#### Event Updates

**Terminal State Rule:** CANCELLED and COMPLETED are terminal states - no modifications allowed.

| Status | Allowed Updates |
|--------|-----------------|
| DRAFT | All fields |
| PUBLISHED | Title, description, category, image (NOT dates/location) |
| CANCELLED | ❌ None |
| COMPLETED | ❌ None |

```typescript
updateDetails(updates): Result<void, Error> {
  // Terminal states reject all modifications
  if (this._status === EventStatus.CANCELLED) {
    return Result.fail(EventCannotBeModifiedException.cancelled());
  }
  if (this._status === EventStatus.COMPLETED) {
    return Result.fail(EventCannotBeModifiedException.completed());
  }
  // ...
}
```

### Ticket Type Rules

| Rule | Constraint |
|------|------------|
| Maximum per event | 10 ticket types |
| Unique names | Names must be unique within event |
| Sales period | Must end before event starts |
| Quantity limits | 1 - 10,000 per type |
| Price limits | 0.001 - 999,999 (currency units) |
| Cannot remove if | Status is PUBLISHED or tickets sold |

---

## Domain Events

### Event Domain Events

| Event | Published When | Data |
|-------|----------------|------|
| `EventCreatedEvent` | Event.create() | aggregateId, organizerId, title, category |
| `EventPublishedEvent` | Event.publish() | aggregateId, organizerId, title, publishedAt, ticketTypeCount, totalCapacity |
| `EventUpdatedEvent` | Event.updateDetails() | aggregateId, organizerId, changes, updatedAt |
| `EventCancelledEvent` | Event.cancel() | aggregateId, organizerId, title, reason, cancelledAt, soldTickets, totalRevenue |

### Ticket Type Domain Events

| Event | Published When | Data |
|-------|----------------|------|
| `TicketTypeAddedEvent` | Event.addTicketType() | aggregateId, ticketTypeId, name, price, quantity, salesStartDate, salesEndDate |
| `TicketTypeUpdatedEvent` | Event.updateTicketType() | aggregateId, ticketTypeId, ticketTypeName, changes, updatedAt |
| `TicketTypeSoldOutEvent` | TicketType.incrementSold() (when sold out) | ticketTypeId, eventId, ticketTypeName, totalQuantity |

---

## Value Objects

### EventCategory

Supported event categories:

```typescript
enum EventCategory {
  CONCERT = 'CONCERT',
  CONFERENCE = 'CONFERENCE',
  SPORT = 'SPORT',
  THEATER = 'THEATER',
  FESTIVAL = 'FESTIVAL',
  WORKSHOP = 'WORKSHOP',
  EXHIBITION = 'EXHIBITION',
  NETWORKING = 'NETWORKING',
  OTHER = 'OTHER',
}
```

### EventStatus

Event lifecycle states:

```typescript
enum EventStatus {
  DRAFT = 'DRAFT',         // Being created/edited
  PUBLISHED = 'PUBLISHED', // Live and visible
  CANCELLED = 'CANCELLED', // Cancelled by organizer
  COMPLETED = 'COMPLETED', // Event has ended
}
```

### LocationVO

Location with optional geocoding:

```typescript
interface LocationProps {
  address?: string | null;  // Street address
  city: string;             // Required
  country: string;          // Required
  latitude?: number;        // Optional geocode
  longitude?: number;       // Optional geocode
}
```

### Currency

Supported currency (Tunisia-focused):

```typescript
enum Currency {
  TND = 'TND',  // Tunisian Dinar (primary)
  EUR = 'EUR',  // Euro (international)
  USD = 'USD',  // US Dollar (international)
}
```

---

## Query Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getTotalRevenue()` | `TicketPriceVO` | Sum of all ticket type revenue |
| `getTotalRevenueAmount()` | `number` | Raw revenue amount (allows zero) |
| `getAvailableCapacity()` | `number` | totalCapacity - soldTickets |
| `canBeCancelled()` | `boolean` | Check if event can be cancelled |
| `canBeModified()` | `boolean` | Check if event is DRAFT |
| `isPublished()` | `boolean` | Check if status is PUBLISHED |
| `hasStarted()` | `boolean` | Check if event has started |
| `hasEnded()` | `boolean` | Check if event has ended |
| `getActiveTicketTypes()` | `TicketTypeEntity[]` | Filter active & on-sale types |
| `getSalesProgress()` | `number` | Percentage of capacity sold (0-100) |
| `isSoldOut()` | `boolean` | Check if all capacity sold |
| `hasTicketTypes()` | `boolean` | Check if any ticket types exist |
| `getTicketTypeCount()` | `number` | Count of ticket types |
| `findTicketType(id)` | `TicketTypeEntity?` | Find ticket type by ID |

---

## Test Coverage

| Component | Statement | Branch | Functions |
|-----------|-----------|--------|-----------|
| **Overall Domain** | 93.59% | 90.6% | 92.35% |
| event.entity.ts | 91.31% | 85.62% | 95% |
| ticket-type.entity.ts | 95.9% | 93.24% | 100% |
| Value Objects (avg) | 96.98% | 94.25% | 97.31% |
| Exceptions (avg) | 95.32% | 100% | 93.5% |

**Total Tests:** 549 (Events domain layer)

---

## Future Work (Sub-Issues 3.2.4+)

- [ ] Repository Interface (3.2.4)
- [ ] Application Layer Commands (3.2.5)
- [ ] Application Layer Queries (3.2.6)
- [ ] Persistence Layer (3.2.7)
- [ ] AWS S3 Service for images (3.2.8)
- [ ] Image Upload & Scheduler (3.2.9)
- [ ] Controllers & Guards (3.2.10)
- [ ] Module Integration (3.2.11)
- [ ] Testing & Documentation (3.2.12)
