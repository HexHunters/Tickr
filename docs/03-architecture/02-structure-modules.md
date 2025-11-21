# 📦 Structure Modules - 6 Modules Tickr

**Version:** 1.0  
**Temps lecture:** 15 minutes

---

## 🎯 Vue d'Ensemble

### 6 Modules Bounded Contexts

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  USERS   │  │  EVENTS  │  │ TICKETS  │
│          │  │          │  │          │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │              │
     └─────────────┼──────────────┘
                   │
            ┌──────▼──────┐
            │ EVENT BUS   │
            │ (In-Memory) │
            └──────┬──────┘
                   │
     ┌─────────────┼──────────────┐
     │             │              │
┌────▼─────┐  ┌───▼──────┐  ┌───▼──────┐
│ PAYMENTS │  │  NOTIFS  │  │ANALYTICS │
│          │  │          │  │          │
└──────────┘  └──────────┘  └──────────┘
```

**Communication:** Events uniquement (pas d'appels directs)

---

## 👤 Module 1: USERS

### Responsabilités

```yaml
✅ Authentification (JWT)
✅ Gestion profils (Participant/Organisateur)
✅ Autorisation (Guards, RBAC)
```

### Entités Domain

```typescript
// Event (User)
export class User {
  id: string;
  email: Email;  // Value Object
  phone: Phone;  // Value Object
  passwordHash: string;
  role: UserRole;
  profile: UserProfile;

  static register(data: RegisterData): User
  becomeOrganizer(profile: OrganizerProfile): void
  changePassword(old: string, new: string): void
}

// Value Objects
export class Email {
  constructor(private readonly value: string) {
    if (!this.isValid(value)) throw new InvalidEmailException();
  }
}

export class Phone {
  constructor(private readonly value: string) {
    if (!this.isTunisianFormat(value)) throw new InvalidPhoneException();
  }
  
  private isTunisianFormat(phone: string): boolean {
    return /^\+216[2-9][0-9]{7}$/.test(phone);
  }
}
```

### Commands

```typescript
RegisterUserCommand
LoginUserCommand
BecomeOrganizerCommand
UpdateProfileCommand
ChangePasswordCommand
```

### Queries

```typescript
GetUserByIdQuery
GetUserByEmailQuery
GetOrganizerProfileQuery
```

### Events Émis

```typescript
UserRegisteredEvent    → Déclenche email confirmation
OrganizerCreatedEvent  → Déclenche setup dashboard
```

---

## 🎉 Module 2: EVENTS

### Responsabilités

```yaml
✅ Création/modification événements
✅ Gestion types billets
✅ Publication/dépublication
✅ Recherche et filtrage
```

### Entités Domain

```typescript
export class Event {
  id: string;
  organizerId: string;
  name: string;
  slug: string;
  description: string;
  category: EventCategory;
  status: EventStatus;  // DRAFT, PUBLISHED, CANCELLED
  location: Location;   // Value Object
  period: DatePeriod;   // Value Object
  ticketTypes: TicketType[];
  coverImage: ImageUrl;

  static create(data: CreateEventData): Event
  publish(): void
  cancel(reason: string): void
  addTicketType(type: TicketType): void
  
  private canPublish(): boolean {
    return this.ticketTypes.length > 0 
      && this.coverImage.isPresent()
      && this.period.isFuture();
  }
}

export class TicketType {
  id: string;
  name: string;
  price: Money;  // Value Object
  quantity: number;
  sold: number;

  get available(): number {
    return this.quantity - this.sold;
  }

  reserve(qty: number): void {
    if (qty > this.available) throw new InsufficientTicketsException();
    this.sold += qty;
  }
}
```

### Commands

```typescript
CreateEventCommand
UpdateEventCommand
PublishEventCommand
CancelEventCommand
AddTicketTypeCommand
UpdateTicketTypeCommand
```

### Queries

```typescript
GetEventByIdQuery
GetEventBySlugQuery
SearchEventsQuery
GetOrganizerEventsQuery
```

### Events Émis

```typescript
EventCreatedEvent      → Analytics track
EventPublishedEvent    → Indexation recherche
EventCancelledEvent    → Remboursements automatiques
TicketTypeAddedEvent   → Cache invalidation
```

---

## 🎫 Module 3: TICKETS

### Responsabilités

```yaml
✅ Génération billets + QR codes
✅ Réservations temporaires (15 min)
✅ Check-in entrée événement
```

### Entités Domain

```typescript
export class Ticket {
  id: string;
  ticketNumber: string;  // TICKR-001234
  eventId: string;
  ticketTypeId: string;
  userId: string;
  orderId: string;
  price: Money;
  qrCode: QRCode;  // Value Object
  status: TicketStatus;
  
