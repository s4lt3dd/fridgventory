variable "project" {
  type    = string
  default = "fridgecheck"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "db_username" {
  type    = string
  default = "fridgecheck"
}

variable "api_image" {
  type        = string
  description = "Docker image for the API service"
}

variable "worker_image" {
  type        = string
  description = "Docker image for the worker service"
}

variable "api_desired_count" {
  type    = number
  default = 1
}

variable "secret_key_ssm_arn" {
  type        = string
  description = "ARN of SSM parameter containing the JWT secret key"
}

variable "sns_alert_email" {
  type        = string
  default     = ""
  description = "Email for CloudWatch alerts (optional)"
}
