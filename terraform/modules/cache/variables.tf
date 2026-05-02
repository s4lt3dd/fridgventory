variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "security_group_id" {
  type = string
}

variable "kms_key_arn" {
  description = "ARN of the customer-managed KMS key used for at-rest encryption"
  type        = string
}

variable "node_type" {
  type    = string
  default = "cache.t3.micro"
}

variable "num_cache_clusters" {
  description = "Number of cache nodes in the replication group (>=2 enables Multi-AZ + automatic failover)"
  type        = number
  default     = 1
}
