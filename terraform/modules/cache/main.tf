resource "aws_elasticache_subnet_group" "main" {
  name        = "${var.project}-${var.environment}-cache-subnet"
  subnet_ids  = var.subnet_ids
  description = "Cache subnet group for ${var.project} ${var.environment}"

  tags = {
    Name        = "${var.project}-${var.environment}-cache-subnet"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Replication group instead of cache_cluster — required for at-rest + transit encryption.
# Single-node by default; bump num_cache_clusters in prod for HA.
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.project}-${var.environment}-redis"
  description          = "Redis ${var.environment} for ${var.project}"

  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.node_type
  parameter_group_name = "default.redis7"
  port                 = 6379

  num_cache_clusters         = var.num_cache_clusters
  automatic_failover_enabled = var.num_cache_clusters > 1
  multi_az_enabled           = var.num_cache_clusters > 1

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [var.security_group_id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  kms_key_id                 = var.kms_key_arn

  snapshot_retention_limit = var.environment == "prod" ? 7 : 1
  snapshot_window          = "02:00-03:00"

  apply_immediately = var.environment != "prod"

  tags = {
    Name        = "${var.project}-${var.environment}-redis"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}
