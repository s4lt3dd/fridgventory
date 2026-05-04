# CLAUDE.md — FridgeCheck

Operational context for Claude Code sessions. Read this before any non-trivial work.

For module-specific guidance see:
- `backend/CLAUDE.md` — FastAPI app, models, services, migrations
- `frontend/CLAUDE.md` — React app, design system, hooks, conventions

For the **current roadmap and prioritisation** — what to build next, the 2-month app-store launch order, the auth migration plan, resolved decisions — see [`docs/research/PLAN.md`](docs/research/PLAN.md). It is the source of truth for sequencing and supersedes any older sequencing notes elsewhere in the repo. Historical Q&A behind those decisions is archived in [`docs/research/archive/`](docs/research/archive/).

---

## What FridgeCheck is

A pantry-tracking SaaS aimed at reducing household food waste. Users register, create or join a household, log pantry items with expiry dates, and get warned before things go off. Two AI-flavoured features:

- **Barcode scanning** at item add: ZXing-in-the-browser → Open Food Facts → auto-prefill name, category, sensible default expiry.
- **Rescue Recipes**: when 3+ items expire within 3 days, Claude (`claude-sonnet-4-20250514`) suggests recipes that use up exactly those items. Backend-proxied; the API key never reaches the browser.

The product framing is "save the average UK household £730/year of binned food" — that figure shows up in marketing copy on the landing page and the README. Don't change it without source.

## High-level architecture

```
Browser ─┐
         │  http://localhost (dev) → nginx → /api/* → api:8000 (FastAPI)
         │                                  /       → frontend:5173 (Vite dev) / static (prod)
         │
         │  api ↔ postgres (asyncpg)
         │  api ↔ redis (cache, rate limit, rescue-recipe cache)
         │  worker (APScheduler) ↔ postgres + redis  — periodic expiry-notification job
```

| Layer | Tech | Notes |
|-------|------|-------|
| API | FastAPI 0.111, Pydantic v2, async SQLAlchemy 2 | Python 3.11, hatchling build, structlog logging |
| DB | PostgreSQL 16 | Alembic migrations under `backend/migrations/versions/` |
| Cache/queue | Redis 7 | Best-effort cache for rescue recipes (10-min TTL); refresh-token storage; rate limiting |
| Worker | APScheduler 3.10 | Single-process in-container scheduler — no separate broker |
| Frontend | React 18 + TS + Vite + Tailwind | TanStack Query for server state, react-router-dom v6 |
| Reverse proxy | nginx | Routes `/api/*` to api, everything else to frontend |
| Infra | Docker Compose (dev), Terraform on AWS (prod) | ECS Fargate target |
| CI | GitHub Actions | `.github/workflows/{ci,deploy,release}.yml` |

## Repo layout

```
backend/                FastAPI app — see backend/CLAUDE.md
  app/
    api/v1/routes/      Routers: auth, households, items, recipes
    models/             SQLAlchemy ORM models
    repositories/       Data-access layer (one per aggregate)
    schemas/            Pydantic request/response types
    services/           Business logic (orchestrates repositories)
    workers/            APScheduler job definitions
    config.py           pydantic-settings — Settings class
    database.py         Async engine, Base, get_db dependency
    dependencies.py     Re-exports `get_db` only. Auth deps live at api/v1/dependencies.py
    main.py             FastAPI app factory, lifespan (Redis client), CORS + correlation-ID + rate-limit middleware
  migrations/           Alembic — versions/0001_initial.py is the full initial schema
  tests/                pytest-asyncio, see test_auth/items/households
  pyproject.toml        Hatchling package config + deps + ruff/mypy/pytest config

frontend/               React app — see frontend/CLAUDE.md
  src/
    api/                Thin axios wrappers per resource
    components/         ui/* primitives, items/*, households/*, layout/*
    contexts/           AuthContext (single source of truth for user + tokens)
    hooks/              TanStack Query hooks (one file per resource)
    pages/              Route components — auth/, dashboard, add-item, ...
    types/              Shared TS types (mirrors backend Pydantic schemas)
    utils/              expiry, urgency, date, validation, categoryMapping
    index.css           Design tokens (CSS custom properties) + reduced-motion
  tailwind.config.js    Maps CSS vars to Tailwind utilities

design-system/fridgecheck/
  MASTER.md             Single source of truth for visual design
  pages/dashboard.md    Page-specific overrides

docker/                 Per-service Dockerfiles (api, worker, frontend, nginx)
docker-compose.yml      Dev stack — bind mounts for hot reload
docker-compose.prod.yml Production stack template
docs/                   Architecture + ops docs
terraform/              AWS infra: modules + envs (dev, prod)
.github/workflows/      ci.yml, deploy.yml, release.yml
```

## Running the stack (dev)

```bash
cp .env.example .env             # then fill in secrets if needed
docker compose up                # boots postgres, redis, api, worker, frontend, nginx
```

URLs once healthy:
- App: <http://localhost> (nginx)
- API docs: <http://localhost/api/docs>
- API direct: <http://localhost:8000>
- Frontend dev server direct: <http://localhost:5173> (HMR)
- Postgres: `localhost:5432`, user `fridgecheck`, db `fridgecheck`, password from `POSTGRES_PASSWORD` (default `fridgecheck_dev`)

