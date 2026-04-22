# FridgeCheck Terraform Infrastructure

This directory contains modular Terraform configuration for provisioning FridgeCheck infrastructure on AWS.

## Prerequisites

- Terraform >= 1.7.0
- AWS CLI configured with appropriate credentials
- An S3 bucket and DynamoDB table for remote state (see below)

## Bootstrap Remote State

Before initialising, create the state backend manually:

```bash
aws s3 mb s3://fridgecheck-terraform-state --region eu-west-1
aws dynamodb create-table \
  --table-name fridgecheck-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-west-1
```

## Usage

```bash
cd environments/dev
terraform init
terraform plan -var="api_image=ghcr.io/your-org/fridgecheck/api:latest" \
               -var="worker_image=ghcr.io/your-org/fridgecheck/worker:latest" \
               -var="secret_key_ssm_arn=arn:aws:ssm:eu-west-1:123456789:parameter/fridgecheck/dev/secret_key"
terraform apply
```

## Module Overview

| Module | Purpose |
|--------|---------|
| `networking` | VPC, public/private subnets across 2 AZs, NAT gateway, security groups |
| `database` | RDS PostgreSQL 16, private subnet, encrypted, automated backups |
| `cache` | ElastiCache Redis 7, private subnet |
| `compute` | ECS Fargate (API + worker), ALB, S3 + CloudFront for frontend |
| `monitoring` | CloudWatch alarms (CPU, memory, 5xx), SNS alerts, dashboard |

## Environments

- **dev**: Single-instance, minimal resources, auto-deploy on release
- **prod**: Multi-AZ database, 2+ API tasks, manual approval required

## Resource Tagging

All resources are tagged with:
- `project = "fridgecheck"`
- `environment = "dev" | "prod"`
- `managed_by = "terraform"`
