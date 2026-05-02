variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "project" {
  type    = string
  default = "fridgecheck"
}

variable "state_bucket" {
  type    = string
  default = "fridgecheck-terraform-state"
}

variable "lock_table" {
  type    = string
  default = "fridgecheck-terraform-locks"
}

variable "github_repo" {
  type        = string
  default     = "s4lt3dd/fridgventory"
  description = "GitHub repo in OWNER/REPO form. Used in the OIDC trust subject."
}
