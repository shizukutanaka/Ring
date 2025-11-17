# WebRTC Call Recorder - Terraform Infrastructure

Production-grade Infrastructure as Code for deploying WebRTC Call Recorder on AWS.

## Overview

This Terraform configuration provisions a complete, scalable, and secure infrastructure including:
- VPC with public, private, and database subnets across 3 availability zones
- RDS PostgreSQL 15 with Multi-AZ, automated backups, and encryption
- Auto-scaling application servers with Docker containers
- Application Load Balancer with HTTPS
- ElastiCache Redis for caching
- S3 for call recordings with lifecycle management
- CloudWatch monitoring and alarms
- AWS WAF for DDoS protection
- Secrets Manager for sensitive data
- IAM roles and policies for least privilege access

## Quick Start

### Prerequisites

```bash
# Install Terraform
# https://www.terraform.io/downloads.html
terraform version  # v1.0 or higher

# Install AWS CLI
# https://aws.amazon.com/cli/
aws configure  # Configure AWS credentials

# Verify AWS access
aws sts get-caller-identity
```

### Deployment Steps

1. **Initialize Terraform working directory**
   ```bash
   cd terraform
   terraform init
   ```

2. **Configure variables**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your environment settings
   ```

3. **Review infrastructure plan**
   ```bash
   terraform plan -out=tfplan
   # Review the proposed changes
   ```

4. **Apply infrastructure**
   ```bash
   terraform apply tfplan
   # Wait 15-20 minutes for infrastructure to be created
   ```

5. **Get outputs**
   ```bash
   terraform output
   ```

### Example Deployment

```bash
# Development environment
terraform workspace new dev
terraform apply -var-file=dev.tfvars

# Staging environment
terraform workspace new staging
terraform apply -var-file=staging.tfvars

# Production environment
terraform workspace new prod
terraform apply -var-file=prod.tfvars
```

## Environment Configurations

### Development (dev.tfvars)
```hcl
environment           = "dev"
db_instance_class     = "db.t3.small"
app_instance_type     = "t3.small"
app_min_size          = 1
app_max_size          = 3
app_desired_capacity  = 1
cache_node_type       = "cache.t3.micro"
enable_multi_az       = false
enable_encryption     = false
```

### Staging (staging.tfvars)
```hcl
environment           = "staging"
db_instance_class     = "db.t3.medium"
app_instance_type     = "t3.medium"
app_min_size          = 2
app_max_size          = 5
app_desired_capacity  = 2
cache_node_type       = "cache.t3.small"
enable_multi_az       = true
enable_encryption     = true
```

### Production (prod.tfvars)
```hcl
environment           = "prod"
db_instance_class     = "db.r5.large"
db_max_allocated_storage = 1000
app_instance_type     = "c5.xlarge"
app_min_size          = 3
app_max_size          = 20
app_desired_capacity  = 5
cache_node_type       = "cache.r6g.xlarge"
enable_multi_az       = true
enable_encryption     = true
enable_deletion_protection = true
```

## Infrastructure Breakdown

### VPC & Networking
- **VPC CIDR**: 10.0.0.0/16
- **Public Subnets** (3): Load balancers and NAT gateways
- **Private Subnets** (3): Application servers
- **Database Subnets** (3): RDS and ElastiCache
- **NAT Gateways**: High-availability NAT gateway per AZ
- **Security Groups**: Separate groups for ALB, app, database, and cache

### Database
- **Engine**: PostgreSQL 15.3
- **Storage**: 100 GB (min) to 500 GB (auto-scaling)
- **Backups**: 30-day retention with automatic snapshots
- **Multi-AZ**: Synchronous replication for HA
- **Encryption**: AES-256 encryption at rest
- **Monitoring**: Enhanced monitoring with CloudWatch
- **Backup Window**: 03:00-04:00 UTC (daily)
- **Maintenance**: Monday 04:00-05:00 UTC

### Application Servers
- **Auto Scaling Group**: 3-10 instances (configurable)
- **Instance Type**: t3.medium to c5.xlarge
- **Launch Template**: Docker-based deployment
- **Load Balancing**: Application Load Balancer
- **Health Checks**: Every 30 seconds
- **Monitoring**: CloudWatch metrics and logs

### Cache Layer
- **Service**: ElastiCache Redis 7.0
- **Cluster**: 2-node (configurable)
- **Node Type**: cache.t3.micro to cache.r6g.xlarge
- **Encryption**: TLS in transit + encryption at rest
- **Automatic Failover**: Enabled for production
- **Port**: 6379

### Load Balancer
- **Type**: Application Load Balancer
- **Scheme**: Internet-facing
- **Listeners**: HTTP (redirect to HTTPS) + HTTPS
- **SSL/TLS**: ACM certificate
- **WAF**: AWS WAF integration for DDoS/attack protection
- **Logging**: S3 bucket for access logs

### Storage
- **Service**: S3
- **Versioning**: Enabled
- **Encryption**: AES-256
- **Lifecycle**: Archive to Glacier after 90 days
- **Logging**: Access logs enabled
- **Backup Retention**: 2555 days (7 years)

### Monitoring & Alarms
- **CloudWatch Logs**: 30-day retention
- **Metrics Collected**:
  - ALB response time, request count, error rates
  - RDS CPU, memory, database connections
  - Auto Scaling Group health
  - ElastiCache CPU and memory
- **Alarms**: High CPU, high memory, error rate, unhealthy targets

## Scaling Configuration

### Horizontal Auto-Scaling
```hcl
# CPU-based scaling
target_tracking_scaling_policy_specification {
  target_value = 70.0
  metric_specification {
    metric_name = "CPUUtilization"
  }
}

