output "api_url" {
  description = "URL of the API load balancer"
  value       = "http://${module.compute.alb_dns_name}"
}

output "frontend_url" {
  description = "CloudFront URL for the frontend"
  value       = "https://${module.compute.cloudfront_domain_name}"
}

output "ecs_cluster" {
  description = "ECS cluster name"
  value       = module.compute.ecs_cluster_name
}

# --- Outputs consumed by the deploy workflow ---

output "private_subnet_ids" {
  description = "Private subnet IDs (for ECS RunTask migrations)"
  value       = module.networking.private_subnet_ids
}

output "api_security_group_id" {
  description = "Security group ID attached to the API task (DB + Redis access)"
  value       = module.networking.api_security_group_id
}

output "frontend_bucket_name" {
  description = "S3 bucket hosting the frontend (target of `aws s3 sync`)"
  value       = module.compute.frontend_bucket_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = module.compute.cloudfront_distribution_id
}
