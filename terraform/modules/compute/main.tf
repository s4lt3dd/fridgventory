data "aws_region" "current" {}
data "aws_caller_identity" "current" {}
data "aws_elb_service_account" "current" {}

locals {
  has_alb_cert        = var.acm_certificate_arn_alb != ""
  has_cloudfront_cert = var.acm_certificate_arn_cloudfront != "" && length(var.custom_domain_aliases) > 0
  origin_protocol     = local.has_alb_cert ? "https-only" : "http-only"
}

# --- ECS Cluster ---
resource "aws_ecs_cluster" "main" {
  name = "${var.project}-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "${var.project}-${var.environment}-cluster"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

# --- IAM Roles ---
data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "task_execution" {
  name               = "${var.project}-${var.environment}-task-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json

  tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "aws_iam_role_policy_attachment" "task_execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "task_execution_secrets" {
  name = "${var.project}-${var.environment}-secrets-read"
  role = aws_iam_role.task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadSSMParams"
        Effect = "Allow"
        Action = ["ssm:GetParameters", "ssm:GetParameter"]
        Resource = [
          var.db_host_ssm_arn,
          var.db_port_ssm_arn,
          var.db_name_ssm_arn,
          var.secret_key_ssm_arn,
        ]
      },
      {
        Sid      = "ReadDBMasterSecret"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
        Resource = [var.db_master_secret_arn]
      },
      {
        Sid      = "DecryptWithCMK"
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = [var.kms_key_arn]
      }
    ]
  })
}

resource "aws_iam_role" "task" {
  name               = "${var.project}-${var.environment}-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json

  tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

# --- CloudWatch Log Groups (encrypted with CMK) ---
resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${var.project}-${var.environment}/api"
  retention_in_days = 30
  kms_key_id        = var.kms_key_arn

  tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "aws_cloudwatch_log_group" "worker" {
  name              = "/ecs/${var.project}-${var.environment}/worker"
  retention_in_days = 30
  kms_key_id        = var.kms_key_arn

  tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

# --- API Task Definition ---
# DB password is pulled from the RDS-managed Secrets Manager secret using a JSON pointer.
# DB_HOST/PORT/NAME come from SSM. Backend assembles DATABASE_URL at startup.
resource "aws_ecs_task_definition" "api" {
  family                   = "${var.project}-${var.environment}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = var.api_image
      essential = true

      portMappings = [
        { containerPort = 8000, protocol = "tcp" }
      ]

      secrets = [
        { name = "DB_HOST",     valueFrom = var.db_host_ssm_arn },
        { name = "DB_PORT",     valueFrom = var.db_port_ssm_arn },
        { name = "DB_NAME",     valueFrom = var.db_name_ssm_arn },
        { name = "DB_PASSWORD", valueFrom = "${var.db_master_secret_arn}:password::" },
        { name = "SECRET_KEY",  valueFrom = var.secret_key_ssm_arn },
      ]

      environment = [
        { name = "DB_USER",     value = var.db_username },
        { name = "REDIS_URL",   value = var.redis_url },
        { name = "ENVIRONMENT", value = var.environment },
        { name = "DEBUG",       value = "false" },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "api"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "python -c \"import httpx; httpx.get('http://localhost:8000/health').raise_for_status()\""]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

# --- Worker Task Definition ---
resource "aws_ecs_task_definition" "worker" {
  family                   = "${var.project}-${var.environment}-worker"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "worker"
      image     = var.worker_image
      essential = true

      secrets = [
        { name = "DB_HOST",     valueFrom = var.db_host_ssm_arn },
        { name = "DB_PORT",     valueFrom = var.db_port_ssm_arn },
        { name = "DB_NAME",     valueFrom = var.db_name_ssm_arn },
        { name = "DB_PASSWORD", valueFrom = "${var.db_master_secret_arn}:password::" },
        { name = "SECRET_KEY",  valueFrom = var.secret_key_ssm_arn },
      ]

      environment = [
        { name = "DB_USER",     value = var.db_username },
        { name = "REDIS_URL",   value = var.redis_url },
        { name = "ENVIRONMENT", value = var.environment },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.worker.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "worker"
        }
      }
    }
  ])

  tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

