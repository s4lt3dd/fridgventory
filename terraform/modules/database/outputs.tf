output "db_endpoint" {
  description = "Connection endpoint of the RDS instance (host:port)"
  value       = aws_db_instance.main.endpoint
}

output "db_address" {
  description = "Hostname of the RDS instance (without port)"
  value       = aws_db_instance.main.address
}

output "db_name" {
  value = aws_db_instance.main.db_name
}

output "db_port" {
  value = aws_db_instance.main.port
}

output "db_username" {
  value = aws_db_instance.main.username
}

output "master_user_secret_arn" {
  description = "ARN of the RDS-managed master user secret in Secrets Manager"
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
}

output "db_host_ssm_arn" {
  value = aws_ssm_parameter.db_host.arn
}

output "db_port_ssm_arn" {
  value = aws_ssm_parameter.db_port.arn
}

output "db_name_ssm_arn" {
  value = aws_ssm_parameter.db_name.arn
}
