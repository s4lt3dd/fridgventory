# backend/CLAUDE.md — FastAPI service

Module-specific guidance. The root `CLAUDE.md` covers the project at large.

---

## Stack

- **Python 3.11**, FastAPI 0.111, Pydantic v2, SQLAlchemy 2 (async), asyncpg
- **Auth**: passlib[bcrypt] + python-jose JWT (HS256), refresh-token rotation
- **Background jobs**: APScheduler 3.10 (in-process, in the `worker` container)
- **HTTP client**: httpx (for outbound — Open Food Facts, Anthropic SDK)
- **Logging**: structlog, JSON-ish output
- **Build**: hatchling (`[tool.hatch.build.targets.wheel] packages = ["app"]`)
- **Lint/type**: ruff, mypy strict, pytest + pytest-asyncio (asyncio_mode = "auto")

## Layered architecture

Strict layering — do not skip layers:

```
route (api/v1/routes/*.py)
  → service (services/*.py)         business logic, transactions, auth checks
    → repository (repositories/*.py) SQL queries, no business logic
      → model (models/*.py)          ORM mappings only
```

Cross-cutting:
- `schemas/*.py` — Pydantic request/response types. Routes consume + return these. Services may accept them but should generally take primitives + return ORM models or DTOs.
- `dependencies.py` — `get_current_user`, `require_household_member`, etc. Composed via `Depends(...)` in routes.
- `database.py` — `Base`, async `engine`, `async_session`, `get_db()` async generator dependency.
- `config.py` — `Settings` class (pydantic-settings). All env vars go here, accessed via `from app.config import settings`.

### Why this layering

- Repositories return ORM objects or primitives. They never raise HTTP errors and don't know about FastAPI.
- Services raise domain exceptions (e.g. `HouseholdError`); routes translate those to `HTTPException`.
- Routes are thin — auth deps + service call + response shaping. Avoid putting query logic directly in route bodies.

## Where each thing goes

| You're adding... | Touch these |
|------------------|-------------|
| A new resource (e.g. shopping lists) | `models/`, `repositories/`, `services/`, `schemas/`, `api/v1/routes/`, register router in `api/v1/__init__.py`, new Alembic migration |
| A new field on an existing model | `models/<x>.py`, related schema in `schemas/`, new Alembic migration, repository update if it filters/sorts by the field |
| A new endpoint on existing resource | route + service + schema; repository may not need changes |
| Background job | `workers/<x>_worker.py`, register in `main.py` lifespan or `workers/__init__.py` |
| External API call | A new client wrapper (style: see future versions of `services/rescue_recipe_service.py` for the AsyncAnthropic pattern). Use httpx for plain HTTP. Always set a timeout. |

## Models — current schema

| Table | Notes |
|-------|-------|
| `users` | UUID PK, email unique, username unique, hashed_password, is_active/is_verified |
| `households` | UUID PK, name, `invite_token` (unique, 64-char) |
| `household_members` | (household_id, user_id) unique; `role` enum `owner` / `member` |
| `pantry_items` | UUID PK, household_id, name, `category` enum (12 values), quantity float, unit, added_date, expiry_date (indexed), added_by, **soft-delete via `deleted_at`** |
| `notification_preferences` | one-per-user, JSONB `days_before_expiry` (default `[1, 3]`), email_enabled |
| `refresh_tokens` | user_id, token (unique), expires_at, revoked_at |

Partial indexes on `pantry_items` for `WHERE deleted_at IS NULL` — prefer those for "active items" queries.

## Migrations

```bash
# Generate (autogenerate diff against models)
docker compose exec api alembic revision --autogenerate -m "add foo to bar"

# Apply
docker compose exec api alembic upgrade head

# Roll back one
docker compose exec api alembic downgrade -1
```

### Migration rules

1. **Never edit `0001_initial.py`** after the first deploy. New schema = new migration file.
2. Enum types are created via raw SQL (`op.execute("CREATE TYPE ...")`). To add a value: `op.execute("ALTER TYPE foo_enum ADD VALUE 'bar'")` in a new migration. PostgreSQL doesn't support removing enum values cleanly — plan accordingly.
3. The Alembic env converts `postgresql://` → `postgresql+asyncpg://` and runs migrations on the async engine. If you add `psycopg2`-only constructs they'll likely still work since Alembic uses the `op` interface, not the async session — but test it.
4. Autogenerate doesn't catch enum value additions, server-default changes, or check constraints. Verify the generated file by hand.

## Auth, briefly

- `POST /api/v1/auth/register` → creates user + initial `notification_preferences` row, returns access + refresh tokens
- `POST /api/v1/auth/login` → email/password → tokens
- `POST /api/v1/auth/refresh` → swap refresh token for new pair (old one revoked)
- `POST /api/v1/auth/logout` → revoke refresh token server-side
- `GET /api/v1/auth/me` → current user (uses access token)

