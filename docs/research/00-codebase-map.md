# 00 — Codebase Map (FridgeCheck)

_Written 2026-05-03 from direct file reads in worktree `stupefied-lalande-392637`. All path:line references verified._

---

## 1. Tech stack confirmed

### Backend (`backend/pyproject.toml`)
| Package | Version | Notes |
|---|---|---|
| Python | 3.11 | `requires-python = ">=3.11"` ([backend/pyproject.toml:8](backend/pyproject.toml:8)) |
| FastAPI | 0.111.0 | |
| SQLAlchemy | 2.0.49 | async only |
| asyncpg | 0.29.0 | runtime driver |
| psycopg2-binary | 2.9.9 | likely Alembic-only |
| alembic | 1.13.1 | |
| redis | 5.0.4 | |
| pydantic / pydantic-settings | 2.7.1 / 2.2.1 | |
| python-jose[cryptography] | 3.5.0 | JWT |
| passlib[bcrypt] | 1.7.4 | |
| **bcrypt** | **==4.0.1 (HARD PIN)** | gotcha #2 in root CLAUDE.md |
| anthropic | 0.34.2 | rescue recipes |
| apscheduler | 3.10.4 | in-process worker |
| structlog | 24.1.0 | |
| ruff / mypy / pytest | 0.4.4 / 1.10.0 / 8.2.0 | dev only |

### Frontend (`frontend/package.json`)
| Package | Version | Notes |
|---|---|---|
| Node | 20 | per CI workflow |
| React | 18.3.1 | |
| Vite | 5.3.1 | |
| TypeScript | 5.4.5 | strict implied |
| @tanstack/react-query | ^5.40.0 | + devtools |
| react-router-dom | ^6.23.1 | |
| axios | ^1.15.2 | |
| @zxing/library | ^0.21.3 | barcode |
| date-fns | ^3.6.0 | |
| lucide-react | ^0.383.0 | |
| vite-plugin-pwa | ^0.20.0 | Workbox under hood |
| vitest | ^1.6.0 | + coverage-v8 |
| @testing-library/react | ^16.0.0 | |

### Infra
- Postgres 16-alpine + Redis 7.2-alpine (both confirmed in CI services block)
- Docker Compose dev, Terraform/AWS prod
- nginx proxy in front

### Drift between CLAUDE.md and code
1. **Token lifetimes.** `backend/CLAUDE.md:91` says "15-min access tokens, 30-day refresh tokens." Actual: `access_token_expire_minutes: int = 30`, `refresh_token_expire_days: int = 7` ([backend/app/config.py:23-24](backend/app/config.py:23)).
2. **JWT secret env var name.** Root `CLAUDE.md` lists `JWT_SECRET_KEY` as the env var; actual alias is `SECRET_KEY` ([backend/app/config.py:21](backend/app/config.py:21)).
3. **Auth dependencies path.** `backend/CLAUDE.md` references `dependencies.py` for `get_current_user`. The real file [backend/app/dependencies.py](backend/app/dependencies.py) only re-exports `get_db`. Auth deps live at `backend/app/api/v1/dependencies.py` (imported at [backend/app/api/v1/routes/auth.py:6](backend/app/api/v1/routes/auth.py:6)).
4. **Test fixture pattern.** `backend/CLAUDE.md:126` claims "rollback at teardown." Actual: an `autouse` fixture creates and drops all tables per test ([backend/tests/conftest.py:43-49](backend/tests/conftest.py:43)) — much heavier; plus tests `commit()` directly (e.g. line 81) which the doc forbids.

---

## 2. Directory layout (3 levels)

```
backend/
  app/
    api/v1/
      routes/         auth.py, households.py, items.py, recipes.py
      dependencies.py auth deps live here (NOT app/dependencies.py)
      __init__.py     router registration
    models/           household.py, item.py, notification.py, user.py
    repositories/     household_, item_, user_repository.py
    schemas/          auth, household, item, recipe, user (Pydantic)
    services/         auth, household, item, recipe, rescue_recipe
    workers/          (APScheduler jobs — referenced in main.py lifespan)
    config.py · database.py · dependencies.py · main.py
  migrations/versions/
  tests/              conftest.py, test_auth/households/items.py
  pyproject.toml

frontend/
  src/
    api/              auth, client, households, items, openFoodFacts, recipes, rescueRecipes
    components/       households/, items/, layout/, ui/
    contexts/         AuthContext.tsx
    hooks/            useAuth, useHousehold, useItems, useRecipes
    pages/            Landing, Dashboard, AddItem, Household, Join, Recipes, Settings, auth/
    types/ · utils/ · index.css · App.tsx · main.tsx
    test-setup.ts     (loaded but no *.test.* files exist)
  package.json · tailwind.config.js

design-system/fridgecheck/   MASTER.md + page docs
docker/                       per-service Dockerfiles
docs/ARCHITECTURE.md          architecture doc
terraform/                    AWS infra
.github/workflows/            ci.yml, deploy.yml, release.yml
```

