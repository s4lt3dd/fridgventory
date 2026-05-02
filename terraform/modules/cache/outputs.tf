output "redis_endpoint" {
  description = "Primary endpoint address of the Redis replication group"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "redis_port" {
  description = "Port of the Redis replication group"
  value       = aws_elasticache_replication_group.main.port
}

output "redis_url_scheme" {
  description = "URL scheme — rediss:// because transit encryption is enabled"
  value       = "rediss"
}
