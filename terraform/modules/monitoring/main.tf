# --- SNS Topic for Alerts ---
resource "aws_sns_topic" "alerts" {
  name = "${var.project}-${var.environment}-alerts"

  tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.sns_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.sns_email
}

# --- CloudWatch Alarms ---
resource "aws_cloudwatch_metric_alarm" "api_cpu_high" {
  alarm_name          = "${var.project}-${var.environment}-api-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "API CPU utilization above 80%"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.api_service_name
  }

  tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_memory_high" {
  alarm_name          = "${var.project}-${var.environment}-api-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "API memory utilization above 80%"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.api_service_name
  }

  tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${var.project}-${var.environment}-alb-5xx-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB 5xx error rate above threshold"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

# --- CloudWatch Dashboard ---
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project}-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title = "API CPU & Memory"
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", var.ecs_cluster_name, "ServiceName", var.api_service_name],
            ["AWS/ECS", "MemoryUtilization", "ClusterName", var.ecs_cluster_name, "ServiceName", var.api_service_name],
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title = "API Request Count"
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix],
            ["AWS/ApplicationELB", "HTTPCode_ELB_5XX_Count", "LoadBalancer", var.alb_arn_suffix],
          ]
          period = 300
          stat   = "Sum"
          region = data.aws_region.current.name
        }
      }
    ]
  })
}

data "aws_region" "current" {}