JWT: HS256, 15-min access tokens, 30-day refresh tokens. Settings: `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`.

`get_current_user` decodes the access token and loads the user. `require_household_member(household_id)` is composed on top — use it on every household-scoped route.

## Adding a route — the recipe

1. **Schema** in `schemas/<resource>.py` — `XxxCreate`, `XxxUpdate`, `XxxResponse`. Use `Field(..., description=...)` so OpenAPI is useful.
2. **Repository method** in `repositories/<resource>_repository.py` — pure data access. Take a `db: AsyncSession`. Return ORM objects.
3. **Service method** in `services/<resource>_service.py` — orchestrates the repo, enforces auth/business rules, raises domain errors. Wrap the service in a class that takes `db` in `__init__`.
4. **Route** in `api/v1/routes/<resource>.py` — thin wrapper. Use `response_model=`. Compose dependencies. Translate service exceptions to `HTTPException`.
5. **Test** in `tests/test_<resource>.py` — at least one happy-path + one auth/permission failure.

## Outbound calls

- **Open Food Facts** is called from the **frontend** today (no backend wrapper). If you ever need server-side lookup, put it in `services/`, use `httpx.AsyncClient` with a 5s timeout, and don't fail the user request on 5xx — degrade gracefully.
- **Anthropic Claude** is called from `services/rescue_recipe_service.py` only. Pattern:
  ```python
  from anthropic import AsyncAnthropic
  client = AsyncAnthropic(api_key=settings.anthropic_api_key)
  msg = await client.messages.create(
      model="claude-sonnet-4-20250514",
      max_tokens=2048,
      system=SYSTEM_PROMPT,
      messages=[{"role": "user", "content": user_prompt}],
  )
  ```
  - Strip code-fences from `msg.content[0].text` before `json.loads`.
  - Validate against the Pydantic response schema. On parse error → 502.
  - On `anthropic.APIError` → 502 with generic message + `logger.exception(...)`.
  - If `settings.anthropic_api_key` is empty → 503 ("not configured").
  - Cache the response in Redis keyed by `rescue_recipes:{household_id}:{hash_of_sorted_item_ids}`, TTL 600s. Best-effort: log and skip on Redis failure, never fail the user request because of cache.

## Testing patterns

`tests/conftest.py` provides:
- `db` fixture — async session inside a transaction that rolls back on teardown
- `client` fixture — `httpx.AsyncClient` against the FastAPI app with `app.dependency_overrides[get_db] = ...`
- `auth_headers` fixture — registers a user and returns `Authorization: Bearer ...`

Idiom:
```python
async def test_create_household(client, auth_headers):
    resp = await client.post("/api/v1/households", json={"name": "Smiths"}, headers=auth_headers)
    assert resp.status_code == 201
    assert resp.json()["name"] == "Smiths"
```

Don't share state across tests. Don't `commit()` in tests — let the rollback handle it.

## Logging

```python
import structlog
logger = structlog.get_logger(__name__)

logger.info("household.created", household_id=str(h.id), user_id=str(user.id))
logger.exception("recipe_service.anthropic_error")  # auto-captures exc_info
```

- Snake-case event names, dot-namespaced (`<module>.<event>`).
- Pass structured kwargs, not f-strings.
- Never log secrets, tokens, passwords, or full request bodies.

## Performance notes

- Always paginate list endpoints (current code uses default 50 limit — see `item_service.get_household_items`).
- `selectinload` for collections you'll iterate. `joinedload` for to-one relationships you need eagerly. Avoid implicit lazy loads in async sessions — they'll error.
- Soft-delete on `pantry_items` means **every query must filter `deleted_at IS NULL`** unless you explicitly want deleted rows. Repository helpers do this; if you write raw queries, don't forget.

## Style + tooling

```bash
docker compose exec api ruff check backend/
docker compose exec api ruff format backend/
docker compose exec api mypy backend/app/
```

CI runs all three. mypy is `strict = true` — public functions need full type annotations.

## Don't do this

- ❌ Database access from a route directly. Always go through a service.
- ❌ Business logic in a repository. Repositories are SQL only.
- ❌ Catching bare `Exception` in a service to translate to `HTTPException` — let specific exceptions through, use a service-level domain error class for the cases you actually want to translate.
- ❌ Synchronous DB calls. Everything is async.
- ❌ Hard-coded secrets. Use `settings.foo` and add the field to `Settings`.
- ❌ Logging passwords, tokens, or request bodies. Especially refresh tokens.
- ❌ Using `print()`. Use structlog.
