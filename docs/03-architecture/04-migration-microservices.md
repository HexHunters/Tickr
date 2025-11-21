# 🚀 Migration vers Microservices

**Version:** V1 Monolithe → V2 Modulaire → V3 Microservices  
**Timeline:** 6-12 mois après MVP  
**Temps lecture:** 15 minutes

---

## 🎯 Stratégie Globale

### Pourquoi Attendre ?

```yaml
❌ NE PAS partir en microservices immédiatement:
  - Complexité opérationnelle (DevOps overhead)
  - Coûts infrastructure × 3-4
  - Debugging distribué difficile
  - Overhead réseau (latence)

✅ Partir en monolithe modulaire V1:
  - Time to market rapide (3 mois)
  - Coûts faibles ($100/mois)
  - Debugging simple (1 process)
  - Changements rapides (pas de contrats API)
```

### Quand Migrer ?

**Triggers V2 (6 mois après lancement):**
```
✅ 200+ événements/mois
✅ 10,000+ billets/mois
✅ 2-3 développeurs équipe
✅ Besoin scaling indépendant (ex: module Payments)
✅ Problèmes performance identifiés
```

---

## 📅 Timeline Migration

```
┌─────────────────────────────────────────────────────────┐
│ V1 MONOLITHE (Mois 0-6)                                 │
│ ✅ MVP livré                                             │
│ ✅ Product-market fit validé                            │
│ ✅ Architecture hexagonale solide                       │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ V2 MODULAIRE (Mois 6-12)                                │
│ 🔄 Event Bus → SQS/EventBridge                          │
│ 🔄 Extraction 2 microservices critiques:               │
│    - Notifications (autonome)                           │
│    - Payments (PCI compliance)                          │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ V3 MICROSERVICES (Mois 12-18)                           │
│ 🔄 6 services indépendants                              │
│ 🔄 Database per service                                 │
│ 🔄 API Gateway                                          │
│ 🔄 Service mesh (optionnel)                             │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Plan Migration Détaillé

### Phase 1: Préparation (Mois 0-6, pendant V1)

```yaml
✅ Architecture hexagonale stricte:
  - Modules isolés (aucun import direct)
  - Communication par events uniquement
  - Schemas DB séparés (pas de FK)

✅ Event-Driven dès le début:
  - Event bus in-memory
  - Catalogue événements complet
  - Handlers testés

✅ Contracts tests:
  - Schémas Zod pour événements
  - Validation stricte données
  - Tests intégration robustes

✅ Monitoring dès V1:
  - CloudWatch logs
  - Métriques custom (ventes, latence)
  - Alertes critiques
```

### Phase 2: Event Bus Persistant (Mois 6-8)

**Action:** Remplacer EventEmitter2 → AWS EventBridge

**Étapes:**
```typescript
// 1. Créer abstraction Event Bus
export interface EventBusPort {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventName: string, handler: EventHandler): void;
}

// 2. Implémenter adapter EventBridge
@Injectable()
export class EventBridgeAdapter implements EventBusPort {
  constructor(
    @Inject('AWS_EVENTBRIDGE')
    private readonly client: EventBridgeClient,
  ) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.client.putEvents({
      Entries: [{
        Source: 'tickr.events',
        DetailType: event.eventName,
        Detail: JSON.stringify(event),
        EventBusName: process.env.EVENT_BUS_NAME,
      }],
    });
  }
}

// 3. Basculer progressivement
// Feature flag pour chaque type événement
if (shouldUseEventBridge('payment.completed')) {
  await this.eventBridgeAdapter.publish(event);
} else {
  this.eventEmitter.emit('payment.completed', event);
}
```

**Bénéfices:**
- Persistance événements (audit trail)
- Retry automatique
- Préparation microservices

**Coût:** +$20/mois (EventBridge + SQS)

---

### Phase 3: Extraction Service NOTIFICATIONS (Mois 7-8)

**Pourquoi en premier ?**
```yaml
✅ Autonome (pas de dépendances critiques)
✅ Stateless (pas de DB complexe)
✅ Volume élevé (bénéfice scaling)
✅ Facile à tester isolément
```

**Étapes:**

**1. Créer nouveau service NestJS**
```bash
mkdir services/notifications
cd services/notifications
nest new .
```

**2. Copier module Notifications**
```
services/notifications/
├── src/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── main.ts
├── Dockerfile
└── package.json
```

**3. Configurer SQS queue**
```typescript
// EventBridge rule → SQS queue
{
  "source": ["tickr.*"],
  "detail-type": [
    "TicketsGenerated",
    "EventPublished",
    "EventCancelled"
  ]
}
```

**4. Consumer SQS**
```typescript
@Injectable()
export class NotificationConsumer {
  @SqsMessageHandler('tickr-notifications-queue')
  async handleMessage(message: AWS.SQS.Message) {
    const event = JSON.parse(message.Body);
    
    switch (event.DetailType) {
      case 'TicketsGenerated':
        await this.sendTicketsEmail(event.Detail);
        break;
      case 'EventPublished':
        await this.sendPublishedEmail(event.Detail);
        break;
    }
  }
}
```

**5. Déployer service séparé**
```yaml
ECS Service: tickr-notifications
Task: 1 vCPU, 512 MB
Scaling: Messages in queue > 100
```

**6. Basculer trafic progressivement**
```typescript
// Dans monolithe, désactiver handlers notifications
@OnEvent('tickets.generated')
handleTicketsGenerated() {
  // Désactivé - géré par service notifications
  return;
}
```

**Durée:** 2 semaines  
**Coût additionnel:** +$30/mois

---

### Phase 4: Extraction Service PAYMENTS (Mois 9-10)

**Pourquoi ?**
```yaml
✅ Sécurité (PCI compliance isolation)
✅ Scaling indépendant (pics paiements)
✅ Rotation secrets simplifié
✅ Monitoring dédié
```

**Complexité:** Moyenne (dépendances tickets, orders)

**Stratégie:** Strangler Pattern

```
┌─────────────┐         ┌─────────────┐
│  MONOLITH   │────────▶│  PAYMENTS   │
│             │         │  SERVICE    │
│  Gateway:   │         │             │
│  If new     │         │  - Orders   │
│  → Service  │         │  - Webhooks │
│  Else       │         │  - Refunds  │
│  → Monolith │         │             │
└─────────────┘         └─────────────┘
```

**Migration données:**
```sql
-- Copier orders/transactions existants
INSERT INTO payments_service.orders
SELECT * FROM monolith.payments.orders
WHERE created_at > '2024-06-01';  -- Seulement ordres récents
```

**Synchronisation temporaire:**
```typescript
// Dual write pendant migration (1 mois)
await this.monolithOrderRepo.save(order);
await this.paymentsServiceOrderRepo.save(order);
```

**Durée:** 3-4 semaines  
**Coût additionnel:** +$50/mois

---

### Phase 5: Extraction Autres Services (Mois 11-15)

**Ordre recommandé:**

**1. ANALYTICS (Semaine 1-2)**
- Autonome, lecture seule
- Peut reconstruire données depuis events

**2. TICKETS (Semaine 3-5)**
- Dépendance: Events (read-only via API)
- QR codes generation isolé

**3. EVENTS (Semaine 6-8)**
- Core business
- Migration lente et prudente

**4. USERS (Semaine 9-10)**
- Auth centralisé (JWT shared secret)
- Session management

---

## 🔀 Patterns Migration

### 1. Strangler Pattern

```
Étape 1: Route nouveau trafic → nouveau service
Étape 2: Migration progressive ancien trafic
Étape 3: Décommission ancien code
```

### 2. Database per Service

```yaml
Problème: Foreign keys entre modules