  static generate(data: GenerateTicketData): Ticket
  checkIn(by: string): void
  cancel(): void
  
  private canCheckIn(): boolean {
    return this.status === TicketStatus.VALID 
      && !this.checkedInAt;
  }
}

export class QRCode {
  constructor(
    private readonly eventId: string,
    private readonly ticketId: string,
    private readonly userId: string,
  ) {}

  get data(): string {
    const payload = `${this.eventId}|${this.ticketId}|${this.userId}`;
    const hash = this.generateHMAC(payload);
    return `TICKR|${payload}|${hash}`;
  }

  verify(data: string): boolean {
    // Vérifie signature HMAC
  }
}

export class Reservation {
  id: string;
  userId: string;
  ticketTypeId: string;
  quantity: number;
  expiresAt: Date;
  status: ReservationStatus;

  static create(data: CreateReservationData): Reservation
  isExpired(): boolean
  confirm(orderId: string): void
  release(): void
}
```

### Commands

```typescript
CreateReservationCommand   // Panier
ReleaseReservationCommand  // Expiration 15 min
GenerateTicketsCommand     // Après paiement
CheckInTicketCommand       // Scan QR
CancelTicketCommand        // Remboursement
```

### Queries

```typescript
GetUserTicketsQuery
GetTicketByNumberQuery
ValidateQRCodeQuery
GetEventCheckinStatsQuery
```

### Events Émis

```typescript
ReservationCreatedEvent    → Timer expiration
ReservationExpiredEvent    → Stock libéré
TicketsGeneratedEvent      → Envoi emails
TicketCheckedInEvent       → Analytics temps réel
```

---

## 💳 Module 4: PAYMENTS

### Responsabilités

```yaml
✅ Création commandes
✅ Intégration gateways (Clictopay, Stripe)
✅ Gestion webhooks paiement
✅ Remboursements
```

### Entités Domain

```typescript
export class Order {
  id: string;
  orderNumber: string;
  userId: string;
  eventId: string;
  items: OrderItem[];
  subtotal: Money;
  platformFee: Money;
  total: Money;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  expiresAt: Date;

  static create(data: CreateOrderData): Order
  complete(): void
  fail(reason: string): void
  refund(amount: Money, reason: string): Refund
  
  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}

export class Transaction {
  id: string;
  orderId: string;
  gateway: PaymentGateway;
  gatewayTransactionId: string;
  amount: Money;
  status: TransactionStatus;

  static initiate(order: Order, gateway: PaymentGateway): Transaction
  complete(gatewayData: any): void
  fail(error: string): void
}

export class Refund {
  id: string;
  orderId: string;
  transactionId: string;
  amount: Money;
  reason: string;
  status: RefundStatus;

  static request(data: RequestRefundData): Refund
  approve(by: string): void
  reject(by: string, reason: string): void
}
```

### Commands

```typescript
CreateOrderCommand
ProcessPaymentCommand
HandlePaymentWebhookCommand
RequestRefundCommand
ApproveRefundCommand
```

### Queries

```typescript
GetOrderByIdQuery
GetUserOrdersQuery
GetOrderStatusQuery
GetRefundStatusQuery
```

### Events Émis

```typescript
OrderCreatedEvent          → Timer expiration
PaymentCompletedEvent      → Génération billets
PaymentFailedEvent         → Libération stock
RefundRequestedEvent       → Notification organisateur
RefundCompletedEvent       → Annulation billets
```

---

## 📧 Module 5: NOTIFICATIONS

### Responsabilités

```yaml
✅ Emails transactionnels (SES)
✅ SMS (Twilio)
✅ Événements système (logs)
```

### Entités Domain

```typescript
export class EmailNotification {
  id: string;
  userId: string;
  to: Email;
  subject: string;
  template: EmailTemplate;
  context: Record<string, any>;
  status: NotificationStatus;

