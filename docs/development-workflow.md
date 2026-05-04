# Development workflow

How the team works on this codebase day to day. Read [`onboarding.md`](onboarding.md) first if you haven't set up locally yet.

---

## Running the app

### Full stack (recommended)

```bash
docker compose up
docker compose exec api alembic upgrade head    # first time only, after pulling new migrations
```

URLs:

- Frontend dev server (Vite, HMR): <http://localhost:5173>
- API direct: <http://localhost:8000>
- API docs (Swagger): <http://localhost:8000/api/docs>
- API docs (ReDoc): <http://localhost:8000/api/redoc>
- API via nginx: <http://localhost/api/docs>
- Postgres: `localhost:5432` user `fridgecheck`, db `fridgecheck`, password `fridgecheck_dev` (or whatever's in `.env`)
- Redis: `localhost:6379`

Hot reload:

- Backend: `uvicorn --reload` is the compose entrypoint; edits to `backend/app/**` reload the process.
- Frontend: Vite HMR. Edits to `frontend/src/**` reload in the browser.

What does **not** auto-reload:

- New Python deps in `backend/pyproject.toml` → rebuild `api` and `worker` images.
- New npm deps in `frontend/package.json` → `docker compose exec frontend npm install <pkg>` and restart Vite.
- Alembic migrations → run `alembic upgrade head` manually.
- Worker schedule changes → restart the worker container.

### Backend only (Path B from onboarding)

Use this when you need a debugger attached to the API process.

```bash
docker compose up -d postgres redis
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload
```

In a second terminal:

```bash
cd frontend && npm run dev
```

Vite's `vite.config.ts` proxies `/api/*` to `localhost:8000`, so the frontend hits your local uvicorn directly.

### Tear-down

```bash
docker compose down            # stop containers
docker compose down -v         # also drop the postgres + redis volumes (nuclear: wipes data)
```

---

## Tests

### Backend — pytest

```bash
docker compose exec api pytest                      # full suite
docker compose exec api pytest -q                   # quiet
docker compose exec api pytest tests/test_auth.py   # one file
docker compose exec api pytest -k login             # by name
docker compose exec api pytest --cov=app --cov-report=html
```

`tests/conftest.py` sets up:

- `engine` against `postgresql://fridgecheck:fridgecheck_test@localhost:5432/fridgecheck_test` (note: different DB from dev).
- An `autouse` `setup_database` fixture that does `Base.metadata.create_all` per test and `drop_all` after — so each test starts clean. **TODO(verify)** whether the team intends a transaction-rollback fixture instead (the root `CLAUDE.md` describes one but the code uses create/drop).
- `client` fixture: an `httpx.AsyncClient` against the FastAPI app with `app.dependency_overrides[get_db]` pointing at the test session.
- `auth_headers` fixture: registers a user and returns a `Bearer ...` header.

Idiom:

```python
async def test_create_household(client, auth_headers):
    resp = await client.post(
        "/api/v1/households", json={"name": "Smiths"}, headers=auth_headers
    )
    assert resp.status_code == 201
    assert resp.json()["name"] == "Smiths"
```

Don't share state across tests, don't `commit()` — let the per-test setup handle it.

### Frontend — vitest

```bash
docker compose exec frontend npm test               # watch mode
docker compose exec frontend npm test -- --run      # single run (CI uses --passWithNoTests)
docker compose exec frontend npm run test:coverage  # coverage report
```

`src/test-setup.ts` wires `@testing-library/jest-dom` matchers. There are very few component tests today — TODO(verify) what coverage the team is aiming for; CI uses `--passWithNoTests` so it doesn't fail when the suite is empty.

### End-to-end smoke

There's no Playwright/Cypress suite yet. Manual smoke for any auth/items change:

1. Register a user, log in.
2. Create a household.
3. Add an item with an expiry date in the next 3 days.
4. See it on the dashboard, see "expiring soon" treatment.
5. Soft-delete it; confirm it disappears optimistically; refresh and confirm it stays gone.

---

## Lint and typecheck

### Backend

```bash
docker compose exec api ruff check backend/        # lint
docker compose exec api ruff format backend/       # format (in place)
docker compose exec api ruff format --check backend/   # CI-style check (no writes)
docker compose exec api mypy backend/app/          # strict type check
```

ruff config is in `backend/pyproject.toml` (`[tool.ruff]`). Selected rules: `E F I N W UP`. Line length 100. Migrations are excluded.

mypy is `strict = true`. All public functions need full annotations. CI runs mypy with `continue-on-error: true` today, so it won't block a PR — but it's expected to pass. **TODO(verify)** whether mypy is intended to become required.

### Frontend

```bash
docker compose exec frontend npm run lint          # ESLint, --max-warnings 0
docker compose exec frontend npm run format:check  # Prettier check
docker compose exec frontend npm run build         # tsc + Vite production build (full type check)
```

Always run `npm run build` before declaring a frontend change done. Vite dev mode is forgiving about TS errors; the production build's `tsc` step is not.

### Terraform

```bash
terraform fmt -check -recursive terraform/
( cd terraform/environments/dev && terraform init -backend=false && terraform validate )
```

### Dockerfiles

CI runs Hadolint (`hadolint/hadolint-action@v3.1.0`) on the three Dockerfiles. Run it locally with:

```bash
docker run --rm -i hadolint/hadolint < docker/api/Dockerfile
```

---

## Branching and commits

### Branches

- `main` — production-shaped history. Squash-merged from feature/integration branches.
- `dev` — integration branch. Day-to-day work targets here.
- Feature branches — short-lived, off `dev`, PR back into `dev`.

Naming: `<type>/<short-description>`, e.g. `feat/barcode-scanning`, `fix/refresh-token-expiry`, `chore/bump-fastapi`, `docs/architecture-diagrams`.

### Commits — Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/) because `release.yml` parses them to bump semver on `main`.

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

| Type | Effect on version |
|------|-------------------|
| `feat` | minor bump |
| `fix` | patch bump |
| `feat!` or `BREAKING CHANGE:` footer | major bump |
| `docs`, `chore`, `test`, `refactor`, `perf`, `ci` | no bump |

Common scopes: `auth`, `items`, `households`, `recipes`, `worker`, `frontend`, `terraform`, `docker`, `ci`, `deps`.

Examples from `CONTRIBUTING.md`:

```
feat(items): add idempotent item creation — duplicate names increment quantity
fix(auth): handle expired refresh tokens without 500 error
docs(architecture): add scalability section to ARCHITECTURE.md
chore(deps): bump fastapi from 0.110.0 to 0.111.0
feat!: remove legacy v0 API endpoints
```

### PR process

1. Title in Conventional Commits format (the squash merge commit will use it).
2. Description covers what, why, how to test, any migration steps.
3. CI passes — lint, tests, Docker builds, Trivy scan.
4. Coverage doesn't drop below 70% for backend code (per `CONTRIBUTING.md`).
5. One approval from a CODEOWNER. **TODO(verify)** there's no `CODEOWNERS` file in the repo today; either the rule is informal or the file is missing.
6. Squash and merge.

CI fires only on PRs targeting `main` or `dev` and on push to `main`. Pushes to feature branches or `dev` itself don't trigger CI by default — you'll first see the suite run when you open the PR.

---

## Adding a dependency

### Backend (Python)

1. Edit `backend/pyproject.toml` — add the version pin under `[project] dependencies` (or `[project.optional-dependencies] dev` for tooling).
2. Rebuild the image:
   ```bash
   docker compose build api worker
   docker compose up -d api worker
   ```
3. If the dep needs C headers (e.g. `psycopg2`, image processing), check the Dockerfile — ours is `python:3.11-slim` with nothing extra installed. You may need to add `apt-get install` lines. **TODO(verify)** whether to extend `docker/api/Dockerfile` directly or move shared deps to a base image.
4. Don't bump `bcrypt` past `4.0.1`. See `pyproject.toml` comment + onboarding gotcha.

### Frontend (npm)

1. From the repo root:
   ```bash
   docker compose exec frontend npm install <pkg>
   ```
   This installs into the container's `/app/node_modules` and updates `package.json` + `package-lock.json` via the bind mount.
2. Restart Vite if HMR doesn't pick it up:
   ```bash
   docker compose restart frontend
   ```
3. New top-level deps add to bundle size. Vite warns at 500 KB chunks — investigate before merging if a new warning appears. Lazy-load heavy components with `React.lazy()` + `<Suspense>` (see how `BarcodeScanner` is loaded in `ItemForm`).

### Terraform / providers

Pin provider versions in the relevant `terraform/environments/<env>/versions.tf`. Run `terraform init -upgrade` after editing.

---

## Debugging

### Backend

- **`docker compose logs -f api`** is your default tail. structlog renders coloured human-readable output in dev (`environment=development`); prod renders JSON.
- **Correlation ID**: every response includes `X-Correlation-ID`. Pass it to `docker compose logs api 2>&1 | grep <id>` to scope a trace.
- **Drop into `pdb`**: edit the route, add `import pdb; pdb.set_trace()`, run `docker compose exec api pytest -s tests/test_x.py` (or attach to the running container's stdin via `docker attach`). For interactive debugging use Path B (uvicorn on the host) and your editor's debugger.
- **SQL echoing**: set `DEBUG=true` in `.env` (already on by default in compose). SQLAlchemy will print every query.
- **Inspect DB**:
  ```bash
  docker compose exec postgres psql -U fridgecheck -d fridgecheck
  ```

### Frontend

- **React Query Devtools** is imported (`@tanstack/react-query-devtools` is a dep) — TODO(verify) it isn't actually mounted in `main.tsx`. To use it, add `<ReactQueryDevtools initialIsOpen={false} />` next to the `<QueryClientProvider>` in `src/main.tsx` while debugging.
- **Network tab + correlation ID**: copy the `X-Correlation-ID` from the response, grep the API logs.
- **Token state**: `localStorage.getItem('access_token')` / `'refresh_token'` in the browser console. Don't paste these into anything.

### Common failure modes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `password cannot be longer than 72 bytes` at API startup | `bcrypt > 4.0.1` | Pin `bcrypt==4.0.1`. |
| `connection refused` from api → postgres | postgres not yet healthy, or host-side postgres holding `:5432` | `docker compose ps`, `lsof -i :5432`. Wait or kill. |
| 401 on every request after refresh | Refresh token revoked or expired in `refresh_tokens` | Re-login. Check `revoked_at`/`expires_at` in DB. |
| `target_metadata` is `None` errors in Alembic | Forgot to import `app.models` in `migrations/env.py` | Already imported — check you didn't accidentally delete the import. |
| Frontend builds in dev but `npm run build` errors | Strict TS catching things Vite ignores | Fix the types. Don't `// @ts-ignore`. |
| Vite HMR not reflecting changes | Edit happened on host but container's `node_modules` mask vendored. Or you're editing in `/mnt/c/...` on WSL2. | Use the WSL2 filesystem; restart the frontend container. |
| Rate-limit middleware 429s on dev | Spamming endpoints in tests | Increase `rate_limit_requests` via env, or run tests against the API in a separate Compose project. |
| Rescue Recipes returns 503 | `ANTHROPIC_API_KEY` empty | Set it in `.env` and restart `api`. |
| Rescue Recipes returns 400 ("Not enough expiring items") | <3 items expiring within 3 days | Seed items with closer expiry dates, or relax the threshold for testing. |

### Deeper drops

- API cold start time should be sub-second. If it's much longer, the first culprit is bcrypt's self-test or a slow Redis/Postgres connection. The lifespan handler in `main.py` runs first.
- The worker has its own structlog config and runs on its own asyncio loop. If you're not seeing scheduled jobs fire, check `docker compose logs worker` for "Scheduler started" + the job listing.
- The Anthropic call has no retry/backoff. A transient 5xx upstream becomes a 502 to the client. Cache hits skip the call entirely.

---

## What to read next

- [`docs/api-reference.md`](api-reference.md) for endpoint shapes when you're calling the API.
- [`backend/CLAUDE.md`](../backend/CLAUDE.md) and [`frontend/CLAUDE.md`](../frontend/CLAUDE.md) for module-level conventions and patterns.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) is the canonical PR + style document.
