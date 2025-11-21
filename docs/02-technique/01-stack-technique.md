# 🛠️ Stack Technique - Tickr

**Version:** 1.0  
**Temps lecture:** 10 minutes

---

## 🎯 Vue d'Ensemble

### Architecture Globale

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│              React 18 + TypeScript                   │
│         Vite + TailwindCSS + React Query             │
└──────────────────┬──────────────────────────────────┘
                   │ HTTPS/REST
                   ↓
┌─────────────────────────────────────────────────────┐
│                    BACKEND                           │
│              NestJS + TypeScript                     │
│        Monolithe Modulaire Hexagonal                │
└──────────────────┬──────────────────────────────────┘
                   │
     ┌─────────────┼─────────────┐
     ↓             ↓             ↓
┌─────────┐  ┌──────────┐  ┌─────────┐
│PostgreSQL│  │  Redis   │  │   S3    │
│  15.4    │  │   7.x    │  │ Images  │
└─────────┘  └──────────┘  └─────────┘
```

---

## 🎨 Frontend

### Framework & Outils

**Core:**
- **React 18.2+** - UI library
- **TypeScript 5.3+** - Type safety
- **Vite 5.x** - Build tool (rapide)

**Styling:**
- **TailwindCSS 3.x** - Utility-first CSS
- **Headless UI** - Components accessibles
- **Lucide React** - Icons

**State Management:**
- **React Query (TanStack Query)** - Server state
- **Zustand** - Client state (panier, auth)

**Forms:**
- **React Hook Form** - Gestion formulaires
- **Zod** - Validation schemas

**Routing:**
- **React Router v6** - Navigation

**Code Quality:**
- **ESLint** - Linting
- **Prettier** - Formatting
- **Husky** - Git hooks

### Structure Frontend

```
frontend/
├── src/
│   ├── app/
│   │   ├── routes/                # Routes React Router
│   │   │   ├── events/
│   │   │   │   ├── $eventId.tsx  # Page détails
│   │   │   │   ├── search.tsx    # Page recherche
│   │   │   │   └── create.tsx    # Créer événement
│   │   │   ├── tickets/
│   │   │   ├── auth/
│   │   │   └── dashboard/
│   │   └── App.tsx
│   │
│   ├── components/
│   │   ├── ui/                    # Components UI réutilisables
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Modal.tsx
│   │   ├── events/                # Components métier
│   │   │   ├── EventCard.tsx
│   │   │   └── EventForm.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── Footer.tsx
│   │
│   ├── lib/
│   │   ├── api/                   # API client
│   │   │   ├── client.ts         # Axios instance
│   │   │   ├── events.ts         # Events endpoints
│   │   │   ├── payments.ts
│   │   │   └── tickets.ts
│   │   ├── hooks/                 # Custom hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useCart.ts
│   │   │   └── useEvents.ts
│   │   ├── stores/                # Zustand stores
│   │   │   ├── authStore.ts
│   │   │   └── cartStore.ts
│   │   └── utils/
│   │       ├── formatters.ts
│   │       └── validators.ts
│   │
│   ├── types/                     # TypeScript types
│   │   ├── events.ts
│   │   ├── tickets.ts
│   │   └── users.ts
│   │
│   └── main.tsx
│
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

