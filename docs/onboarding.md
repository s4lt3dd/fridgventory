# Onboarding

Goal: a working FridgeCheck dev environment in under an hour. If you only follow one section, follow [Path A: full stack via Docker Compose](#path-a-full-stack-via-docker-compose) — it's the fastest and the least likely to drift from CI.

---

## Prerequisites

You need exactly these tools. Versions matter — pin to these unless you have a reason not to.

| Tool | Version | Why pinned |
|------|---------|-----------|
| Docker Engine | 24+ (with Compose v2) | Compose v2 syntax is used in `docker-compose.yml` (the `services:` top level, no `version:` key). |
| Git | 2.30+ | Conventional commits + signed tags work fine on anything modern. |
| Python | 3.11.x | `pyproject.toml` declares `requires-python = ">=3.11"`. CI runs 3.11; mypy strict targets 3.11. Don't use 3.12+ — `passlib`/`bcrypt` pinning has bitten us. |
| Node.js | 20.x | Both the frontend Dockerfile and CI use `node:20`. Vite 5 requires ≥18; we standardise on 20. |
| npm | 10+ | Ships with Node 20. |
| PostgreSQL client (`psql`) | 16 | Optional, only for poking the DB by hand. |
| Terraform | 1.7.0 | Only if you'll touch infra. CI lints against this version. |
| AWS CLI | v2 | Only if you'll deploy or bootstrap remote state. |

**You do not need** to install Python, Node, or PostgreSQL locally if you only use Docker Compose (Path A). Everything runs in containers.

---

## Path A: full stack via Docker Compose

This is the recommended starting point.

### 1. Clone and create your `.env`

```bash
git clone https://github.com/your-org/fridgecheck.git
cd fridgecheck
cp .env.example .env
```

The defaults in `.env.example` are dev-safe placeholders — you can boot the stack without editing anything. Two values are worth knowing about:

- `SECRET_KEY` — JWT signing key. The placeholder works for local dev. Don't keep this value in any deployed environment.
- `ANTHROPIC_API_KEY` — leave empty unless you want to test the Rescue Recipes feature. When empty, `POST /api/v1/recipes/rescue` returns 503 ("Recipe suggestions are not configured"). Everything else works without it.

If you need a real Anthropic key for local Rescue Recipes work, ask in `#fridgecheck-eng` (or wherever the team chat lives — TODO(verify) channel name) for a shared dev key, or get one from the Anthropic console under your own account. Never commit it.

### 2. Boot

```bash
docker compose up
```

First boot pulls images and builds three custom containers (api, worker, frontend). Plan for ~3 min on a warm cache, ~10 min cold.

You should see (in any order):

```
fridgecheck-postgres-1  | LOG:  database system is ready to accept connections
fridgecheck-redis-1     | * Ready to accept connections tcp
fridgecheck-api-1       | INFO: Application startup complete.
fridgecheck-worker-1    | Starting FridgeCheck background worker
fridgecheck-frontend-1  | VITE v5.x  ready in N ms
fridgecheck-nginx-1     | start worker process
```

### 3. Apply database migrations

In a second terminal:

```bash
docker compose exec api alembic upgrade head
```

This is required on first boot — the api container starts without applying migrations. You'll see `0001 -> head` and the schema is ready.

### 4. First-run checklist

Verify each of these:

| Check | Command / URL | Expected |
|-------|---------------|----------|
| API health | <http://localhost:8000/health> | `{"status":"healthy","version":"0.1.0","redis":"connected","database":"connected"}` |
| OpenAPI UI | <http://localhost:8000/api/docs> | Swagger UI lists `auth`, `items`, `households`, `recipes` tags |
| Frontend (Vite) | <http://localhost:5173> | Landing page renders |
| Nginx routing | <http://localhost/api/docs> | Same Swagger UI as above (proxied through nginx) |
| Postgres | `docker compose exec postgres psql -U fridgecheck -c '\dt'` | Lists `users`, `households`, `household_members`, `pantry_items`, `notification_preferences`, `refresh_tokens`, `alembic_version` |
| Redis | `docker compose exec redis redis-cli ping` | `PONG` |
| Worker | `docker compose logs worker` | `Scheduler started` line, two jobs (`expiry_check`, `cleanup`) |
| Backend tests pass | `docker compose exec api pytest -q` | All green; this also exercises the test DB connection. |

### 5. Create an account

```bash
curl -s -X POST http://localhost/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","username":"you","password":"hunter22long"}' | jq .
```

You should get back `{"access_token":"...","refresh_token":"...","token_type":"bearer"}`. Then sign in via the UI at <http://localhost:5173/login>.

> **TODO(verify)**: The root `CLAUDE.md` says the app is reachable at <http://localhost> via nginx. The committed `docker/nginx/nginx.conf` serves frontend assets from `/usr/share/nginx/html`, which is empty in dev (the dev frontend container runs Vite separately on `:5173`). Either nginx is meant to proxy to the Vite dev server in dev (and the config is missing that block) or `:5173` is the canonical dev entry point. Confirm with the team and update `nginx.conf` or the docs as appropriate.

---

## Path B: native dev (backend hot-reload outside Docker)

Use this if the Docker bind-mount feedback loop is too slow on your machine, or you want to attach a debugger to the API process directly. It's also what `CONTRIBUTING.md` recommends for active backend dev.

You still run Postgres and Redis in Docker — there's no good reason to install them on the host.

```bash
# 1. Just the data services
docker compose up -d postgres redis

# 2. Backend
cd backend
python3.11 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -e ".[dev]"

export DATABASE_URL=postgresql://fridgecheck:fridgecheck_dev@localhost:5432/fridgecheck
export REDIS_URL=redis://localhost:6379/0
export SECRET_KEY=dev_secret_key
# Optional: export ANTHROPIC_API_KEY=sk-ant-...

alembic upgrade head
uvicorn app.main:app --reload
```

In a third terminal:

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

The Vite dev server has a proxy block in `vite.config.ts` that forwards `/api/*` to `http://localhost:8000`, so the frontend talks to your local uvicorn directly without nginx in the middle.

---

## OS-specific notes

The stack is identical across macOS, Linux, and Windows once Docker is happy. Quirks:

### macOS

- Apple Silicon: all three Dockerfiles are based on `python:3.11-slim` and `node:20-alpine` which have arm64 variants — no extra flags needed. The `bcrypt==4.0.1` wheel exists for arm64.
- `docker compose` (v2) is bundled with Docker Desktop. Don't use `docker-compose` (v1) — file references the v2 schema.

### Linux

- Native Docker Engine works fine; you don't need Docker Desktop.
- If your distro uses cgroup v1, postgres health checks have been flaky for some users. Switching the host to cgroup v2 fixes it. Most modern distros (Ubuntu 22.04+, Fedora 35+) default to v2.
- The default postgres user on the host (if you have one) does **not** affect the container — credentials are entirely defined by `POSTGRES_USER` / `POSTGRES_PASSWORD` env in `docker-compose.yml`.

### Windows

- Use Docker Desktop with the WSL2 backend. Native Windows containers won't work.
- Clone the repo **inside the WSL2 filesystem** (e.g. `~/code/fridgecheck`), not under `/mnt/c/...`. Bind mounts from `/mnt/c/...` are an order of magnitude slower and Vite HMR will time out.
- The expiry worker uses `signal.SIGINT` / `SIGTERM`. The worker code already handles the Windows fallback path (`signal.signal` instead of `loop.add_signal_handler`), so it runs in a Windows container — but the container itself is Linux, so this only matters if you ever run the worker outside Docker on Windows.

---

## Local credentials, env vars, secrets

### Where they live

| File | Status | Purpose |
|------|--------|---------|
| `.env.example` | Tracked | Documented placeholders. **Source of truth for what variables exist.** |
| `.env` | **Git-ignored** | Your local copy. Never commit. |
| `backend/.env.example` | Tracked | Subset used when running the API natively (Path B). |
| `terraform/**/*.tfvars` | **Git-ignored** | Per-env Terraform variables (account IDs, ARNs). |

`.env` is loaded by Compose; backend reads vars directly from the environment via `pydantic-settings`. The `Settings` class in `backend/app/config.py` is the canonical list of what the API expects.

### What each variable does

| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `DATABASE_URL` | yes (in dev) | from `.env.example` | Sync URL (`postgresql://...`). Backend converts it to `postgresql+asyncpg://` at runtime. Alembic does the same conversion in `migrations/env.py`. |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | alt. to `DATABASE_URL` | unset | Used in production where RDS provides the password separately. The `Settings` validator assembles `DATABASE_URL` from these if it isn't set directly. |
| `POSTGRES_PASSWORD` | yes | `fridgecheck_dev` | Used by the postgres container only. Must match whatever's in `DATABASE_URL`. |
| `REDIS_URL` | yes | `redis://redis:6379/0` | Container hostname `redis`; switch to `localhost` in Path B. |
| `SECRET_KEY` | yes | placeholder | JWT signing key (HS256). 32+ random bytes in production. |
| `ANTHROPIC_API_KEY` | no | empty | When empty, the rescue-recipes endpoint returns 503. Never expose to the frontend. |
| `ENVIRONMENT` | no | `development` | Switches structlog renderer to JSON when not `development`. |
| `DEBUG` | no | `false` (dev compose sets `true`) | Toggles SQLAlchemy `echo`. |
| `CORS_ORIGINS` | no | `["http://localhost:3000", "http://localhost:5173"]` | Comma-separated in env. |
| `VITE_API_URL` | no | `/api/v1` | Frontend baseline. Baked at build time. |

### Where to get real values

- **Anthropic API key**: shared dev key from the team's password manager — TODO(verify) location with the team. Otherwise create a personal key at <https://console.anthropic.com>.
- **AWS credentials**: deploys are gated through GitHub Actions OIDC. You should not need long-lived AWS credentials locally for normal work. For Terraform changes, ask for `iam-cicd` role assume permissions — TODO(verify) the named IAM users in `terraform/iam-users/`.
- **GitHub Actions secrets**: documented in the deploy workflow under "Validate required secrets and variables". The set is roughly `AWS_DEPLOY_ROLE_ARN_DEV`, `SECRET_KEY_SSM_ARN_DEV`, and the prod equivalents. Repository owner manages these in `Settings → Secrets and variables → Actions`.

---

## Common setup gotchas

These are real footguns observed in this codebase. Most are also called out in `CLAUDE.md`.

1. **Two postgres processes fighting over `:5432`.** If a host-side Postgres (DataGrip's bundled one, an old `brew services` instance) is already listening on 5432, `fridgecheck-postgres-1` starts but the host port mapping silently doesn't bind. Symptom: `docker ps` shows `5432/tcp` rather than `0.0.0.0:5432->5432/tcp`. Fix:
   ```bash
   sudo lsof -i :5432   # find the offender
   docker compose down && docker compose up -d postgres
   ```

2. **`bcrypt > 4.0.1` breaks passlib's startup self-test.** The pin in `backend/pyproject.toml` is deliberate. Bumping it produces `password cannot be longer than 72 bytes` at app startup. Don't.

3. **Migrations need to be applied manually on first boot.** `docker compose up` does not run `alembic upgrade head`. Run it explicitly the first time and after any new migration is merged.

4. **Backend `.env` and root `.env` are different.** The root `.env` is read by Compose. `backend/.env.example` is for Path B (native dev). They overlap but aren't identical — root `.env` has frontend and Compose-level vars too.

5. **Adding a Python dep means rebuilding the image.** Bind-mounting `./backend → /app` lets code changes hot-reload, but `pip install -e .` was run at image build time. After editing `pyproject.toml`:
   ```bash
   docker compose build api worker && docker compose up -d api worker
   ```

6. **Adding an npm dep needs `npm install` inside the container.** `node_modules` is masked by an anonymous volume (see the `frontend` service in `docker-compose.yml`). Either:
   ```bash
   docker compose exec frontend npm install <pkg>
   ```
   ...or rebuild the frontend image. Editing `package.json` on the host alone won't pick up.

7. **Camera-based barcode scanning needs HTTPS or `localhost`.** Browsers block `getUserMedia` on plain HTTP from a non-loopback origin. Local dev is fine; staging URLs need TLS.

8. **`grep ANTHROPIC` under `frontend/` should return nothing.** The Anthropic SDK is backend-only — Rescue Recipes goes through `POST /api/v1/recipes/rescue`. If you ever import `@anthropic-ai/sdk` on the frontend, stop and route through the backend.

9. **The dev frontend container does not run nginx.** It runs Vite's dev server on `:5173`. The separate `nginx` service in compose serves a static `index.html` from an empty directory — see TODO(verify) above. Treat `:5173` as the dev URL.

10. **bind-mounted `node_modules` would brick the frontend.** The compose file uses an anonymous volume (`/app/node_modules`) on top of `./frontend → /app` exactly to avoid the host masking the container's installed deps. Don't "fix" this.

11. **Tokens in `localStorage` use bare keys.** `frontend/src/api/client.ts` reads/writes `access_token` and `refresh_token` directly. (The frontend `CLAUDE.md` mentions `fridgecheck_*` prefixes — TODO(verify): docs are stale.)

---

## What to read next

- [`docs/architecture.md`](architecture.md) for the system tour.
- [`docs/development-workflow.md`](development-workflow.md) for the day-to-day commands.
- `backend/CLAUDE.md` and `frontend/CLAUDE.md` for in-module conventions.
