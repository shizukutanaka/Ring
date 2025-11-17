# WebRTC Call Recorder - Terraform Variables

# AWS Configuration
variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "webrtc-recorder"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
}

# Database Configuration
variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15.3"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.small" # Change to db.r5.large for production

  validation {
    condition     = can(regex("^db\\.", var.db_instance_class))
    error_message = "DB instance class must be a valid AWS RDS instance type."
  }
}

variable "db_allocated_storage" {
  description = "Initial allocated storage in GB"
  type        = number
  default     = 100

  validation {
    condition     = var.db_allocated_storage >= 20 && var.db_allocated_storage <= 65536
    error_message = "Allocated storage must be between 20 and 65536 GB."
  }
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage in GB (for auto-scaling)"
  type        = number
  default     = 500

  validation {
    condition     = var.db_max_allocated_storage >= var.db_allocated_storage
    error_message = "Max allocated storage must be >= allocated storage."
  }
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "webrtc_recorder"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "postgres"
  sensitive   = true
}

variable "backup_retention_period" {
  description = "Database backup retention period in days"
  type        = number
  default     = 30

  validation {
    condition     = var.backup_retention_period >= 1 && var.backup_retention_period <= 35
    error_message = "Backup retention period must be between 1 and 35 days."
  }
}

variable "backup_window" {
  description = "Daily backup window (UTC)"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "Weekly maintenance window"
  type        = string
  default     = "mon:04:00-mon:05:00"
}

variable "enable_backup_window" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "enable_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = true
}

variable "enable_encryption" {
  description = "Enable database encryption at rest"
  type        = bool
  default     = true
}

variable "enable_enhanced_monitoring" {
  description = "Enable RDS Enhanced Monitoring"
  type        = bool
  default     = true
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for RDS"
  type        = bool
  default     = true
}

variable "enable_iam_database_auth" {
  description = "Enable IAM database authentication"
  type        = bool
  default     = true
}

# Application Configuration
variable "app_instance_type" {
  description = "EC2 instance type for application servers"
  type        = string
  default     = "t3.medium" # Change to c5.xlarge for production

  validation {
    condition     = can(regex("^[a-z][0-9a-z-]*\\.[a-z0-9-]+$", var.app_instance_type))
    error_message = "Instance type must be a valid AWS EC2 instance type."
  }
}

variable "app_min_size" {
  description = "Minimum number of application instances"
  type        = number
  default     = 2

  validation {
    condition     = var.app_min_size >= 1
    error_message = "Minimum size must be at least 1."
  }
}

variable "app_max_size" {
  description = "Maximum number of application instances"
  type        = number
  default     = 10

  validation {
    condition     = var.app_max_size >= var.app_min_size
    error_message = "Maximum size must be >= minimum size."
  }
}

variable "app_desired_capacity" {
  description = "Desired number of application instances"
  type        = number
  default     = 3

  validation {
    condition     = var.app_desired_capacity >= var.app_min_size && var.app_desired_capacity <= var.app_max_size
    error_message = "Desired capacity must be between min and max size."
  }
}

variable "app_port" {
  description = "Port for application server"
  type        = number
  default     = 3000

  validation {
    condition     = var.app_port >= 1 && var.app_port <= 65535
    error_message = "Port must be between 1 and 65535."
  }
}

variable "docker_image" {
  description = "Docker image URI for application"
  type        = string
  # Example: "123456789.dkr.ecr.us-east-1.amazonaws.com/webrtc-recorder:latest"
}

variable "key_pair_name" {
  description = "EC2 Key Pair name for SSH access"
  type        = string
}

# Cache Configuration
variable "redis_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "cache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro" # Change to cache.r6g.xlarge for production

  validation {
    condition     = can(regex("^cache\\.", var.cache_node_type))
    error_message = "Cache node type must be a valid ElastiCache node type."
  }
}

variable "cache_num_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 2

  validation {
    condition     = var.cache_num_nodes >= 1
    error_message = "Number of cache nodes must be at least 1."
  }
}

variable "redis_parameter_group" {
  description = "Redis parameter group name"
  type        = string
  default     = "default.redis7"
}

variable "cache_automatic_failover" {
  description = "Enable automatic failover for cache"
  type        = bool
  default     = true
}

variable "cache_encryption_at_rest" {
  description = "Enable encryption at rest for cache"
  type        = bool
  default     = true
}

variable "cache_encryption_in_transit" {
  description = "Enable encryption in transit for cache"
  type        = bool
  default     = true
}

# Load Balancer Configuration
variable "enable_https" {
  description = "Enable HTTPS on load balancer"
  type        = bool
  default     = true
}

variable "ssl_certificate_arn" {
  description = "ARN of SSL certificate for HTTPS"
  type        = string
  default     = "" # Required if enable_https is true
}

variable "enable_waf" {
  description = "Enable AWS WAF on load balancer"
  type        = bool
  default     = true
}

# Storage Configuration
variable "s3_enable_versioning" {
  description = "Enable S3 versioning for recordings"
  type        = bool
  default     = true
}

variable "s3_enable_encryption" {
  description = "Enable S3 encryption"
  type        = bool
  default     = true
}

variable "s3_enable_logging" {
  description = "Enable S3 access logging"
  type        = bool
  default     = true
}

variable "s3_lifecycle_rules" {
  description = "S3 lifecycle rules for archival"
  type = list(object({
    id          = string
    prefix      = optional(string)
    days        = number
    action      = string # transition, expiration
    storage_class = optional(string)
  }))
  default = [
    {
      id     = "archive-old-recordings"
      days   = 90
      action = "transition"
      storage_class = "GLACIER"
    },
    {
      id     = "delete-old-recordings"
      days   = 2555 # 7 years
      action = "expiration"
    }
  ]
}

# Monitoring Configuration
variable "enable_monitoring" {
  description = "Enable CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "enable_monitoring_alarms" {
  description = "Enable CloudWatch alarms"
  type        = bool
  default     = true
}

variable "cloudwatch_log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.cloudwatch_log_retention_days)
    error_message = "Log retention must be a valid CloudWatch value."
  }
}

variable "alarm_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
}

# Tags
variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Project   = "WebRTC Call Recorder"
    Terraform = "true"
  }
}
