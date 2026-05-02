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