# Request count scaling
target_tracking_scaling_policy_specification {
  target_value = 1000.0
  metric_specification {
    metric_name = "RequestCountPerTarget"
  }
}
```

### Expected Performance
- **Minimum Setup**: 2 instances, ~500 RPS
- **Standard Setup**: 4-5 instances, ~1,500-2,000 RPS
- **High-Performance**: 10+ instances, 5,000+ RPS

## Cost Optimization

### Cost Estimates (Monthly)
```
Development Environment:
  Compute:    $30
  Database:   $45
  Cache:      $10
  Network:    $20
  Storage:    $10
  Total:      ~$115/month

Production Environment:
  Compute:    $800
  Database:   $400
  Cache:      $150
  Network:    $100
  Storage:    $50
  Total:      ~$1,500/month
```

### Cost Reduction Strategies
1. **Development**: Use smaller instances (t3.small, db.t3.small)
2. **Reserved Instances**: Save 40% on compute for production
3. **Spot Instances**: Use for auto-scaling beyond baseline
4. **Storage**: Lifecycle policies to transition to Glacier
5. **Data Transfer**: Minimize cross-AZ transfers

## Security Best Practices

### Implemented
- ✅ VPC with private subnets for app servers
- ✅ Security groups with least privilege rules
- ✅ Encryption at rest (RDS, S3, ElastiCache)
- ✅ Encryption in transit (TLS 1.2+)
- ✅ IAM roles with least privilege permissions
- ✅ Secrets Manager for sensitive data
- ✅ AWS WAF for DDoS protection
- ✅ VPC Flow Logs for network monitoring
- ✅ Deletion protection for critical resources
- ✅ Multi-AZ for high availability

### Additional Hardening
```bash
# Enable VPC Flow Logs
aws ec2 create-flow-logs --resource-type VPC

# Enable CloudTrail
aws cloudtrail create-trail --name webrtc-recorder-trail

# Enable GuardDuty
aws guardduty create-detector

# Enable Security Hub
aws securityhub enable-security-hub
```

## Backup & Disaster Recovery

### Automated Backups
```bash
# RDS backups (automated)
- Retention: 30 days
- Backup window: Daily 03:00-04:00 UTC
- Storage: S3

# S3 versioning (enabled)
- All recordings preserved
- Deletion recovery for 30 days

# Cross-region backup
terraform apply -var-file=prod.tfvars -var=enable_backup_replication=true
```

### Restore Procedures
```bash
# Restore RDS from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier webrtc-recorder-restored \
  --db-snapshot-identifier arn:aws:rds:...

