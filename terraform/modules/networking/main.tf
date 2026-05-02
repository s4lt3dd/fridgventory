# Lookup AWS-managed prefix list for CloudFront origin-facing ranges
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.project}-${var.environment}-vpc"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "${var.project}-${var.environment}-igw"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.project}-${var.environment}-public-${count.index + 1}"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
    tier        = "public"
  }
}

# Private Subnets
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name        = "${var.project}-${var.environment}-private-${count.index + 1}"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
    tier        = "private"
  }
}

# Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name        = "${var.project}-${var.environment}-nat-eip"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

# NAT Gateway (single for dev, one per AZ for prod)
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name        = "${var.project}-${var.environment}-nat"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }

  depends_on = [aws_internet_gateway.main]
}

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name        = "${var.project}-${var.environment}-public-rt"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Private Route Table
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name        = "${var.project}-${var.environment}-private-rt"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Route table associations
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# --- Security Groups ---
# ALB and API SGs are defined without inline rules to break the SG-to-SG
# reference cycle (alb<->api, api<->db, api<->cache). Their rules are declared
# below as standalone aws_vpc_security_group_*_rule resources, which terraform
# can sequence after both endpoints exist.
#
# Note: per AWS provider docs, an SG cannot mix inline rules with standalone
# rule resources, so when one rule on an SG is extracted, all must be.

resource "aws_security_group" "alb" {
  name_prefix = "${var.project}-${var.environment}-alb-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for Application Load Balancer (CloudFront-only ingress)"

  tags = {
    Name        = "${var.project}-${var.environment}-alb-sg"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# CloudFront origin uses http-only (see compute module aws_cloudfront_distribution
# custom_origin_config.origin_protocol_policy), so only port 80 ingress is needed.
# The CloudFront managed prefix list counts as ~55 rules per reference; doubling
# it for 80+443 would exceed the default per-SG rule quota.
resource "aws_vpc_security_group_ingress_rule" "alb_http_from_cloudfront" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTP from CloudFront edge nodes"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront.id
}

resource "aws_vpc_security_group_egress_rule" "alb_to_api" {
  security_group_id            = aws_security_group.alb.id
  description                  = "Forward to API tasks on 8000"
  ip_protocol                  = "tcp"
  from_port                    = 8000
  to_port                      = 8000
  referenced_security_group_id = aws_security_group.api.id
}

resource "aws_security_group" "api" {
  name_prefix = "${var.project}-${var.environment}-api-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for API ECS tasks"

  tags = {
    Name        = "${var.project}-${var.environment}-api-sg"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_vpc_security_group_ingress_rule" "api_from_alb" {
  security_group_id            = aws_security_group.api.id
  description                  = "From ALB"
  ip_protocol                  = "tcp"
  from_port                    = 8000
  to_port                      = 8000
  referenced_security_group_id = aws_security_group.alb.id
}

resource "aws_vpc_security_group_egress_rule" "api_https_outbound" {
  security_group_id = aws_security_group.api.id
  description       = "HTTPS to internet (ECR pulls, SSM, Secrets Manager, Open Food Facts, Anthropic)"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_egress_rule" "api_to_database" {
  security_group_id            = aws_security_group.api.id
  description                  = "Postgres to RDS"
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = aws_security_group.database.id
}

resource "aws_vpc_security_group_egress_rule" "api_to_cache" {
  security_group_id            = aws_security_group.api.id
  description                  = "Redis to ElastiCache"
  ip_protocol                  = "tcp"
  from_port                    = 6379
  to_port                      = 6379
  referenced_security_group_id = aws_security_group.cache.id
}

resource "aws_security_group" "database" {
  name_prefix = "${var.project}-${var.environment}-db-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for RDS PostgreSQL"

  ingress {
    description     = "Postgres from API tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]
  }

  tags = {
    Name        = "${var.project}-${var.environment}-db-sg"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "cache" {
  name_prefix = "${var.project}-${var.environment}-cache-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for ElastiCache Redis"

  ingress {
    description     = "Redis from API tasks"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]
  }

  tags = {
    Name        = "${var.project}-${var.environment}-cache-sg"
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}
