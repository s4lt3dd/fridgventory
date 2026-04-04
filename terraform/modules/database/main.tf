resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_db_subnet_group" "main" {
  name        = "${var.project}-${var.environment}-db-subnet-group"
  subnet_ids  = var.subnet_ids
  description = "DB subnet group for ${var.project} ${var.environment}"

  tags = {
    Name        = "${var.project}-${var.environment}-db-subnet-group"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "aws_db_instance" "main" {
  identifier        = "${var.project}-${var.environment}-postgres"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = var.instance_class
  allocated_storage = var.allocated_storage

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.security_group_id]

  storage_encrypted       = true
  backup_retention_period = var.backup_retention_days
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  multi_az               = var.multi_az
  deletion_protection    = var.environment == "prod" ? true : false
  skip_final_snapshot    = var.environment == "prod" ? false : true
  final_snapshot_identifier = var.environment == "prod" ? "${var.project}-${var.environment}-final-snapshot" : null

  performance_insights_enabled = true

  tags = {
    Name        = "${var.project}-${var.environment}-postgres"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "aws_ssm_parameter" "db_connection" {
  name        = "/${var.project}/${var.environment}/database_url"
  description = "PostgreSQL connection string for ${var.project} ${var.environment}"
  type        = "SecureString"
  value       = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/${var.db_name}"

  tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}
