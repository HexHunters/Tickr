# 🔄 CI/CD Pipeline - GitHub Actions

**Version:** 1.0  
**Temps lecture:** 10 minutes

---

## 🎯 Pipeline Overview

```
┌──────────────┐
│  Git Push    │
│  (develop)   │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────┐
│  GitHub Actions Workflow         │
│                                  │
│  1. Lint & Format Check         │
│  2. Unit Tests                  │
│  3. Integration Tests           │
│  4. Build Docker Image          │
│  5. Push to ECR                 │
│  6. Deploy to ECS (dev)         │
└──────────────────────────────────┘
       │
       ▼
┌──────────────┐         ┌──────────────┐
│  Pull Request│  ──────▶│    Review    │
│  (main)      │         │   + Approve  │
└──────┬───────┘         └──────┬───────┘
       │                        │
       ▼                        ▼
┌──────────────────────────────────┐
│  Deploy to Production           │
│  (Manual Approval Required)     │
└──────────────────────────────────┘
```

---

## 📁 Structure

```
.github/
├── workflows/
│   ├── ci.yml              # Tests sur PR
│   ├── deploy-dev.yml      # Auto-deploy dev
│   └── deploy-prod.yml     # Manual deploy prod
│
└── actions/
    ├── build-backend/
    │   └── action.yml
    └── deploy-ecs/
        └── action.yml
```

---

## 🔍 Workflow CI (Tests)

### .github/workflows/ci.yml

```yaml
name: CI - Tests & Linting

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [develop]

jobs:
  lint:
    name: Lint & Format Check
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint backend
        working-directory: ./backend
        run: npm run lint

      - name: Format check backend
        working-directory: ./backend
        run: npm run format:check

      - name: Lint frontend
        working-directory: ./frontend
        run: npm run lint

  test-backend:
    name: Backend Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: tickr_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run migrations
        working-directory: ./backend
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: tickr_test
          DB_USER: test
          DB_PASSWORD: test
        run: npm run migration:run

      - name: Run unit tests
        working-directory: ./backend
        run: npm run test:cov

      - name: Run integration tests
        working-directory: ./backend
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: tickr_test
          DB_USER: test
          DB_PASSWORD: test
          REDIS_HOST: localhost
          REDIS_PORT: 6379
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/lcov.info
          flags: backend

  test-frontend:
    name: Frontend Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Run tests
        working-directory: ./frontend
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./frontend/coverage/lcov.info
          flags: frontend
```

---

## 🚀 Workflow Deploy Dev

### .github/workflows/deploy-dev.yml

```yaml
name: Deploy to Dev

on:
  push:
    branches: [develop]

env:
  AWS_REGION: eu-west-1
  ECR_REPOSITORY: tickr-backend
  ECS_CLUSTER: tickr-dev
  ECS_SERVICE: tickr-backend-service
  CONTAINER_NAME: backend

jobs:
  deploy:
    name: Build & Deploy to Dev
    runs-on: ubuntu-latest

    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN_DEV }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        working-directory: ./backend
        run: |
          docker build \
            --tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
            --tag $ECR_REGISTRY/$ECR_REPOSITORY:latest \
            --file Dockerfile \
            .

      - name: Push to ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

      - name: Download task definition
        run: |
          aws ecs describe-task-definition \
            --task-definition tickr-backend \
            --query taskDefinition > task-definition.json

      - name: Update task definition
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-definition.json
          container-name: ${{ env.CONTAINER_NAME }}
          image: ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }}

      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true

      - name: Run database migrations
        run: |
          TASK_ARN=$(aws ecs run-task \
            --cluster $ECS_CLUSTER \
            --task-definition tickr-backend \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=DISABLED}" \
            --overrides '{"containerOverrides":[{"name":"backend","command":["npm","run","migration:run"]}]}' \
            --query 'tasks[0].taskArn' \
            --output text)
          
          aws ecs wait tasks-stopped --cluster $ECS_CLUSTER --tasks $TASK_ARN

      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "Deploy to Dev: ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deploy to Dev Environment*\nStatus: ${{ job.status }}\nCommit: ${{ github.sha }}"
                  }
                }
              ]
            }
```

---

