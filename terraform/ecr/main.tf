terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
  }

  backend "s3" {
    bucket         = "fridgecheck-terraform-state"
    key            = "ecr/terraform.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "fridgecheck-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      project    = var.project
      managed_by = "terraform"
      stack      = "ecr"
    }
  }
}

locals {
  # ECR repos live in this stack so they outlive any single environment teardown.
  # The frontend ships as static files via S3+CloudFront, so no frontend image.
  repos = ["api", "worker"]
}

resource "aws_ecr_repository" "this" {
  for_each = toset(local.repos)

  name                 = "${var.project}-${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

# Adopt the existing repos that were created out-of-band by the first manual
# push. Idempotent on subsequent applies.
import {
  for_each = toset(local.repos)
  to       = aws_ecr_repository.this[each.key]
  id       = "${var.project}-${each.key}"
}

resource "aws_ecr_lifecycle_policy" "this" {
  for_each   = aws_ecr_repository.this
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 20 tagged images"
        selection = {
          tagStatus      = "tagged"
          tagPatternList = ["*"]
          countType      = "imageCountMoreThan"
          countNumber    = 20
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Expire untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      }
    ]
  })
}
