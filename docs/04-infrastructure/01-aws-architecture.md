# ☁️ Architecture AWS - Tickr

**Version:** 1.0  
**Région:** eu-west-1 (Ireland) - proche Tunisie  
**Temps lecture:** 15 minutes

---

## 🎯 Architecture V1 (MVP)

### Diagram

```
                    ┌──────────────┐
                    │  CloudFront  │ (optionnel V2)
                    │    (CDN)     │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
    Internet ──────▶│  Application │
                    │Load Balancer │
                    │    (ALB)     │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
      ┌─────▼─────┐  ┌────▼─────┐  ┌────▼─────┐
      │ECS Task 1 │  │ECS Task 2│  │ECS Task N│
      │ (Fargate) │  │(Fargate) │  │(Fargate) │
      │           │  │          │  │          │
      │ Backend   │  │ Backend  │  │ Backend  │
      │ NestJS    │  │ NestJS   │  │ NestJS   │
      └─────┬─────┘  └────┬─────┘  └────┬─────┘
            │             │             │
            └─────────────┼─────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼─────┐  ┌──────▼──────┐  ┌───▼────┐
    │PostgreSQL │  │   Redis     │  │   S3   │
    │   (RDS)   │  │(ElastiCache)│  │(Images)│
    └───────────┘  └─────────────┘  └────────┘
```

### Services Utilisés

```yaml
Compute:
  - ECS Fargate (serverless containers)
  - Application Load Balancer (ALB)

Database:
  - RDS PostgreSQL 15.4
  - ElastiCache Redis 7.x

Storage:
  - S3 (images événements)

Notifications:
  - SES (emails)
  - SNS (SMS)

Monitoring:
  - CloudWatch (logs + metrics)
  - X-Ray (tracing)

Networking:
  - VPC (réseau privé)
  - Security Groups (firewall)
```

---

## 🏗️ VPC & Networking

### Configuration VPC

```yaml
VPC:
  CIDR: 10.0.0.0/16
  
Subnets Publics: (ALB)
  - eu-west-1a: 10.0.1.0/24
  - eu-west-1b: 10.0.2.0/24
  
Subnets Privés: (ECS, RDS, Redis)
  - eu-west-1a: 10.0.11.0/24
  - eu-west-1b: 10.0.12.0/24

Internet Gateway: ✅
NAT Gateway: ❌ (V1 coût), ✅ (V2)
```

### Security Groups

**ALB Security Group:**
```yaml
Inbound:
  - Port 80 (HTTP): 0.0.0.0/0
  - Port 443 (HTTPS): 0.0.0.0/0
  
Outbound:
  - All traffic: ECS Security Group
```

**ECS Security Group:**
```yaml
Inbound:
  - Port 3000 (NestJS): ALB Security Group
  
Outbound:
  - Port 5432: RDS Security Group
  - Port 6379: Redis Security Group
  - Port 443: S3, SES, SNS (via endpoints)
```

**RDS Security Group:**
```yaml
Inbound:
  - Port 5432: ECS Security Group
  
Outbound: None
```

---

## 🐳 ECS Fargate

### Cluster Configuration

```yaml
Cluster Name: tickr-cluster
Launch Type: Fargate (serverless)
```

### Task Definition

```json
{
  "family": "tickr-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/tickrBackendTaskRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "ACCOUNT.dkr.ecr.eu-west-1.amazonaws.com/tickr-backend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:eu-west-1:ACCOUNT:secret:tickr/db/password"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:eu-west-1:ACCOUNT:secret:tickr/jwt/secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/tickr-backend",
          "awslogs-region": "eu-west-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Service Configuration

```yaml
Service Name: tickr-backend-service
Desired Count: 2
Min Healthy Percent: 100
Max Percent: 200

Auto-Scaling:
  Min: 2
  Max: 10
  Target CPU: 70%
  Target Memory: 80%
  
Load Balancer:
  Type: ALB
  Target Group: tickr-backend-tg
  Health Check: /health
  