## 🏭 Workflow Deploy Production

### .github/workflows/deploy-prod.yml

```yaml
name: Deploy to Production

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to deploy (git tag)'
        required: true
        type: string

env:
  AWS_REGION: eu-west-1
  ECR_REPOSITORY: tickr-backend
  ECS_CLUSTER: tickr-production
  ECS_SERVICE: tickr-backend-service

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://api.tickr.tn

    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.version }}

      - name: Validate version tag
        run: |
          if ! git describe --tags --exact-match ${{ inputs.version }} 2>/dev/null; then
            echo "Error: ${{ inputs.version }} is not a valid tag"
            exit 1
          fi

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN_PROD }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ inputs.version }}
        working-directory: ./backend
        run: |
          docker build \
            --tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
            --tag $ECR_REGISTRY/$ECR_REPOSITORY:latest-prod \
            --file Dockerfile.production \
            .

      - name: Push to ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ inputs.version }}
        run: |
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest-prod

      - name: Create backup before deploy
        run: |
          SNAPSHOT_ID=$(aws rds create-db-snapshot \
            --db-instance-identifier tickr-production \
            --db-snapshot-identifier tickr-prod-pre-deploy-$(date +%Y%m%d-%H%M%S) \
            --query 'DBSnapshot.DBSnapshotIdentifier' \
            --output text)
          
          echo "Backup snapshot: $SNAPSHOT_ID"

      - name: Deploy to ECS (Blue/Green)
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: task-definition-production.json
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true
          codedeploy-appspec: appspec.yml
          codedeploy-application: tickr-prod
          codedeploy-deployment-group: tickr-prod-dg

      - name: Run smoke tests
        run: |
          npm ci
          npm run test:smoke -- --baseURL=https://api.tickr.tn

      - name: Rollback on failure
        if: failure()
        run: |
          echo "Rolling back deployment..."
          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_SERVICE \
            --task-definition tickr-backend:previous \
            --force-new-deployment

      - name: Notify team
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "🚀 Production Deploy: ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Production Deployment*\nVersion: ${{ inputs.version }}\nStatus: ${{ job.status }}\n<https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Logs>"
                  }
                }
              ]
            }
```

---

## 🔐 GitHub Secrets

### Configuration Requise

```yaml
AWS Credentials:
  AWS_ROLE_ARN_DEV: arn:aws:iam::ACCOUNT:role/GitHubActionsRoleDev
  AWS_ROLE_ARN_PROD: arn:aws:iam::ACCOUNT:role/GitHubActionsRoleProd

Notifications:
  SLACK_WEBHOOK_URL: https://hooks.slack.com/services/xxx

Other:
  CODECOV_TOKEN: xxx (optionnel)
```

### IAM Role Setup

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/tickr:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

---

## 📋 Pre-commit Hooks

### .husky/pre-commit

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Backend lint
cd backend && npm run lint && npm run format:check

# Frontend lint
cd ../frontend && npm run lint

# Run unit tests
cd ../backend && npm run test
```

### package.json

```json
{
  "scripts": {
    "prepare": "husky install",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\"",
    "format": "prettier --write \"src/**/*.ts\""
  },
  "devDependencies": {
    "husky": "^8.0.0",
    "lint-staged": "^15.0.0"
  }
}
```

---

## ✅ Checklist CI/CD

```yaml
✅ GitHub Actions:
  - [ ] Workflows créés (ci.yml, deploy-dev.yml, deploy-prod.yml)
  - [ ] Secrets configurés
  - [ ] IAM roles AWS créés (OIDC)
  - [ ] Tests passent sur PR

✅ Docker:
  - [ ] Dockerfile optimisé (multi-stage)
  - [ ] ECR repository créé
  - [ ] Image tagging strategy définie

✅ Déploiement:
  - [ ] Auto-deploy dev fonctionne
  - [ ] Manual approval prod configuré
  - [ ] Rollback testé
  - [ ] Smoke tests définis

✅ Monitoring:
  - [ ] Slack notifications actives
  - [ ] CloudWatch logs accessibles
  - [ ] Alertes sur échecs deploy
```

---

**Prochaine lecture:** `04-monitoring.md` pour observer la production.
