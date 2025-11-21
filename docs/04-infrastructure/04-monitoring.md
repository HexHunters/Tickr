# 📊 Monitoring & Observability - Tickr

**Version:** 1.0  
**Temps lecture:** 10 minutes

---

## 🎯 Les 3 Piliers

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│    LOGS     │  │  METRICS    │  │   TRACES    │
│             │  │             │  │             │
│ CloudWatch  │  │ CloudWatch  │  │   X-Ray     │
│    Logs     │  │  Metrics    │  │             │
└─────────────┘  └─────────────┘  └─────────────┘
```

---

## 📝 Logs Structurés

### Configuration Winston (NestJS)

```typescript
// src/shared/infrastructure/logger/winston.config.ts
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

export const winstonConfig = WinstonModule.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
    }),
  ],
});
```

### Logs Application

```typescript
import { Logger } from '@nestjs/common';

export class CreateEventHandler {
  private readonly logger = new Logger(CreateEventHandler.name);

  async execute(command: CreateEventCommand) {
    this.logger.log({
      message: 'Creating event',
      organizerId: command.organizerId,
      eventName: command.name,
      correlationId: command.correlationId,
    });

    try {
      const event = Event.create(command.data);
      await this.eventRepo.save(event);

      this.logger.log({
        message: 'Event created successfully',
        eventId: event.id,
        duration: Date.now() - startTime,
      });

      return event;
    } catch (error) {
      this.logger.error({
        message: 'Failed to create event',
        error: error.message,
        stack: error.stack,
        command: JSON.stringify(command),
      });
      throw error;
    }
  }
}
```

### Logs Queries CloudWatch Insights

```sql
-- Top erreurs dernières 24h
fields @timestamp, message, error, stack
| filter level = "error"
| sort @timestamp desc
| limit 100

-- Performance endpoints (p95)
fields @timestamp, message, duration, endpoint
| filter message = "Request completed"
| stats percentile(duration, 95) by endpoint

-- Erreurs paiement par gateway
fields @timestamp, gateway, error
| filter message = "Payment failed"
| stats count() by gateway

-- Activité utilisateur
fields @timestamp, userId, action
| filter action in ["ticket_purchased", "event_created"]
| stats count() by userId
| sort count desc
| limit 20
```

---

## 📈 Métriques Custom

### Configuration NestJS

```typescript
// src/shared/infrastructure/metrics/cloudwatch-metrics.service.ts
import { Injectable } from '@nestjs/common';
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

@Injectable()
export class CloudWatchMetricsService {
  private cloudwatch = new CloudWatch({ region: 'eu-west-1' });

  async recordTicketSale(eventId: string, amount: number, ticketType: string) {
    await this.cloudwatch.putMetricData({
      Namespace: 'Tickr/Business',
      MetricData: [
        {
          MetricName: 'TicketsSold',
          Value: 1,
          Unit: 'Count',
          Timestamp: new Date(),
          Dimensions: [
            { Name: 'EventId', Value: eventId },
            { Name: 'TicketType', Value: ticketType },
          ],
        },
        {
          MetricName: 'Revenue',
          Value: amount,
          Unit: 'None',
          Timestamp: new Date(),
          Dimensions: [
            { Name: 'EventId', Value: eventId },
          ],
        },
      ],
    });
  }