---

## 3. Where auth lives today (end-to-end)

### Backend — username+password login flow

| Step | Where |
|---|---|
| Login route | [backend/app/api/v1/routes/auth.py:29](backend/app/api/v1/routes/auth.py:29) |
| Service `login()` | [backend/app/services/auth_service.py:100](backend/app/services/auth_service.py:100) |
| Password verify (`passlib` bcrypt) | [backend/app/services/auth_service.py:37](backend/app/services/auth_service.py:37) |
| Password hash on register | [backend/app/services/auth_service.py:33](backend/app/services/auth_service.py:33) |
| `pwd_context = CryptContext(schemes=["bcrypt"])` | [backend/app/services/auth_service.py:16](backend/app/services/auth_service.py:16) |
| Access token mint (HS256 JWT, 30-min) | [backend/app/services/auth_service.py:44-53](backend/app/services/auth_service.py:44) |
| Refresh token mint (UUID4 — **not a JWT**) | [backend/app/services/auth_service.py:55-58](backend/app/services/auth_service.py:55) |
| Access token decode | [backend/app/services/auth_service.py:60-68](backend/app/services/auth_service.py:60) |
| Refresh rotate (revoke + reissue pair) | [backend/app/services/auth_service.py:121-144](backend/app/services/auth_service.py:121) |
| Refresh-token DB row (revoked_at, expires_at) | `refresh_tokens` table per backend/CLAUDE.md schema list |
| Logout (revoke refresh token) | [backend/app/services/auth_service.py:146-148](backend/app/services/auth_service.py:146) |
| Route protection dep | `get_current_user` in `backend/app/api/v1/dependencies.py` (referenced at [backend/app/api/v1/routes/auth.py:6](backend/app/api/v1/routes/auth.py:6)) |

### Frontend

| Step | Where |
|---|---|
| Token storage (localStorage, plain) | [frontend/src/api/client.ts:14-30](frontend/src/api/client.ts:14) |
| Request interceptor → adds `Bearer` | [frontend/src/api/client.ts:34-40](frontend/src/api/client.ts:34) |
| Response interceptor → 401 single-retry | [frontend/src/api/client.ts:65-124](frontend/src/api/client.ts:65) |
| Concurrent-401 queue (`pendingQueue`) | [frontend/src/api/client.ts:44-48](frontend/src/api/client.ts:44) |
| Refresh failure → hard redirect to `/login` | [frontend/src/api/client.ts:115-120](frontend/src/api/client.ts:115) |
| Session restore on mount | [frontend/src/contexts/AuthContext.tsx:44-78](frontend/src/contexts/AuthContext.tsx:44) |
| Login + cache clear | [frontend/src/contexts/AuthContext.tsx:80-92](frontend/src/contexts/AuthContext.tsx:80) |
| Register + cache clear | [frontend/src/contexts/AuthContext.tsx:94-103](frontend/src/contexts/AuthContext.tsx:94) |
| Logout + revoke + cache clear | [frontend/src/contexts/AuthContext.tsx:105-118](frontend/src/contexts/AuthContext.tsx:105) |

### Notable
- **No password reset** route or UI — verified absent from `routes/auth.py` and `pages/auth/`.
- **No email verification flow** — `User.is_verified` field is set but never written by any code path I found.
- **No MFA, no SSO, no social login.**
- **Rate limiting is per-IP, sliding-window via Redis** ([backend/app/main.py:92-116](backend/app/main.py:92)). No per-user quota. Fails open if Redis is down.
- **No CSRF.** Not strictly needed because tokens are bearer-in-header (not cookie), but worth knowing if you ever switch to cookies.

---

## 4. Where new features slot in

### Backend recipe (per `backend/CLAUDE.md:43-49`, verified by file layout)

