# Contributing to FridgeCheck

Thank you for considering contributing! This document explains how to get set up, our conventions, and the PR process.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Conventions](#commit-conventions)
- [Branch Naming](#branch-naming)
- [Pull Request Process](#pull-request-process)
- [Running Tests](#running-tests)
- [Code Style](#code-style)

---

## Code of Conduct

Be respectful and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).

---

## Getting Started

### Prerequisites

- Docker & Docker Compose (for the full stack)
- Python 3.11+ (for backend development)
- Node.js 20+ (for frontend development)
- Terraform 1.7+ (for infrastructure changes)

### Local Setup

```bash
git clone https://github.com/your-org/fridgecheck.git
cd fridgecheck
cp .env.example .env
docker compose up
```

For active backend development (with hot reload outside Docker):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"

export DATABASE_URL=postgresql://fridgecheck:fridgecheck_dev@localhost:5432/fridgecheck
export REDIS_URL=redis://localhost:6379/0
export SECRET_KEY=dev_secret_key

alembic upgrade head
uvicorn app.main:app --reload
```

For active frontend development:

```bash
cd frontend
npm install
npm run dev
```

---

## Development Workflow

1. **Create a branch** from `main` (see [Branch Naming](#branch-naming))
2. **Make your changes** with tests
3. **Run the test suite** locally (see [Running Tests](#running-tests))
4. **Commit** using [Conventional Commits](#commit-conventions)
5. **Open a PR** against `main`

---

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/) to enable automated semantic versioning.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Triggers | Description |
|------|----------|-------------|
| `feat` | Minor version bump | A new feature |
| `fix` | Patch bump | A bug fix |
| `feat!` or `BREAKING CHANGE:` | Major bump | Breaking change |
| `docs` | No bump | Documentation only |
| `chore` | No bump | Maintenance (deps, build, etc.) |
| `test` | No bump | Adding or fixing tests |
| `refactor` | No bump | Code change that doesn't add a feature or fix a bug |
| `perf` | No bump | Performance improvement |
| `ci` | No bump | CI/CD changes |

### Examples

```
feat(items): add idempotent item creation — duplicate names increment quantity
fix(auth): handle expired refresh tokens without 500 error
docs(architecture): add scalability section to ARCHITECTURE.md
chore(deps): bump fastapi from 0.110.0 to 0.111.0
feat!: remove legacy v0 API endpoints
```

### Scopes

Use the area of the codebase: `auth`, `items`, `households`, `recipes`, `worker`, `frontend`, `terraform`, `docker`, `ci`, `deps`.

---

## Branch Naming

```
<type>/<short-description>
```

Examples:
- `feat/barcode-scanning`
- `fix/refresh-token-expiry`
- `chore/bump-fastapi`
- `docs/architecture-diagrams`

---

## Pull Request Process

1. **Title** must follow Conventional Commits format (the merge commit will use it)
2. **Description** should explain:
   - What changed and why
   - How to test it
   - Any migration steps required
3. **Tests** must pass — the CI pipeline runs automatically on every PR
4. **Coverage** must not drop below 70% for backend code
5. **One approval** required from a CODEOWNER before merging
6. Use **Squash and Merge** for feature branches to keep history clean

### PR Template

```markdown
## What
<!-- What does this PR do? -->

## Why
<!-- Why is this change needed? -->

## How to Test
<!-- Steps to manually verify the change -->

## Checklist
- [ ] Tests added/updated
- [ ] Docs updated (if applicable)
- [ ] No breaking changes (or documented if so)
```

---

## Running Tests

### Backend

```bash
cd backend

# All tests
pytest

# With coverage report
pytest --cov=app --cov-report=html

# Single test file
pytest tests/test_items.py -v

# Single test
pytest tests/test_auth.py::test_login_success -v
```

### Frontend

```bash
cd frontend

# All tests (watch mode)
npm test

# Single run (for CI)
npm test -- --run

# With coverage
npm run test:coverage
```

### Full Stack Integration

```bash
# Start the stack
docker compose up -d

# Run health check
curl http://localhost/health

# Tear down
docker compose down
```

---

## Code Style

### Python

We use `ruff` for linting and formatting:

```bash
cd backend
ruff check .       # lint
ruff format .      # format
mypy app/          # type check
```

Key rules:
- Line length: 100 characters
- Use type hints everywhere
- No bare `except:` — always catch specific exceptions
- Use `structlog` for logging, never `print()`

### TypeScript / React

We use ESLint + Prettier:

```bash
cd frontend
npm run lint           # ESLint
npm run format:check   # Prettier check
```

Key rules:
- TypeScript strict mode — no `any` without a comment explaining why
- Functional components only
- Custom hooks for data fetching (TanStack Query)
- No direct DOM manipulation

### Terraform

```bash
cd terraform
terraform fmt -recursive   # format
terraform validate         # validate
```

Key rules:
- All resources tagged with `project`, `environment`, `managed_by`
- No hardcoded values — use variables
- Document all variables and outputs

---

## Questions?

Open a [GitHub Discussion](https://github.com/your-org/fridgecheck/discussions) or create an issue tagged `question`.
