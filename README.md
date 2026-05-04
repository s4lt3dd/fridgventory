# FridgeCheck

> **The average UK household throws away £730 worth of food every year.** FridgeCheck helps you stop wasting food — and money — by tracking what's in your fridge, warning you before things expire, and suggesting recipes for items about to go off.

[![CI](https://github.com/your-org/fridgecheck/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/fridgecheck/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## What this is

FridgeCheck is a pantry-tracking SaaS aimed at households who want to cut food waste. Users register, create or join a household, log items with expiry dates, and get warned before food goes off. Two AI-flavoured features sit on top: in-browser barcode scanning that prefills item metadata via Open Food Facts, and "Rescue Recipes" — when 3+ items expire within 3 days, a backend-proxied call to Claude (`claude-sonnet-4-20250514`) suggests recipes that use them up.

The audience for this README is engineers. If you're new to the project, start with [`docs/onboarding.md`](docs/onboarding.md).

---

## Tech stack at a glance

| Layer | Technology |
|-------|-----------|
| API | FastAPI 0.111 (Python 3.11), Pydantic v2, async SQLAlchemy 2 |
| Database | PostgreSQL 16, Alembic migrations |
| Cache / rate limit | Redis 7 (asyncio client) |
| Worker | APScheduler 3.10, in-process |
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS, TanStack Query v5 |
| Auth | JWT (HS256) access tokens + opaque UUID refresh tokens, refresh rotation |
| AI | Anthropic SDK (`anthropic==0.34.2`) — backend-only, model `claude-sonnet-4-20250514` |
| Reverse proxy | nginx 1.27 |
| Local dev | Docker Compose |
| Cloud | AWS ECS Fargate, RDS Postgres, ElastiCache Redis (Terraform) |
| CI/CD | GitHub Actions, OIDC to AWS, semantic-release on `main` |

---

## Quick start

The only prerequisite is [Docker](https://docs.docker.com/get-docker/).

```bash
git clone https://github.com/your-org/fridgecheck.git
cd fridgecheck
cp .env.example .env
docker compose up
```

Open <http://localhost:5173> for the frontend (Vite dev server) and <http://localhost:8000/api/docs> for the live OpenAPI UI. See [`docs/onboarding.md`](docs/onboarding.md) for the verified first-run checklist.

---

## Documentation map

| Doc | Read it when… |
|-----|---------------|
| [`docs/onboarding.md`](docs/onboarding.md) | You're setting up a dev machine for the first time. |
| [`docs/architecture.md`](docs/architecture.md) | You want a tour of how the system fits together. |
| [`docs/development-workflow.md`](docs/development-workflow.md) | You're ready to make a change — running, testing, branching, debugging. |
| [`docs/api-reference.md`](docs/api-reference.md) | You're integrating against the HTTP API. |
| [`docs/glossary.md`](docs/glossary.md) | You hit a domain term you don't recognise. |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | You're opening a PR — branching, commit format, code style. |
| [`CLAUDE.md`](CLAUDE.md), [`backend/CLAUDE.md`](backend/CLAUDE.md), [`frontend/CLAUDE.md`](frontend/CLAUDE.md) | You're working with an AI coding assistant — these are its operational notes. |
| [`design-system/fridgecheck/MASTER.md`](design-system/fridgecheck/MASTER.md) | You're touching anything visual. |
| [`terraform/README.md`](terraform/README.md) | You're touching infrastructure. |

---

## Project structure

```
fridgecheck/
├── backend/         FastAPI application (see backend/CLAUDE.md)
├── frontend/        React + TypeScript SPA (see frontend/CLAUDE.md)
├── docker/          Dockerfiles + nginx config
├── docs/            Engineering documentation (start here)
├── design-system/   Visual design tokens, page-level rules
├── terraform/       AWS infrastructure (modules + dev/prod envs)
└── .github/workflows/  CI, release, deploy pipelines
```

---

## License

[MIT](LICENSE) — use it, fork it, build on it.