  async recordPaymentStatus(gateway: string, status: 'success' | 'failed') {
    await this.cloudwatch.putMetricData({
      Namespace: 'Tickr/Payments',
      MetricData: [
        {
          MetricName: 'PaymentAttempts',
          Value: 1,
          Unit: 'Count',
          Dimensions: [
            { Name: 'Gateway', Value: gateway },
            { Name: 'Status', Value: status },
          ],
        },
      ],
    });
  }
}
```

### Dashboard CloudWatch

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "title": "Billets Vendus (24h)",
        "region": "eu-west-1",
        "metrics": [
          ["Tickr/Business", "TicketsSold", { "stat": "Sum", "period": 300 }]
        ],
        "yAxis": { "left": { "min": 0 } },
        "period": 300
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Revenus Cumulés",
        "region": "eu-west-1",
        "metrics": [
          ["Tickr/Business", "Revenue", { "stat": "Sum", "period": 3600 }]
        ],
        "yAxis": { "left": { "min": 0 } }
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Taux Succès Paiements",
        "region": "eu-west-1",
        "metrics": [
          [
            {
              "expression": "(m1 / (m1 + m2)) * 100",
              "label": "Success Rate %"
            }
          ],
          [
            "Tickr/Payments",
            "PaymentAttempts",
            { "stat": "Sum", "id": "m1", "visible": false },
            { "Status": "success" }
          ],
          [
            "...",
            { "stat": "Sum", "id": "m2", "visible": false },
            { "Status": "failed" }
          ]
        ]
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "ECS CPU & Memory",
        "region": "eu-west-1",
        "metrics": [
          [
            "AWS/ECS",
            "CPUUtilization",
            { "stat": "Average" },
            { "ServiceName": "tickr-backend-service" }
          ],
          [
            ".",
            "MemoryUtilization",
            { "stat": "Average" },
            { "ServiceName": "tickr-backend-service" }
          ]
        ]
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "API Latency (p95)",
        "region": "eu-west-1",
        "metrics": [
          [
            "Tickr/API",
            "RequestDuration",
            { "stat": "p95" },
            { "Endpoint": "/events" }
          ],
          ["...", { "Endpoint": "/orders" }],
          ["...", { "Endpoint": "/tickets" }]
        ]
      }
    },
    {
      "type": "log",
      "properties": {
        "title": "Erreurs Récentes",
        "region": "eu-west-1",
        "query": "SOURCE '/ecs/tickr-backend'\n| fields @timestamp, message, error\n| filter level = \"error\"\n| sort @timestamp desc\n| limit 20"
      }
    }
  ]
}
```

---

## 🔍 Distributed Tracing (X-Ray)

### Configuration

```typescript
// src/main.ts
import * as AWSXRay from 'aws-xray-sdk-core';

if (process.env.NODE_ENV === 'production') {
  AWSXRay.captureHTTPsGlobal(require('http'));
  AWSXRay.captureHTTPsGlobal(require('https'));
  AWSXRay.captureAWS(require('aws-sdk'));
}
```

### Instrumentation

```typescript
import * as AWSXRay from 'aws-xray-sdk-core';

export class PaymentService {
  async processPayment(orderId: string) {
    const segment = AWSXRay.getSegment();
    const subsegment = segment.addNewSubsegment('ProcessPayment');

    try {
      subsegment.addAnnotation('orderId', orderId);
      subsegment.addMetadata('orderDetails', { orderId });

      // Logique paiement
      const result = await this.gateway.charge(order);

      subsegment.addMetadata('result', result);
      subsegment.close();

      return result;
    } catch (error) {
      subsegment.addError(error);
      subsegment.close();
      throw error;
    }
  }
}
```

---

## 🚨 Alarmes CloudWatch

### Configuration Terraform

```hcl
# ECS CPU élevé
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "tickr-${var.environment}-ecs-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"

  dimensions = {
    ServiceName = "tickr-backend-service"
    ClusterName = "tickr-${var.environment}"
  }

  alarm_description = "ECS CPU utilization is too high"
  alarm_actions     = [aws_sns_topic.alerts.arn]
}

# RDS Storage faible
resource "aws_cloudwatch_metric_alarm" "rds_storage_low" {
  alarm_name          = "tickr-${var.environment}-rds-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "2000000000" # 2 GB

  dimensions = {
    DBInstanceIdentifier = "tickr-${var.environment}"
  }

  alarm_description = "RDS free storage space is low"
  alarm_actions     = [aws_sns_topic.alerts.arn]
}

# Taux erreurs API
resource "aws_cloudwatch_metric_alarm" "api_error_rate" {
  alarm_name          = "tickr-${var.environment}-api-error-rate-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  threshold           = "5"

  metric_query {
    id          = "error_rate"
    expression  = "(m1 / m2) * 100"
    label       = "Error Rate %"
    return_data = true
  }

  metric_query {
    id = "m1"
    metric {
      metric_name = "5XXError"
      namespace   = "AWS/ApplicationELB"
      period      = "300"
      stat        = "Sum"
      dimensions = {
        LoadBalancer = aws_lb.main.arn_suffix
      }
    }
  }

  metric_query {
    id = "m2"
    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = "300"
      stat        = "Sum"
      dimensions = {
        LoadBalancer = aws_lb.main.arn_suffix
      }
    }
  }

  alarm_description = "API error rate is too high"
  alarm_actions     = [aws_sns_topic.alerts.arn]
}
```

