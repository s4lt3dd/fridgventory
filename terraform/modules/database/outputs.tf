output "db_endpoint" {
  description = "Connection endpoint of the RDS instance"
  value       = aws_db_instance.main.endpoint
}

output "db_name" {
  description = "Name of the PostgreSQL database"
  value       = aws_db_instance.main.db_name
}

output "db_port" {
  description = "Port on which the database listens"
  value       = aws_db_instance.main.port
}

output "db_connection_ssm_arn" {
  description = "ARN of the SSM parameter storing the database connection string"
  value       = aws_ssm_parameter.db_connection.arn
}
