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
    key            = "iam-users/terraform.tfstate"
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
      stack      = "iam-users"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id   = data.aws_caller_identity.current.account_id
  region       = data.aws_region.current.name
  state_bucket = var.state_bucket
  lock_table   = var.lock_table
  project      = var.project

  # Split across multiple managed policies because IAM caps each at 6144 chars.
  deploy_policy_files = {
    core    = "terraform-deploy-core.json.tftpl"
    compute = "terraform-deploy-compute.json.tftpl"
    data    = "terraform-deploy-data.json.tftpl"
  }
}

resource "aws_iam_user" "terraform_deploy" {
  name = "terraform-deploy"
  path = "/automation/"
}

resource "aws_iam_policy" "terraform_deploy" {
  for_each = local.deploy_policy_files

  name        = "terraform-deploy-${each.key}"
  description = "Least-privilege apply policy (${each.key}) for ${local.project} Terraform stacks"

  policy = templatefile("${path.module}/policies/${each.value}", {
    account_id   = local.account_id
    region       = local.region
    state_bucket = local.state_bucket
    lock_table   = local.lock_table
    project      = local.project
  })
}

resource "aws_iam_user_policy_attachment" "terraform_deploy" {
  for_each = local.deploy_policy_files

  user       = aws_iam_user.terraform_deploy.name
  policy_arn = aws_iam_policy.terraform_deploy[each.key].arn
}

resource "aws_iam_user" "terraform_plan_only" {
  name = "terraform-plan-only"
  path = "/automation/"
}

resource "aws_iam_policy" "terraform_plan_only" {
  name        = "terraform-plan-only"
  description = "Read-only plan policy for ${local.project} Terraform CI"

  policy = templatefile("${path.module}/policies/terraform-plan-only.json.tftpl", {
    account_id   = local.account_id
    region       = local.region
    state_bucket = local.state_bucket
    lock_table   = local.lock_table
    project      = local.project
  })
}

resource "aws_iam_user_policy_attachment" "terraform_plan_only" {
  user       = aws_iam_user.terraform_plan_only.name
  policy_arn = aws_iam_policy.terraform_plan_only.arn
}
