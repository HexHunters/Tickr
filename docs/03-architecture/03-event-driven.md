# ⚡ Event-Driven Architecture

**Version:** 1.0  
**Pattern:** Event Sourcing Light + CQRS  
**Temps lecture:** 10 minutes

---

## 🎯 Pourquoi Event-Driven ?

### Bénéfices

```yaml
✅ Découplage modules (aucun import direct)
✅ Scalabilité horizontale (V2 microservices)
✅ Audit trail (historique événements)
✅ Résilience (retry automatique)
✅ Extensibilité (nouveaux handlers facilement)
```

---

## 📨 Types Événements

### 1. Domain Events

**Définition:** Quelque chose qui s'est passé dans le domaine

```typescript
// src/shared/domain/domain-event.base.ts
export abstract class DomainEvent {
  public readonly occurredAt: Date;
  public readonly eventId: string;

  constructor(
    public readonly aggregateId: string,
  ) {
    this.eventId = uuid();
    this.occurredAt = new Date();
  }

  abstract get eventName(): string;
}

// Exemple concret
export class EventPublishedEvent extends DomainEvent {
  constructor(
    public readonly eventId: string,
    public readonly organizerId: string,
    public readonly eventName: string,
  ) {
    super(eventId);
  }

  get eventName(): string {
    return 'event.published';
  }
}
```

### 2. Integration Events

**Définition:** Communication externe (APIs, webhooks)

```typescript
export class PaymentWebhookReceivedEvent {
  constructor(
    public readonly gateway: string,
    public readonly transactionId: string,
    public readonly status: string,
    public readonly rawData: any,
  ) {}
}
```

---

## 🚌 Event Bus V1 (In-Memory)

### Configuration NestJS

```typescript
// src/app.module.ts
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),
  ],
})
export class AppModule {}
```

### Publier Événement

```typescript
// Dans un Handler
import { EventEmitter2 } from '@nestjs/event-emitter';

@CommandHandler(PublishEventCommand)
export class PublishEventHandler {
  constructor(
    private readonly eventBus: EventEmitter2,
  ) {}

  async execute(command: PublishEventCommand) {
    // 1. Logique métier
    const event = await this.eventRepo.findById(command.eventId);
    event.publish();
    await this.eventRepo.save(event);

    // 2. Publier événement
    this.eventBus.emit(
      'event.published',
      new EventPublishedEvent(event.id, event.organizerId, event.name),
    );

    return EventDto.fromDomain(event);
  }
}
```

### Écouter Événement

```typescript
// Dans un module différent
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class EventPublishedListener {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly notificationService: NotificationService,
  ) {}

  @OnEvent('event.published')
  async handleEventPublished(event: EventPublishedEvent) {
    // Plusieurs handlers peuvent écouter le même événement
    
    // Analytics: initialiser tracking
    await this.analyticsService.initializeTracking(event.eventId);

    // Notification: email organisateur
    await this.notificationService.sendEmail({
      to: event.organizerId,
      template: 'event-published-confirmation',
      context: { eventName: event.eventName },
    });
  }
}
```

---

## 📋 Catalogue Événements

### Module EVENTS

```typescript
EventCreatedEvent         // Événement créé (brouillon)
EventPublishedEvent       // Événement publié
EventCancelledEvent       // Événement annulé
EventDateChangedEvent     // Date modifiée
TicketTypeAddedEvent      // Nouveau type billet
TicketTypeSoldOutEvent    // Type billet épuisé
```

### Module TICKETS

```typescript
ReservationCreatedEvent   // Panier créé (15 min)
ReservationExpiredEvent   // Panier expiré
ReservationCancelledEvent // Panier vidé manuel
TicketsGeneratedEvent     // Billets générés après paiement
TicketCheckedInEvent      // Billet scanné entrée
TicketCancelledEvent      // Billet annulé (remboursement)
```

### Module PAYMENTS

```typescript
OrderCreatedEvent         // Commande créée
PaymentInitiatedEvent     // Redirection gateway
PaymentCompletedEvent     // Paiement réussi
PaymentFailedEvent        // Paiement échoué
RefundRequestedEvent      // Demande remboursement
RefundCompletedEvent      // Remboursement traité
```

### Module USERS

```typescript
UserRegisteredEvent       // Inscription
OrganizerCreatedEvent     // Devenu organisateur
UserUpdatedEvent          // Profil modifié
```

---

## 🔄 Flows Événementiels Critiques

### Flow 1: Achat Billet

