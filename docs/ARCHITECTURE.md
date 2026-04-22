# FridgeCheck — Architecture

This document explains the system architecture, design decisions, scalability path, and security model for FridgeCheck.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Data Flow Diagrams](#data-flow-diagrams)
3. [Database Schema](#database-schema)
4. [Scalability Path](#scalability-path)
5. [Security Considerations](#security-considerations)
6. [Trade-offs and Decisions](#trade-offs-and-decisions)

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Clients                          │
│  Browser (PWA)  │  iOS Home Screen  │  Android Chrome   │
└────────┬────────┴──────────┬─────────┴────────┬──────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │ HTTPS
                     ┌───────▼───────┐
                     │  CloudFront   │  CDN / Edge Cache
                     │  + S3 (SPA)   │
                     └───────┬───────┘
                             │ /api/* → ALB
                     ┌───────▼───────┐
                     │  Application  │
                     │  Load Balancer│
                     └──────┬────────┘
                    ┌───────┘
          ┌─────────▼────────┐
          │   ECS Fargate    │
          │   API Service    │  (FastAPI, N tasks)
          └────┬────────┬────┘
               │        │
    ┌──────────▼──┐  ┌───▼──────────┐
    │  PostgreSQL  │  │    Redis     │
    │    (RDS)     │  │ (ElastiCache)│
    └─────────────┘  └──────────────┘
                          │
          ┌───────────────▼──────────┐
          │   ECS Fargate Worker     │
          │  (APScheduler, 1 task)   │
          └──────────────────────────┘
```

---

## Data Flow Diagrams

### 1. Adding a Pantry Item

```
Client                  API                   PostgreSQL         Redis
  │                      │                         │               │
  │  POST /api/v1/        │                         │               │
  │  households/{id}/     │                         │               │
  │  items                │                         │               │
  │──────────────────────►│                         │               │
  │                       │ Validate JWT             │               │
  │                       │◄────────────────────────┼───────────────│
  │                       │                         │               │
  │                       │ Check household          │               │
  │                       │ membership               │               │
  │                       │────────────────────────►│               │
  │                       │◄────────────────────────│               │
  │                       │                         │               │
  │                       │ Check duplicate          │               │
  │                       │ (same name in household) │               │
  │                       │────────────────────────►│               │
  │                       │◄────────────────────────│               │
  │                       │                         │               │
  │                       │ If duplicate: UPDATE qty │               │
  │                       │ If new: INSERT item      │               │
  │                       │────────────────────────►│               │
  │                       │◄────────────────────────│               │
  │                       │                         │               │
  │  201 Created          │                         │               │
  │◄──────────────────────│                         │               │
```

### 2. Expiry Notification Pipeline

```
APScheduler (Worker)        PostgreSQL              Notification
        │                       │                     System
        │  [Daily at 08:00 UTC] │                        │
        │                       │                        │
        │  SELECT items WHERE   │                        │
        │  expiry_date BETWEEN  │                        │
        │  NOW() AND NOW()+3d   │                        │
        │  AND deleted_at IS NULL│                        │
        │──────────────────────►│                        │
        │◄──────────────────────│                        │
        │                       │                        │
        │  For each user with   │                        │
        │  expiring items:      │                        │
        │  Get notification     │                        │
        │  preferences          │                        │
        │──────────────────────►│                        │
        │◄──────────────────────│                        │
        │                       │                        │
        │  Filter by user's     │                        │
        │  threshold (1d, 3d)   │                        │
        │                       │                        │
        │  Send notification    │                        │
        │  (email / push)       │───────────────────────►│
        │                       │                        │
        │  [Weekly cleanup]     │                        │
        │  DELETE items WHERE   │                        │
        │  deleted_at < NOW()-7d│                        │
        │──────────────────────►│                        │
```

### 3. Household Invitation Flow

```
Owner              API              PostgreSQL          Invitee
  │                 │                    │                 │
  │  GET /households│                    │                 │
  │  /{id}/invite   │                    │                 │
  │────────────────►│                    │                 │
  │                 │ Generate/fetch      │                 │
  │                 │ invite_token        │                 │
  │                 │ (stored on          │                 │
  │                 │ Household row)      │                 │
  │                 │───────────────────►│                 │
  │                 │◄───────────────────│                 │
  │  Shareable URL  │                    │                 │
  │◄────────────────│                    │                 │
  │                 │                    │                 │
  │  Shares URL via │                    │                 │
  │  WhatsApp, etc. │                    │                 │
  │─────────────────┼────────────────────┼────────────────►│
  │                 │                    │                 │
  │                 │  POST /households  │                 │
  │                 │  /join             │                 │
  │                 │◄────────────────────────────────────│
  │                 │                    │                 │
  │                 │ Lookup household   │                 │
  │                 │ by invite_token    │                 │
  │                 │───────────────────►│                 │
  │                 │◄───────────────────│                 │
  │                 │                    │                 │
  │                 │ INSERT into        │                 │
  │                 │ household_members  │                 │
  │                 │ role='member'      │                 │
  │                 │───────────────────►│                 │
  │                 │◄───────────────────│                 │
  │                 │                    │                 │
  │                 │  200 OK + household│                 │
  │                 │────────────────────┼────────────────►│
```

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    username    VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Households
CREATE TABLE households (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(255) NOT NULL,
    invite_token VARCHAR(64) UNIQUE NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-many: Users <-> Households
CREATE TABLE household_members (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role         VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'member')),
    joined_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(household_id, user_id)
);

-- Pantry items
CREATE TABLE pantry_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    category     VARCHAR(50) NOT NULL,
    quantity     NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit         VARCHAR(50) NOT NULL DEFAULT 'pieces',
    added_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date  DATE NOT NULL,
    added_by     UUID NOT NULL REFERENCES users(id),
    notes        TEXT,
    deleted_at   TIMESTAMPTZ,        -- soft delete
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Notification preferences (one per user)
CREATE TABLE notification_preferences (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    days_before_expiry  JSONB NOT NULL DEFAULT '[1, 3]',
    email_enabled       BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh tokens (for JWT rotation)
CREATE TABLE refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pantry_items_household ON pantry_items(household_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pantry_items_expiry ON pantry_items(expiry_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_household_members_user ON household_members(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
```

---

## Scalability Path

### Current State (10–100 households)

The current architecture is a single-instance monolith deployed on ECS Fargate with a single RDS instance and a single Redis node. This is intentionally simple and costs roughly £30–50/month.

The system handles this load comfortably. A single Fargate task (0.5 vCPU, 512MB) can handle ~500 req/s with async FastAPI.

### Path to 10,000 households

**API scaling (horizontal):**
```
Current:  1 Fargate task
→ Scale:  Auto-scaling group (2–10 tasks based on CPU/request count)
          ALB distributes traffic evenly
          ECS Service Auto Scaling with target tracking
```

**Database connection pooling:**
```
Current:  SQLAlchemy connection pool (max 20 connections)
→ Add:    PgBouncer sidecar or RDS Proxy
          This prevents connection exhaustion under high concurrency
          RDS Proxy adds ~1ms latency but allows thousands of clients
```

**Redis:**
```
Current:  Single ElastiCache node
→ Scale:  ElastiCache cluster mode (multiple shards)
          Session tokens and rate limit counters shard well by user ID
```

**Background worker:**
```
Current:  Single Fargate task, APScheduler in-process
→ Split:  Dedicated worker service
          Multiple workers consuming from a Redis queue (Celery)
          Each household's expiry check becomes an independent task
```

### Path to 100,000 households

**Database read replicas:**
```
Write path: Primary RDS instance (all mutations)
Read path:  Read replica(s) for:
            - List pantry items
            - Recipe suggestions queries
            - Household member lookups

SQLAlchemy routing: custom Session that routes SELECTs to replica
```

**Caching strategy for recipe suggestions:**
```
Recipe suggestions for a household change infrequently (when items are
added/removed near expiry). Cache key: household_id + expiring_item_ids_hash.

Redis TTL: 1 hour. Invalidate on item create/update/delete.

For the external TheMealDB API, cache results by ingredient at the
application level (Redis, TTL 24h) to avoid hammering the free API.
```

**Event-driven migration path:**
```
Current:  Polling-based worker (APScheduler, daily scan of all items)
Problem:  At 100k households, daily scan is slow and expensive

→ Migrate to pub/sub:
  1. On item CREATE/UPDATE, publish event to Redis Streams or SQS
  2. Worker consumes events, schedules notification jobs per item
  3. Use scheduled SQS DelayedMessage for exact notification timing
  4. Eliminates full-table scans entirely

This migration is backwards-compatible — run both systems in parallel
during rollout.
```

**CDN and edge:**
```
All static assets (React SPA) already served from CloudFront.
Add: CloudFront caching for API responses where safe (recipe suggestions,
     household info with short TTL).
```

**Multi-region:**
```
At 100k+ households across multiple continents:
- Route 53 latency-based routing to regional ALBs
- RDS Global Database for cross-region replication
- ElastiCache Global Datastore
- S3 + CloudFront already globally distributed
```

---

## Security Considerations

### Authentication

- **JWT access tokens**: Short-lived (30 minutes), signed with HS256. Stored in memory (React state), not localStorage for the access token.
- **Refresh token rotation**: Each refresh request rotates the refresh token. Old token is revoked in DB. Prevents token theft from going undetected.
- **Refresh tokens**: Stored in httpOnly cookies in production (not covered in this implementation — marked as future work). Currently stored in localStorage as a pragmatic tradeoff.
- **Token storage in Redis**: Active refresh tokens cached in Redis for O(1) lookup and instant revocation.

### Input Validation

- All request bodies validated via Pydantic v2 models — type coercion, length limits, regex validation.
- Path parameters validated by FastAPI (UUID format enforced).
- No raw SQL — SQLAlchemy ORM prevents SQL injection.
- XSS: React escapes all rendered content by default. No `dangerouslySetInnerHTML`.

### Rate Limiting

Sliding window algorithm implemented in Redis:

```python
# Per IP, 100 requests per 60 seconds
key = f"rate_limit:{client_ip}"
current = redis.incr(key)
if current == 1:
    redis.expire(key, 60)
if current > 100:
    raise HTTPException(429)
```

Separate stricter limits on auth endpoints (5 attempts/minute) to prevent brute force.

### Invitation Tokens

- Generated as `secrets.token_urlsafe(32)` — 256 bits of entropy.
- No expiry by default (design choice: households share these via chat apps, expiry would be annoying). Owners can **regenerate** the token, which instantly invalidates all previous links.
- Tokens are stored hashed in production (future work — currently stored plain in the database, acceptable for this use case since the token only grants `member` access, not `owner`).

### CORS Policy

```python
allow_origins = settings.cors_origins  # Explicit list, not "*"
allow_credentials = True
allow_methods = ["GET", "POST", "PATCH", "DELETE"]
allow_headers = ["Authorization", "Content-Type"]
```

In production, `cors_origins` should be set to `["https://yourdomain.com"]`.

### Secrets Management

- All secrets injected via environment variables (12-factor).
- In AWS: secrets stored in SSM Parameter Store (SecureString), injected into ECS task definitions at runtime.
- Secret rotation: DATABASE_URL and SECRET_KEY can be rotated by updating SSM parameters and redeploying tasks.
- `.env` file is gitignored. `.env.example` has no real values.

### Soft Deletes

Items are soft-deleted (set `deleted_at`) rather than hard-deleted. Hard deletion happens after 7 days via the background worker. This prevents:
- Accidental data loss from mis-taps
- Race conditions where a deletion races with a read

---

## Trade-offs and Decisions

### FastAPI over Django

**Chose FastAPI because:**
- Native async support — the expiry worker, recipe API calls, and DB queries benefit from async I/O
- Automatic OpenAPI/Swagger generation from type hints — no extra work for documentation
- Pydantic v2 integration is first-class and performant
- Lighter weight — less "magic", easier to reason about
- Faster startup time (relevant for Lambda/Fargate cold starts)

**Django would be better if:**
- We needed the Django admin panel (useful for ops teams)
- The team was already Django-experienced
- We needed Django's ORM migrations ecosystem (Alembic is good but Django migrations are more mature)

### PostgreSQL over MongoDB

**Chose PostgreSQL because:**
- The data model is highly relational: Users ↔ Households ↔ Items with role-based access
- ACID transactions matter (e.g., creating a household and its first owner membership atomically)
- JSONB available for notification preferences (best of both worlds)
- Mature tooling, backups, read replicas
- The query patterns (filter by household, sort by date) suit a relational model perfectly

**MongoDB would be better if:**
- Items had wildly varying schemas per household (they don't)
- We needed horizontal write scaling from day one

### Redis over RabbitMQ

**Chose Redis because:**
- Already needed Redis for caching and rate limiting — avoiding a second dependency
- APScheduler with Redis job store is sufficient for the expiry notification pattern (one daily job, not high-throughput messaging)
- Simpler ops — one fewer service to monitor and maintain

**RabbitMQ/SQS would be better if:**
- We needed message durability guarantees stronger than Redis AOF
- We needed complex routing/fanout patterns
- At scale, the event-driven migration path (documented above) would use SQS

### Soft Deletes over Hard Deletes

See [Security Considerations — Soft Deletes](#soft-deletes). The 7-day cleanup window gives users a recovery window while keeping the database clean.

### APScheduler over Celery

**Chose APScheduler because:**
- Simpler setup — runs in-process, no separate worker process to manage
- Sufficient for daily batch jobs
- Celery adds significant complexity (separate broker config, worker scaling, task serialisation)

**Celery would be better at scale** (see Scalability Path above) where individual notifications need to be fanned out as independent tasks.

### Repository Pattern

Business logic in services, data access in repositories — never in route handlers. This:
- Makes testing easy (mock the repository, test the service)
- Separates concerns cleanly
- Makes it easy to swap the data store (e.g., add a read replica)
- Prevents "fat controller" anti-pattern

```
Route handler → validates input, calls service
Service       → business logic, calls repository
Repository    → database queries only, no business logic
```