Solution:
  - Dupliquer données nécessaires
  - Synchroniser via events
  - Eventual consistency acceptable
```

**Exemple:**
```typescript
// Service TICKETS a besoin info event
// Ne PAS foreign key vers DB Events
// Stocker copie locale event data

export class Ticket {
  eventId: string;
  eventName: string;      // Dupliqué
  eventDate: Date;        // Dupliqué
  eventLocation: string;  // Dupliqué
}

// Synchronisation via event
@OnEvent('event.updated')
async syncEventData(event: EventUpdatedEvent) {
  await this.ticketRepo.updateEventData(
    event.eventId,
    { name: event.name, date: event.date }
  );
}
```

### 3. Saga Pattern (Transactions Distribuées)

```typescript
// Exemple: Remboursement cross-services

export class RefundSaga {
  async execute(orderId: string) {
    try {
      // 1. Initier remboursement
      const refund = await this.paymentsService.initiateRefund(orderId);
      
      // 2. Annuler billets
      await this.ticketsService.cancelTickets(orderId);
      
      // 3. Notifier utilisateur
      await this.notificationsService.sendRefundEmail(orderId);
      
      // 4. Compléter refund
      await this.paymentsService.completeRefund(refund.id);
      
    } catch (error) {
      // Compensation: rollback
      await this.compensate(orderId);
    }
  }

  private async compensate(orderId: string) {
    // Annuler actions précédentes
    await this.paymentsService.cancelRefund(orderId);
    await this.ticketsService.reactivateTickets(orderId);
  }
}
```

---

## 📊 Comparaison Architecture

### Coûts Infrastructure

```
V1 Monolithe:
  - ECS Fargate: 2 tasks = $50
  - RDS: $30
  - S3/CloudWatch: $10
  TOTAL: $90/mois

V2 Modulaire (2 services):
  - Monolith: $50
  - Notifications service: $30
  - Payments service: $50
  - EventBridge + SQS: $20
  - RDS: $30
  TOTAL: $180/mois

V3 Microservices (6 services):
  - 6 × ECS services: $200
  - 6 × RDS (ou shared): $150
  - EventBridge/SQS: $40
  - API Gateway: $30
  TOTAL: $420/mois
```

### Complexité Opérationnelle

```
V1: ⭐ (1 service, 1 DB)
V2: ⭐⭐ (3 services, 2 DB)
V3: ⭐⭐⭐⭐ (6 services, 6 DB, API Gateway, service mesh)
```

---

## ✅ Checklist Migration

```yaml
✅ Préparation (V1):
  - [ ] Modules isolés (architecture hexagonale)
  - [ ] Event-driven complet
  - [ ] Schemas DB séparés
  - [ ] Tests contrats robustes

✅ Event Bus (V2):
  - [ ] EventBridge configuré
  - [ ] SQS queues créées
  - [ ] Feature flags migration
  - [ ] Monitoring events persistés

✅ Extraction Services:
  - [ ] Service autonome (Dockerfile, CI/CD)
  - [ ] Database migration strategy
  - [ ] Dual write période transition
  - [ ] Rollback plan documenté

✅ Validation:
  - [ ] Tests E2E cross-services
  - [ ] Performance benchmarks
  - [ ] Monitoring distribué (X-Ray)
  - [ ] Coûts validés
```

---

**Recommandation Finale:** Rester en V1 monolithe modulaire tant que volume < 10k billets/mois. La flexibilité et rapidité développement valent plus que le "hype" microservices.

---

**Prochaine lecture:** `../04-infrastructure/01-aws-architecture.md` pour le setup AWS V1.
