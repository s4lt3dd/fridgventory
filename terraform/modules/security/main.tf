terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 5.50"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# --- Customer-managed KMS key (per environment) ---
# Used by RDS, Secrets Manager (RDS-managed master password), SSM SecureString,
# CloudWatch Logs, and ElastiCache at-rest encryption.

data "aws_iam_policy_document" "kms" {
  statement {
    sid     = "EnableRootAccountAdmin"
    actions = ["kms:*"]
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
    resources = ["*"]
  }

  statement {
    sid = "AllowAWSServicesViaService"
    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:DescribeKey",
      "kms:CreateGrant"
    ]
    principals {
      type = "Service"
      identifiers = [
        "rds.amazonaws.com",
        "secretsmanager.amazonaws.com",
        "ssm.amazonaws.com",
        "logs.${data.aws_region.current.name}.amazonaws.com",
        "elasticache.amazonaws.com",
        "s3.amazonaws.com"
      ]
    }
    resources = ["*"]
  }
}

resource "aws_kms_key" "main" {
  description             = "${var.project} ${var.environment} CMK for RDS, Secrets Manager, SSM, Logs, ElastiCache"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  policy                  = data.aws_iam_policy_document.kms.json

  tags = {
    Name        = "${var.project}-${var.environment}-cmk"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "aws_kms_alias" "main" {
  name          = "alias/${var.project}-${var.environment}"
  target_key_id = aws_kms_key.main.key_id
}

# --- WAFv2 Web ACL (CloudFront scope, requires us-east-1) ---
# Conditional on var.enable_waf. Attached to CloudFront via the compute module.

resource "aws_wafv2_web_acl" "cloudfront" {
  count    = var.enable_waf ? 1 : 0
  provider = aws.us_east_1

  name        = "${var.project}-${var.environment}-cloudfront"
  description = "Baseline managed-rule WAF for ${var.project} ${var.environment}"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 1
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "common-rule-set"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWS-AWSManagedRulesAmazonIpReputationList"
    priority = 2
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "ip-reputation"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWS-AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "known-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "RateLimitPerIP"
    priority = 10
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit_per_5min
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "rate-limit-per-ip"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project}-${var.environment}-cloudfront-waf"
    sampled_requests_enabled   = true
  }

  tags = {
    Name        = "${var.project}-${var.environment}-cloudfront-waf"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}