### SNS Topic pour Alertes

```hcl
resource "aws_sns_topic" "alerts" {
  name = "tickr-${var.environment}-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_sns_topic_subscription" "slack" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.slack_notifier.arn
}
```

---

## 📱 Notification Slack

### Lambda Function

```typescript
// lambda/slack-notifier.ts
import { SNSEvent } from 'aws-lambda';
import axios from 'axios';

export const handler = async (event: SNSEvent) => {
  const message = event.Records[0].Sns.Message;
  const alarm = JSON.parse(message);

  const color = alarm.NewStateValue === 'ALARM' ? 'danger' : 'good';
  const emoji = alarm.NewStateValue === 'ALARM' ? '🚨' : '✅';

  await axios.post(process.env.SLACK_WEBHOOK_URL, {
    attachments: [
      {
        color,
        title: `${emoji} ${alarm.AlarmName}`,
        text: alarm.NewStateReason,
        fields: [
          {
            title: 'Status',
            value: alarm.NewStateValue,
            short: true,
          },
          {
            title: 'Region',
            value: alarm.Region,
            short: true,
          },
        ],
        footer: 'Tickr Monitoring',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  });
};
```

---

## 📊 Métriques Business à Tracker

```yaml
Ventes:
  - Billets vendus / heure
  - Revenue / jour
  - Panier moyen (TND)
  - Taux conversion (vue → achat)

Événements:
  - Nouveaux événements / jour
  - Taux publication (draft → published)
  - Événements actifs
  - Billets disponibles

Paiements:
  - Taux succès par gateway
  - Temps traitement paiement
  - Montant moyen transaction
  - Remboursements / jour

Performance:
  - Latence API (p50, p95, p99)
  - Temps génération QR codes
  - Temps chargement recherche
  - Erreurs 5xx / 4xx

Utilisateurs:
  - Inscriptions / jour
  - Utilisateurs actifs (DAU/MAU)
  - Organisateurs actifs
  - Sessions moyennes
```

---

## ✅ Checklist Monitoring

```yaml
✅ Logs:
  - [ ] Logs structurés (JSON)
  - [ ] CloudWatch Logs configuré
  - [ ] Retention définie (7-30 jours)
  - [ ] Requêtes Insights testées

✅ Métriques:
  - [ ] Métriques custom implémentées
  - [ ] Dashboard CloudWatch créé
  - [ ] Namespace organisé (Tickr/*)
  - [ ] Dimensions pertinentes

✅ Traces:
  - [ ] X-Ray activé (ECS + ALB)
  - [ ] Instrumentation code critique
  - [ ] Annotations/metadata ajoutées

✅ Alertes:
  - [ ] Alarmes critiques créées
  - [ ] SNS topic configuré
  - [ ] Notifications email/Slack
  - [ ] Seuils validés

✅ Tests:
  - [ ] Déclencher alarme manuellement
  - [ ] Vérifier notifications reçues
  - [ ] Temps réponse < 5 min
  - [ ] Procédure escalade définie
```

---

## 📋 Runbook Incidents

### Incident: API Latence Élevée

```yaml
Détection: Alarme "API Latency p95 > 1s"

Investigation:
  1. Vérifier Dashboard CloudWatch
  2. Identifier endpoint lent
  3. Analyser X-Ray traces
  4. Vérifier logs erreurs

Causes communes:
  - Requête DB non optimisée (missing index)
  - Pool connexions saturé
  - External API timeout (gateway paiement)
  - Memory leak

Actions immédiates:
  - Scale up ECS tasks si CPU/Memory élevé
  - Redémarrer service si memory leak
  - Activer cache Redis si DB surchargée

Post-mortem:
  - Documenter root cause
  - Optimiser requête lente
  - Ajouter index manquant
  - Augmenter monitoring
```

---

**Documentation complète ! 🎉**  
Vous êtes maintenant prêt à démarrer le développement avec une base solide.