| Layer | Canonical example | Pattern |
|---|---|---|
| Model | `backend/app/models/item.py` | SQLAlchemy ORM with UUID PK + `deleted_at` for soft-delete |
| Repository | `backend/app/repositories/item_repository.py` | Async session-bound class, returns ORM objects, never raises HTTP |
| Service | `backend/app/services/item_service.py` | Class with `__init__(self, db)`, raises domain `XxxError` |
| Schema | `backend/app/schemas/item.py` | `XxxCreate` / `XxxUpdate` / `XxxResponse` Pydantic v2 |
| Route | `backend/app/api/v1/routes/items.py` | Thin: deps + service call + `response_model=` |
| Router register | `backend/app/api/v1/__init__.py` | |
| Migration | `backend/migrations/versions/0001_initial.py` (sole base) | `alembic revision --autogenerate -m "..."` then hand-audit |
| Worker job | `backend/app/workers/*.py` (referenced in `main.py` lifespan) | APScheduler in-process |
| Test | `backend/tests/test_items.py` | `client` + `auth_headers` fixtures, async |

### Frontend recipe

| Layer | Example | Pattern |
|---|---|---|
| API wrapper | `frontend/src/api/items.ts` | Thin axios using `apiClient`, returns typed promise |
| Hook | `frontend/src/hooks/useItems.ts` | TanStack Query, key tuple `['items', householdId]` |
| Types | `frontend/src/types/index.ts` | Mirrors backend Pydantic schemas |
| Page | `frontend/src/pages/DashboardPage.tsx` | Renders all states (loading, error, empty, data) |
| Route registration | `frontend/src/App.tsx` (auth-required under `/app/*`) | |
| UI primitive | `frontend/src/components/ui/Button.tsx` | Tailwind-only; `displayName` if `forwardRef` |
| Feature component | `frontend/src/components/items/ItemForm.tsx` | Domain-grouped under `components/<domain>/` |

---

## 5. Test coverage shape

