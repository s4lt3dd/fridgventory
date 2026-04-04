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

resource "aws_elasticache_cluster" "main" {
  cluster_id           = "${var.project}-${var.environment}-redis"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.node_type
  num_cache_nodes      = var.num_cache_nodes
  parameter_group_name = "default.redis7"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [var.security_group_id]

  snapshot_retention_limit = var.environment == "prod" ? 7 : 0

  tags = {
    Name        = "${var.project}-${var.environment}-redis"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}