Deployment:
  Type: Rolling
  Min Healthy: 100%
```

---

## 🗄️ RDS PostgreSQL

### Instance Configuration

```yaml
Engine: PostgreSQL 15.4
Instance Class: db.t3.small (V1) → db.t3.medium (V2)
vCPU: 2
RAM: 2 GB
Storage: 20 GB SSD (gp3)
Storage Autoscaling: ✅ Max 100 GB

Multi-AZ: ❌ (V1), ✅ (V2 production)
Backup:
  Retention: 7 days
  Window: 03:00-04:00 UTC
  
Maintenance Window: Sun 04:00-05:00 UTC

Enhanced Monitoring: ✅ (60s interval)
Performance Insights: ✅
```

### Connection Pool

```typescript
// Backend configuration
{
  host: process.env.DB_HOST,
  port: 5432,
  database: 'tickr',
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  poolSize: 20,  // 2 tasks × 10 connections
  maxQueryExecutionTime: 5000,
  
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('rds-ca-bundle.pem'),
  },
}
```

---

## ⚡ ElastiCache Redis

### Configuration

```yaml
Engine: Redis 7.x
Node Type: cache.t3.micro (V1)
Nodes: 1 (pas de cluster V1)

Parameter Group:
  maxmemory-policy: allkeys-lru
  timeout: 300
  
Security:
  Encryption at rest: ✅
  Encryption in transit: ✅
  Auth token: ✅
```

### Use Cases

```typescript
// 1. Session storage (JWT blacklist)
await redis.setex(`jwt:blacklist:${userId}`, 86400, token);

// 2. Rate limiting
const key = `ratelimit:${ip}:${endpoint}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 60);
if (count > 100) throw new TooManyRequestsException();

// 3. Cache requêtes fréquentes
const cached = await redis.get(`event:${eventId}`);
if (cached) return JSON.parse(cached);

const event = await this.eventRepo.findById(eventId);
await redis.setex(`event:${eventId}`, 300, JSON.stringify(event));

// 4. Pub/Sub (notifications temps réel V2)
await redis.publish('checkin:updates', JSON.stringify(data));
```

---

## 📦 S3 Storage

### Bucket Configuration

```yaml
Bucket Name: tickr-event-images
Region: eu-west-1

Versioning: ❌
Encryption: ✅ (SSE-S3)

Lifecycle Rules:
  - Name: Archive old images
    Transition: Glacier après 90 jours
    Expiration: Jamais (garder historique)

CORS:
  - AllowedOrigins: ["https://tickr.tn"]
    AllowedMethods: [GET, PUT, POST]
    AllowedHeaders: ["*"]
    MaxAgeSeconds: 3600

Public Access Block: ✅ (pas d'accès public direct)
```

### Accès via CloudFront (V2)

```yaml
CloudFront Distribution:
  Origin: S3 bucket
  Price Class: Europe only
  HTTPS only: ✅
  Cache TTL: 86400 (1 jour)
  
  Custom Domain: cdn.tickr.tn
  SSL Certificate: ACM (gratuit)
```

### Upload Pattern

```typescript
import { S3 } from '@aws-sdk/client-s3';

export class S3StorageAdapter implements StoragePort {
  private s3 = new S3({ region: 'eu-west-1' });

  async upload(file: Buffer, key: string): Promise<string> {
    await this.s3.putObject({
      Bucket: 'tickr-event-images',
      Key: `events/${key}`,
      Body: file,
      ContentType: 'image/jpeg',
      CacheControl: 'max-age=86400',
    });

    return `https://tickr-event-images.s3.eu-west-1.amazonaws.com/events/${key}`;
  }
}
```

---

## 📧 SES (Email)

### Configuration

```yaml
Region: eu-west-1
Verified Identities:
  - noreply@tickr.tn
  - support@tickr.tn

Sending Limits:
  - Sandbox: 200 emails/jour → Production: 50,000/jour
  - Rate: 1 email/sec → 14 emails/sec

