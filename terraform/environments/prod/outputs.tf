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
