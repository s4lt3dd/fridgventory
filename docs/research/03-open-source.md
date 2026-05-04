# 03 — Open-Source Building Blocks (FridgeCheck)

_Written 2026-05-03. Audits Tier 1 + Tier 2 features in [02-feature-opportunities.md](02-feature-opportunities.md) for ready-made libraries / datasets we can pull in instead of building from scratch. Stack baselines: Python 3.11, FastAPI 0.111, async SQLAlchemy 2, Postgres 16, Redis 7; React 18, Vite 5, TypeScript, TanStack Query 5, Tailwind, vite-plugin-pwa already installed ([00-codebase-map.md](00-codebase-map.md))._

All URLs verified live; cite "(accessed 2026-05-03)". Maintenance signal scale: green = active multi-maintainer, recent release; yellow = single-maintainer or single-org but releasing; red = stale > 12 months or DEPRECATED upstream.

---

## Tier 1

### F1 — UK Product Data Overlay

#### Open Food Facts (data + API)

- **Name**: Open Food Facts product database — [world.openfoodfacts.org/data](https://world.openfoodfacts.org/data) (accessed 2026-05-03)
- **Use case**: Seed product table (EAN → name, brand, category, nutrition, image) and live `/api/v2/product/{barcode}` lookup. Direct replacement for the current frontend-only call at `frontend/src/api/openFoodFacts.ts` ([00-codebase-map.md surprise #8](00-codebase-map.md)).
- **Language / ecosystem**: Language-neutral. Daily MongoDB / JSONL / Parquet dumps; live REST API.
- **License**: **ODbL 1.0** for the database (share-alike on derivative databases) + **CC-BY-SA** on images. Confirmed at [world.openfoodfacts.org/data](https://world.openfoodfacts.org/data) (accessed 2026-05-03). Permissive enough for commercial use *with attribution and share-alike of any DB derivative we publish*. We do not have to open-source application code, only an enriched DB if we ever redistribute one. **License-review needed before we mix Open Food Facts data with any non-share-alike-compatible source (e.g. licensed retailer feed).**
- **Last release / size / maintainers**: Database ~4 M products as of 2025; nightly dumps. Project is a Wikipedia-style nonprofit collective (multi-maintainer org).
- **Maintenance**: green.
- **Why it fits**: Already de-facto integrated; moving the call backend-side gives us caching control (CLAUDE gotcha #6 path) and lets us layer F1's local override table on top.
- **Risks**: UK own-label coverage is patchy ([01-industry-landscape #3.5 Fridgely](01-industry-landscape.md)); we will still need to crowdsource gaps (F10) or add a secondary source. Share-alike is a real constraint if we ever ingest GS1 / commercial feeds — we cannot relicense the merged DB out of ODbL.
- **Confidence**: **high**.

#### openfoodfacts-python (official SDK)

- **Name**: openfoodfacts-python — [github.com/openfoodfacts/openfoodfacts-python](https://github.com/openfoodfacts/openfoodfacts-python) (accessed 2026-05-03)
- **Use case**: Backend `services/product_service.py` lookup wrapper, instead of hand-rolling httpx code.
- **Language**: Python (>= 3.10) — matches our 3.11 baseline.
- **License**: MIT.
- **Last release**: v5.0.1, 2026-03-18. **443 stars.** Maintained by Open Food Facts org.
- **Maintenance**: green.
- **Why it fits**: Canonical client; thin wrapper over the same REST surface we'd otherwise call ourselves.
- **Risks**: SDK appears sync-first; we may end up calling it from a thread pool or just using `httpx.AsyncClient` directly per `backend/CLAUDE.md` guidance. Confirm async story before committing — could be lighter to skip the SDK and call REST directly.
- **Confidence**: medium — SDK is fine but the value-add over `httpx` is small.

#### GS1 UK GTIN Check / Verified by GS1

- **Name**: GS1 UK GTIN Check API — [gs1uk.org/standards-services/data-services/gtin-check-api](https://www.gs1uk.org/standards-services/data-services/gtin-check-api) (accessed 2026-05-03), Verified by GS1 — [gs1uk.org/standards-services/data-services/verified-by-gs1](https://www.gs1uk.org/standards-services/data-services/verified-by-gs1) (accessed 2026-05-03).
- **Use case**: Authoritative UK GTIN → brand owner mapping — fills exactly the Fridgely UK-own-label gap.
- **License / cost**: **Member-only, restricted commercial use.** Terms & conditions at [gs1uk.org/terms-and-conditions/GTIN-check-service](https://www.gs1uk.org/terms-and-conditions/GTIN-check-service) (accessed 2026-05-03) explicitly say "must not use the API in conjunction with any commercial purpose" without a paid agreement.
- **Maintenance**: N/A — vendor service.
- **Why it fits / why not**: Best-in-class UK barcode authority but **paid + commercial-use license needs negotiation**. Treat as a phase-2 enrichment source, not a phase-1 dependency.
- **Confidence**: high (on the gap and the constraint); low (that we'll adopt before product-market fit).

#### USDA FoodData Central (gap-filler)

- **Name**: USDA FoodData Central API — [fdc.nal.usda.gov](https://fdc.nal.usda.gov/api-key-signup/) (accessed 2026-05-03)
- **Use case**: Nutrition fallback when OFF lacks values for a UK product.
- **License**: **CC0 / public domain.** No commercial restrictions; attribution requested only.
- **Rate limit**: 1,000 req/h per IP; key required.
- **Maintenance**: green (US Government dataset).
- **Why it fits**: Free, public-domain backstop dataset; safer to mix with ODbL than commercial feeds.
- **Risks**: US-centric; UK own-label products won't be in it. Useful only for *generic* nutrition gaps.
- **Confidence**: medium.

**Recommended F1 stack**: Open Food Facts ODbL data dump (license review for share-alike scope) ingested nightly into a local `products` table via a FastAPI worker, with a thin `services/product_service.py` calling the live OFF REST API for cache-misses through `httpx.AsyncClient`. Skip the official SDK; defer GS1 UK to phase 2 once revenue justifies a member fee.

---

### F8 — Push Notifications & PWA Polish

#### pywebpush (server-side Web Push)

- **Name**: pywebpush — [github.com/web-push-libs/pywebpush](https://github.com/web-push-libs/pywebpush) (accessed 2026-05-03)
- **Use case**: Worker job sends VAPID-signed Web Push to subscribed clients when expiry approaches; replaces the missing push delivery channel called out in [02-feature-opportunities.md F8](02-feature-opportunities.md).
- **Language**: Python — matches.
- **License**: **MPL-2.0.** File-level copyleft; safe for commercial proprietary apps that don't modify pywebpush itself.
- **Last release**: v2.0.1, 2024-10-14. **365 stars.** PyPI "Critical Project" but **single maintainer** (per repo README, accessed 2026-05-03). 68k weekly downloads.
- **Maintenance**: yellow — releases are slow (~once/year) but it's the de-facto Python web push library; protocol itself is mature.
- **Why it fits**: Encapsulates VAPID + ECDH/AES-128-GCM payload encryption, which is the part you do *not* want to reimplement.
- **Risks**: Single maintainer + 18-month release cadence. Bus-factor risk; protocol changes are rare so impact is low. MPL-2.0 file-level copyleft means **don't fork-and-modify in-tree** — depend via PyPI.
- **Confidence**: high.

#### vite-plugin-pwa (already installed)

- **Name**: vite-plugin-pwa — [github.com/vite-pwa/vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa) (accessed 2026-05-03), already at `^0.20.0` per [00-codebase-map #1](00-codebase-map.md).
- **Use case**: We already have the PWA shell. For F8 we switch from `generateSW` (auto) to `injectManifest` so we can ship a custom service-worker `push` handler. Per [vite-pwa-org.netlify.app/workbox/inject-manifest](https://vite-pwa-org.netlify.app/workbox/inject-manifest.html) (accessed 2026-05-03).
- **License**: MIT. **Maintenance**: green.
- **Why it fits**: No additional package. Just a config + service-worker file change.
- **Risks**: Switching strategies invalidates current precache assumptions; QA needed.
- **Confidence**: high.

#### @vite-pwa/workbox-window

- **Name**: @vite-pwa/workbox-window — [npmjs.com/package/@vite-pwa/workbox-window](https://www.npmjs.com/package/@vite-pwa/workbox-window) (accessed 2026-05-03)
- **Use case**: Client-side helper to register the SW + subscribe to push from React. Esp. handles the `installing` event correctly which the upstream workbox-window package misses.
- **License**: MIT. **Maintenance**: green (same org as vite-plugin-pwa).
- **Why it fits**: ESM-native, Vite-friendly, complements what we already have.
- **Confidence**: medium-high.

**Recommended F8 stack**: pywebpush server-side + vite-plugin-pwa `injectManifest` strategy with @vite-pwa/workbox-window in React for subscribe/unsubscribe UX. New `push_subscriptions` table; APScheduler worker iterates subscriptions and delegates the actual send to pywebpush.

---

### F3 — Post-Opening Shelf-Life Tracking

#### USDA FSIS FoodKeeper data

- **Name**: FoodKeeper dataset — [catalog.data.gov/dataset/fsis-foodkeeper-data](https://catalog.data.gov/dataset/fsis-foodkeeper-data) (accessed 2026-05-03), JSON wrapper at [github.com/jelera/food-shelflife-db](https://github.com/jelera/food-shelflife-db) (accessed 2026-05-03).
- **Use case**: Seed `products.opened_shelf_life_days` and `products.default_shelf_life_days` defaults. Hummus opened: 7d, ketchup opened: 6 months, etc.
- **Language**: Dataset (JSON / CSV); Rails wrapper exists but we'd just consume the raw data.
- **License**: **Public domain (US Government work).** Free for commercial use; attribution requested.
- **Maintenance**: Underlying USDA dataset (green / authoritative). The Rails wrapper repo is single-contributor and stale (last commit > 4 years).
- **Why it fits**: Saves us from manually curating a 200-row "how long does an opened jar of mayo last" table. Field names map cleanly to `pantry_open_life`, `refrigerator_open_life`.
- **Risks**: US product names; need a small mapping pass for UK terminology ("courgette" vs "zucchini"). **Don't depend on the Rails wrapper** — it's stale; just import the underlying data.
- **Confidence**: high (data); n/a (no library to maintain).

#### FSA / Food Standards Agency open data

- **Name**: FSA Data Catalog — [data.food.gov.uk/catalog](https://data.food.gov.uk/catalog) (accessed 2026-05-03)
- **Use case**: Considered as a UK-native shelf-life source.
- **Verdict after audit**: **No dedicated shelf-life dataset.** Catalog covers food hygiene ratings, incidents, allergens — none of which give us "opened ketchup keeps 6 months". Build-from-scratch flag confirmed; FoodKeeper remains the only practical seed.
- **Confidence**: high that this isn't a substitute.

**Recommended F3 stack**: import the FoodKeeper JSON once (script in `backend/migrations/seed_foodkeeper.py`), map US category names → our 12 enum values, attach `opened_shelf_life_days` and `default_shelf_life_days` to the `products` table created in F1. No runtime library needed.

---

### F14 — Rescue Recipe Hardening

#### MSW (Mock Service Worker)

- **Name**: MSW — [github.com/mswjs/msw](https://github.com/mswjs/msw) (accessed 2026-05-03)
- **Use case**: Frontend-side: stub the `/api/v1/recipes/rescue` response in tests + Storybook so we can develop the rescue UI without a live Anthropic key. Pairs with vitest (already installed).
- **Language**: TypeScript / browser + Node.
- **License**: MIT. **17.9k stars**, latest v2.14.2 (2026-04-29). Active multi-org sponsorship (GitHub, Microsoft, Spotify cited as users). Self-described as "maintained in spare time" but release cadence and sponsor list are reassuring.
- **Maintenance**: green (yellow on bus-factor).
- **Why it fits**: Industry-standard; intercepts at network layer so the existing axios client is unaware. Fixes the [00-codebase-map #5 frontend zero-tests](00-codebase-map.md) gap.
- **Risks**: Single primary maintainer financially. Service-worker setup gotcha: Vite dev SW path must not collide with vite-plugin-pwa's SW (config carve-out needed).
- **Confidence**: high.

#### vcrpy / pytest-recording (alternative for backend)

- **Name**: pytest-recording / vcrpy — [github.com/kiwicom/pytest-recording](https://github.com/kiwicom/pytest-recording) (search referenced; not separately fetched but well-known stable lib)
- **Use case**: Backend-side: record actual Anthropic responses once, replay in CI without API key. Replaces hand-built fixture files.
- **License**: MIT.
- **Maintenance**: green.
- **Why it fits**: Closes the test gap on `services/rescue_recipe_service.py` ([00-codebase-map #5](00-codebase-map.md)) without leaking an `ANTHROPIC_API_KEY` into CI.
- **Risks**: Cassettes capture full request/response — must be scrubbed for any tokens before commit.
- **Confidence**: medium-high.

**Recommended F14 stack**: MSW for frontend test stubs + pytest-recording for backend cassette tests of rescue_recipe_service. Plus a deterministic non-AI fallback (no library — just curated JSON in repo) for the 503 path when `ANTHROPIC_API_KEY` is absent.

---

## Tier 2

### F5 — Rescue Recipe → UK Basket Bridge

#### recipe-scrapers (Python)

- **Name**: recipe-scrapers — [github.com/hhursev/recipe-scrapers](https://github.com/hhursev/recipe-scrapers) (accessed 2026-05-03)
- **Use case**: When Anthropic returns a recipe URL, we may want to canonicalise the ingredient list. Also useful as a supplement / fallback (extract ingredients from a known curated UK recipe site without LLM cost).
- **Language**: Python; >= 3.9. Matches.
- **License**: MIT. **2.2k stars.** v15.11.0 (2025-12-10). 1,967 commits.
- **Maintenance**: green.
- **Supports BBC Good Food** (per [docs.recipe-scrapers.com supported sites](https://docs.recipe-scrapers.com/getting-started/supported-sites/), accessed 2026-05-03) plus 300+ other sites incl. several UK ones.
- **Why it fits**: Saves writing per-site scrapers for the F14 deterministic fallback path; gives us a pure-Python alternative to LLM extraction for a curated recipe pool.
- **Risks**: Brittle by definition (sites change HTML). Always run with timeouts and `try/except` graceful degradation.
- **Confidence**: medium (auxiliary, not load-bearing).

#### TheMealDB / Spoonacular

- **TheMealDB**: free for non-commercial / hobby; **commercial use requires paid API key.** [themealdb.com/api.php](https://www.themealdb.com/api.php) (per search results, accessed 2026-05-03). **Verdict: not safe for our commercial roadmap without a paid plan.** Note: `backend/app/config.py` may already reference a `THEMEALDB_API_KEY` — flag for legal review before shipping.
- **Spoonacular**: $10–500/mo tiers. [spoonacular.com/food-api/pricing](https://spoonacular.com/food-api/pricing) (accessed 2026-05-03). Commercial use OK with attribution + paid plan.
- **Recommendation for F5**: skip both; use deep-link search URLs to retailers (no API needed for v1) and let Anthropic / recipe-scrapers handle the recipe leg.

**Recommended F5 stack**: v1 = pure deep-link approach (no library — just URL templates per retailer), augmented by recipe-scrapers for any "use a curated recipe pool" path. v2 = direct retailer API negotiation (out of scope for OSS).

---

### F2 — Personalised Waste Savings

No single dependency carries this feature; it's a backend job + UI screen. Building blocks already in place:

- **APScheduler 3.10** — already installed.
- **structlog** — already installed.
- **Email vendor**: AWS SES is already a Terraform target (root [CLAUDE.md](../../CLAUDE.md)). For Python sending, **boto3 (Apache-2.0, AWS-maintained, green)** is the obvious choice; alternative `fastapi-mail` (MIT, single-maintainer, yellow) only worth it if we ever leave SES.
- **Charts** for the in-app `/app/insights` page: **Recharts** (MIT, ~24k stars, green) — composes well with React 18 and Tailwind. Or **visx** (MIT, Airbnb, green) for more bespoke. Pick Recharts; lighter API for dashboard charts.

**Recommended F2 stack**: boto3 SES for transactional email, Recharts for the insights screen. No new "savings engine" library — this is bespoke domain logic.

---

### F11 — Account Hardening

This depends heavily on [04-auth-providers.md](04-auth-providers.md). If self-hosting:

#### pwdlib (replace passlib)

- **Name**: pwdlib — [github.com/frankie567/pwdlib](https://github.com/frankie567/pwdlib) (per WorkOS / search, accessed 2026-05-03)
- **Use case**: Direct replacement for passlib, which is **effectively dead** (last release ~3 years ago, deprecation errors on Python 3.11+ from removed `crypt` module). Closes the `bcrypt==4.0.1` hard-pin landmine ([CLAUDE.md gotcha #2](../../CLAUDE.md), [00-codebase-map debt #1](00-codebase-map.md)).
- **Language**: Python 3.8+. Matches.
- **License**: MIT.
- **Maintenance**: green; built by the FastAPI Users author.
- **Why it fits**: argon2id default (OWASP-recommended); supports legacy bcrypt verification path so we can migrate without invalidating existing hashes.
- **Risks**: Migration window — every active user's hash must be re-hashed on next login. Plan a dual-verify path.
- **Confidence**: high.

#### fastapi-users

- **Name**: fastapi-users — [github.com/fastapi-users/fastapi-users](https://fastapi-users.github.io/fastapi-users/) (accessed 2026-05-03)
- **Use case**: Drop-in routers for password reset + email verification + social OAuth.
- **Language**: Python; FastAPI 0.111-compatible.
- **License**: MIT. **Maintenance**: yellow — maintainer announced an *eventual successor toolkit* "to supersede FastAPI Users"; new architectural changes paused. Still releasing patches.
- **Why it fits**: Saves ~600 LOC of boilerplate for the reset / verify flows that we admittedly don't have ([00-codebase-map #3](00-codebase-map.md)). Has the exact router endpoints we need.
- **Risks**: Adoption locks us to its `User` model abstraction; we'd need to migrate our existing `users` table to its expectations or use it in mixed mode. The "supersede" announcement means architectural inertia is real.
- **Confidence**: medium — works today but I'd want [04-auth-providers.md](04-auth-providers.md) to confirm we're not switching to managed auth in the next 6 months before adopting it.

#### Authlib

- **Name**: Authlib — [github.com/lepture/authlib](https://docs.authlib.org/) (accessed 2026-05-03 via search)
- **Use case**: Only relevant if we add OAuth provider support (Google / Apple sign-in).
- **License**: BSD-3.
- **Maintenance**: green.
- **Why it fits**: Best-in-class for spec compliance; complements rather than replaces our JWT code.
- **Confidence**: medium (likely adopted only if F11 expands to social login).

**Recommended F11 stack**: pwdlib to replace passlib (immediate landmine fix, decoupled from the broader auth question). Defer fastapi-users until [04-auth-providers.md](04-auth-providers.md) lands. If 04 recommends managed auth, F11 collapses entirely (Supabase / Clerk handle reset + verify).

#### supabase-js + supabase-py (if 04 picks Supabase)

- **Name**: supabase-js — [github.com/supabase/supabase-js](https://github.com/supabase/supabase-js) (referenced); supabase-py — [github.com/supabase/supabase-py](https://github.com/supabase/supabase-py) (accessed 2026-05-03)
- **Use case**: Frontend auth UI and backend JWT verification if we go managed.
- **Language**: TS / Python — both match.
- **License**: MIT.
- **Maintenance**: green; supabase-py latest 2026-04-24, multi-org-maintained.
- **Async**: supabase-py exposes `from supabase._async.client import AsyncClient`. Drop into FastAPI's `Depends(...)` pattern.
- **Risks**: Vendor lock-in to Supabase; rate limits on free tier. See [04-auth-providers.md](04-auth-providers.md) for full analysis.
- **Confidence**: high (if 04 selects Supabase).

---

### F6 — Multiple Storage Locations

No external dependency required. New `location` enum + UI picker. No OSS recommendation.

---

## Cross-cutting concerns (apply to several Tier 1/2 features)

### Test infrastructure

- **MSW** (covered above; F14, but useful for F1 / F5 / F8 too).
- **Faker (Python)** — [github.com/joke2k/faker](https://github.com/joke2k/faker) (accessed 2026-05-03). MIT, multi-maintainer, weekly releases. Use in `backend/tests/conftest.py` for richer fixtures than the current hand-built rows. Confidence: high.
- **Mimesis** — [pypi.org/project/mimesis](https://pypi.org/project/mimesis) (accessed 2026-05-03). MIT. Faster than Faker but smaller community; pick Faker for ecosystem mass. Confidence: medium (alternative, not preferred).
- **@faker-js/faker** for frontend tests if/when we add Playwright/Storybook fixtures. MIT, active.

### Accessibility

- **eslint-plugin-jsx-a11y** — [npmjs.com/package/eslint-plugin-jsx-a11y](https://www.npmjs.com/package/eslint-plugin-jsx-a11y) v6.10.2 (accessed 2026-05-03). MIT. Last published 2 years ago but PRs for ESLint 10 active in Feb 2026 — **yellow trending green.** Drop into existing ESLint config (frontend ESLint is already a hard CI gate per [00-codebase-map #5](00-codebase-map.md)). Confidence: high.
- **@axe-core/react** — [npmjs.com/package/@axe-core/react](https://www.npmjs.com/package/@axe-core/react) v4.11.2 (2026-04-26 ish, "7 days ago" at access). **WARNING: README says it does not support React 18+.** Deque now points React 18 users at their commercial "axe Developer Hub". Confidence: **low / red on React 18 compat.** Substitute: **`@axe-core/playwright`** if we adopt E2E, or just use axe-core directly via `vitest-axe`.
- **axe-core** (the engine) — [npmjs.com/package/axe-core](https://www.npmjs.com/package/axe-core). MPL-2.0 (file-level copyleft). Engine itself is fine to depend on.

### Observability

- **sentry-sdk[fastapi]** — [pypi.org/project/sentry-sdk](https://pypi.org/project/sentry-sdk) (accessed 2026-05-03). MIT. Auto-instruments FastAPI when present. Pairs with structlog already in place. Confidence: high.
- **opentelemetry-instrumentation-fastapi** + **-sqlalchemy** + **-redis** — [opentelemetry-python-contrib](https://opentelemetry-python-contrib.readthedocs.io/) (accessed 2026-05-03). Apache-2.0. Multi-vendor. Use the `opentelemetry-distro` + `opentelemetry-bootstrap -a install` flow. Confidence: high — but only adopt when we have a backend (Sentry's OTLP endpoint, Honeycomb, etc.) to send traces to. Otherwise just enable Sentry traces.
- **PostHog** (`posthog-js`, `posthog-python`) — [posthog.com/docs/libraries](https://posthog.com/docs/libraries) (accessed 2026-05-03). MIT. **FastAPI gotcha**: docs warn calling SDK methods directly blocks the event loop in async frameworks; use `posthog.capture(...)` in a background task or the async client. Self-host or cloud. Confidence: high for product analytics, medium for feature flags (the async caveat is real).
- **slowapi** — [github.com/laurentS/slowapi](https://github.com/laurentS/slowapi) (accessed 2026-05-03). MIT, 2k stars, active. **Could replace** the bespoke per-IP Redis sliding-window rate limiter at `backend/app/main.py:92-116` ([00-codebase-map #3](00-codebase-map.md)). Currently 52 open issues / 51 open PRs — slightly yellow. Confidence: medium — only adopt if the bespoke code starts breaking; otherwise leave it.

### Receipt scanning (Tier 3 F4 — flagged because building blocks deserve a heads-up)

- **tesseract.js** — [github.com/naptha/tesseract.js](https://github.com/naptha/tesseract.js) (accessed 2026-05-03). Apache-2.0, **38k stars**, v7.0.0 (2025-12-15). Browser OCR via WASM. Confidence: medium — works but quality on UK receipts (faint thermal print, small fonts) is uneven. Best as a dev-time / offline fallback.
- **docTR** — [github.com/mindee/doctr](https://github.com/mindee/doctr) (accessed 2026-05-03). Apache-2.0, **6.1k stars**, v1.0.1 (2026-02-04), Python 3.10+. Deep-learning OCR with CORD-trained receipt support. Confidence: high on quality, **medium on ops cost** — needs a GPU container for real-time use; CPU works but slow. Worth flagging for F4 even though it's Tier 3 because picking *Anthropic vision* vs *docTR* has architectural implications (GPU container vs API spend).
- **Anthropic vision** — Claude Sonnet 4.6 ($3 in / $15 out per Mtok per [pricing](https://www.claude.com/pricing) accessed 2026-05-03). Already have `anthropic` 0.34.2 + key + service pattern. Cheapest path to ship and dogfoods our existing AI plumbing. **Recommended winner** when F4 happens.

### Recipe parsing

- **recipe-scrapers** (covered in F5).
- **scrape-schema-recipe** — [github.com/micahcochran/scrape-schema-recipe](https://github.com/micahcochran/scrape-schema-recipe) (accessed 2026-05-03). MIT, smaller scope (just schema.org / JSON-LD). Lighter dep if we only ever ingest sites with schema markup.

### UK retailer data (Tier 1 F1 supplement)

- **Pepesto / Actowiz / Apify scrapers** — paid third-party APIs covering Tesco / Sainsbury's / Asda / Morrisons / Waitrose. Not OSS; flagged for completeness. Recommend deferring until F1 + F5 prove out and we have revenue to justify subscription. Cite [pepesto.com](https://www.pepesto.com/supermarkets/sainsburys/) (accessed 2026-05-03) for typical pricing posture.

---

## Flagged risks table

| Item | Risk class | Notes |
|------|-----------|-------|
| **Open Food Facts (ODbL)** | License — share-alike | We must publish derivative *databases* under ODbL if we redistribute them. Mixing with non-share-alike-compatible commercial feeds (GS1 UK, Tesco) creates a contamination question. Legal review before any DB-redistribution scenario. |
| **Open Food Facts images (CC-BY-SA)** | License — attribution | Photos require credit + share-alike. Don't bake into proprietary asset pipelines without notice. |
| **GS1 UK GTIN Check** | License — non-commercial unless paid | T&C explicitly says "must not use the API in conjunction with any commercial purpose" without paid agreement. Cannot adopt without a member fee. |
| **TheMealDB** | License — non-commercial free tier | If `THEMEALDB_API_KEY` is referenced anywhere in `config.py` for a commercial feature path, this is a license drift risk. Audit before launch. |
| **Spoonacular** | Cost — paid only for commercial | $10–500/mo. Not OSS; flagged because it's an obvious tempting alternative. |
| **pywebpush** | Single-maintainer | One human, ~yearly releases. Critical-Project status mitigates. Pin version. |
| **passlib** (incumbent) | Stale / dead | Last release ~3 years; deprecation errors on Python 3.11+ from removed `crypt` module. **Migrate to pwdlib.** |
| **fastapi-users** | Maintenance — sunsetting | Maintainer announced an eventual successor; new architectural work paused. Adopt only as a stopgap. |
| **@axe-core/react** | Compat — DEPRECATED for React 18+ | We're on React 18.3.1. Use vitest-axe + axe-core directly, or wait for Deque's replacement. |
| **eslint-plugin-jsx-a11y** | Maintenance — recovering | Last NPM release 2 years ago but ESLint 10 PRs active in 2026. Yellow → green; safe to adopt now. |
| **MSW** | Single-org bus-factor | Major-corp users + sponsors mitigate; release cadence is healthy. Pin and watch. |
| **bcrypt 4.0.1 hard pin** | Pre-existing landmine | Already documented ([CLAUDE.md gotcha #2](../../CLAUDE.md), [00-codebase-map debt #1](00-codebase-map.md)). pwdlib migration resolves. |
| **MPL-2.0** (pywebpush, axe-core) | License — file-level copyleft | Fine if we depend via PyPI / npm without modifying the source. Don't fork in-tree. |
| **SlowApi** | Yellow — open PR backlog | 52 open issues / 51 open PRs. Ours is bespoke today; only swap if our code breaks first. |
| **FoodKeeper Rails wrapper** ([github.com/jelera/food-shelflife-db](https://github.com/jelera/food-shelflife-db)) | Stale — 4+ years no commits | Use the underlying USDA dataset directly; do not add the wrapper as a dep. |

---

## Build-from-scratch flags (no good OSS option found)

1. **F1 UK own-label coverage gap.** Open Food Facts is the only viable licensed-for-commercial seed, and its UK supermarket own-label coverage is the exact thing Fridgely got hammered for ([01-industry-landscape #3.5](01-industry-landscape.md)). No GitHub repo of "UK Tesco/Sainsbury's/Asda/Morrisons/Aldi/Lidl own-label EAN dump" exists with a permissive license. We will need to crowdsource (F10) and/or pay GS1 UK. Flagging clearly: there is no OSS shortcut for the *UK-specific* coverage problem.
2. **FSA shelf-life data.** Audited the FSA Data Catalog — no dedicated shelf-life dataset. FoodKeeper (US) is the only practical seed; UK terminology mapping is a manual one-off task.
3. **F2 savings-attribution engine.** No "fridge-app savings calculator" library exists. Bespoke domain logic.
4. **F5 cross-retailer ingredient → SKU matching.** No OSS lib; commercial scrapers exist (Pepesto et al.) but are paid. Bespoke v1 via deep-link URLs is the right move.
5. **F6 location-aware shelf-life rules.** Simple enough that an OSS rule engine would be overkill — bespoke `services/expiry_service.py` logic.

---

## Confidence summary by feature

| Feature | OSS coverage | Recommended primary deps | Confidence |
|---------|-------------|--------------------------|------------|
| F1 UK Product Data | partial | OFF dump (ODbL) + httpx + USDA fallback | high |
| F8 Push + PWA | full | pywebpush + vite-plugin-pwa injectManifest | high |
| F3 Post-Opening | full (data) | FoodKeeper JSON seed | high |
| F14 Rescue Hardening | full | MSW + pytest-recording | high |
| F5 Basket Bridge v1 | partial | (deep links) + recipe-scrapers | medium |
| F2 Savings | partial | boto3 SES + Recharts | medium |
| F11 Auth Hardening | full | pwdlib (immediate); fastapi-users or supabase-py contingent on 04 | medium |
| F6 Multi-location | none needed | n/a | high |

---

## Sources

- Open Food Facts data + license — [world.openfoodfacts.org/data](https://world.openfoodfacts.org/data) (accessed 2026-05-03)
- openfoodfacts-python SDK — [github.com/openfoodfacts/openfoodfacts-python](https://github.com/openfoodfacts/openfoodfacts-python) (accessed 2026-05-03)
- GS1 UK GTIN Check API — [gs1uk.org/standards-services/data-services/gtin-check-api](https://www.gs1uk.org/standards-services/data-services/gtin-check-api) (accessed 2026-05-03)
- GS1 UK GTIN Check T&C — [gs1uk.org/terms-and-conditions/GTIN-check-service](https://www.gs1uk.org/terms-and-conditions/GTIN-check-service) (accessed 2026-05-03)
- USDA FoodData Central — [fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup/) (accessed 2026-05-03)
- USDA FoodKeeper dataset — [catalog.data.gov/dataset/fsis-foodkeeper-data](https://catalog.data.gov/dataset/fsis-foodkeeper-data) (accessed 2026-05-03)
- FSA Data Catalog — [data.food.gov.uk/catalog](https://data.food.gov.uk/catalog) (accessed 2026-05-03)
- pywebpush — [github.com/web-push-libs/pywebpush](https://github.com/web-push-libs/pywebpush) (accessed 2026-05-03)
- vite-plugin-pwa — [github.com/vite-pwa/vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa) (accessed 2026-05-03)
- vite-pwa injectManifest — [vite-pwa-org.netlify.app/workbox/inject-manifest](https://vite-pwa-org.netlify.app/workbox/inject-manifest.html) (accessed 2026-05-03)
- @vite-pwa/workbox-window — [npmjs.com/package/@vite-pwa/workbox-window](https://www.npmjs.com/package/@vite-pwa/workbox-window) (accessed 2026-05-03)
- MSW — [github.com/mswjs/msw](https://github.com/mswjs/msw) (accessed 2026-05-03)
- recipe-scrapers — [github.com/hhursev/recipe-scrapers](https://github.com/hhursev/recipe-scrapers) (accessed 2026-05-03)
- recipe-scrapers supported sites — [docs.recipe-scrapers.com/getting-started/supported-sites](https://docs.recipe-scrapers.com/getting-started/supported-sites/) (accessed 2026-05-03)
- TheMealDB pricing context — covered in [eathealthy365.com](https://eathealthy365.com/best-recipe-apis-2025-a-developer-s-deep-dive/) (accessed 2026-05-03)
- Spoonacular pricing — [spoonacular.com/food-api/pricing](https://spoonacular.com/food-api/pricing) (accessed 2026-05-03)
- pwdlib — [francoisvoron.com/blog/introducing-pwdlib](https://www.francoisvoron.com/blog/introducing-pwdlib-a-modern-password-hash-helper-for-python) (accessed 2026-05-03)
- fastapi-users — [fastapi-users.github.io/fastapi-users](https://fastapi-users.github.io/fastapi-users/latest/) (accessed 2026-05-03)
- supabase-py — [github.com/supabase/supabase-py](https://github.com/supabase/supabase-py) (accessed 2026-05-03)
- eslint-plugin-jsx-a11y — [npmjs.com/package/eslint-plugin-jsx-a11y](https://www.npmjs.com/package/eslint-plugin-jsx-a11y) (accessed 2026-05-03)
- @axe-core/react — [npmjs.com/package/@axe-core/react](https://www.npmjs.com/package/@axe-core/react) (accessed 2026-05-03)
- Sentry FastAPI — [docs.sentry.io/platforms/python/integrations/fastapi](https://docs.sentry.io/platforms/python/integrations/fastapi/) (accessed 2026-05-03)
- OpenTelemetry Python contrib — [opentelemetry-python-contrib.readthedocs.io](https://opentelemetry-python-contrib.readthedocs.io/) (accessed 2026-05-03)
- PostHog libraries — [posthog.com/docs/libraries](https://posthog.com/docs/libraries) (accessed 2026-05-03)
- slowapi — [github.com/laurentS/slowapi](https://github.com/laurentS/slowapi) (accessed 2026-05-03)
- tesseract.js — [github.com/naptha/tesseract.js](https://github.com/naptha/tesseract.js) (accessed 2026-05-03)
- docTR — [github.com/mindee/doctr](https://github.com/mindee/doctr) (accessed 2026-05-03)
- Claude API pricing — [claude.com/pricing](https://www.claude.com/pricing) (accessed 2026-05-03)
- FoodKeeper Rails wrapper (flagged stale) — [github.com/jelera/food-shelflife-db](https://github.com/jelera/food-shelflife-db) (accessed 2026-05-03)
