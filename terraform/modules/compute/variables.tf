variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "alb_security_group_id" {
  type = string
}

variable "api_security_group_id" {
  type = string
}

variable "api_image" {
  type = string
}

variable "worker_image" {
  type = string
}

variable "api_desired_count" {
  type    = number
  default = 1
}

variable "api_cpu" {
  type    = number
  default = 256
}

variable "api_memory" {
  type    = number
  default = 512
}

variable "kms_key_arn" {
  description = "Customer-managed KMS key ARN used to encrypt CloudWatch Logs and to grant decrypt to the task execution role"
  type        = string
}

variable "db_host_ssm_arn" {
  type = string
}

variable "db_port_ssm_arn" {
  type = string
}

variable "db_name_ssm_arn" {
  type = string
}

variable "db_username" {
  description = "Plain DB username (not a secret — informational env var on the task)"
  type        = string
}

variable "db_master_secret_arn" {
  description = "ARN of the RDS-managed master user secret in Secrets Manager"
  type        = string
}

variable "redis_url" {
  description = "Full Redis URL including scheme (rediss:// for TLS-enabled clusters)"
  type        = string
}

variable "secret_key_ssm_arn" {
  description = "ARN of the SSM SecureString containing the JWT secret key"
  type        = string
}

variable "acm_certificate_arn_alb" {
  description = "Regional ACM certificate ARN for the ALB HTTPS listener. If empty, ALB serves HTTP only."
  type        = string
  default     = ""
}

variable "acm_certificate_arn_cloudfront" {
  description = "us-east-1 ACM certificate ARN for the CloudFront alias. Required if custom_domain_aliases is set."
  type        = string
  default     = ""
}

variable "custom_domain_aliases" {
  description = "Custom domain aliases for the CloudFront distribution. Empty list = use default *.cloudfront.net hostname."
  type        = list(string)
  default     = []
}

variable "waf_web_acl_arn" {
  description = "ARN of a WAFv2 Web ACL (CLOUDFRONT scope) to attach to the distribution. Empty = no WAF."
  type        = string
  default     = null
}