# Restore S3 recording
aws s3 cp s3://webrtc-recordings/backup/call-123.wav ./
```

## Troubleshooting

### Common Issues

**1. Authentication Failed**
```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check IAM permissions
aws iam get-user
```

**2. Insufficient Capacity**
```bash
# Change instance type or availability zones
terraform apply -var-file=prod.tfvars -var=app_instance_type=t3.large
```

**3. Database Connection Timeout**
```bash
# Check security groups
aws ec2 describe-security-groups --filters Name=group-name,Values=webrtc-db-sg

# Verify RDS endpoint
terraform output database_endpoint
```

**4. High Costs**
```bash
# Review cost optimizer recommendations
aws ce get-cost-anomaly-monitors

# Check for unused resources
aws resource-groups-tagging-api list-resources --tag-filter
```

## Advanced Topics

### Terraform State Management
```bash
# Use remote state with S3 backend
terraform {
  backend "s3" {
    bucket         = "webrtc-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

# Create state bucket
aws s3 mb s3://webrtc-terraform-state --region us-east-1
aws s3api put-bucket-versioning \
  --bucket webrtc-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB lock table
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

### Multi-Environment Management
```bash
# Create workspaces for different environments
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

# Switch environments
terraform workspace select prod

# Apply environment-specific vars
terraform apply -var-file=prod.tfvars
```

### Module Reusability
```bash
# Reference modules in another project
module "webrtc_infrastructure" {
  source = "git::https://github.com/your-org/webrtc-recorder//terraform"

  environment = "prod"
  app_name    = "webrtc-recorder"
  # ... other variables
}
```

## Maintenance Tasks

### Regular Monitoring
```bash
# Check health of infrastructure
terraform apply -auto-approve -var-file=prod.tfvars

# Review CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --start-time 2025-11-17T00:00:00Z \
  --end-time 2025-11-18T00:00:00Z \
  --period 3600 \
  --statistics Average,Maximum
```

### Update Management
```bash
# Update Terraform code
git pull origin main

# Plan changes
terraform plan -var-file=prod.tfvars

# Apply updates
terraform apply -var-file=prod.tfvars
```

### Database Maintenance
```bash
# Schedule maintenance window
aws rds modify-db-instance \
  --db-instance-identifier webrtc-recorder-db \
  --preferred-maintenance-window "mon:04:00-mon:05:00"
```

## Cleanup

### Destroy Infrastructure
```bash
# Staging (safe)
terraform workspace select staging
terraform destroy -var-file=staging.tfvars

# Production (careful!)
# Ensure backups exist before destroying
terraform workspace select prod
terraform destroy -var-file=prod.tfvars
```

## Support & Resources

- [Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest)
- [AWS Architecture Best Practices](https://aws.amazon.com/architecture/)
- [Terraform Best Practices](https://www.terraform.io/cloud-docs/state)
- [AWS Well-Architected Framework](https://wa.aws.amazon.com/)

## Module Structure

```
terraform/
├── main.tf              # Main configuration
├── variables.tf         # Input variables
├── terraform.tfvars     # Variable values (git-ignored)
├── terraform.tfvars.example
├── outputs.tf           # Output definitions
├── README.md
├── modules/
│   ├── networking/      # VPC, subnets, security groups
│   ├── database/        # RDS PostgreSQL
│   ├── app_servers/     # EC2, Auto Scaling
│   ├── load_balancer/   # ALB, target groups
│   ├── cache/           # ElastiCache Redis
│   ├── storage/         # S3 buckets
│   ├── monitoring/      # CloudWatch
│   ├── iam/             # IAM roles/policies
│   └── secrets/         # Secrets Manager
├── environments/
│   ├── dev.tfvars
│   ├── staging.tfvars
│   └── prod.tfvars
└── scripts/
    ├── init-remote-state.sh
    ├── validate-plan.sh
    └── apply-with-approval.sh
```

---

**Last Updated**: 2025-11-17
**Terraform Version**: >= 1.0
**AWS Provider**: ~> 5.0
