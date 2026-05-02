output "kms_key_arn" {
  description = "ARN of the customer-managed KMS key"
  value       = aws_kms_key.main.arn
}

output "kms_key_id" {
  description = "ID of the customer-managed KMS key"
  value       = aws_kms_key.main.key_id
}

output "kms_alias_name" {
  value = aws_kms_alias.main.name
}

output "waf_web_acl_arn" {
  description = "ARN of the CloudFront WAF Web ACL (null if WAF disabled)"
  value       = var.enable_waf ? aws_wafv2_web_acl.cloudfront[0].arn : null
}