  static create(data: CreateEmailData): EmailNotification
  send(gateway: EmailGateway): Promise<void>
  markOpened(): void
}

export class SMSNotification {
  id: string;
  userId: string;
  to: Phone;
  message: string;
  gateway: SMSGateway;
  status: NotificationStatus;

  static create(data: CreateSMSData): SMSNotification
  send(gateway: SMSGateway): Promise<void>
  
  private isWithinAllowedHours(): boolean {
    const hour = new Date().getHours();
    return hour >= 8 && hour <= 20;
  }
}
```

### Commands

```typescript
SendEmailCommand
SendSMSCommand
MarkEmailOpenedCommand
```

### Event Handlers (Écoute Autres Modules)

```typescript
// Écoute: UserRegisteredEvent
→ Envoie email confirmation

// Écoute: PaymentCompletedEvent
→ Envoie email + SMS avec billets

// Écoute: EventPublishedEvent
→ Email organisateur confirmation

// Écoute: EventDateChangedEvent
→ Notifie participants changement
```

---

## 📊 Module 6: ANALYTICS

### Responsabilités

```yaml
✅ Tracking vues événements
✅ Statistiques ventes temps réel
✅ Métriques dashboard organisateur
✅ Reports business
```

### Entités Domain

```typescript
export class EventView {
  id: string;
  eventId: string;
  userId?: string;
  ipAddress: string;
  referrer?: string;
  viewedAt: Date;

  static track(data: TrackViewData): EventView
}

export class DailyStats {
  date: Date;
  eventId?: string;
  views: number;
  ticketsSold: number;
  revenue: Money;

  increment(metric: Metric, value: number): void
  snapshot(): DailyStatsSnapshot
}

export class SalesStats {
  eventId: string;
  
  get soldPercentage(): number
  get conversionRate(): number
  get revenueByTicketType(): Map<string, Money>
  get salesTrend(): DailyRevenue[]
}
```

### Commands

```typescript
TrackEventViewCommand
RecordSaleCommand
GenerateReportCommand
```

### Queries

```typescript
GetEventStatsQuery
GetDashboardStatsQuery
GetSalesTrendQuery
GetConversionMetricsQuery
```

### Event Handlers

```typescript
// Écoute: EventPublishedEvent
→ Initialise tracking

// Écoute: PaymentCompletedEvent
→ Incrémente ventes

// Écoute: TicketCheckedInEvent
→ Track taux présence
```

---

## 🔗 Communication Inter-Modules

### Règles

```yaml
❌ INTERDIT:
  - Import direct d'un module dans un autre
  - Appel méthode direct entre modules
  - Requête BDD cross-schema

✅ AUTORISÉ:
  - Events domain (pub/sub)
  - Event bus in-memory (V1)
  - Duplication données si nécessaire
```

### Exemple Flow

```
1. User achète billet
   → PAYMENTS: OrderCreatedEvent

2. TICKETS écoute
   → Crée réservation
   
3. User paie
   → PAYMENTS: PaymentCompletedEvent

4. TICKETS écoute
   → Génère billets
   → TicketsGeneratedEvent

5. NOTIFICATIONS écoute
   → Envoie email + SMS

6. ANALYTICS écoute
   → Incrémente stats ventes
```

---

## ✅ Checklist Modules

```yaml
✅ Séparation:
  - [ ] 6 modules isolés
  - [ ] Chaque module = dossier séparé
  - [ ] Aucun import cross-module

✅ Communication:
  - [ ] Event bus configuré
  - [ ] Events domain définis
  - [ ] Handlers enregistrés

✅ Database:
  - [ ] 1 schema PostgreSQL par module
  - [ ] Pas de FK entre schémas
  - [ ] Duplication si nécessaire

✅ Tests:
  - [ ] Tests unitaires par module
  - [ ] Tests intégration event bus
  - [ ] Tests E2E flows complets
```

---

**Prochaine lecture:** `03-event-driven.md` pour l'architecture événementielle détaillée.
