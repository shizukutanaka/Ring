# WebRTC Call Recorder - Main Infrastructure (AWS)
# Production-grade infrastructure with auto-scaling, RDS, and load balancing

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment for remote state
  # backend "s3" {
  #   bucket         = "webrtc-recorder-terraform-state"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "WebRTC Call Recorder"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CreatedAt   = timestamp()
    }
  }
}

# VPC and Networking
module "networking" {
  source = "./modules/networking"

  vpc_cidr              = var.vpc_cidr
  environment           = var.environment
  availability_zones    = data.aws_availability_zones.available.names
  public_subnet_cidrs   = var.public_subnet_cidrs
  private_subnet_cidrs  = var.private_subnet_cidrs
  database_subnet_cidrs = var.database_subnet_cidrs

  tags = local.common_tags
}

# RDS PostgreSQL Database
module "database" {
  source = "./modules/database"

  identifier              = "${var.app_name}-db-${var.environment}"
  engine                  = "postgres"
  engine_version          = var.postgres_version
  instance_class          = var.db_instance_class
  allocated_storage       = var.db_allocated_storage
  max_allocated_storage   = var.db_max_allocated_storage
  database_name           = var.db_name
  username                = var.db_username
  password                = random_password.db_password.result
  vpc_security_group_ids  = [module.networking.db_security_group_id]
  db_subnet_group_name    = module.networking.db_subnet_group_name

  backup_retention_period       = var.backup_retention_period
  backup_window                 = var.backup_window
  maintenance_window            = var.maintenance_window
  enable_backup_window          = var.enable_backup_window
  enable_multi_az               = var.enable_multi_az
  enable_encryption             = var.enable_encryption
  enable_enhanced_monitoring    = var.enable_enhanced_monitoring
  enable_deletion_protection    = var.enable_deletion_protection
  enable_iam_database_auth      = var.enable_iam_database_auth

  tags = local.common_tags
}

# Application Load Balancer
module "load_balancer" {
  source = "./modules/load_balancer"

  app_name              = var.app_name
  environment           = var.environment
  vpc_id                = module.networking.vpc_id
  subnet_ids            = module.networking.public_subnet_ids
  enable_https          = var.enable_https
  certificate_arn       = var.ssl_certificate_arn
  enable_waf            = var.enable_waf

  tags = local.common_tags
}

# Auto Scaling Group for App Servers
module "app_servers" {
  source = "./modules/app_servers"

  app_name                = var.app_name
  environment             = var.environment
  instance_type           = var.app_instance_type
  min_size                = var.app_min_size
  max_size                = var.app_max_size
  desired_capacity        = var.app_desired_capacity
  vpc_subnet_ids          = module.networking.private_subnet_ids
  security_group_id       = module.networking.app_security_group_id
  target_group_arn        = module.load_balancer.target_group_arn
  key_name                = var.key_pair_name
  enable_monitoring       = var.enable_monitoring
  docker_image            = var.docker_image
  container_port          = var.app_port
  environment_variables   = {
    DATABASE_HOST     = module.database.endpoint
    DATABASE_PORT     = module.database.port
    DATABASE_NAME     = var.db_name
    REDIS_HOST        = module.cache.endpoint
    REDIS_PORT        = module.cache.port
    NODE_ENV          = var.environment
    JWT_SECRET        = random_password.jwt_secret.result
    ENVIRONMENT       = var.environment
  }

  tags = local.common_tags
}

# Redis Cache Cluster
module "cache" {
  source = "./modules/cache"

  cluster_id              = "${var.app_name}-cache-${var.environment}"
  engine                  = "redis"
  engine_version          = var.redis_version
  node_type               = var.cache_node_type
  num_cache_nodes         = var.cache_num_nodes
  parameter_group_name    = var.redis_parameter_group
  port                    = 6379
  security_group_ids      = [module.networking.cache_security_group_id]
  subnet_group_name       = module.networking.cache_subnet_group_name
  automatic_failover      = var.cache_automatic_failover
  at_rest_encryption      = var.cache_encryption_at_rest
  transit_encryption      = var.cache_encryption_in_transit

  tags = local.common_tags
}

# S3 for Call Recordings and Backups
module "storage" {
  source = "./modules/storage"

  bucket_name             = "${var.app_name}-recordings-${var.environment}-${data.aws_caller_identity.current.account_id}"
  versioning              = var.s3_enable_versioning
  server_side_encryption  = var.s3_enable_encryption
  public_access_block     = true
  enable_logging          = var.s3_enable_logging
  lifecycle_rules         = var.s3_lifecycle_rules
  backup_retention_days   = var.backup_retention_period

  tags = local.common_tags
}

# CloudWatch Monitoring
module "monitoring" {
  source = "./modules/monitoring"

  app_name              = var.app_name
  environment           = var.environment
  log_retention_days    = var.cloudwatch_log_retention_days
  enable_alarms         = var.enable_monitoring_alarms
  alarm_email           = var.alarm_email

  # ALB Metrics
  alb_target_group_name = module.load_balancer.target_group_name
  alb_full_name         = module.load_balancer.alb_name

  # RDS Metrics
  rds_identifier        = module.database.identifier
  db_instance_class     = var.db_instance_class

  # Auto Scaling Group
  asg_name              = module.app_servers.asg_name

  tags = local.common_tags
}

# IAM Roles and Policies
module "iam" {
  source = "./modules/iam"

  app_name              = var.app_name
  environment           = var.environment
  s3_bucket_arn         = module.storage.bucket_arn
  enable_s3_access      = true
  enable_cloudwatch_logs = true
  enable_kms_access     = var.enable_encryption

  tags = local.common_tags
}

# Secrets Manager for Sensitive Data
module "secrets" {
  source = "./modules/secrets"

  environment = var.environment

  secrets = {
    db_password      = random_password.db_password.result
    jwt_secret       = random_password.jwt_secret.result
    api_key          = random_password.api_key.result
    encryption_key   = random_password.encryption_key.result
  }

  tags = local.common_tags
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Random passwords
resource "random_password" "db_password" {
  length  = 16
  special = true
}

resource "random_password" "jwt_secret" {
  length  = 32
  special = true
}

resource "random_password" "api_key" {
  length  = 32
  special = true
}

resource "random_password" "encryption_key" {
  length  = 32
  special = true
}

# Local variables
locals {
  common_tags = {
    Project     = "WebRTC Call Recorder"
    Environment = var.environment
    ManagedBy   = "Terraform"
    CreatedDate = timestamp()
  }
}

# Outputs
output "load_balancer_dns" {
  description = "DNS name of the load balancer"
  value       = module.load_balancer.alb_dns_name
}

output "database_endpoint" {
  description = "RDS database endpoint"
  value       = module.database.endpoint
}

output "redis_endpoint" {
  description = "Redis cache endpoint"
  value       = module.cache.endpoint
}

output "s3_bucket_name" {
  description = "S3 bucket for recordings"
  value       = module.storage.bucket_name
}

output "auto_scaling_group_name" {
  description = "Auto Scaling Group name"
  value       = module.app_servers.asg_name
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group name"
  value       = module.monitoring.log_group_name
}
