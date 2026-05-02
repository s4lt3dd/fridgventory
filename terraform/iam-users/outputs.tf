output "terraform_deploy_user_arn" {
  description = "ARN of the terraform-deploy user. Generate access keys via: aws iam create-access-key --user-name terraform-deploy"
  value       = aws_iam_user.terraform_deploy.arn
}

output "terraform_plan_only_user_arn" {
  description = "ARN of the terraform-plan-only user. Generate access keys via: aws iam create-access-key --user-name terraform-plan-only"
  value       = aws_iam_user.terraform_plan_only.arn
}

output "terraform_deploy_policy_arns" {
  description = "Map of split terraform-deploy policy ARNs (core/compute/data) — all attached to the terraform-deploy user."
  value       = { for k, p in aws_iam_policy.terraform_deploy : k => p.arn }
}

output "terraform_plan_only_policy_arn" {
  value = aws_iam_policy.terraform_plan_only.arn
}
