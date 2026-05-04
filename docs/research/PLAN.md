# PLAN.md — FridgeCheck synthesised plan

_Written 2026-05-03. Synthesises [00-codebase-map.md](00-codebase-map.md), [01-industry-landscape.md](01-industry-landscape.md), [02-feature-opportunities.md](02-feature-opportunities.md), [03-open-source.md](03-open-source.md), [04-auth-providers.md](04-auth-providers.md), [05-claude-skills.md](05-claude-skills.md). All web-verified claims accessed 2026-05-03 unless noted._

---

## TL;DR

The market is converging fast and Tesco ships its own in-Clubcard AI meal-planning assistant later in 2026 ([01-industry-landscape.md#1](01-industry-landscape.md)) which directly overlaps our rescue-recipes pitch. Our defensible position is **cross-retailer neutrality + personalised waste data + UK-tuned product DB** — none of which Tesco can match from inside a single retailer's loyalty walled garden.

Before any feature work: replace `passlib` with `pwdlib` to defuse the `bcrypt==4.0.1` landmine, write a frontend test baseline, and decide on the Supabase Auth migration. After that, build in this order: F1 UK Product DB → F8 Push/PWA → F3 Post-opening shelf life → F14 Rescue-recipe hardening, with F11 Account hardening pulled forward if Supabase is adopted.

---

## 1. Recommended top features

In priority order. Each line of rationale ties to a specific industry-research finding.

### Tier 1 — build next

| # | Feature | Why first | Effort | Industry signal |
|---|---|---|---|---|
| 1 | **F1 — UK Product Data Overlay** | Fridgely's UK reception ([01-industry-landscape.md#3.5](01-industry-landscape.md)) proves a US-skewed product DB kills a UK launch on its own. F2/F4/F5/F10 are all materially worse without it. **It is both a feature and a precondition** — that is why it's #1 despite being the largest item. | L | "appears aimed at Americans" — verified UK reviewer quote |
| 2 | **F8 — Push notifications + PWA polish** | NoWaste's most-cited complaint is notifications "fire only in-app, not on the device" ([01-industry-landscape.md#4.3](01-industry-landscape.md)). Without push, our APScheduler expiry-warning worker is inert. `vite-plugin-pwa` is already installed ([00-codebase-map.md §1](00-codebase-map.md)) — we have the infra; we lack the delivery channel. | M | iOS Safari supports Web Push since 16.4 if PWA-installed |
| 3 | **F3 — Post-opening shelf-life tracking** | Only Best Before and partially NoWaste track "opened X days ago, use within Y" ([01-industry-landscape.md#3.6](01-industry-landscape.md)). Opened jars / sauces / dips are a huge slice of UK waste. Cheapest gap-closer in the category. | S | Single column + small UI affordance |
| 4 | **F14 — Rescue-recipe hardening** | Most expensive (Anthropic API), most fragile (JSON parsing), least tested code path ([00-codebase-map.md §5–7](00-codebase-map.md)). Tesco AI shipping in 2026 means this needs to be *better* than theirs, not just present. Unblocks F5. | S–M | Make model name a config var; canned-response tests; deterministic non-AI fallback |
| 5 | **F11 — Account hardening** (password reset, email verification, MFA-ready) | Apple Store Guideline 5.1.1(v) requires user-initiated account deletion in any app with user accounts; missing password reset is a routine reviewer rejection ([00-codebase-map.md §3, §6](00-codebase-map.md) confirms we have neither). Collapses from M to S effort once Supabase Auth lands (§2), and bundles magic-link login. **Mandatory for app-store submission.** | S (with managed auth) | App Store Review Guideline 5.1.1(v); Supabase magic-link is near-free |

### Tier 2 — build next-next

| # | Feature | Why next | Effort | Notes |
|---|---|---|---|---|
| 6 | **F2 — Personalised waste savings** | Replaces the stale £730 figure (WRAP 2018 — same source Kitche cites; we don't differentiate by repeating it; WRAP 2026 says ~£1,000 / household-of-four — [01-industry-landscape.md#1](01-industry-landscape.md)) with a per-user *measured* savings story Tesco's Clubcard data structurally cannot generate. | M | Needs F1 (price data) + F3 (waste vs consumed signal) to be credible |
| 7 | **F5 — Rescue-recipe → UK basket bridge (v1)** | Cherrypick / Mealia / Tesco AI all converge on the *upstream* recipe → basket flow ([01-industry-landscape.md#3.12, 3.14](01-industry-landscape.md)). Nobody connects it the *other* way: rescue recipe → "you have 3 of 5 ingredients, deep-link the missing 2 to whichever of Tesco / Sainsbury's / Asda / Morrisons is cheapest". v1 is deep-link only — no integration cost. | M (v1) | Cross-retailer neutrality is the thing Tesco AI structurally can't ship |

### Why this order specifically

- **F1 is unavoidable** despite being the largest item. The Fridgely warning is concrete enough that we'd be repeating their failure if we shipped F2/F4/F5/F10 on top of OFF alone.
- **F8 over F3** because push is the difference between "I check the app" and "the app saves me from waste" — F3 is a great feature, but only matters if the user is opening the app anyway.
- **F14 cheap and defensive** before F5 ambitious — we should not bet against Tesco with a flaky JSON parser.
- **F2 in Tier 2 not Tier 1** because it depends on F1 being good enough to attach prices to products. Shipping F2 before F1 means inflated/wrong numbers, which destroys the trust the feature is supposed to build.
- **F11 is Tier 1 #5 strategically, but build-sequence #3** (after auth migration phases 0–4 and before minimum-viable F1). Strategically last because the other four are user-facing differentiation and F11 is table-stakes hygiene; tactically third because it's the cheapest, most reviewer-blocking item once Supabase is in place — landing it early closes App Store Guideline 5.1.1(v) risk before any reviewer sees the build, and lets every later feature ship behind a verified-account flow rather than getting retrofitted.

### 2-month MVP launch order (Q3 — A + C combined)

The Tier 1/2/3 view above is the **strategic** prioritisation. The **tactical** order for hitting the 2-month app-store deadline (Q3 option A trim, shipped via TestFlight / Play closed-track per option C) is:

**Step 0 — Clean up the runway (1-week sprint, before any auth work).** None of these are negotiable; without them the auth migration is unverifiable and F2 is permanently unattributable.

- §5 #1 — `passlib` → `pwdlib` swap. Independent of every other decision; defuses the bcrypt-4.0.1 pin.
- §5 #2 — Frontend test baseline (RTL component tests + hook tests + `msw`; delete `--passWithNoTests` from CI). **Without this landing before the auth migration, every subsequent step in §2 is unverifiable** — there is no regression net to catch a broken login path.
- §5 #3 — Flip `mypy continue-on-error` to false; gate the build on what strict mode catches today.
- §5 #5 — Make Anthropic model name a config var (precondition for F14).
- §5 #6 — `consumption_events` table migration (consumed-vs-wasted disposition; precondition for F2 attribution).

Then the build sequence:

1. **Auth migration phases 0–4** (§2). Step 0 (5-user spike + username/email audit) plus dual-write through to backfill.
2. **F11 — Account hardening** (now S-effort, magic-link near-free). Closes the App Store 5.1.1(v) gap.
3. **Minimum-viable F1**: move OFF lookup to backend + Redis cache (§5 #4). UK overlay seeding deferred to post-launch.
4. **F8 push + PWA hardening + Capacitor packaging** (§8). End-to-end Web Push verified on a real iOS device.
5. **F14 rescue-recipe hardening**.
6. **TestFlight / Play closed-track cutover.** ← 2-month milestone.
7. **Full F1 UK overlay** — post-launch (4–8 weeks).
8. **F3 post-opening shelf-life tracking** — post-launch.

Out of v1 (per Q3 / Q4): full F1 UK overlay seeding, F3, F5 basket bridge, F2 savings, F4 receipt scanning. They land in the public-launch wave after the TestFlight cohort validates the trim-list.

### Explicitly rejected (and why, briefly)

- **Apple Watch / widgets (F12)** — needs native shells we don't have; value-to-lift ratio is bad at our stage.
- **Repeating the £730 figure with a fresher cite** — doesn't differentiate (Kitche uses the same source). F2 is the durable answer.
- **Building our own surplus-food marketplace** — wrong problem; F13 hand-off to Olio / TGTG is the right scope.
- **"FridgeCheck Premium" as a roadmap item** — pricing is a go-to-market call, not a feature.

---

## 2. Auth migration path

### Recommendation: Supabase Auth

**Rationale** ([04-auth-providers.md](04-auth-providers.md)):
- Asymmetric JWT keys (RS256/ES256/Ed25519) launched July 2025 — eliminates HS256 shared-secret concern.
- bcrypt hash import is a direct SQL INSERT (matching Supabase's own migration guide) — our existing `$2b$` hashes survive without rehash.
- Pro overage at $0.00325/MAU is the cheapest of any provider; covers 50k MAU on the $25/mo Pro plan.
- EU residency in London + Frankfurt is first-class — UK GDPR posture is solid.
- Open-source GoTrue under the hood — exit path is `pg_dump` of `auth.users`.

**Anti-picks:** AWS Cognito (cannot export password hashes — locks us in permanently); WorkOS (no EMEA region as of 2026-05-03 — disqualifying for our market).

**Runner-up:** Auth0, only viable under ~25k MAU; paid pricing escalates fast.

### Concrete migration steps

| # | Step | When | Reversible? |
|---|---|---|---|
| 0 | **`passlib` → `pwdlib` swap.** Keep bcrypt verification for legacy hashes; new hashes go to argon2id. **Independent of the auth migration — do this regardless.** Fixes the `bcrypt==4.0.1` landmine in [00-codebase-map.md §6 #1](00-codebase-map.md). Unblocks Dependabot. | Week 0 | Yes — git revert |
| 1 | **5-user spike.** Pick 5 real (test-account) bcrypt hashes from `users.hashed_password`. Direct-INSERT into a Supabase project's `auth.users.encrypted_password`. Verify each can log in via Supabase. **This is mandatory because Supabase issue [auth#1678](https://github.com/supabase/auth/issues/1678) shows `admin.createUser` can fail silently with mismatched PHC prefixes** ([03-open-source.md](03-open-source.md), [04-auth-providers.md](04-auth-providers.md)). **Also audit `users.username` vs `users.email`**: Supabase Auth is email-first; if any rows have a username distinct from their email, run a one-off email-canonicalisation migration before the bulk import in step 4 ([04-auth-providers.md §Risks called out](04-auth-providers.md)). | Week 1 | Yes — discard the spike Supabase project |
| 2 | **Dual-write window.** Add a Supabase client to `auth_service.py`. On register/login/password-change, write to both stores. Reads continue to come from our DB. New refresh-token rotation continues against our `refresh_tokens` table. | Week 2 | Yes — flip writes back to DB-only |
| 3 | **Frontend SDK swap behind a feature flag.** Install `@supabase/supabase-js`. New code path uses Supabase session; old code path keeps the localStorage tokens working. `AuthContext` becomes the switch. | Week 2–3 | Yes — flag default off |
| 4 | **Backfill.** Bulk SQL INSERT all remaining `users` rows into `auth.users`. Handle duplicates idempotently. Run during a low-traffic window. | Week 3 | Yes — `auth.users` rows can be deleted; our DB is unaffected |
| 5 | **Cutover.** Flip the feature flag to "Supabase by default" for new sessions. Old sessions naturally migrate as their refresh tokens rotate (7-day window — [00-codebase-map.md §3](00-codebase-map.md)). | Week 4 | Yes for ~7 days (until refresh tokens rotate); after that, partial — need to re-mint tokens |
| 6 | **Move tokens out of localStorage.** Switch to Supabase's session-cookie pattern (httpOnly + Secure + SameSite). Remove the manual axios interceptor in [`frontend/src/api/client.ts`](../../frontend/src/api/client.ts). Closes tech debt #2. | Week 4–5 | Yes — keep both code paths during the swap |
| 7 | **Deprecate `refresh_tokens` table.** Stop writing to it. After 30 days (longest possible refresh-window expiry), drop the table in a new migration. | Week 8+ | Mostly — table is gone, but data preserved in dump |
| 8 | **Pull F11 into the migration.** Email verification, password reset, social login (Google + Apple), magic-link, MFA — all come for free with Supabase Auth. Closes tech debt #8. | Week 4 onwards | n/a |

### Rollback strategy

The migration is engineered so any step can be unwound until step 6. Specifically:

- **Up to step 5:** our DB still has every hash and every refresh token. Flipping the feature flag back to "DB-only" returns us to today's state; no user is locked out.
- **Step 6 (cookies):** keep both axios+localStorage and Supabase session-cookie code paths for at least 30 days. If we discover a bug post-cutover, flip the flag and old code reads localStorage tokens minted before cutover.
- **Step 7 (table drop):** the dump from step 4 is the rollback point. Until that dump is taken and verified, do not drop.
- **Failure mode we cannot recover from:** if step 1 (5-user spike) silently succeeds but a real user can't log in post-cutover, we discover it only when they try. **Mitigation:** in step 5, log every first-login-against-Supabase event; if the rate of refresh-token failures spikes >2× baseline within 24h of cutover, auto-revert the flag.

---

## 3. Open-source dependencies to adopt

### Adopt now (independent of feature work)

| Dependency | License | Where it slots | Why |
|---|---|---|---|
| **`pwdlib`** ([03-open-source.md](03-open-source.md)) | MIT | [`backend/app/services/auth_service.py:16`](../../backend/app/services/auth_service.py:16) replaces `passlib.context.CryptContext` | passlib is effectively unmaintained (~3 years since last release; raises deprecation errors on Python 3.11+ from removed `crypt` module). It is the proximate cause of the `bcrypt==4.0.1` hard pin. pwdlib is from the FastAPI Users author, defaults to argon2id, supports legacy bcrypt verification for migration. **Single highest-leverage dep change in the codebase.** |

### Adopt during Tier 1

| Dependency | Slots into | License | Notes |
|---|---|---|---|
| **`pywebpush`** | F8 backend (worker → push subscriptions) | MPL-2.0 | Standard library for Web Push from Python. |
| **`web-push` (npm)** | F8 service worker | MIT | Frontend subscribe + VAPID key generation. |
| **VAPID key generation in CI** | F8 deploy | n/a | One pair per env; never rotate without staged migration. |
| **Open Food Facts data dump** | F1 backend cache | **ODbL** ⚠ | **Legal review required** before architecting F1. ODbL is share-alike on the *database* — mixing OFF data with commercial-licensed retailer feeds creates a contamination question. See [03-open-source.md](03-open-source.md) flagged-risks table. |

### Adopt during Tier 2 / migration

| Dependency | Slots into | License | Notes |
|---|---|---|---|
| **`supabase-py`** | Backend Supabase client (step 2 above) | MIT | Async-friendly. |
| **`@supabase/supabase-js`** | Frontend SDK (step 3) | MIT | Replaces our hand-rolled axios refresh interceptor. |
| **`msw` (Mock Service Worker)** | Frontend test infra | MIT | Mocks `apiClient` calls in vitest; enables hook tests without a backend. |
| **`vitest-axe` + `axe-core` + `eslint-plugin-jsx-a11y`** | Accessibility CI gate | MIT / MPL-2.0 | `@axe-core/react` doesn't support React 18+ ([03-open-source.md §Cross-cutting concerns / Accessibility](03-open-source.md)); FridgeCheck is on React 18.3.1. Substitute is `vitest-axe` + `axe-core` directly (or `@axe-core/playwright` once E2E lands). Pairs with the `accessibility` Claude skill (§4). |
| **`vitest` config + `@testing-library/react` (already installed)** | Frontend tests | MIT | Already in `package.json` — just unused. |

### Build, don't buy

[03-open-source.md](03-open-source.md) flagged three areas where no good OSS option exists:

- **UK supermarket own-label EAN coverage** (F1 core). No GitHub repo, no permissive dataset. Honest answer is **crowdsource (F10) + eventual paid GS1 UK membership.**
- **F2 savings-attribution engine.** Bespoke; no library encodes "how to map a soft-deleted item to a counterfactual £ saved".
- **F5 cross-retailer ingredient → SKU matching.** Bespoke; no library aligns Tesco / Sainsbury's / Asda / Morrisons SKU schemas.

---

## 4. Claude skills to install

Per [05-claude-skills.md](05-claude-skills.md), the verified starter pack expands from the 5 first-party skills to 9 once community sources are included. Recommended install order:

| # | Skill | Source | Use case for FridgeCheck |
|---|---|---|---|
| 1 | **webapp-testing** | `anthropics/skills` | Plays into the biggest existing gap: zero E2E tests. Plays a real browser against the 8000/5173 dev topology. |
| 2 | **test-driven-development** | `obra/superpowers` | Addresses [00-codebase-map.md §5](00-codebase-map.md) — frontend has zero tests; backend rescue-recipe service has zero tests. |
| 3 | **fastapi-expert** | community | Routine pattern-checking against our layered architecture conventions ([backend/CLAUDE.md](../../backend/CLAUDE.md)). |
| 4 | **security-reviewer** | community | Direct fit for tech debt #1, #2, #6 in [00-codebase-map.md §6](00-codebase-map.md) (bcrypt pin, localStorage tokens, refresh-token replay detection). |
| 5 | **accessibility** | community | We have a UI-heavy product and `ui-ux-pro-max` already in use; accessibility extends the design-system audit to WCAG 2.2 AA. |
| 6 | **claude-api** | `anthropics/skills` | Used directly during F14 (rescue-recipe hardening) and F4 (receipt scanning via Anthropic vision). |
| 7 | **mcp-builder** | `anthropics/skills` | Strategic. A "FridgeCheck MCP" — "ask Claude what's expiring in my fridge" — is a defensible play that reuses our `/api/v1/items/expiring-soon` endpoint. Cheap to build later if we install this now. |
| 8 | **skill-creator** | `anthropics/skills` | Force multiplier — lets us build custom FridgeCheck skills (Alembic-migration safety reviewer, urgency-tier-rules linter, OWASP for our specific shape). |
| 9 | **postgres-pro** | community | F1 schema design and the soft-delete + partial-index patterns ([backend/CLAUDE.md](../../backend/CLAUDE.md)) benefit from review. |

Detailed install commands and per-skill `SKILL.md` extracts are in [05-claude-skills.md](05-claude-skills.md).

---

## 5. Architectural changes needed before feature work

These are **must-haves** before any Tier 1 feature is started. Doing them in parallel with the roadmap discussion is fine; doing F1/F8 before any of them is not.

| # | Change | Why | Where |
|---|---|---|---|
| 1 | **`passlib` → `pwdlib`** | Defuses the bcrypt-4.0.1 hard pin; unblocks all dependency updates. Independent of any other decision. | [`backend/app/services/auth_service.py:16`](../../backend/app/services/auth_service.py:16), [`backend/pyproject.toml:20-21`](../../backend/pyproject.toml:20) |
| 2 | **Frontend test baseline** | Currently zero `*.test.*` files; CI passes vacuously on `--passWithNoTests`. Write 3-5 RTL component tests + 2-3 hook tests, install `msw`, then **delete `--passWithNoTests` from [.github/workflows/ci.yml](../../.github/workflows/ci.yml)**. Pair with `test-driven-development` skill. | `frontend/src/**/*.test.tsx`, [.github/workflows/ci.yml](../../.github/workflows/ci.yml) |
| 3 | **Flip `mypy continue-on-error` to false** | Strict mode is decorative today ([00-codebase-map.md §6 #4](00-codebase-map.md)). Fix what breaks; gate the build. | [.github/workflows/ci.yml](../../.github/workflows/ci.yml) `lint-python` |
| 4 | **Move OFF lookup from frontend to backend** | Today the frontend hits Open Food Facts directly ([00-codebase-map.md §7 #8](00-codebase-map.md)) — no caching, no rate-limiting, no UK overlay surface. Precondition for F1. | New `backend/app/api/v1/routes/products.py` + `services/product_service.py` |
| 5 | **Make Anthropic model name a config var** | Currently hardcoded to `claude-sonnet-4-20250514` in `services/rescue_recipe_service.py` ([00-codebase-map.md §7 #7](00-codebase-map.md)). Required for F14 and any future model bump. | `config.py` — add `anthropic_model: str = "claude-sonnet-4-20250514"` |
| 6 | **Add `disposition` tracking via a new `consumption_events` table per F2** | Today, "delete" doesn't distinguish consumed vs wasted. Without that signal, F2 is fiction. The dedicated table beats an enum on `pantry_items` because it preserves analytics history after the parent item is purged ([02-feature-opportunities.md F2](02-feature-opportunities.md)). | New Alembic migration; new `models/consumption_event.py`; `item_service.delete` updated to write a `consumption_events` row |
| 7 | **Decide on auth migration before scoping F11** | Supabase yes/no flips F11 from M to S effort and changes whether we ship our own password-reset flow. See §2 for the recommendation. | Decision, not code |
| 8 | **Bump backend coverage gate from 55%** | 55% leaves rescue-recipe service + worker untested ([00-codebase-map.md §5](00-codebase-map.md)). Add a coverage gate for the rescue-recipe path specifically; bump global to 70% over two sprints. | [.github/workflows/ci.yml](../../.github/workflows/ci.yml) `--cov-fail-under` |
| 9 | **CLAUDE.md drift fixed** ✅ | Already done in this pass: token lifetimes (15→30 min, 30d→7d), `JWT_SECRET_KEY` → `SECRET_KEY`, `VITE_API_BASE_URL` → `VITE_API_URL`, auth-deps file path, fixture description (rollback → create+drop), and rate-limiting note added. | [CLAUDE.md](../../CLAUDE.md), [backend/CLAUDE.md](../../backend/CLAUDE.md) |
| 10 | **Update landing-page £730 copy → WRAP 2026 ~£1,000-per-household-of-four** with a working cite. (Per §6 Q3 / §9 — interim copy until F2 ships a live "FridgeCheck users saved an average of £X last month".) | The current £730 figure is unsourced and stale; same WRAP 2018 source Kitche cites — repeating it does not differentiate. Cheap pre-launch task; risks falling through the cracks. | Landing page hero copy + [README.md](../../README.md) marketing line. Cite: <https://www.wrap.ngo/media-centre/press-releases/sunday-15-march-average-uk-household-four-will-have-already-wasted> |

---

## 6. Open questions you need to answer before execution

These block planning, not just engineering. Listed in roughly the order the answer is needed.

| # | Question | Why it matters | Recommendation |
|---|---|---|---|
| 1 | **ODbL legal review for F1.** Are we OK seeking legal sign-off on Open Food Facts use before architecting F1? Can we afford a paid GS1 UK membership later? | F1 architecture differs materially based on whether we can mix OFF with retailer feeds. | Get legal opinion in week 0; budget for GS1 UK in year 2 |
| 2 | **Supabase Auth — green-light or self-host?** Migration is reversible up to step 5 but lock-in increases after step 7. Are we comfortable with the trade-off? | §2 entire migration plan depends on this. | Go — the open-source GoTrue + `pg_dump` exit path makes lock-in soft |
| 3 | **£730 marketing copy fix.** Three options: (a) keep with explicit 2018 source cite; (b) update to WRAP 2026 (~£1,000 / household-of-four); (c) replace with live aggregate from F2 ("FridgeCheck users saved an average of £X last month"). | Repeating 2018 figure without citation is fragile; same source Kitche uses ([01-industry-landscape.md#3.1](01-industry-landscape.md)). | Ship (b) immediately as a holding move; replace with (c) once F2 has 4 weeks of data |
| 4 | **Email transactional vendor.** Required for F11 (password reset, email verification), F2 (weekly recap), F15 (annual recap). | SES already in our Terraform/AWS — but reputation management on shared SES IPs is a real cost. | Start on SES; budget for Postmark / Resend if deliverability suffers |
| 5 | **Tesco competitive posture.** Cross-retailer neutrality (F5 v1) or head-on rescue-recipe quality (F14)? | Both are defensible. F5 v1 is cheap; F14 is on the critical path anyway. | Both — they don't conflict; F14 is defensive, F5 is offensive |
| 6 | **Receipt-scanning vendor (F4 in Tier 3).** Anthropic vision vs Taggun / Veryfi / Klippa. Per-receipt cost vs DX. | Decision affects F4 viability date. | Defer until F1 lands; until then, line-item parsing has nowhere good to go |
| 7 | **MAU forecast confidence.** [04-auth-providers.md](04-auth-providers.md) priced 1k / 10k / 50k MAU tiers. Which is realistic for end-2026? | At >50k MAU, Supabase Pro hits overage; the math still works but worth knowing. | Worst-case budget for 50k MAU on Supabase Pro = $25/mo + ~$130/mo overage |
| 8 | **Reddit qualitative signal.** [01-industry-landscape.md §4.3](01-industry-landscape.md) flags Reddit was blocked — no direct quotes. | Loss of voice-of-customer. | Spend 1 hour with a browser before F1 starts; pull 10 quotes manually |
| 9 | **F11 timing.** If a paid pilot is on the near roadmap, F11 must move into Tier 1. | Charging without password-reset is a non-starter. | If pilot is <3 months away → F11 to Tier 1; otherwise leave in Tier 2 |
| 10 | **Apple-store readiness.** F8 depends on PWA install; F4/F7 are easier with a native shell. Do we have iOS/Android expertise on hand? | Determines whether a thin native shell is in the year-1 plan. | If no native expertise: PWA-only for 12 months; revisit when MAU >25k |

---

## 7. Confidence and caveats

- **Web verification is real.** Phases 2a, 2d, 2e, 2c all confirmed live web access on 2026-05-03 across competitor pages, provider pricing pages, GitHub repos, and OSS license docs. Phase 2a flagged Reddit as unfetchable — see open question #8.
- **Phase 1 was written by me from direct file reads** (the Explore subagent had no Write tool). Every path:line citation was verified at write time.
- **CLAUDE.md drift was reconciled** in [CLAUDE.md](../../CLAUDE.md) and [backend/CLAUDE.md](../../backend/CLAUDE.md) before this plan was written.
- **The £730 figure is stale** — flagged in [01-industry-landscape.md](01-industry-landscape.md) and surfaced as open question #3. Do not ship landing-page copy with an unlinked £730 claim.
- **`auth#1678` Supabase issue** is the single biggest unknown in the migration plan. The 5-user spike (step 1 of §2) is mandatory mitigation.
- **No code has been modified beyond the CLAUDE.md drift fixes and the docs/research/* files**, per the brief.

This plan is ready for review.

---

## 8. App-store packaging

**Decision (Q2):** **Capacitor** (Ionic, MIT) for both iOS and Android. Ships as part of step 4 in §1's 2-month MVP launch order.

PWABuilder was the obvious alternative — minutes-to-package, zero new toolchain — but FridgeCheck's value prop hinges on F8 push reliability, and the most-cited NoWaste complaint ([01-industry-landscape.md §4.3](01-industry-landscape.md)) is notifications firing only in-app. A thin PWABuilder shell risks the same failure mode, particularly on iOS. Capacitor is a real native bridge with first-class Web Push, a barcode-scanner plugin path (we keep ZXing or swap to native), and a community sized for solo-founder Stack Overflow help.

### Setup deliverables

1. **Apple Developer account enrolment ($99/yr) — START DAY 1 OF THE LAUNCH SPRINT.** ⚠ This is on the **critical path** for the 2-month deadline. Apple's individual-applicant identity-verification process can take **up to 2 weeks** (sometimes longer if D-U-N-S / address checks fail), and **no TestFlight build can be uploaded without an active membership**. Do not wait until Capacitor work begins — start enrolment before any code change in step 0.
2. **Google Play Console** ($25 one-off). Faster turnaround (typically same-day to 48h), but enrol in parallel with Apple — there is no reason to defer.
3. Xcode + Android Studio toolchains on the build machine (CI extension out of v1).
4. `@capacitor/core`, `@capacitor/ios`, `@capacitor/android`, `@capacitor/push-notifications`.
5. `capacitor.config.ts` pointing at the Vite dev server in dev and at the baked static assets in prod.
6. Manual sign-and-upload flow for the first TestFlight / Play closed-track build; CI automation deferred until after the 2-month milestone.

### Spike + risk

Budget **5–7 working days** for the first end-to-end build, including a successful TestFlight upload. The 5–7 day estimate **excludes Apple reviewer rejection cycles** — budget another 1–2 calendar weeks for review iterations on the first submission, on top of the up-to-2-week enrolment window above.

**Verify on a real iOS device during the spike**: Capacitor's iOS Web Push plugin compatibility against Safari 17/18 in 2026 has not been re-verified for this plan. Apple Web Push for installed PWAs requires Safari 16.4+ ([02-feature-opportunities.md F8](02-feature-opportunities.md)). If the plugin path stalls, fall back to Capacitor's native APNs push and adapt the `pywebpush` server path accordingly.

**Sources:** Capacitor — <https://capacitorjs.com/> (accessed 2026-05-03); PWABuilder — <https://docs.pwabuilder.com/> (accessed 2026-05-03).

---

## 9. Resolved decisions

_Resolved 2026-05-04 from [PLAN-QUESTIONS-RESOLVED.md](archive/PLAN-QUESTIONS-RESOLVED.md). This section is the authoritative answer where it overlaps with §6's open-question snapshot._

| Q | Decision | Supersedes | Rationale (short) |
|---|---|---|---|
| Q1 — ODbL legal review for F1 | **B (self-assess for now)**, with a hard rule: never mix OFF data with any non-share-alike-compatible commercial feed (GS1 UK, scraped retailer SKUs, Pepesto) until a paid solicitor opinion is taken. Park paid review as a year-2 expense tied to revenue. | §6 #1 | Risk only materialises on data-blending. Pure OFF + crowdsourced edits + USDA FoodKeeper stays clean. |
| Q2 — App-store packaging | **B (Capacitor)** for both iOS and Android. See §8. | §6 #10 | F8 push reliability is too central to the value prop for a thin PWABuilder wrapper. |
| Q3 — Scope vs 2-month timeline | **A + C combined.** Ship the trim-list (auth migration + F11 + minimum-viable F1 + F8 + F14) into TestFlight / Play closed-track at the 2-month mark; take 4–8 more weeks to add F1 UK overlay + F3 post-opening before public-store launch. See §1 "2-month MVP launch order". | new — see §1 | Hits the stated app-store deadline; gets real-user feedback before public review; preserves the differentiation moat for public release. |
| Q4 — F4 receipt scanning in v1 | **B (out of v1).** Land F4 in the public-launch wave after TestFlight, once F1 UK overlay is seeded. | §6 #6 (was already "defer until F1"; now firmer) | F4 quality is bottlenecked on F1; without F1 in v1 (Q3 trims it), receipt OCR will misfire on UK own-label items and generate negative reviews. |
