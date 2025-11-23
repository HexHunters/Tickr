# Tickr Infrastructure

This directory contains infrastructure configuration files for deployment and monitoring.

## Directory Structure

```
infrastructure/
├── nginx/              # Nginx configuration for frontend proxy
│   └── nginx.conf      # Main nginx configuration
├── monitoring/         # Monitoring and observability
│   ├── prometheus.yml  # Prometheus configuration
│   └── grafana/        # Grafana dashboards and datasources
└── terraform/          # Infrastructure as Code (future)
```

## Nginx Configuration

The nginx configuration serves as:
- Reverse proxy for the frontend React app
- API gateway to backend services
- Static file server with caching
- HTTPS termination (in production)

## Monitoring

### Prometheus
- Metrics collection from backend and infrastructure
- Configured in `monitoring/prometheus.yml`
- Accessible at http://localhost:9090 (when running docker-compose.prod.yml)

### Grafana
- Visualization of metrics
- Pre-configured dashboards
- Accessible at http://localhost:3001 (when running docker-compose.prod.yml)
- Default credentials: admin/admin

## Usage

### Development
```bash
# Infrastructure not needed in dev mode
# Backend and frontend run directly with hot reload
make dev
```

### Production (Local)
```bash
# Start with production configuration
make build-prod
make deploy-staging
```

## Future Enhancements

- [ ] Terraform configurations for AWS
- [ ] Kubernetes manifests
- [ ] Additional monitoring dashboards
- [ ] Alert manager configuration
- [ ] Logging aggregation (ELK/Loki)
