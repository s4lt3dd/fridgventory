# FridgeCheck

> **The average UK household throws away £730 worth of food every year.** FridgeCheck helps you stop wasting food — and money — by tracking what's in your fridge, warning you before things expire, and suggesting recipes for items about to go off.

[![CI](https://github.com/your-org/fridgecheck/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/fridgecheck/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Screenshots

> _Screenshots coming soon — run `docker compose up` to see it in action._

| Dashboard | Add Item | Recipe Suggestions |
|-----------|----------|--------------------|
| _Pantry grouped by expiry urgency_ | _Smart-default form with category hints_ | _Recipes based on what's about to expire_ |

---

## Quick Start

The only prerequisite is [Docker](https://docs.docker.com/get-docker/).

```bash
git clone https://github.com/your-org/fridgecheck.git
cd fridgecheck
cp .env.example .env
docker compose up
```

Then open [http://localhost](http://localhost) in your browser.

- **API docs**: [http://localhost/api/docs](http://localhost/api/docs)
- **Frontend**: [http://localhost](http://localhost)
- **API directly**: [http://localhost:8000](http://localhost:8000)

That's it. No database setup, no local dependencies to install.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **API** | FastAPI (Python 3.11) | Async-first, automatic OpenAPI docs, Pydantic v2 validation |
| **Database** | PostgreSQL 16 | ACID compliance, strong relational model for households/memberships |
| **Cache / Queue** | Redis 7 | Rate limiting, token storage, background job queue |
| **Background Worker** | APScheduler | Lightweight scheduler, no separate broker needed at this scale |
| **Frontend** | React 18 + TypeScript + Vite | Fast iteration, type safety, great DX |
| **State Management** | TanStack Query v5 | Server state, caching, background refetch built-in |
| **Styling** | Tailwind CSS | Utility-first, mobile-first, no context switching |
| **IaC** | Terraform | Declarative, provider-agnostic, mature ecosystem |
| **CI/CD** | GitHub Actions | Native GitHub integration, OIDC for AWS auth |
| **Container Runtime** | Docker / ECS Fargate | No server management, scales to zero |

---

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for:

- Data flow diagrams (item addition, expiry pipeline, invite flow)
- Scalability path from 10 to 100,000 households
- Security considerations
- Trade-off decisions

---

## API Documentation

Once running, the auto-generated Swagger UI is available at:

```
http://localhost/api/docs
```

ReDoc (alternative renderer):

```
http://localhost/api/redoc
```

The OpenAPI spec can be downloaded at `/api/openapi.json`.

---

## Project Structure

```
fridgecheck/
├── backend/          # FastAPI application
│   ├── app/
│   │   ├── api/v1/  # Route handlers
│   │   ├── models/  # SQLAlchemy ORM models
│   │   ├── schemas/ # Pydantic request/response models
│   │   ├── services/# Business logic layer
│   │   ├── repositories/ # Data access layer
│   │   └── workers/ # Background scheduler
│   ├── migrations/  # Alembic migrations
│   └── tests/       # pytest test suite
├── frontend/         # React + TypeScript application
│   └── src/
│       ├── api/     # HTTP client layer
│       ├── components/
│       ├── hooks/   # TanStack Query hooks
│       └── pages/
├── docker/           # Dockerfiles and nginx config
├── terraform/        # Infrastructure as Code
│   ├── modules/     # Reusable Terraform modules
│   └── environments/# dev and prod configurations
└── .github/
    └── workflows/   # CI, release, and deploy pipelines
```

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for:
- Branch naming conventions
- Commit message format (Conventional Commits)
- PR process and review guidelines
- Running tests locally

### Quick contribution setup

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest

# Frontend
cd frontend
npm install
npm test
```

---

## Deployment

The full deployment pipeline is automated via GitHub Actions:

1. **Every PR** runs the CI suite (lint, test, security scan, build)
2. **Merging to `main`** triggers semantic versioning and creates a GitHub Release
3. **Each release** automatically deploys to **dev** then awaits approval for **prod**

Infrastructure is provisioned on AWS using the Terraform modules in `terraform/`. See the [Terraform README](terraform/README.md) for setup instructions.

The pipeline uses AWS OIDC for authentication — no stored credentials.

---

## Roadmap

- [ ] **Barcode scanning** — scan barcodes via camera to auto-fill item details
- [ ] **Push notifications** — browser push and mobile PWA notifications for expiry alerts
- [ ] **AI recipe suggestions** — Claude-powered personalised recipe recommendations
- [ ] **Shopping list generation** — auto-generate a shopping list from frequently used expired items
- [ ] **Multi-language support** — i18n for international households
- [ ] **Nutrition tracking** — link items to nutritional databases
- [ ] **Meal planning** — plan weekly meals around what's in the pantry

---

## License

[MIT](LICENSE) — use it, fork it, build on it.
