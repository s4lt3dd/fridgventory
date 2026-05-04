# API reference

Authoritative source: the live OpenAPI spec at <http://localhost:8000/api/openapi.json> when the stack is running. Swagger UI: <http://localhost:8000/api/docs>. ReDoc: <http://localhost:8000/api/redoc>.

This file mirrors what's in the routes today. If something here disagrees with `app/api/v1/routes/*.py`, the code wins.

---

## Conventions

- **Base URL**: `/api/v1`. Compose nginx forwards `/api/*` to the API; the SPA's axios client uses `VITE_API_URL` (defaults to `/api/v1`).
- **Auth**: `Authorization: Bearer <access_token>` on protected endpoints. Refresh via `POST /auth/refresh`. See `docs/architecture.md#auth-model-current`.
- **Content type**: `application/json` for request bodies. UUIDs in path params are validated by FastAPI.
- **Errors**: `{"detail": "<message>"}` for handled errors. 422 on validation failures includes Pydantic's structured error list.
- **Rate limit**: 100 requests / 60 s per IP, sliding window. Health/docs paths are exempt. Bypassed if Redis is down.
- **Correlation ID**: every response includes `X-Correlation-ID`. Pass `X-Correlation-ID: <uuid>` on the request to control it; otherwise the API generates one.
- **Pagination**: not standardised yet. List endpoints return arrays today.

### Error codes you'll see

| Code | When |
|------|------|
| 200 | OK |
| 201 | Created (register, household create, item create) |
| 204 | No Content (logout, item delete) |
| 400 | Domain error (e.g. invalid invite token, not enough expiring items) |
| 401 | Missing/invalid/expired access token |
| 403 | Authenticated but not authorised (not a household member, owner-only action, account disabled) |
| 404 | Not found (item, household) |
| 409 | Conflict (email/username already taken at register) |
| 422 | Pydantic validation failure |
| 429 | Rate limit exceeded |
| 500 | Unhandled — caught by global handler, full trace in logs |
| 502 | Upstream service returned junk (rescue recipes parse failure) |
| 503 | Feature not configured (rescue recipes without `ANTHROPIC_API_KEY`) |

---

## Auth

`prefix=/api/v1/auth`, `tags=["auth"]`. Defined in `backend/app/api/v1/routes/auth.py`. Schemas in `app/schemas/auth.py` and `app/schemas/user.py`.

### `POST /auth/register`

Public. Creates a user, issues an access + refresh token pair.

Request:

```json
{
  "email": "you@example.com",
  "username": "you",
  "password": "at-least-8-chars"
}
```

| Field | Type | Constraint |
|-------|------|-----------|
| `email` | string | RFC-valid email |
| `username` | string | 3–100 chars |
| `password` | string | 8–128 chars |

Response 201:

```json
{
  "access_token": "<jwt>",
  "refresh_token": "<uuid4>",
  "token_type": "bearer"
}
```

Errors: 409 `Email already registered` / `Username already taken`. 422 on shape failures.

### `POST /auth/login`

Public. Returns a fresh token pair if credentials check out.

Request: `{"email": "...", "password": "..."}`. Response: same `TokenResponse` as register. Errors: 401 `Invalid email or password` / `Account is disabled`.

### `POST /auth/refresh`

Public. Rotates a refresh token. Old token is revoked in the same transaction.

Request: `{"refresh_token": "<uuid4>"}`. Response: new `TokenResponse`. Errors: 401 `Invalid refresh token` / `Refresh token has been revoked` / `Refresh token has expired`.

### `POST /auth/logout`

Public (just needs the refresh token). Revokes the refresh token server-side.

Request: `{"refresh_token": "<uuid4>"}`. Response 204, no body.

### `GET /auth/me`

Auth required. Returns the current user.

Response 200:

```json
{
  "id": "uuid",
  "email": "you@example.com",
  "username": "you",
  "is_active": true,
  "is_verified": false,
  "created_at": "2026-01-01T12:00:00Z"
}
```

---

## Households

`prefix=/api/v1/households`, `tags=["households"]`. Defined in `app/api/v1/routes/households.py`. Schemas in `app/schemas/household.py`.

All endpoints require authentication.

### `POST /households`