Configuration Set:
  - Name: tickr-transactional
  - Event Destinations: CloudWatch (bounces, complaints)

Templates:
  - ticket-confirmation
  - event-published
  - refund-completed
```

### Envoi Email

```typescript
import { SES } from '@aws-sdk/client-ses';

export class SESAdapter implements EmailPort {
  private ses = new SES({ region: 'eu-west-1' });

  async send(to: string, template: string, data: any): Promise<void> {
    await this.ses.sendTemplatedEmail({
      Source: 'noreply@tickr.tn',
      Destination: { ToAddresses: [to] },
      Template: template,
      TemplateData: JSON.stringify(data),
      ConfigurationSetName: 'tickr-transactional',
    });
  }
}
```

---

## 📊 CloudWatch

### Logs

```yaml
Log Groups:
  - /ecs/tickr-backend
  - /rds/tickr/postgresql
  - /aws/lambda/tickr-*

Retention: 7 days (V1), 30 days (V2)
```

### Métriques Custom

```typescript
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

export class CloudWatchMetrics {
  private cw = new CloudWatch({ region: 'eu-west-1' });

  async recordSale(amount: number) {
    await this.cw.putMetricData({
      Namespace: 'Tickr',
      MetricData: [{
        MetricName: 'TicketsSold',
        Value: 1,
        Unit: 'Count',
        Timestamp: new Date(),
      }, {
        MetricName: 'Revenue',
        Value: amount,
        Unit: 'None',
        Timestamp: new Date(),
      }],
    });
  }
}
```

### Alarmes

```yaml
Alarmes Critiques:
  - ECS CPU > 80% (5 min)
  - RDS CPU > 90% (5 min)
  - RDS FreeSpace < 2 GB
  - API Error Rate > 5% (5 min)
  - Payment Success Rate < 90%

Actions:
  - SNS Topic → Email admin
  - Auto-scaling ECS
```

---

## 💰 Coûts Estimés V1

```yaml
ECS Fargate:
  2 tasks × 0.5 vCPU × $0.04048/h × 720h = $29
  2 tasks × 1 GB × $0.004445/h × 720h = $6
  TOTAL: $35/mois

RDS db.t3.small:
  Instance: $30/mois
  Storage 20 GB: $2/mois
  TOTAL: $32/mois

ElastiCache cache.t3.micro:
  $12/mois

S3:
  Storage 10 GB: $0.25/mois
  Requests: $0.50/mois
  TOTAL: $1/mois

ALB:
  $16/mois + data processed

SES:
  10,000 emails: $1/mois

CloudWatch:
  Logs 5 GB: $2.50/mois
  Custom metrics: $0.30/mois
  TOTAL: $3/mois

TOTAL MENSUEL: ~$100/mois
```

---

## ✅ Checklist AWS

```yaml
✅ Compte:
  - [ ] Compte AWS créé
  - [ ] IAM user avec permissions appropriées
  - [ ] MFA activé
  - [ ] Budget alerts configurés ($150/mois)

✅ VPC:
  - [ ] VPC créé (10.0.0.0/16)
  - [ ] Subnets publics + privés (2 AZ)
  - [ ] Internet Gateway attaché
  - [ ] Route tables configurées

✅ Compute:
  - [ ] ECS cluster créé
  - [ ] Task definition validée
  - [ ] Service avec ALB configuré
  - [ ] Auto-scaling activé

✅ Database:
  - [ ] RDS PostgreSQL lancé
  - [ ] Backup automatique activé
  - [ ] Security group restreint
  - [ ] Parameter group optimisé

✅ Storage:
  - [ ] S3 bucket créé
  - [ ] Lifecycle rules configurées
  - [ ] CORS configuré

✅ Monitoring:
  - [ ] CloudWatch alarmes créées
  - [ ] Logs retention configurée
  - [ ] X-Ray activé
```

---

**Prochaine lecture:** `02-terraform-setup.md` pour automatiser ce déploiement.
