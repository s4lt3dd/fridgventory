# 02 — Feature Opportunities (FridgeCheck)

_Written 2026-05-03. Synthesised from [00-codebase-map.md](00-codebase-map.md) and [01-industry-landscape.md](01-industry-landscape.md). All architectural references verified against the worktree at write time._

---

## Framing

The market is converging fast. Three forces shape this list:

1. **Tesco AI assistant ships broadly later in 2026.** It explicitly markets *"select meals that use leftover ingredients in the fridge or cupboard"* ([01-industry-landscape.md#1](01-industry-landscape.md)) — i.e. it directly overlaps FridgeCheck's rescue-recipes pitch. We need defensible features Tesco's app cannot easily clone: cross-retailer neutrality, post-opening tracking, behavioural recap, and household-shared inventory that exists *outside* a single retailer's loyalty walled garden.
2. **Fridgely's UK reception** ([01-industry-landscape.md#3.5](01-industry-landscape.md)) proves a US-skewed product DB kills a UK launch on its own. UK product data quality is a precondition, not just a feature.
3. **The £730 figure is stale.** WRAP's 2026 messaging is ~£1,000 per household of four ([01-industry-landscape.md#1](01-industry-landscape.md)). Static marketing copy is fragile; per-user *measured* savings are durable.

The candidate list below prioritises (a) closing the cleanest UK gap, (b) creating a defensible moat against Tesco AI, and (c) leaning on infrastructure we already have (APScheduler worker, Redis cache, household model, ZXing scanner).

---

## Candidate features

### F1. UK Product Data Overlay

| | |
|---|---|
| **Problem solved** | UK reviewers of Fridgely report it "appears aimed at Americans" and that many UK products won't scan ([01-industry-landscape.md#3.5](01-industry-landscape.md), [01-industry-landscape.md#4.4](01-industry-landscape.md)). Open Food Facts is global and patchy on UK supermarket own-label (Tesco Finest, Sainsbury's Taste the Difference, Asda Extra Special, Morrisons The Best, Lidl Deluxe, Aldi Specially Selected). |
| **Effort** | **L** — the largest item on this list. Scrape/license/seed an own-label EAN database, add a backend cache layer in front of OFF, ship a "claim & correct" UX so users contribute, and govern the contributions. |
| **Impact** | **High** — this is the precondition for every other UK-specific feature. Without it, scan UX is a coin flip and rescue recipes propose the wrong substitutes. |
| **Architectural fit** | New `products` table (EAN PK, brand, retailer, default_shelf_life_days, opened_shelf_life_days, source enum). New `product_repository` + `product_service` ([00-codebase-map.md#4](00-codebase-map.md)). Move OFF lookup **off the frontend** (currently at [`frontend/src/api/openFoodFacts.ts`](../../frontend/src/api/openFoodFacts.ts) per [00-codebase-map.md#7](00-codebase-map.md)) into a backend `products/lookup/{ean}` route; cache 24h in Redis. New crowdsourced-edits table with admin moderation. |
| **Dependencies / risks** | Legal/licensing risk on retailer data; need a scraping or licensed-feed strategy. Moderation surface must exist before opening the gates (NoWaste-style breaking schema changes lost users; we cannot afford a bad-data wave — see [01-industry-landscape.md#4.3](01-industry-landscape.md)). |
| **Confidence** | **High** that the gap exists. **Medium** on execution path (licensing vs scraping vs crowdsource). |

### F2. Personalised Waste Savings ("Your £ Saved")

| | |
|---|---|
| **Problem solved** | The £730 figure is an out-of-date WRAP statistic (2018 vintage; superseded by ~£1,000-per-household-of-four in 2026 — [01-industry-landscape.md#5](01-industry-landscape.md)). Generic marketing numbers can't drive in-app retention. Nobody in the category has shipped a *persuasive* personal recap (Nosh and Kitche have rudimentary versions — [01-industry-landscape.md#4.4](01-industry-landscape.md)). |
| **Effort** | **M** — backend job + a price-estimation table + one weekly email + one in-app screen. |
| **Impact** | **High** for retention (gives users a reason to open the app once a week even when their pantry is fine). Replaces a brittle marketing claim with a per-user truth. |
| **Architectural fit** | New `weekly_recap` worker job in `backend/app/workers/` running on APScheduler (already in-process — [00-codebase-map.md#1](00-codebase-map.md)). New `consumption_events` table tracking item dispositions (`consumed` / `wasted` / `donated`) with a price snapshot. New `recap_service`. Frontend: new `/app/insights` page, new `useRecap` TanStack hook keyed `['recap', userId, weekIso]`. Email path needs a transactional sender (out of scope here — flag as dependency). |
| **Dependencies / risks** | Requires users to mark items consumed vs wasted — small UX tax that we can default to "consumed" on delete with an undo. Needs price data per product (could come from F1 or from receipt-scan F4). Risk: if numbers feel inflated, trust collapses — must under-promise. |
| **Confidence** | **High** on the gap; **medium** on attribution accuracy (the savings figure is an inference, not a measurement). |

### F3. Post-Opening Shelf-Life Tracking

| | |
|---|---|
| **Problem solved** | Only Best Before and (partially) NoWaste track "opened X days ago, use within Y" ([01-industry-landscape.md#3.6](01-industry-landscape.md), [01-industry-landscape.md#4.4](01-industry-landscape.md)). Yet a huge slice of UK home waste is opened jars, sauces, dips, condiments. Direct industry-standard gap. |
| **Effort** | **S** — single new column + a small UI affordance + per-product `opened_shelf_life_days` lookup. |
| **Impact** | **Medium-high** — addresses a real waste category with a simple primitive. Marketing-friendly ("we warn you when your hummus is on the edge"). |
| **Architectural fit** | Migration adds `opened_at: TIMESTAMPTZ NULL` to `items` and `opened_shelf_life_days: INT NULL` to `products` (depends on F1) or to `items` directly. Service: `item_service.mark_opened(item_id)`. Effective expiry = `min(expiry_date, opened_at + opened_shelf_life_days)`. Update urgency calc in [`frontend/src/utils/urgency.ts`](../../frontend/src/utils/urgency.ts) accordingly. |
| **Dependencies / risks** | More valuable when paired with F1 (so users don't have to type opened-shelf-life every time); shippable without F1 by letting users set it manually. |
| **Confidence** | **High**. |

### F4. Receipt Scanning

| | |
|---|---|
| **Problem solved** | Industry-standard feature we lack ([01-industry-landscape.md#4.1](01-industry-landscape.md)). Kitche, NoWaste, and Fridgely all have it. Bulk-adding a weekly shop is the single highest-friction moment in the current FridgeCheck UX. |
| **Effort** | **L** — receipt OCR is hard; UK receipts vary by retailer. Either: (a) integrate a third-party (Taggun, Veryfi, Klippa) — fast but adds COGS; (b) use Anthropic vision via the existing Anthropic dependency — cheaper and dogfoods our AI stack but needs careful prompt + parsing. |
| **Impact** | **High** at conversion (first-week activation), **medium** at retention (one weekly trip). |
| **Architectural fit** | New `routes/receipts.py` with multipart upload. New `receipt_service` calling either an OCR vendor or Anthropic vision (model already configured at `claude-sonnet-4-20250514` per [00-codebase-map.md#7](00-codebase-map.md)). Cache uploads to S3 (already a Terraform target). New `receipts` and `receipt_items` tables. Frontend: new flow in `pages/AddItem` — choose between barcode / receipt / manual. |
| **Dependencies / risks** | F1 makes line-item → product matching dramatically better; otherwise, line items are free-text and the auto-add will misfire (the Fridgely failure mode). Anthropic vision approach has a per-receipt cost we'd need to model. Privacy: receipts contain location + payment metadata — strip on ingest. |
| **Confidence** | **Medium-high**. |

### F5. Rescue Recipe → UK Basket Bridge

| | |
|---|---|
| **Problem solved** | Cherrypick and Mealia own the *recipe → UK supermarket basket* loop ([01-industry-landscape.md#3.12](01-industry-landscape.md), [01-industry-landscape.md#3.14](01-industry-landscape.md), [01-industry-landscape.md#4.4](01-industry-landscape.md)). Tesco's own AI assistant ships in 2026 and bundles this. **Nobody connects it the *other* way: rescue recipe → "you have 3 of 5 ingredients, add the missing 2 to your Tesco basket".** That is the defensible counter-positioning to Tesco AI: cross-retailer neutrality. |
| **Effort** | **M** for v1 (deep-link to retailer search URLs with pre-filled query strings, no API integration). **L** for full Tesco / Sainsbury's / Asda / Morrisons API integration. |
| **Impact** | **High** as the strategic differentiator vs Tesco AI; medium in absolute conversion until UK basket APIs are wired. |
| **Architectural fit** | Extends `rescue_recipe_service`. Output already lists ingredients — augment with a "missing ingredients" diff against the user's pantry, then render deep-link buttons for the four UK retailers in the frontend. Backend remains the proxy (never expose API keys frontwards — [CLAUDE.md gotcha #7](../../CLAUDE.md)). |
| **Dependencies / risks** | F1 (UK product DB) makes ingredient → SKU matching much better. v1 deep-link version has no UK-product matching dependency but is less magical. Affiliate revenue could be a follow-on (Cherrypick's model). |
| **Confidence** | **High** on the strategic value; **medium** on whether v1 deep-links convert at all. |

### F6. Multiple Storage Locations (fridge / freezer / pantry / spice cabinet)

| | |
|---|---|
| **Problem solved** | Convergent industry feature we don't have ([01-industry-landscape.md#4.1](01-industry-landscape.md)). Frozen items have completely different shelf-life rules than fridge items. Spice-cabinet items rarely "expire" the same way. Without this, expiry warnings on frozen / dry-stored goods are noise that erodes trust. |
| **Effort** | **S-M** — new column, picker UI, per-location default shelf-life logic. |
| **Impact** | **Medium** — quality-of-life feature; reduces false-positive notifications which are the fastest way to lose users. |
| **Architectural fit** | Add `location: enum('fridge','freezer','pantry','spice','other')` to `items`. Use the enum-via-raw-SQL pattern documented at [CLAUDE.md gotcha #4](../../CLAUDE.md). Update item form, list grouping, and notification policy. |
| **Dependencies / risks** | None blocking. Watch the migration path so existing items default to `fridge`. |
| **Confidence** | **High**. |

### F7. Voice Add ("Just say what you bought")

| | |
|---|---|
| **Problem solved** | Kitche and NoWaste both support voice entry ([01-industry-landscape.md#4.1](01-industry-landscape.md)). For non-barcoded items (loose veg, deli counter, market produce) it's the fastest path. |
| **Effort** | **M** — Web Speech API (browser-native) for transcription, then a structured-extraction pass via Anthropic ("`{name, qty, category, suggested_expiry}`"). |
| **Impact** | **Medium** — convenience feature; meaningful for fresh produce that doesn't have a barcode. |
| **Architectural fit** | Frontend uses Web Speech API; new `routes/items/parse_voice` posts the transcript to a backend service that calls Anthropic and returns structured JSON. Reuses the rescue-recipe LLM pattern. |
| **Dependencies / risks** | Web Speech API is browser-dependent (Safari iOS coverage is patchy). Server-side ASR (Whisper, AssemblyAI) is a fallback but adds cost. Privacy: voice clips should not be persisted unless the user opts in. |
| **Confidence** | **Medium** — depends on whether mobile-web voice UX is good enough vs a native app. |

### F8. Push Notifications & Mobile Web App Polish (PWA + Web Push)

| | |
|---|---|
| **Problem solved** | NoWaste users complain notifications "fire only in-app, not on the device" ([01-industry-landscape.md#4.3](01-industry-landscape.md)). FridgeCheck's worker generates notifications but there's no push delivery channel. `vite-plugin-pwa` is already installed ([00-codebase-map.md#1](00-codebase-map.md)) — install base is partial. |
| **Effort** | **M** — Web Push subscription endpoints, VAPID keys, service-worker push handler. iOS Safari supports Web Push as of 16.4+ when installed as PWA. |
| **Impact** | **High** — without push, expiry alerts are inert. This is the difference between "I check the app" and "the app saves me from waste". |
| **Architectural fit** | New `push_subscriptions` table (user_id, endpoint, p256dh, auth keys). Worker job extends to publish to Web Push instead of just writing to `notifications`. Frontend: subscribe in service worker on first auth; manage permissions in `pages/Settings`. Use `pywebpush` server-side. |
| **Dependencies / risks** | iOS PWA push only works if the user has installed the PWA to home screen — needs install-prompt UX. Email fallback for users who never install. |
| **Confidence** | **High**. |

### F9. Price-Per-Item & Smart Shopping List

| | |
|---|---|
| **Problem solved** | AnyList's strength is list-sharing UX with price tracking ([01-industry-landscape.md#3.4](01-industry-landscape.md)). FridgeCheck has no shopping list at all. A shopping list seeded by "you're running low on X" + "you wasted Y last week, buy less" is a unique angle. |
| **Effort** | **M**. |
| **Impact** | **Medium** — opens the second weekly touchpoint (the shop, not the fridge). Underpins F2 (savings need prices) and F5 (basket bridge needs items). |
| **Architectural fit** | New `shopping_list_items` table scoped to household. Service generates suggestions from consumption history + low-stock inference. Frontend: new `/app/shopping` page; share via the existing household model. |
| **Dependencies / risks** | Pricing data: pull from F1 product DB or from receipt-scan F4 history. |
| **Confidence** | **Medium**. |

### F10. Crowdsourced Expiry Dates ("Did this last as long as expected?")

| | |
|---|---|
| **Problem solved** | NoWaste's top complaint is wrong barcode → wrong expiration date ([01-industry-landscape.md#3.2](01-industry-landscape.md), [01-industry-landscape.md#4.3](01-industry-landscape.md)). Pantry Check's USP is its crowdsourced DB ([01-industry-landscape.md#3.7](01-industry-landscape.md)). Self-improving data is a moat. |
| **Effort** | **M**. |
| **Impact** | **Medium-high** over time — compounds with F1. Each user makes the next user's defaults better. |
| **Architectural fit** | When a user adjusts a default expiry on an item, log a `product_expiry_observation` row (anonymised). Aggregate weekly via worker, update `products.default_shelf_life_days` once N>k confirmations match. Moderate against outliers. |
| **Dependencies / risks** | Depends on F1. Anti-griefing measures needed (one bad actor seeding "milk expires in 5 years"). |
| **Confidence** | **Medium**. |

### F11. Account Hardening: Password Reset, Email Verification, Migration Safety

| | |
|---|---|
| **Problem solved** | We have no password reset, no email verification, `User.is_verified` is dead state ([00-codebase-map.md#3](00-codebase-map.md), [00-codebase-map.md#6](00-codebase-map.md)). NoWaste's worst churn moment was a forced re-account that wiped inventories ([01-industry-landscape.md#4.3](01-industry-landscape.md)). FridgeCheck cannot scale or run a paid trial without these. |
| **Effort** | **M**. |
| **Impact** | **High** — strictly enabling, but a precondition for any growth or pricing experiment. Also addresses tech debt items #2, #6, #8 in [00-codebase-map.md#6](00-codebase-map.md). |
| **Architectural fit** | New `password_resets` table (token hash, expires_at, used_at). New routes in `routes/auth.py`. Email sender becomes a real dependency (transactional email vendor). Move tokens out of `localStorage` while we're here (debt #2). |
| **Dependencies / risks** | Email vendor selection (SES is in-house given Terraform/AWS) — pick once, use everywhere. **See cross-references — if we adopt managed auth (Supabase / Clerk / Auth.js), most of this is free.** |
| **Confidence** | **High** that we need it; **medium** on build-vs-buy. |

### F12. Apple Watch Glance / Home-Screen Widget

| | |
|---|---|
| **Problem solved** | AnyList ships on watch ([01-industry-landscape.md#3.4](01-industry-landscape.md)); no pantry app ships a "what's about to expire" widget. Glanceable expiry would be a sticky habit-builder. |
| **Effort** | **L** — requires native iOS / Android shells; we are PWA-only today. |
| **Impact** | **Medium** for power users; low for the long tail. |
| **Architectural fit** | Mostly outside the current stack. PWA shortcuts + iOS WidgetKit + Android App Widget would each need a thin native wrapper. Backend just needs a `/api/v1/items/expiring-soon` endpoint (trivial). |
| **Dependencies / risks** | New build pipelines, app-store presence, code-signing. Big ops cost relative to value at our stage. |
| **Confidence** | **Low** that this is the right next move. |

### F13. Olio / Too Good To Go Hand-off

| | |
|---|---|
| **Problem solved** | When an item is genuinely too far gone for a rescue recipe, the next-best outcome is *share, not bin*. Olio is UK-native with retailer partnerships; TGTG is the demand side ([01-industry-landscape.md#3.10](01-industry-landscape.md), [01-industry-landscape.md#3.11](01-industry-landscape.md)). FridgeCheck is complementary, not competitive. |
| **Effort** | **S** as a deep-link button; **M** if Olio offers a real partner API. |
| **Impact** | **Low-medium** — small per-event but PR-friendly and aligned with mission. |
| **Architectural fit** | UI affordance only on item detail when expiry is imminent. Deep link to Olio with prefilled item name. |
| **Dependencies / risks** | Olio partnership conversation. Without it, just a deep link — easy. |
| **Confidence** | **Medium**. |

### F14. Rescue Recipe Hardening (Cache Hits, Tests, Fallback)

| | |
|---|---|
| **Problem solved** | The rescue-recipe service is the most expensive code path (Anthropic API), most fragile (JSON parsing), and least tested ([00-codebase-map.md#7](00-codebase-map.md)). Tesco AI shipping in 2026 means we need this to be *better* than theirs, not just present. |
| **Effort** | **S-M**. |
| **Impact** | **Medium** — primarily defensive; also unlocks faster iteration. |
| **Architectural fit** | Add tests against canned Anthropic responses (bypass live call). Make model name a config variable (currently hardcoded — [00-codebase-map.md#7](00-codebase-map.md)). Improve cache key shape (include household + sorted item IDs). Add a deterministic non-AI fallback that ranks pre-curated recipes when Anthropic is down or `ANTHROPIC_API_KEY` is absent. |
| **Dependencies / risks** | None. |
| **Confidence** | **High**. |

### F15. Behavioural Recap Email (anchored to Food Waste Action Week)

| | |
|---|---|
| **Problem solved** | WRAP's Food Waste Action Week is the annual category PR window ([01-industry-landscape.md#1](01-industry-landscape.md), [01-industry-landscape.md#4.5](01-industry-landscape.md)). A campaign-anchored "your year of FridgeCheck" recap doubles as a re-engagement nudge and an organic-PR moment. |
| **Effort** | **S** once F2 exists. |
| **Impact** | **Medium** seasonally; near-zero outside the window. |
| **Architectural fit** | Worker-scheduled batch job that materialises a recap per active household every March. Reuses the F2 recap pipeline. |
| **Dependencies / risks** | Depends on F2 + transactional email. |
| **Confidence** | **Medium**. |

---

## Tiering

### Tier 1 — Build next (best impact-per-effort, defensible, low pre-work)

| Rank | Feature | Why this tier |
|---|---|---|
| 1 | **F1. UK Product Data Overlay** | Precondition for almost everything else. Fridgely's UK reception is the explicit cautionary tale. Any rescue / receipt / basket play is shaky without it. Large but unavoidable. |
| 2 | **F8. Push Notifications & PWA Polish** | Closes the highest-leverage UX hole (silent notifications), uses infra we already have (`vite-plugin-pwa`, APScheduler worker), no risky pre-work. |
| 3 | **F3. Post-Opening Shelf-Life Tracking** | Cheapest gap-closer in the category. Single column + small UI. Marketing-friendly. |
| 4 | **F14. Rescue Recipe Hardening** | Defensive prep for Tesco AI's 2026 launch. Unblocks F5. Makes our most ambitious feature reliable enough to lean on. |

### Tier 2 — Build after (solid candidates that need Tier 1 first or have higher risk)

| Rank | Feature | Why this tier |
|---|---|---|
| 5 | **F5. Rescue Recipe → UK Basket Bridge** | The strategic counter-positioning to Tesco AI, but its v1 quality depends on F1 to map ingredients to UK SKUs. v1 deep-links can ship in parallel with F1. |
| 6 | **F2. Personalised Waste Savings** | Replaces the stale £730 figure with a per-user truth. Needs F1 (price data) and F3 (better waste vs consumed signal) to be credible. |
| 7 | **F11. Account Hardening (Password Reset + Email Verification + Token Storage)** | Strictly enabling. Required before charging anyone or running a real growth experiment. Move up to Tier 1 if a paid pilot is on the near roadmap. |
| 8 | **F6. Multiple Storage Locations** | Quality-of-life win that reduces false-positive notifications. Standalone, ships any time. |

### Tier 3 — Maybe later (interesting but speculative or expensive)

| Rank | Feature | Why this tier |
|---|---|---|
| 9 | **F4. Receipt Scanning** | High-impact but L-effort and benefits hugely from F1 first. Probably the right item for a "next quarter" plan, not "this sprint". |
| 10 | **F7. Voice Add** | Convenience feature; cheap-ish to ship but UX quality on mobile web is uncertain. Build once we have a native shell or PWA-with-shortcuts. |
| 11 | **F9. Price-Per-Item & Smart Shopping List** | Useful and underpins F2 / F5 economics, but second-order to actually solving expiry tracking. |
| 12 | **F10. Crowdsourced Expiry Dates** | Long-term moat play; only meaningful at scale and depends on F1. |
| 13 | **F15. Behavioural Recap (Food Waste Action Week)** | Marketing-anchored; depends on F2 + email infra. Cheap once those exist. |
| 14 | **F13. Olio / TGTG Hand-off** | Mission-aligned and PR-friendly but small per-user impact; better as a partnership conversation than a build. |
| 15 | **F12. Apple Watch / Widget** | Clear "later" — needs native shells we don't have, value relative to that lift is modest. |

---

## Specific questions raised in the brief

### "Tesco AI ships in 2026 — what defensible features should we lean into?"

Three things Tesco's AI structurally cannot do as well as we can:

1. **Cross-retailer neutrality (F5).** Tesco AI will optimise for Tesco baskets. A rescue-recipe → "buy missing 2 ingredients on whichever of Tesco / Sainsbury's / Asda / Morrisons is cheapest right now" pitch is the exact thing a single-retailer assistant cannot ship.
2. **Pantry-shared-with-housemates (already partially built).** Our household primitive is real; Tesco's loyalty model is per-Clubcard. A flat-share with a shared pantry is our turf.
3. **Personalised behavioural recap (F2).** Tesco has Clubcard data on what you buy from them; it does not know what you opened, what you finished, or what you binned. We do. F2 is the most defensible long-term feature on this list.

We should also lean defensively on **F14** — the rescue-recipe path needs to be more robust than Tesco's first cut to keep the comparison honest.

### "The £730 figure — does the team need a personalised waste savings feature?"

Yes — this is **F2**. The £730 number is from 2018 and superseded ([01-industry-landscape.md#5](01-industry-landscape.md)); Kitche cites the same source ([01-industry-landscape.md#3.1](01-industry-landscape.md)) so we don't differentiate by repeating it. Replace marketing copy with **per-user measured savings**: same emotional pitch, but durable and unique to FridgeCheck. Update the landing-page copy to either cite WRAP 2026 (~£1,000 / household-of-four) with a working link, or — better — replace the static figure with a live "FridgeCheck users saved an average of £X last month" served from F2 aggregates.

### "UK product database gap — Tier 1 or precondition?"

**Both — that's why it's the #1 Tier 1 item (F1).** It's a feature in the sense that it's user-visible (better scan accuracy, smarter defaults), and a precondition in that F2 / F4 / F5 / F10 are materially worse without it. We should not take F1 out of Tier 1 even though it's the largest item; everything else degrades if we do.

### "Recipe → supermarket basket bridge — partner or build?"

**Build a v1 (F5), then negotiate.**

- v1 = deep-link / pre-filled retailer search URLs with a "missing ingredients" diff (M effort, no integration).
- v2 = real basket APIs where retailers expose them (Tesco's Shopping API for partners; Sainsbury's via Cherrypick-style direct; Asda / Morrisons less open).
- Partner = Cherrypick or Mealia for the basket leg. Cherrypick already owns this loop and would gain "rescue recipe" inbound traffic. Worth a conversation, but build v1 in parallel — partnership talks shouldn't gate the roadmap.

---

## Cross-references

The following recommendations would shift if `04-auth-providers.md` or `05-claude-skills.md` adopt specific directions:

| Trigger | Effect |
|---|---|
| **04 recommends a managed auth provider (Supabase Auth, Clerk, Auth.js, Cognito).** | **F11 (account hardening) collapses from M-effort to S-effort** — password reset, email verification, social login, MFA all come for free. F11 might also pull forward into Tier 1 because it becomes cheap. **Magic-link / passwordless login becomes a near-free quick-win** worth adding as a new candidate (call it F16). |
| **04 recommends staying self-hosted but moves tokens out of `localStorage` (httpOnly cookies).** | F11 still M but the scope shifts; the concurrent-401 queue at [`frontend/src/api/client.ts:44-48`](../../frontend/src/api/client.ts) needs review. No tier change. |
| **05 recommends adopting Anthropic Skills / structured tool use heavily.** | **F4 (receipt scanning) and F7 (voice add) get cheaper** — both rely on structured extraction from unstructured input, which is exactly Skills' wheelhouse. F4 could move from Tier 3 to Tier 2. F14 (rescue recipe hardening) overlaps directly with Skills patterns; the hardening work would be done in the Skills adoption itself. |
| **05 recommends a self-hosted / OSS LLM for cost reasons.** | F2's per-user recap text generation, F4's OCR, and F7's voice parsing all benefit. Doesn't change tiers, but it does change build-vs-buy on F4 (Anthropic vision becomes the cheap path; commercial OCR vendors get harder to justify). |
| **05 recommends offline-capable / on-device inference for any path.** | F7 (voice add) becomes far more attractive as a privacy-forward feature — voice clips never leave the device. Possible Tier 2 promotion. |

If neither doc lands by the time Tier 1 begins, the Tier 1 list above stands as written.
