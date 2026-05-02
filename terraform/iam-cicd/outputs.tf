output "github_actions_deploy_role_dev_arn" {
  description = "Set as GitHub repo secret AWS_DEPLOY_ROLE_ARN_DEV."
  value       = aws_iam_role.github_actions["dev"].arn
}

output "github_actions_deploy_role_prod_arn" {
  description = "Set as GitHub repo secret AWS_DEPLOY_ROLE_ARN_PROD."
  value       = aws_iam_role.github_actions["prod"].arn
}

output "github_oidc_provider_arn" {
  description = "ARN of the GitHub OIDC identity provider (account-wide singleton)."
  value       = aws_iam_openid_connect_provider.github.arn
}