### Backend
- **3 test files**: `test_auth.py`, `test_households.py`, `test_items.py` ([backend/tests/](backend/tests/)).
- **Coverage gate**: `--cov-fail-under=55` ([.github/workflows/ci.yml#test-backend](.github/workflows/ci.yml)). 55% is permissive.
- **Untested code paths**:
  - Recipes endpoints (`routes/recipes.py`)
  - **Rescue-recipe service** (the Anthropic-calling code) — high risk; no parsing/error tests
  - Worker / notification job
  - `notification_preferences` flows
  - Refresh-token rotation under concurrent requests
- **Conftest oddity**: per-test `Base.metadata.create_all` + `drop_all` ([backend/tests/conftest.py:43-49](backend/tests/conftest.py:43)). Slow; not the rollback pattern doc'd in `backend/CLAUDE.md:125`. Tests `commit()` directly (e.g. [backend/tests/conftest.py:81](backend/tests/conftest.py:81)).

### Frontend
- **Zero `*.test.*` / `*.spec.*` files** in `frontend/src/` (verified via find).
- `test-setup.ts` is one line: `import "@testing-library/jest-dom"`.
- CI runs `npm test -- --run --passWithNoTests` ([.github/workflows/ci.yml#test-frontend](.github/workflows/ci.yml)) — passes vacuously when no tests exist.
- Testing infrastructure (vitest, RTL, jsdom) is installed and ready — just unused.

### CI gates (informational)
- `lint-python`: ruff check + format check (hard-fail), **mypy `continue-on-error: true`** — type errors don't fail the build.
- `lint-frontend`: ESLint + Prettier (hard-fail).
- `lint-terraform`: fmt + validate.
- `lint-dockerfiles`: hadolint on api/worker/frontend.
- `security-scan`: pip-audit + npm audit, both `|| true` — informational only, never blocks.
- `test-backend`: real Postgres + Redis services, 55% min cov.
- `test-frontend`: vacuous pass (no tests).
- `build-images`: api / worker / frontend Docker images.
- `trivy-scan`: depends on build-images.

### No E2E
- No Playwright/Cypress repo, no `e2e/` directory.

---

## 6. Tech debt / risk areas

| # | Item | Where | Severity |
|---|---|---|---|
| 1 | `bcrypt==4.0.1` hard pin breaks if bumped (passlib startup self-test) | [backend/pyproject.toml:21](backend/pyproject.toml:21) + [backend/app/services/auth_service.py:16](backend/app/services/auth_service.py:16) | High — landmine for any dep update |
| 2 | Tokens in `localStorage` (access **and** refresh) — XSS exposure | [frontend/src/api/client.ts:14-25](frontend/src/api/client.ts:14) | High — single XSS = full session theft |
| 3 | Frontend has zero tests; CI passes on `--passWithNoTests` | [.github/workflows/ci.yml](.github/workflows/ci.yml) | High for a UI-heavy product |
| 4 | mypy in CI is `continue-on-error: true` | [.github/workflows/ci.yml#lint-python](.github/workflows/ci.yml) | Medium — strict mypy effectively decorative |
| 5 | Backend coverage gate 55% — leaves rescue_recipe + worker uncovered | CI + tests/ | Medium |
| 6 | Refresh-token rotation has no replay-detection — stolen old token won't auto-revoke the chain | [backend/app/services/auth_service.py:121-144](backend/app/services/auth_service.py:121) | Medium |
| 7 | Refresh token is a plain UUID4 in DB (not a JWT) — fine for revocation but no IP/UA binding | [backend/app/services/auth_service.py:55-58](backend/app/services/auth_service.py:55) | Low — design choice; flag for hardening |
| 8 | No password reset, no email verification, `User.is_verified` is dead state | absent from `routes/auth.py` and `pages/auth/` | Medium — required before scaling |
| 9 | Rate limiting is per-IP only, in-process via Redis INCR — no per-user, no auth-aware quotas | [backend/app/main.py:92-116](backend/app/main.py:92) | Low — adequate for now, but trivially bypassed via shared NAT |
| 10 | Doc drift on token lifetimes and env var names | CLAUDE.md vs `config.py` | Low — confusing for new contributors |
| 11 | Conftest creates+drops schema per test instead of rolling back | [backend/tests/conftest.py:43-49](backend/tests/conftest.py:43) | Low — slow, not what backend/CLAUDE.md says |
| 12 | `pip-audit` and `npm audit` use `\|\| true` — vulnerabilities never block | [.github/workflows/ci.yml#security-scan](.github/workflows/ci.yml) | Medium — deps could rot quietly |
| 13 | `auth_headers` fixture mints a token directly via `AuthService.create_access_token` — bypasses the route surface | [backend/tests/conftest.py:88](backend/tests/conftest.py:88) | Low — hides login-route regressions in dependent tests |

---

## 7. Surprises (things the docs don't tell you that matter)

1. **Refresh token is NOT a JWT.** It's a server-side opaque UUID4 stored in `refresh_tokens` table. Simpler revocation, but means refresh validation is a DB round-trip on every refresh.
2. **Auth deps are at `app/api/v1/dependencies.py`, not `app/dependencies.py`.** The latter only re-exports `get_db`. Easy to miss when grep-ing.
3. **Secret env var is `SECRET_KEY`, not `JWT_SECRET_KEY`.** Root CLAUDE.md is wrong.
4. **Frontend's `restoreSession` does its own refresh-and-retry on mount** ([frontend/src/contexts/AuthContext.tsx:54-71](frontend/src/contexts/AuthContext.tsx:54)) — this is parallel to the axios interceptor. Two refresh paths to keep in sync if you change the protocol.
5. **Test fixtures `commit()` directly**, contradicting `backend/CLAUDE.md` which says "Don't `commit()` in tests — let the rollback handle it." But the conftest no longer uses transaction-rollback, so commits are fine in practice. Doc lies.
6. **No tests for the rescue-recipe service** — the most expensive (Claude API) and most fragile (JSON parsing) code path is also the least tested.
7. **Anthropic model hardcoded to `claude-sonnet-4-20250514`** in `services/rescue_recipe_service.py` (per backend/CLAUDE.md snippet) — no config knob; will need a code change to update.
8. **Open Food Facts is called from the frontend** ([frontend/src/api/openFoodFacts.ts](frontend/src/api/openFoodFacts.ts)). User → OFF directly, no backend proxy. Means OFF outages affect the barcode UX and we have no caching/throttling control.
9. **Frontend env var for API base is `VITE_API_URL`**, not `VITE_API_BASE_URL` as root CLAUDE.md claims ([frontend/src/api/client.ts:3](frontend/src/api/client.ts:3)).
