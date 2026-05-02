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
    key            = "iam-cicd/terraform.tfstate"
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
      stack      = "iam-cicd"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Pull terraform-deploy policy ARNs from the iam-users stack so we can attach
# them to the OIDC roles. The terraform-deploy user has them attached too;
# this avoids duplicating thousands of lines of policy JSON.
data "terraform_remote_state" "iam_users" {
  backend = "s3"
  config = {
    bucket = var.state_bucket
    key    = "iam-users/terraform.tfstate"
    region = var.aws_region
  }
}

locals {
  account_id                   = data.aws_caller_identity.current.account_id
  region                       = data.aws_region.current.name
  terraform_deploy_policy_arns = data.terraform_remote_state.iam_users.outputs.terraform_deploy_policy_arns

  envs = ["dev", "prod"]
}

# --- GitHub OIDC provider ---
# One per account, regardless of how many repos use it. The thumbprint is
# vestigial since AWS started doing native TLS validation against GitHub's
# issuer in 2023, but the field is still required by the IAM API.
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# --- Trust policies ---
# Per-env subject scope:
#   dev role: jobs declaring `environment: dev`, OR pull_request events
#             (so PRs can run terraform plan against either env's state)
#   prod role: only jobs declaring `environment: prod` — the GitHub Environment
#              with that name can require manual approval, gating role assumption
data "aws_iam_policy_document" "trust" {
  for_each = toset(local.envs)

  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = each.key == "dev" ? [
        "repo:${var.github_repo}:environment:dev",
        "repo:${var.github_repo}:pull_request",
        ] : [
        "repo:${var.github_repo}:environment:prod",
      ]
    }
  }
}

# --- Roles ---
resource "aws_iam_role" "github_actions" {
  for_each = toset(local.envs)

  name                 = "${var.project}-github-actions-deploy-${each.key}"
  assume_role_policy   = data.aws_iam_policy_document.trust[each.key].json
  description          = "GitHub Actions OIDC role for ${each.key} deploys"
  max_session_duration = 3600
}

# --- Per-env CICD policies ---
resource "aws_iam_policy" "cicd_deploy" {
  for_each = toset(local.envs)

  name        = "${var.project}-cicd-deploy-${each.key}"
  description = "ECR push + ECS deploy/run-task + log tail for ${each.key}"

  policy = templatefile("${path.module}/policies/cicd-deploy.json.tftpl", {
    account_id  = local.account_id
    region      = local.region
    project     = var.project
    environment = each.key
  })
}

resource "aws_iam_policy" "cicd_frontend" {
  for_each = toset(local.envs)

  name        = "${var.project}-cicd-frontend-${each.key}"
  description = "S3 frontend bucket sync + CloudFront invalidation for ${each.key}"

  policy = templatefile("${path.module}/policies/cicd-frontend.json.tftpl", {
    account_id  = local.account_id
    region      = local.region
    project     = var.project
    environment = each.key
  })
}

# --- Attachments ---
# Each role gets:
#   1. The 3 shared terraform-deploy-{core,compute,data} policies (for terraform apply)
#   2. The per-env cicd-deploy policy (for image push + ECS deploy + log tail)
#   3. The per-env cicd-frontend policy (for S3 sync + CloudFront invalidation)
# Total: 5 managed policies per role. IAM cap is 10.
resource "aws_iam_role_policy_attachment" "terraform_deploy" {
  for_each = {
    for pair in setproduct(local.envs, keys(local.terraform_deploy_policy_arns)) :
    "${pair[0]}-${pair[1]}" => {
      env        = pair[0]
      policy_arn = local.terraform_deploy_policy_arns[pair[1]]
    }
  }

  role       = aws_iam_role.github_actions[each.value.env].name
  policy_arn = each.value.policy_arn
}

resource "aws_iam_role_policy_attachment" "cicd_deploy" {
  for_each   = toset(local.envs)
  role       = aws_iam_role.github_actions[each.key].name
  policy_arn = aws_iam_policy.cicd_deploy[each.key].arn
}

resource "aws_iam_role_policy_attachment" "cicd_frontend" {
  for_each   = toset(local.envs)
  role       = aws_iam_role.github_actions[each.key].name
  policy_arn = aws_iam_policy.cicd_frontend[each.key].arn
}