The frontend container runs Vite in dev mode with HMR. Source is bind-mounted, so edits to `frontend/src/**` reload automatically. `node_modules` is **not** bind-mounted — deps live inside the container.

The api container also bind-mounts source. Adding a Python dep means rebuilding (`docker compose build api worker`); adding an npm dep means running `npm install` inside the container (or rebuilding).

## Environment variables that matter

| Var | Where | Purpose |
|-----|-------|---------|
| `POSTGRES_PASSWORD` | root `.env` | DB password; default `fridgecheck_dev` |
| `DATABASE_URL` | api/worker | Sync URL — Alembic converts to `postgresql+asyncpg://` automatically |
| `REDIS_URL` | api/worker | `redis://redis:6379/0` |
| `SECRET_KEY` | api | JWT signing — REQUIRED in prod |
| `ANTHROPIC_API_KEY` | api/worker | Optional in dev (rescue-recipe endpoint returns 503 if absent) — never expose to frontend |
| `ANTHROPIC_MODEL` | api/worker | Model ID passed to the Messages API. Defaults to `claude-sonnet-4-20250514`. Override to roll model upgrades without code changes; current IDs at <https://docs.anthropic.com/en/docs/about-claude/models> |
| `CORS_ORIGINS` | api | Comma-separated; nginx in front so `http://localhost` is enough in dev |

Frontend has its own `VITE_API_URL` baked at build time; in dev it defaults to `/api/v1` (nginx-proxied).

## Common gotchas (real ones we've hit)

1. **Two postgres containers conflict on 5432.** If a stray postgres (DataGrip's bundled one, an old project) holds the port, `fidgecheck-postgres-1` will start without a host port mapping silently. Symptom: `docker ps` shows `5432/tcp` instead of `0.0.0.0:5432->5432/tcp`. Fix: `docker stop <other>; docker compose up -d postgres`.

2. **bcrypt > 4.0.1 breaks passlib's startup self-test.** `pyproject.toml` pins `bcrypt==4.0.1` — don't bump it without testing login. The error message is `password cannot be longer than 72 bytes` raised at app startup, not during a request.

3. **Alembic env.py converts `postgresql://` → `postgresql+asyncpg://`.** Migration scripts run async. Don't change this without also auditing all migration files.

4. **Enum types are pre-created via raw SQL** in `0001_initial.py`, then referenced with `postgresql.ENUM(..., create_type=False)` on columns. Adding a new enum value: write an `op.execute("ALTER TYPE ... ADD VALUE ...")` in a new migration.

5. **TanStack Query cache is cleared on login/register/logout** in `AuthContext`. If you add resources keyed without a user id (e.g. `['households']`), they'd otherwise leak between sessions on the same tab.

6. **`/households/{id}/items` returns a grouped object** `{expired, today, this_week, fresh}`, not a flat array. The frontend `itemsApi.list` flattens it. Don't try to consume the raw response as an array.

7. **ANTHROPIC_API_KEY must never appear under `frontend/`.** The rescue-recipes feature is exclusively a backend proxy. Grep before merging if you touch this code path.

8. **Auth flow:** access token in localStorage, refresh token also in localStorage. `apiClient` axios instance auto-refreshes on 401 once before giving up. There is no httpOnly cookie path right now.

## Branch and CI flow

- `main` = production-shaped history. Squash-merged from feature/integration branches.
- `dev` = integration branch. Day-to-day work targets here.
- Feature branches: short-lived, off `dev`, PR back into `dev`.
- CI (`.github/workflows/ci.yml`) currently runs on **push to main** and **PRs targeting main**. Pushes to `dev` and feature branches do **not** fire CI by default.
- See `CONTRIBUTING.md` for the full team workflow.

## Testing

```bash
# Backend
docker compose exec api pytest                      # all tests
docker compose exec api pytest tests/test_auth.py   # one file
docker compose exec api pytest -k "login"           # by name

# Frontend
docker compose exec frontend npm run build          # type-check + production build
docker compose exec frontend npm test               # vitest (if configured)
```

Backend tests use an autouse fixture that creates and drops the full schema per test — see `tests/conftest.py`. (This is heavier than the rollback pattern; tests `commit()` directly.) Don't change that conftest without understanding the fixture order.

Always run `npm run build` before declaring a frontend change done. Vite dev mode is forgiving in ways the production build is not.

## When in doubt

- Architecture decisions → `docs/ARCHITECTURE.md`
- Design tokens / visual rules → `design-system/fridgecheck/MASTER.md`
- Module-level conventions → the CLAUDE.md inside that module
- API surface → `http://localhost/api/docs` (live OpenAPI) once running

## What NOT to change without a very good reason

- `migrations/versions/0001_initial.py` — initial schema is frozen. New schema goes in new migrations.
- `backend/app/database.py` — async engine config is load-bearing for tests and migrations.
- `frontend/src/index.css` `:root` token block — design system depends on these names.
- `tailwind.config.js` color/font keys — components reference them via utilities.
- `docker/api/Dockerfile` — order of COPY then `pip install -e .` is deliberate (editable install needs source present).
