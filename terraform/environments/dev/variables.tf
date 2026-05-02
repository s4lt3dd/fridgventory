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
  description = "ARN of SSM SecureString parameter containing the JWT secret key (created out-of-band)"
}

variable "sns_alert_email" {
  type        = string
  default     = ""
  description = "Email for CloudWatch alerts (optional)"
}

variable "enable_waf" {
  type        = bool
  default     = false
  description = "Enable CloudFront-scoped WAF (managed rule sets + rate limiting). Off in dev by default."
}

variable "acm_certificate_arn_alb" {
  type        = string
  default     = ""
  description = "Regional ACM cert ARN for ALB HTTPS listener. Leave empty to keep HTTP-only ALB."
}

variable "acm_certificate_arn_cloudfront" {
  type        = string
  default     = ""
  description = "us-east-1 ACM cert ARN for CloudFront alias. Required if custom_domain_aliases is set."
}

variable "custom_domain_aliases" {
  type        = list(string)
  default     = []
  description = "Custom domain aliases for CloudFront. Empty = use default *.cloudfront.net hostname."
}
