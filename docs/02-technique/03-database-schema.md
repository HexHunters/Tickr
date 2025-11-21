# 🗄️ Database Schema - Tickr

**Version:** 1.0  
**SGBD:** PostgreSQL 15.4  
**Temps lecture:** 15 minutes

---

## 🎯 Architecture Globale

### Schémas PostgreSQL

```sql
-- 6 schémas isolés (1 par module)
CREATE SCHEMA users;
CREATE SCHEMA events;
CREATE SCHEMA tickets;
CREATE SCHEMA payments;
CREATE SCHEMA notifications;
CREATE SCHEMA analytics;
```

**Principe:** Aucune foreign key entre schémas (migration-ready)

---

## 👤 Schema: users

### Table: users

```sql
CREATE TABLE users.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'PARTICIPANT',
  is_organizer BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users.users(email);
CREATE INDEX idx_users_phone ON users.users(phone);
CREATE INDEX idx_users_role ON users.users(role);
```

### Table: organizer_profiles

```sql
CREATE TABLE users.organizer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  organization_name VARCHAR(255) NOT NULL,
  description TEXT,
  logo_url VARCHAR(500),
  social_links JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_organizer_profiles_user_id ON users.organizer_profiles(user_id);
```

### Table: refresh_tokens

```sql
CREATE TABLE users.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user_id ON users.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON users.refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON users.refresh_tokens(expires_at);
```

---

## 🎉 Schema: events

### Table: events

```sql
CREATE TABLE events.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  cover_image_url VARCHAR(500),
  
  location_name VARCHAR(255) NOT NULL,
  location_address TEXT NOT NULL,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  
  views_count INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP,
  
  CHECK (end_date > start_date)
);

CREATE INDEX idx_events_organizer_id ON events.events(organizer_id);
CREATE INDEX idx_events_slug ON events.events(slug);
CREATE INDEX idx_events_status ON events.events(status);
CREATE INDEX idx_events_category ON events.events(category);
CREATE INDEX idx_events_start_date ON events.events(start_date);
CREATE INDEX idx_events_location_coords ON events.events(location_lat, location_lng);

-- Full-text search
CREATE INDEX idx_events_name_trgm ON events.events USING gin(name gin_trgm_ops);
```

### Table: ticket_types

```sql
CREATE TABLE events.ticket_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL,
  sold INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (event_id) REFERENCES events.events(id) ON DELETE CASCADE,
  CHECK (price > 0),
  CHECK (quantity > 0),
  CHECK (sold >= 0),
  CHECK (sold <= quantity)
);

CREATE INDEX idx_ticket_types_event_id ON events.ticket_types(event_id);
```

### Table: event_changes_log

```sql
CREATE TABLE events.event_changes_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,
  changed_by UUID NOT NULL,
  change_type VARCHAR(50) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (event_id) REFERENCES events.events(id) ON DELETE CASCADE
);

CREATE INDEX idx_event_changes_log_event_id ON events.event_changes_log(event_id);
```

---

## 🎫 Schema: tickets

### Table: tickets

```sql
CREATE TABLE tickets.tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  
  event_id UUID NOT NULL,
  ticket_type_id UUID NOT NULL,
  order_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  price DECIMAL(10, 2) NOT NULL,
  
  qr_code_url VARCHAR(500) NOT NULL,
  qr_code_data TEXT NOT NULL,
  
  status VARCHAR(20) NOT NULL DEFAULT 'VALID',
  
  checked_in_at TIMESTAMP,
  checked_in_by UUID,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tickets_ticket_number ON tickets.tickets(ticket_number);
CREATE INDEX idx_tickets_event_id ON tickets.tickets(event_id);
CREATE INDEX idx_tickets_user_id ON tickets.tickets(user_id);
CREATE INDEX idx_tickets_order_id ON tickets.tickets(order_id);
CREATE INDEX idx_tickets_status ON tickets.tickets(status);
```

### Table: reservations

