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

# Master credentials managed by RDS — secret materialised in Secrets Manager,
# encrypted with the customer-managed KMS key. Password never enters Terraform state.
resource "aws_db_instance" "main" {
  identifier        = "${var.project}-${var.environment}-postgres"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = var.instance_class
  allocated_storage = var.allocated_storage

  db_name  = var.db_name
  username = var.db_username

  manage_master_user_password   = true
  master_user_secret_kms_key_id = var.kms_key_arn

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.security_group_id]

  storage_encrypted       = true
  kms_key_id              = var.kms_key_arn
  backup_retention_period = var.backup_retention_days
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  multi_az                  = var.multi_az
  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = var.environment == "prod" ? false : true
  final_snapshot_identifier = var.environment == "prod" ? "${var.project}-${var.environment}-final-snapshot" : null

  performance_insights_enabled    = true
  performance_insights_kms_key_id = var.kms_key_arn

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name        = "${var.project}-${var.environment}-postgres"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Plain (non-secret) connection metadata for the application. Password is NOT here —
# the container reads it from Secrets Manager at boot.
resource "aws_ssm_parameter" "db_host" {
  name  = "/${var.project}/${var.environment}/db/host"
  type  = "String"
  value = aws_db_instance.main.address

  tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "aws_ssm_parameter" "db_port" {
  name  = "/${var.project}/${var.environment}/db/port"
  type  = "String"
  value = tostring(aws_db_instance.main.port)

  tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "aws_ssm_parameter" "db_name" {
  name  = "/${var.project}/${var.environment}/db/name"
  type  = "String"
  value = aws_db_instance.main.db_name

  tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}
