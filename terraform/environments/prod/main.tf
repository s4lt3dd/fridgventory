terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
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

module "networking" {
  source      = "../../modules/networking"
  project     = var.project
  environment = var.environment
}

module "database" {
  source            = "../../modules/database"
  project           = var.project
  environment       = var.environment
  vpc_id            = module.networking.vpc_id
  subnet_ids        = module.networking.private_subnet_ids
  security_group_id = module.networking.database_security_group_id
  db_username       = var.db_username
  instance_class    = var.db_instance_class
  multi_az          = true
}

module "cache" {
  source            = "../../modules/cache"
  project           = var.project
  environment       = var.environment
  vpc_id            = module.networking.vpc_id
  subnet_ids        = module.networking.private_subnet_ids
  security_group_id = module.networking.cache_security_group_id
}

module "compute" {
  source                = "../../modules/compute"
  project               = var.project
  environment           = var.environment
  vpc_id                = module.networking.vpc_id
  public_subnet_ids     = module.networking.public_subnet_ids
  private_subnet_ids    = module.networking.private_subnet_ids
  alb_security_group_id = module.networking.alb_security_group_id
  api_security_group_id = module.networking.api_security_group_id
  api_image             = var.api_image
  worker_image          = var.worker_image
  api_desired_count     = var.api_desired_count
  api_cpu               = 512
  api_memory            = 1024
  database_url_ssm_arn  = module.database.db_connection_ssm_arn
  redis_url             = "redis://${module.cache.redis_endpoint}:${module.cache.redis_port}/0"
  secret_key_ssm_arn    = var.secret_key_ssm_arn
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