Create a new household. The creator becomes its `owner`.

Request: `{"name": "Smiths"}` — 1–255 chars.

Response 201:

```json
{
  "id": "uuid",
  "name": "Smiths",
  "invite_token": "<urlsafe-token>",
  "created_at": "...",
  "updated_at": "...",
  "members": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "household_id": "uuid",
      "role": "owner",
      "joined_at": "...",
      "username": "you",
      "email": "you@example.com"
    }
  ]
}
```

### `GET /households`

List households the current user is a member of. Returns `HouseholdResponse[]`.

### `GET /households/{household_id}`

Fetch a specific household by id. Auth + membership required.

Errors: 404 `Household not found` / `You are not a member of this household` (the route returns 404 on either).

### `GET /households/{household_id}/invite`

Auth + membership required. Returns the current invite link and token.

Response 200:

```json
{
  "invite_link": "http://localhost:8000/join?token=<token>",
  "invite_token": "<token>"
}
```

> Note: the `invite_link` is built from `request.base_url`. In dev that's whatever served the request (api directly or via nginx). The frontend renders its own `/join/:token` URL — see `frontend/src/components/households/InviteLink.tsx`.

Errors: 403 if not a member.

### `POST /households/{household_id}/invite/regenerate`

Owner only. Issues a fresh `invite_token` and returns the new pair. Previous links are immediately invalidated.

Response 200: same shape as `GET /invite`.

Errors: 403 `Only the household owner can regenerate the invite link` / `You are not a member of this household`.

### `POST /households/join`

Auth required. Joins a household by invite token.

Request: `{"invite_token": "<token>"}`. Response 200: full `HouseholdResponse`.

Errors: 400 `Invalid invite token` / `You are already a member of this household`.

### `GET /households/{household_id}/members`