```sql
CREATE TABLE tickets.reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  ticket_type_id UUID NOT NULL,
  quantity INT NOT NULL,
  
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  expires_at TIMESTAMP NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CHECK (quantity > 0)
);

CREATE INDEX idx_reservations_user_id ON tickets.reservations(user_id);
CREATE INDEX idx_reservations_ticket_type_id ON tickets.reservations(ticket_type_id);
CREATE INDEX idx_reservations_expires_at ON tickets.reservations(expires_at);
CREATE INDEX idx_reservations_status ON tickets.reservations(status);
```

---

## 💳 Schema: payments

### Table: orders

```sql
CREATE TABLE payments.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  
  user_id UUID NOT NULL,
  event_id UUID NOT NULL,
  
  subtotal DECIMAL(10, 2) NOT NULL,
  platform_fee DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  
  payment_method VARCHAR(50),
  payment_gateway VARCHAR(50),
  
  expires_at TIMESTAMP NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  
  CHECK (subtotal > 0),
  CHECK (platform_fee >= 0),
  CHECK (total = subtotal + platform_fee)
);

CREATE INDEX idx_orders_order_number ON payments.orders(order_number);
CREATE INDEX idx_orders_user_id ON payments.orders(user_id);
CREATE INDEX idx_orders_event_id ON payments.orders(event_id);
CREATE INDEX idx_orders_status ON payments.orders(status);
CREATE INDEX idx_orders_created_at ON payments.orders(created_at DESC);
```

### Table: order_items

```sql
CREATE TABLE payments.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL,
  ticket_type_id UUID NOT NULL,
  
  ticket_type_name VARCHAR(100) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES payments.orders(id) ON DELETE CASCADE,
  CHECK (unit_price > 0),
  CHECK (quantity > 0),
  CHECK (subtotal = unit_price * quantity)
);

CREATE INDEX idx_order_items_order_id ON payments.order_items(order_id);
```

### Table: transactions

```sql
CREATE TABLE payments.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL,
  
  gateway VARCHAR(50) NOT NULL,
  gateway_transaction_id VARCHAR(255) UNIQUE,
  
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'TND',
  
  status VARCHAR(20) NOT NULL,
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES payments.orders(id) ON DELETE CASCADE
);

CREATE INDEX idx_transactions_order_id ON payments.transactions(order_id);
CREATE INDEX idx_transactions_gateway_transaction_id ON payments.transactions(gateway_transaction_id);
CREATE INDEX idx_transactions_status ON payments.transactions(status);
```

### Table: refunds

```sql
CREATE TABLE payments.refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL,
  transaction_id UUID NOT NULL,
  
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  
  requested_by UUID NOT NULL,
  processed_by UUID,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES payments.orders(id),
  FOREIGN KEY (transaction_id) REFERENCES payments.transactions(id),
  CHECK (amount > 0)
);

CREATE INDEX idx_refunds_order_id ON payments.refunds(order_id);
CREATE INDEX idx_refunds_status ON payments.refunds(status);
```

---

## 📧 Schema: notifications

### Table: email_logs

```sql
CREATE TABLE notifications.email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  template VARCHAR(100) NOT NULL,
  
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  
  metadata JSONB DEFAULT '{}',
  
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  
  error_message TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_logs_user_id ON notifications.email_logs(user_id);
CREATE INDEX idx_email_logs_status ON notifications.email_logs(status);
CREATE INDEX idx_email_logs_created_at ON notifications.email_logs(created_at DESC);
```

### Table: sms_logs

```sql
CREATE TABLE notifications.sms_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  
  to_phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  
  gateway VARCHAR(50) NOT NULL,
  gateway_message_id VARCHAR(255),
  
  cost DECIMAL(6, 4),
  
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  
  error_message TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sms_logs_user_id ON notifications.sms_logs(user_id);
CREATE INDEX idx_sms_logs_status ON notifications.sms_logs(status);
CREATE INDEX idx_sms_logs_created_at ON notifications.sms_logs(created_at DESC);
```

---

## 📊 Schema: analytics

### Table: event_views

```sql
CREATE TABLE analytics.event_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,
  user_id UUID,
  
  ip_address INET,
  user_agent TEXT,
  referrer VARCHAR(500),
  
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_event_views_event_id ON analytics.event_views(event_id);
CREATE INDEX idx_event_views_user_id ON analytics.event_views(user_id);
CREATE INDEX idx_event_views_viewed_at ON analytics.event_views(viewed_at DESC);
```

