variable "project" {
  description = "Project name used for resource naming and tagging"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for the ALB"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "Security group ID for the ALB"
  type        = string
}

variable "api_security_group_id" {
  description = "Security group ID for API ECS tasks"
  type        = string
}

variable "api_image" {
  description = "Docker image URI for the API service"
  type        = string
}

variable "worker_image" {
  description = "Docker image URI for the worker service"
  type        = string
}

variable "api_desired_count" {
  description = "Desired number of API tasks"
  type        = number
  default     = 1
}

variable "api_cpu" {
  description = "CPU units for the API task (1 vCPU = 1024)"
  type        = number
  default     = 256
}

variable "api_memory" {
  description = "Memory in MiB for the API task"
  type        = number
  default     = 512
}

variable "database_url_ssm_arn" {
  description = "ARN of the SSM parameter containing DATABASE_URL"
  type        = string
}

variable "redis_url" {
  description = "Redis connection URL"
  type        = string
}

variable "secret_key_ssm_arn" {
  description = "ARN of the SSM parameter containing the JWT secret key"
  type        = string
}