Auth + membership required. Returns `HouseholdMemberResponse[]`.

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "household_id": "uuid",
    "role": "owner",
    "joined_at": "...",
    "username": "you",
    "email": "you@example.com"
  }
]
```

> **TODO(verify)**: the frontend `householdsApi.rename` calls `PATCH /households/{id}` but no such backend route exists. Either the frontend code path is dead or a backend endpoint is missing.

---

## Items

`prefix=/api/v1/households/{household_id}/items`, `tags=["items"]`. Defined in `app/api/v1/routes/items.py`. Schemas in `app/schemas/item.py`.

All endpoints require authentication and `require_household_member`.

### `GET /households/{household_id}/items`

Returns items grouped by urgency (not a flat array — the frontend `itemsApi.list` flattens it).

Response 200:

```json
{
  "expired":   [ItemResponse, ...],
  "today":     [ItemResponse, ...],
  "this_week": [ItemResponse, ...],
  "fresh":     [ItemResponse, ...]
}
```

`urgency` is computed in the service from `expiry_date` vs. today:

| Urgency | Rule |
|---------|------|
| `expired` | `expiry_date < today` |
| `today` | `expiry_date == today` |
| `this_week` | `0 < days_until_expiry <= 7` |
| `fresh` | `days_until_expiry > 7` |

### `POST /households/{household_id}/items`

Add an item. Idempotent on name within a household — if an active item with the same name exists, the request **increments its quantity** instead of creating a duplicate.

Request:

```json
{
  "name": "Milk",
  "category": "dairy",
  "quantity": 1.0,
  "unit": "litres",
  "expiry_date": "2026-05-10",
  "notes": "semi-skimmed"
}
```

| Field | Type | Constraint | Default |
|-------|------|-----------|---------|
| `name` | string | 1–255 chars | required |
| `category` | enum | `produce` \| `dairy` \| `meat` \| `seafood` \| `bakery` \| `frozen` \| `canned` \| `dry_goods` \| `beverages` \| `condiments` \| `snacks` \| `other` | `other` |
| `quantity` | float | `> 0` | `1.0` |
| `unit` | string | ≤ 50 chars; common units listed in `schemas/item.py` `COMMON_UNITS` | `pieces` |
| `expiry_date` | ISO date | — | required |
| `notes` | string \| null | ≤ 1000 chars | `null` |

Response 201: `ItemResponse`:

```json
{
  "id": "uuid",
  "household_id": "uuid",
  "name": "Milk",
  "category": "dairy",
  "quantity": 1.0,
  "unit": "litres",
  "added_date": "2026-05-03",
  "expiry_date": "2026-05-10",
  "added_by": "uuid",
  "deleted_at": null,
  "notes": "semi-skimmed",
  "created_at": "...",
  "updated_at": "...",
  "urgency": "this_week"
}
```

### `GET /households/{household_id}/items/expiring`

Returns a flat list of items expiring within `days` (default 3). Useful for dashboards and the rescue-recipes precheck.

Query: `?days=3`. Response 200: `ItemResponse[]`.

### `GET /households/{household_id}/items/{item_id}`

Fetch a single item. 404 if it doesn't exist or belongs to a different household.

### `PATCH /households/{household_id}/items/{item_id}`

Partial update. Any subset of `name`, `category`, `quantity`, `unit`, `expiry_date`, `notes` may be provided. Same field constraints as `POST`. Returns the updated `ItemResponse`.

### `DELETE /households/{household_id}/items/{item_id}`

Soft-delete (sets `deleted_at`). Hard-deletion happens in the worker's weekly cleanup job after 7 days.

Response 204, no body. 404 if not found.

---

## Recipes

Two distinct paths, both `tags=["recipes"]`. Defined in `app/api/v1/routes/recipes.py`. Schemas in `app/schemas/recipe.py`.

### `GET /api/v1/households/{household_id}/recipes`

Auth + membership required. Returns recipe suggestions by ingredient overlap from TheMealDB. Falls back to a hard-coded list if the upstream errors.

Response 200: `RecipeSuggestion[]`:

```json
[
  {
    "id": "52771",
    "name": "Spicy Arrabiata Penne",
    "thumbnail_url": "https://...",
    "matched_ingredients": ["Penne", "Tomato"],
    "source_url": "https://www.themealdb.com/meal/52771",
    "category": "Vegetarian",
    "area": "Italian"
  }
]
```

Up to 10 results, sorted by number of matched ingredients descending.

### `POST /api/v1/recipes/rescue`

Auth required. Returns 3–5 AI-generated recipes that use up the household's expiring items. The frontend hits this from `RecipesPage` via `fetchRescueRecipes`.

Request: `{"household_id": "uuid"}`.

Response 200:

```json
{
  "recipes": [
    {
      "name": "Tomato basil pasta",
      "description": "Quick weeknight pasta using up tomatoes and basil before they wilt.",
      "uses_items": ["Cherry tomatoes", "Fresh basil", "Spaghetti"],
      "estimated_time_minutes": 20,
      "difficulty": "easy"
    }
  ]
}
```

Errors:

| Code | Reason |
|------|--------|
| 403 | Not a household member. |
| 400 | Fewer than 3 items expiring within 3 days. |
| 502 | Anthropic API error or response failed schema validation. |
| 503 | `ANTHROPIC_API_KEY` not configured. |

Server caches the response in Redis for 10 minutes keyed by `rescue_recipes:{household_id}:{hash_of_sorted_item_ids}`. Cache failures are logged and ignored — the user request never fails because of cache issues.

---

## Health

### `GET /health`

Public. Reports app + dependency status.

Response 200 (or 503 if database is unreachable):

```json
{
  "status": "healthy",   // or "degraded" / "unhealthy"
  "version": "0.1.0",
  "redis": "connected",
  "database": "connected"
}
```

`degraded` means Redis is down but the API still serves requests (rate limiting falls open, rescue-recipes cache is bypassed). `unhealthy` means the database is unreachable — the API can't do meaningful work.

The api Dockerfile uses this endpoint for its `HEALTHCHECK`.

---

## What's not in the API yet

- Notification preferences endpoints — the `notification_preferences` table exists but no CRUD routes do.
- Email verification — `is_verified` is in the schema but nothing flips it.
- Password reset.
- Removing a household member or transferring ownership.
- Renaming a household — the frontend has a `rename` call that currently 405s. **TODO(verify)** whether to add the route or remove the dead frontend path.
- Per-user item attribution beyond `added_by`.
- A `/users/me/preferences` endpoint.

If you're adding any of these, follow the [Adding a route — the recipe](architecture.md#adding-a-route--the-recipe) checklist.
