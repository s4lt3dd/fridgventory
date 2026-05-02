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
  description = "ARN of the customer-managed KMS key used for storage and Secrets Manager encryption"
  type        = string
}

variable "instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "db_name" {
  type    = string
  default = "fridgecheck"
}

variable "db_username" {
  type = string
}

variable "allocated_storage" {
  type    = number
  default = 20
}

variable "backup_retention_days" {
  type    = number
  default = 7
}

variable "multi_az" {
  type    = bool
  default = false
}

variable "deletion_protection" {
  description = "Enable deletion protection. Default true; only set false for short-lived dev stacks you intend to tear down."
  type        = bool
  default     = true
}