# --- ALB access logs bucket ---
resource "aws_s3_bucket" "alb_logs" {
  bucket        = "${var.project}-${var.environment}-alb-logs"
  force_destroy = var.environment != "prod"

  tags = {
    Name        = "${var.project}-${var.environment}-alb-logs"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "aws_s3_bucket_public_access_block" "alb_logs" {
  bucket                  = aws_s3_bucket.alb_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id
  rule {
    id     = "expire-old-logs"
    status = "Enabled"
    filter {}
    expiration {
      days = var.environment == "prod" ? 90 : 30
    }
  }
}

data "aws_iam_policy_document" "alb_logs" {
  statement {
    sid     = "AllowELBToWriteAccessLogs"
    actions = ["s3:PutObject"]
    principals {
      type        = "AWS"
      identifiers = [data.aws_elb_service_account.current.arn]
    }
    # ALB prepends the access_logs.prefix ("alb") before the AWSLogs/<account>/ path.
    resources = ["${aws_s3_bucket.alb_logs.arn}/alb/AWSLogs/${data.aws_caller_identity.current.account_id}/*"]
  }
}

resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id
  policy = data.aws_iam_policy_document.alb_logs.json
}

# --- ALB ---
resource "aws_lb" "main" {
  name               = "${var.project}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  drop_invalid_header_fields = true

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    enabled = true
    prefix  = "alb"
  }

  tags = {
    Name        = "${var.project}-${var.environment}-alb"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }

  depends_on = [aws_s3_bucket_policy.alb_logs]
}

resource "aws_lb_target_group" "api" {
  name        = "${var.project}-${var.environment}-api-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Port 80 listener: redirect to HTTPS when cert is configured, otherwise forward.
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  dynamic "default_action" {
    for_each = local.has_alb_cert ? [1] : []
    content {
      type = "redirect"
      redirect {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }

  dynamic "default_action" {
    for_each = local.has_alb_cert ? [] : [1]
    content {
      type             = "forward"
      target_group_arn = aws_lb_target_group.api.arn
    }
  }
}

# Port 443 listener (only when ACM cert configured).
resource "aws_lb_listener" "https" {
  count             = local.has_alb_cert ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn_alb

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

# --- ECS Services ---
resource "aws_ecs_service" "api" {
  name            = "${var.project}-${var.environment}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.api_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [var.api_security_group_id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8000
  }

  tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }

  depends_on = [aws_lb_listener.http]
}

resource "aws_ecs_service" "worker" {
  name            = "${var.project}-${var.environment}-worker"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [var.api_security_group_id]
  }

  tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

# --- S3 frontend bucket ---
resource "aws_s3_bucket" "frontend" {
  bucket        = "${var.project}-${var.environment}-frontend"
  force_destroy = var.environment != "prod"

  tags = {
    Name        = "${var.project}-${var.environment}-frontend"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_cloudfront_origin_access_identity" "frontend" {
  comment = "${var.project} ${var.environment} frontend OAI"
}

data "aws_iam_policy_document" "frontend_s3" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]
    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.frontend.iam_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.frontend_s3.json
}

# --- CloudFront access logs bucket ---
resource "aws_s3_bucket" "cloudfront_logs" {
  bucket        = "${var.project}-${var.environment}-cloudfront-logs"
  force_destroy = var.environment != "prod"

  tags = {
    Name        = "${var.project}-${var.environment}-cloudfront-logs"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "aws_s3_bucket_public_access_block" "cloudfront_logs" {
  bucket                  = aws_s3_bucket.cloudfront_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "cloudfront_logs" {
  bucket = aws_s3_bucket.cloudfront_logs.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cloudfront_logs" {
  bucket = aws_s3_bucket.cloudfront_logs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "cloudfront_logs" {
  bucket = aws_s3_bucket.cloudfront_logs.id
  rule {
    id     = "expire-old-logs"
    status = "Enabled"
    filter {}
    expiration {
      days = var.environment == "prod" ? 90 : 30
    }
  }
}

# --- CloudFront distribution ---
resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  aliases = local.has_cloudfront_cert ? var.custom_domain_aliases : []

  web_acl_id = var.waf_web_acl_arn

  logging_config {
    bucket          = aws_s3_bucket.cloudfront_logs.bucket_domain_name
    include_cookies = false
    prefix          = "cloudfront/"
  }

  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "s3-frontend"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.frontend.cloudfront_access_identity_path
    }
  }

  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "alb-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = local.origin_protocol
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "alb-api"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "X-Correlation-ID"]
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-frontend"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = !local.has_cloudfront_cert
    acm_certificate_arn            = local.has_cloudfront_cert ? var.acm_certificate_arn_cloudfront : null
    ssl_support_method             = local.has_cloudfront_cert ? "sni-only" : null
    minimum_protocol_version       = local.has_cloudfront_cert ? "TLSv1.2_2021" : "TLSv1"
  }

  tags = {
    Name        = "${var.project}-${var.environment}-cdn"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}
