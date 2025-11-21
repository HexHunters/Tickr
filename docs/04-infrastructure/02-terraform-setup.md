# 🏗️ Terraform Setup - Tickr Infrastructure as Code

**Version:** 1.0  
**Temps lecture:** 10 minutes

---

## 🎯 Structure Terraform

```
terraform/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   ├── staging/
│   │   ├── main.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   └── production/
│       ├── main.tf
│       ├── terraform.tfvars
│       └── backend.tf
│
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── ecs/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── rds/
│   ├── elasticache/
│   ├── s3/
│   └── cloudwatch/
│
├── global/
│   ├── iam/
│   └── route53/
│
└── README.md
```

---

## 🌐 Module VPC

### variables.tf

```hcl
variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["eu-west-1a", "eu-west-1b"]
}
```

### main.tf

```hcl
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "tickr-${var.environment}-vpc"
    Environment = var.environment
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "tickr-${var.environment}-igw"
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = var.availability_zones[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "tickr-${var.environment}-public-${count.index + 1}"
    Type = "Public"
  }
}

# Private Subnets
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "tickr-${var.environment}-private-${count.index + 1}"
    Type = "Private"
  }
}

# Route Table Public
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "tickr-${var.environment}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
```

---

## 🐳 Module ECS

### main.tf

```hcl
resource "aws_ecs_cluster" "main" {
  name = "tickr-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Environment = var.environment
  }
}

# Task Definition
resource "aws_ecs_task_definition" "backend" {
  family                   = "tickr-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "backend"
    image = "${var.ecr_repository_url}:${var.image_tag}"

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = var.environment },
      { name = "PORT", value = "3000" },
      { name = "DB_HOST", value = var.db_host },
      { name = "REDIS_HOST", value = var.redis_host }
    ]

    secrets = [
      {
        name      = "DB_PASSWORD"
        valueFrom = aws_secretsmanager_secret.db_password.arn
      },
      {
        name      = "JWT_SECRET"
        valueFrom = aws_secretsmanager_secret.jwt_secret.arn
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.backend.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])
}

# ECS Service
resource "aws_ecs_service" "backend" {
  name            = "tickr-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 3000
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  depends_on = [aws_lb_listener.backend]
}

# Auto-Scaling
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "tickr-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 70.0

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

---

## 🗄️ Module RDS

### main.tf

```hcl
resource "aws_db_subnet_group" "main" {
  name       = "tickr-${var.environment}"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "tickr-${var.environment}-db-subnet"
  }
}

resource "aws_db_instance" "postgresql" {
  identifier     = "tickr-${var.environment}"
  engine         = "postgres"
  engine_version = "15.4"

  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az               = var.environment == "production" ? true : false
  publicly_accessible    = false
  skip_final_snapshot    = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "tickr-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  performance_insights_enabled = true
  monitoring_interval         = 60
  monitoring_role_arn         = aws_iam_role.rds_monitoring.arn

  tags = {
    Name        = "tickr-${var.environment}-db"
    Environment = var.environment
  }
}
```

---

## 📦 Environment Dev

### environments/dev/terraform.tfvars

```hcl
environment = "dev"
aws_region  = "eu-west-1"

# VPC
vpc_cidr = "10.0.0.0/16"
availability_zones = ["eu-west-1a", "eu-west-1b"]

# ECS
task_cpu         = "512"
task_memory      = "1024"
desired_count    = 1
min_capacity     = 1
max_capacity     = 3

# RDS
db_instance_class    = "db.t3.micro"
db_allocated_storage = 20
db_name             = "tickr_dev"
db_username         = "tickr_admin"

# ElastiCache
redis_node_type  = "cache.t3.micro"
redis_num_nodes  = 1
```

### environments/dev/main.tf

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "tickr-terraform-state"
    key    = "dev/terraform.tfstate"
    region = "eu-west-1"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Tickr"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

module "vpc" {
  source = "../../modules/vpc"

  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
}

module "ecs" {
  source = "../../modules/ecs"

  environment = var.environment
  vpc_id      = module.vpc.vpc_id

  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids

  task_cpu      = var.task_cpu
  task_memory   = var.task_memory
  desired_count = var.desired_count
  min_capacity  = var.min_capacity
  max_capacity  = var.max_capacity

  db_host    = module.rds.db_endpoint
  redis_host = module.elasticache.redis_endpoint
}

module "rds" {
  source = "../../modules/rds"

  environment          = var.environment
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids

  db_instance_class    = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage
  db_name              = var.db_name
  db_username          = var.db_username
  db_password          = var.db_password
}

module "elasticache" {
  source = "../../modules/elasticache"

  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  redis_node_type = var.redis_node_type
  redis_num_nodes = var.redis_num_nodes
}

module "s3" {
  source = "../../modules/s3"

  environment = var.environment
}
```

---

## 🚀 Commandes Terraform

### Initialisation

```bash
cd terraform/environments/dev

# Initialiser
terraform init

# Vérifier format
terraform fmt -recursive

# Valider configuration
terraform validate
```

### Planification

```bash
# Plan avec variables
terraform plan -var-file=terraform.tfvars

# Sauvegarder plan
terraform plan -out=tfplan
```

### Application

```bash
# Appliquer changements
terraform apply -var-file=terraform.tfvars

# Appliquer plan sauvegardé
terraform apply tfplan

# Auto-approve (CI/CD uniquement)
terraform apply -auto-approve
```

### Destruction

```bash
# Détruire environnement (DANGER!)
terraform destroy -var-file=terraform.tfvars
```

---

## 🔐 Secrets Management

### AWS Secrets Manager

```hcl
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "tickr/${var.environment}/db/password"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.db_password
}
```

### Utilisation

```bash
# Créer secret manuellement
aws secretsmanager create-secret \
  --name tickr/dev/jwt/secret \
  --secret-string "your-super-secret-jwt-key"

# Récupérer secret
aws secretsmanager get-secret-value \
  --secret-id tickr/dev/jwt/secret \
  --query SecretString \
  --output text
```

---

## ✅ Checklist Terraform

```yaml
✅ Setup Initial:
  - [ ] Terraform 1.0+ installé
  - [ ] AWS CLI configuré
  - [ ] S3 bucket backend créé
  - [ ] Modules organisés

✅ Environnements:
  - [ ] Dev environment créé
  - [ ] Variables définies
  - [ ] Secrets configurés
  - [ ] Plan validé

✅ Déploiement:
  - [ ] terraform init réussi
  - [ ] terraform plan sans erreur
  - [ ] terraform apply testé
  - [ ] Outputs vérifiés

✅ Sécurité:
  - [ ] Secrets dans AWS Secrets Manager
  - [ ] State file dans S3 (chiffré)
  - [ ] IAM roles least privilege
  - [ ] Security groups restrictifs
```

---

**Prochaine lecture:** `03-cicd-pipeline.md` pour automatiser les déploiements.