```
1. User ajoute billet au panier
   TICKETS → ReservationCreatedEvent
   
2. Timer 15 min démarre
   (Background job écoute)
   
3a. Si paiement réussi avant expiration:
    PAYMENTS → PaymentCompletedEvent
    ├─ TICKETS écoute → Génère billets → TicketsGeneratedEvent
    ├─ NOTIFICATIONS écoute → Email + SMS
    ├─ ANALYTICS écoute → Incrémente ventes
    └─ EVENTS écoute → Décrémente stock

3b. Si expiration sans paiement:
    Timer → ReservationExpiredEvent
    └─ TICKETS écoute → Libère stock
```

### Flow 2: Annulation Événement

```
1. Organisateur annule événement
   EVENTS → EventCancelledEvent
   
2. PAYMENTS écoute
   ├─ Récupère toutes commandes événement
   ├─ Initie remboursements
   └─ RefundRequestedEvent × N

3. TICKETS écoute
   ├─ Récupère tous billets événement
   ├─ Change status CANCELLED
   └─ TicketCancelledEvent × N

4. NOTIFICATIONS écoute
   └─ Email tous participants (annulation + remboursement)
```

### Flow 3: Check-in Entrée

```
1. Staff scanne QR code
   TICKETS → TicketCheckedInEvent
   
2. ANALYTICS écoute
   └─ Incrémente compteur temps réel

3. NOTIFICATIONS écoute (optionnel V2)
   └─ SMS organisateur milestone (ex: 50% checked-in)
```

---

## ⚠️ Gestion Erreurs

### Retry Automatique

```typescript
@OnEvent('payment.completed', { async: true })
async handlePaymentCompleted(event: PaymentCompletedEvent) {
  try {
    await this.generateTickets(event.orderId);
  } catch (error) {
    // Log erreur
    this.logger.error(`Failed to generate tickets: ${error.message}`);
    
    // Option 1: Republier événement avec délai
    setTimeout(() => {
      this.eventBus.emit('payment.completed.retry', event);
    }, 5000);
    
    // Option 2: Dead letter queue (V2 SQS)
    // this.dlq.send(event);
  }
}
```

### Idempotence

```typescript
@OnEvent('tickets.generated')
async handleTicketsGenerated(event: TicketsGeneratedEvent) {
  // Vérifier si déjà traité (éviter doublons)
  const alreadySent = await this.emailRepo.findByOrderId(event.orderId);
  if (alreadySent) {
    this.logger.warn(`Email already sent for order ${event.orderId}`);
    return;
  }

  await this.sendTicketsEmail(event);
}
```

---

## 🔄 Migration V2 (SQS/EventBridge)

### V1 → V2

```typescript
// V1: In-Memory (EventEmitter2)
this.eventBus.emit('event.published', event);

// V2: AWS EventBridge
await this.eventBridge.putEvents({
  Entries: [{
    Source: 'tickr.events',
    DetailType: 'EventPublished',
    Detail: JSON.stringify(event),
  }],
});
```

### Avantages V2

```yaml
✅ Persistance événements (pas de perte si crash)
✅ Retry automatique (DLQ)
✅ Filtrage avancé (règles EventBridge)
✅ Monitoring (CloudWatch)
✅ Multi-consumer (autres services)
```

---

## 📊 Monitoring

### Métriques à Tracker

```yaml
Events:
  - events.published.count
  - events.processing.duration
  - events.failed.count
  
Handlers:
  - handler.tickets.generated.success
  - handler.tickets.generated.failed
  - handler.tickets.generated.duration
```

### Logs Structurés

```typescript
this.logger.log({
  message: 'Event handled successfully',
  eventType: 'payment.completed',
  eventId: event.eventId,
  orderId: event.orderId,
  duration: Date.now() - startTime,
});
```

---

## ✅ Checklist Event-Driven

```yaml
✅ Configuration:
  - [ ] EventEmitterModule configuré
  - [ ] Wildcard + délimiteur définis
  - [ ] Max listeners ajusté

✅ Événements:
  - [ ] Base class DomainEvent créée
  - [ ] Tous événements métier définis
  - [ ] Naming convention respectée (past tense)

✅ Handlers:
  - [ ] @OnEvent decorators utilisés
  - [ ] Async handlers si I/O
  - [ ] Error handling + retry

✅ Tests:
  - [ ] Vérifier événements émis
  - [ ] Vérifier handlers déclenchés
  - [ ] Tests intégration flows

✅ Monitoring:
  - [ ] Logs structurés
  - [ ] Métriques events/handlers
  - [ ] Alertes sur échecs
```

---

**Prochaine lecture:** `04-migration-microservices.md` pour le plan migration V2/V3.
