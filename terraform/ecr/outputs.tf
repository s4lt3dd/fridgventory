output "repository_urls" {
  description = "Map of repo name to URL (e.g. ACCT.dkr.ecr.REGION.amazonaws.com/fridgecheck-api)"
  value       = { for k, r in aws_ecr_repository.this : k => r.repository_url }
}

output "repository_arns" {
  description = "Map of repo name to ARN"
  value       = { for k, r in aws_ecr_repository.this : k => r.arn }
}