### Table: daily_stats

```sql
CREATE TABLE analytics.daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  
  event_id UUID,
  
  views INT DEFAULT 0,
  tickets_sold INT DEFAULT 0,
  revenue DECIMAL(10, 2) DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (date, event_id)
);

CREATE INDEX idx_daily_stats_date ON analytics.daily_stats(date DESC);
CREATE INDEX idx_daily_stats_event_id ON analytics.daily_stats(event_id);
```

---

## 🔄 Migrations TypeORM

### Configuration

```typescript
// src/config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/migrations/*{.ts,.js}'],
  
  synchronize: false, // IMPORTANT: false en production
  migrationsRun: true,
  
  logging: process.env.NODE_ENV === 'development',
  
  poolSize: 20,
  maxQueryExecutionTime: 5000,
};
```

### Exemple Migration

```typescript
// migrations/1705315200000-CreateUsersSchema.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersSchema1705315200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS users`);
    
    await queryRunner.query(`
      CREATE TABLE users.users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'PARTICIPANT',
        is_organizer BOOLEAN DEFAULT FALSE,
        email_verified BOOLEAN DEFAULT FALSE,
        phone_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await queryRunner.query(`
      CREATE INDEX idx_users_email ON users.users(email)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE users.users`);
    await queryRunner.query(`DROP SCHEMA users`);
  }
}
```

### Générer Migration

```bash
# Créer nouvelle migration
npm run migration:create -- -n CreateEventsSchema

# Générer depuis entités
npm run migration:generate -- -n AutoGeneratedMigration

# Exécuter migrations
npm run migration:run

# Annuler dernière migration
npm run migration:revert
```

---

## 🔍 Requêtes Optimisées

### Search Events (Full-Text)

```sql
-- Installation extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Requête recherche
SELECT 
  e.*,
  COUNT(DISTINCT t.id) as ticket_types_count,
  SUM(t.quantity - t.sold) as total_available
FROM events.events e
LEFT JOIN events.ticket_types t ON t.event_id = e.id
WHERE 
  e.status = 'PUBLISHED'
  AND e.start_date >= NOW()
  AND (
    e.name ILIKE '%concert%'
    OR e.description ILIKE '%concert%'
  )
  AND e.category = 'CONCERT'
GROUP BY e.id
ORDER BY e.start_date ASC
LIMIT 12 OFFSET 0;
```

### Dashboard Stats (Aggregates)

```sql
SELECT 
  e.id,
  e.name,
  COUNT(DISTINCT t.id) as tickets_sold,
  SUM(t.price) as revenue_gross,
  SUM(t.price) * 0.04 as platform_fee,
  SUM(t.price) * 0.96 as revenue_net,
  COUNT(DISTINCT CASE WHEN t.checked_in_at IS NOT NULL THEN t.id END) as checked_in_count
FROM events.events e
LEFT JOIN tickets.tickets t ON t.event_id = e.id AND t.status = 'VALID'
WHERE e.organizer_id = $1
GROUP BY e.id, e.name;
```

---

## ✅ Checklist Database

```yaml
✅ Schémas:
  - [ ] 6 schémas créés (users, events, tickets, payments, notifications, analytics)
  - [ ] Aucune FK entre schémas
  - [ ] Isolation respectée

✅ Tables:
  - [ ] Toutes tables créées
  - [ ] UUID comme PK partout
  - [ ] Timestamps created_at/updated_at
  - [ ] Contraintes CHECK appropriées

✅ Index:
  - [ ] Index sur FK
  - [ ] Index sur colonnes recherchées
  - [ ] Index full-text (pg_trgm)
  - [ ] Index composites si nécessaire

✅ Migrations:
  - [ ] TypeORM configuré
  - [ ] Migration initiale créée
  - [ ] Scripts npm setup

✅ Performance:
  - [ ] Pool connexions configuré
  - [ ] Query timeout défini
  - [ ] EXPLAIN ANALYZE requêtes lentes
```

---

**Prochaine lecture:** `04-modele-economique.md` pour le calcul des revenus et coûts.