### Dépendances Principales

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0",
    "axios": "^1.6.0",
    "tailwindcss": "^3.3.0",
    "@headlessui/react": "^1.7.0",
    "lucide-react": "^0.292.0",
    "qrcode.react": "^3.1.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/node": "^20.9.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "typescript": "^5.3.0",
    "eslint": "^8.54.0",
    "prettier": "^3.1.0"
  }
}
```

---

## ⚙️ Backend

### Framework & Architecture

**Core:**
- **NestJS 10.x** - Framework Node.js
- **TypeScript 5.3+** - Type safety
- **Node.js 20 LTS** - Runtime

**Architecture:**
- **Hexagonal (Ports & Adapters)**
- **Domain-Driven Design (DDD)**
- **CQRS Pattern** (Command Query Separation)
- **Event-Driven** (EventEmitter2 V1)

**ORM:**
- **TypeORM 0.3.x** - Object-Relational Mapping
- **Migrations** automatiques

**Validation:**
- **class-validator** - DTO validation
- **class-transformer** - DTO transformation

**Authentification:**
- **Passport JWT** - JWT strategy
- **bcrypt** - Password hashing

**Documentation:**
- **Swagger/OpenAPI** - API docs auto

**Testing:**
- **Jest** - Unit & integration tests
- **Supertest** - E2E tests

### Structure Backend

```
backend/
├── src/
│   ├── modules/
│   │   ├── events/
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   └── event.entity.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   └── location.vo.ts
│   │   │   │   └── events/
│   │   │   │       └── event-created.event.ts
│   │   │   ├── application/
│   │   │   │   ├── commands/
│   │   │   │   │   ├── create-event.command.ts
│   │   │   │   │   └── create-event.handler.ts
│   │   │   │   ├── queries/
│   │   │   │   │   ├── get-event.query.ts
│   │   │   │   │   └── get-event.handler.ts
│   │   │   │   └── ports/
│   │   │   │       ├── event.repository.port.ts
│   │   │   │       └── storage.port.ts
│   │   │   └── infrastructure/
│   │   │       ├── controllers/
│   │   │       │   └── event.controller.ts
│   │   │       ├── repositories/
│   │   │       │   └── event.repository.ts
│   │   │       ├── adapters/
│   │   │       │   └── s3-storage.adapter.ts
│   │   │       └── events.module.ts
│   │   │
│   │   ├── tickets/
│   │   ├── payments/
│   │   ├── users/
│   │   ├── notifications/
│   │   └── analytics/
│   │
│   ├── shared/
│   │   ├── domain/
│   │   │   ├── base-entity.ts
│   │   │   ├── value-object.base.ts
│   │   │   └── domain-event.base.ts
│   │   ├── infrastructure/
│   │   │   ├── database/
│   │   │   │   └── typeorm.config.ts
│   │   │   ├── event-bus/
│   │   │   │   └── in-memory.event-bus.ts
│   │   │   └── exceptions/
│   │   │       └── http-exception.filter.ts
│   │   └── guards/
│   │       ├── jwt-auth.guard.ts
│   │       └── roles.guard.ts
│   │
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   └── aws.config.ts
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── migrations/
├── nest-cli.json
├── tsconfig.json
└── package.json
```

### Dépendances Principales

```json
{
  "dependencies": {
    "@nestjs/common": "^10.2.0",
    "@nestjs/core": "^10.2.0",
    "@nestjs/platform-express": "^10.2.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/swagger": "^7.1.0",
    "@nestjs/event-emitter": "^2.0.0",
    "typeorm": "^0.3.17",
    "pg": "^8.11.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "bcrypt": "^5.1.1",
    "uuid": "^9.0.0",
    "qrcode": "^1.5.0",
    "stripe": "^14.0.0",
    "@aws-sdk/client-s3": "^3.400.0",
    "@aws-sdk/client-ses": "^3.400.0",
    "ioredis": "^5.3.0"
  },
  "devDependencies": {
    "@nestjs/testing": "^10.2.0",
    "@types/node": "^20.9.0",
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "supertest": "^6.3.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.3.0"
  }
}
```

---

## 🗄️ Base de Données

### PostgreSQL 15.4

**Choix:**
- ACID transactions
- Schemas isolation (1 par module)
- JSON support (metadata)
- Full-text search
- Excellent performance

**Configuration:**
```yaml
Version: 15.4
Instance AWS RDS: db.t3.small (V1)
Storage: 20 GB SSD (gp3)
Backup: automatique quotidien
Multi-AZ: non (V1), oui (V2)
```

**Schemas:**
```sql
CREATE SCHEMA events;
CREATE SCHEMA tickets;
CREATE SCHEMA payments;
CREATE SCHEMA users;
CREATE SCHEMA analytics;
```

**Connexion Pool:**
```typescript
{
  type: 'postgres',
  host: process.env.DB_HOST,
  port: 5432,
  database: 'tickr',
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  poolSize: 20,
  maxQueryExecutionTime: 5000,
  logging: process.env.NODE_ENV === 'development'
}
```

### Redis 7.x

**Usage:**
- Session storage (JWT blacklist)
- Cache requêtes fréquentes
- Rate limiting
- Pub/Sub (notifications temps réel)

**Configuration:**
```yaml
Instance AWS ElastiCache: cache.t3.micro
Mode: Standalone (V1), Cluster (V2)
Eviction policy: allkeys-lru
Max memory: 512 MB
```

---

## ☁️ Services AWS

### Compute

**ECS Fargate:**
```yaml
Service: tickr-monolith
Task CPU: 512 (.5 vCPU)
Task Memory: 1024 MB
Desired count: 2
Auto-scaling: CPU > 70%
```

### Storage

**S3:**
```yaml
Bucket: tickr-event-images
Region: eu-west-1
Storage class: Standard (V1), Intelligent-Tiering (V2)
Lifecycle: Archive to Glacier après 90 jours
CDN: CloudFront (V2)
```

### Notifications

**SES (Simple Email Service):**
```yaml
Region: eu-west-1
Sending limit: 50,000 emails/jour (V1)
Bounce rate: < 5%
Templates: confirmations, rappels
```

**SNS (Simple Notification Service):**
```yaml
Usage: SMS transactionnels
Coût: $0.00645 par SMS (Tunisie)
Fallback: Twilio si échec
```

### Monitoring

**CloudWatch:**
- Logs aggregation
- Metrics custom (ventes, conversions)
- Alarms (erreurs, latence)

**X-Ray:**
- Distributed tracing
- Performance analysis

---

## 🔧 Outils Développement

### Version Control

```bash
Git + GitHub
  - Branches: main, develop, feature/*
  - Pull Requests obligatoires
  - Reviews avant merge
```

### CI/CD

```yaml
GitHub Actions:
  - Lint & Tests sur PR
  - Build Docker image
  - Deploy ECS (main branch)
  
Environnements:
  - dev: auto-deploy (develop branch)
  - staging: manual approve
  - production: manual approve
```

### Local Development

```yaml
Docker Compose:
  - PostgreSQL container
  - Redis container
  - Backend (hot-reload)
  - Frontend (Vite dev server)
  
Commande:
  docker-compose up -d
```

---

## 📦 Gestion Dépendances

### Node.js Packages

**Lock files:**
- `package-lock.json` (npm)
- Commités dans Git
- Installations reproductibles

**Audit sécurité:**
```bash
npm audit
npm audit fix
```

**Updates:**
```bash
# Check outdated
npm outdated

# Update patch versions
npm update

# Update major (careful!)
npm install package@latest
```

---

## ✅ Checklist Stack

Avant développement:

```yaml
✅ Frontend:
  - [ ] React 18 + TypeScript configuré
  - [ ] Vite build tool setup
  - [ ] TailwindCSS + Headless UI installés
  - [ ] React Query pour API calls
  - [ ] Zustand pour state local

✅ Backend:
  - [ ] NestJS 10 + TypeScript configuré
  - [ ] TypeORM + PostgreSQL connecté
  - [ ] Architecture hexagonale comprise
  - [ ] JWT auth implémenté
  - [ ] Swagger docs auto

✅ Database:
  - [ ] PostgreSQL 15 local (Docker)
  - [ ] Schemas séparés par module
  - [ ] Migrations TypeORM setup
  - [ ] Redis cache configuré

✅ AWS:
  - [ ] Compte créé (Free Tier)
  - [ ] IAM user avec permissions
  - [ ] S3 bucket images créé
  - [ ] SES vérifié (email domaine)

✅ Outils:
  - [ ] Git + GitHub repo
  - [ ] Docker Desktop installé
  - [ ] VS Code + extensions
  - [ ] Postman/Insomnia API tests
```

---

**Prochaine lecture:** `02-api-contract.md` pour la spécification des endpoints REST.
