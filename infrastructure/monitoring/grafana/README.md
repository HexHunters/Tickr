# Grafana Monitoring Dashboards

This directory contains Grafana dashboard and datasource configurations.

## Structure

```
grafana/
├── dashboards/         # Dashboard JSON files
│   └── provisioning.yml
└── datasources/        # Datasource configurations
    └── prometheus.yml
```

## Dashboards

Will include:
- Application Overview
- Backend API Metrics
- Database Performance
- Redis Cache Metrics
- Infrastructure Health

## Datasources

- Prometheus (primary metrics source)
- Loki (logs, future)
- Tempo (traces, future)

## Usage

Dashboards and datasources are automatically provisioned when Grafana starts with docker-compose.prod.yml

Access Grafana at: http://localhost:3001
- Username: admin
- Password: admin

## Adding Custom Dashboards

1. Create dashboard in Grafana UI
2. Export as JSON
3. Save to `dashboards/` directory
4. Update `dashboards/provisioning.yml`
