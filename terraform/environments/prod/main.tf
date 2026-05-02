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
    key            = "prod/terraform.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "fridgecheck-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      project     = "fridgecheck"
      environment = var.environment
      managed_by  = "terraform"
    }
  }
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      project     = "fridgecheck"
      environment = var.environment
      managed_by  = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  expected_account_id = "043309324197"
}

check "correct_account" {
  assert {
    condition     = data.aws_caller_identity.current.account_id == local.expected_account_id
    error_message = "Wrong AWS account: expected ${local.expected_account_id}, got ${data.aws_caller_identity.current.account_id}."
  }
}

module "networking" {
  source      = "../../modules/networking"
  project     = var.project
  environment = var.environment
}

module "security" {
  source      = "../../modules/security"
  project     = var.project
  environment = var.environment
  enable_waf  = var.enable_waf
  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
}

module "database" {
  source              = "../../modules/database"
  project             = var.project
  environment         = var.environment
  vpc_id              = module.networking.vpc_id
  subnet_ids          = module.networking.private_subnet_ids
  security_group_id   = module.networking.database_security_group_id
  db_username         = var.db_username
  instance_class      = var.db_instance_class
  multi_az            = true
  kms_key_arn         = module.security.kms_key_arn
  deletion_protection = true
}

module "cache" {
  source             = "../../modules/cache"
  project            = var.project
  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.private_subnet_ids
  security_group_id  = module.networking.cache_security_group_id
  kms_key_arn        = module.security.kms_key_arn
  num_cache_clusters = 2
}

module "compute" {
  source                         = "../../modules/compute"
  project                        = var.project
  environment                    = var.environment
  vpc_id                         = module.networking.vpc_id
  public_subnet_ids              = module.networking.public_subnet_ids
  private_subnet_ids             = module.networking.private_subnet_ids
  alb_security_group_id          = module.networking.alb_security_group_id
  api_security_group_id          = module.networking.api_security_group_id
  api_image                      = var.api_image
  worker_image                   = var.worker_image
  api_desired_count              = var.api_desired_count
  api_cpu                        = 512
  api_memory                     = 1024
  kms_key_arn                    = module.security.kms_key_arn
  db_host_ssm_arn                = module.database.db_host_ssm_arn
  db_port_ssm_arn                = module.database.db_port_ssm_arn
  db_name_ssm_arn                = module.database.db_name_ssm_arn
  db_username                    = module.database.db_username
  db_master_secret_arn           = module.database.master_user_secret_arn
  redis_url                      = "${module.cache.redis_url_scheme}://${module.cache.redis_endpoint}:${module.cache.redis_port}/0"
  secret_key_ssm_arn             = var.secret_key_ssm_arn
  acm_certificate_arn_alb        = var.acm_certificate_arn_alb
  acm_certificate_arn_cloudfront = var.acm_certificate_arn_cloudfront
  custom_domain_aliases          = var.custom_domain_aliases
  waf_web_acl_arn                = module.security.waf_web_acl_arn
}

module "monitoring" {
  source           = "../../modules/monitoring"
  project          = var.project
  environment      = var.environment
  ecs_cluster_name = module.compute.ecs_cluster_name
  api_service_name = "${var.project}-${var.environment}-api"
  alb_arn_suffix   = module.compute.alb_arn_suffix
  sns_email        = var.sns_alert_email
}
