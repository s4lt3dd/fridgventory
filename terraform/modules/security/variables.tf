variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "enable_waf" {
  description = "Provision a CloudFront-scoped WAF Web ACL with AWS managed rule sets + rate limiting"
  type        = bool
  default     = false
}

variable "waf_rate_limit_per_5min" {
  description = "Rate-based rule threshold: requests per 5-minute window per source IP before blocking"
  type        = number
  default     = 2000
}
