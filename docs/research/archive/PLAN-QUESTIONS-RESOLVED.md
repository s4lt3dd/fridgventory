# PLAN-QUESTIONS-RESOLVED

_Working pass over [PLAN.md §6](../../PLAN.md) open questions. Written 2026-05-03 against PLAN, [00-codebase-map](00-codebase-map.md), [01-industry-landscape](01-industry-landscape.md), [02-feature-opportunities](02-feature-opportunities.md), [03-open-source](03-open-source.md), [04-auth-providers](04-auth-providers.md), [05-claude-skills](05-claude-skills.md). User context applied: solo founder, bootstrapped, must stay on Postgres + EU residency, ~2 months to app-store ready, OK with maintenance windows, leaning Supabase Auth._

---

## Resolved questions (no further input needed)

### Q2 — Supabase Auth: green-light or self-host? — **Bucket 2**

**Answer:** Green-light managed Supabase Auth. The user is "leaning Supabase Auth based on the research" and the deal-breakers for the alternatives all align with the user's non-negotiables (Postgres, EU residency, low burn).

**Reasoning:** [04-auth-providers.md §Recommendation](04-auth-providers.md) confirms Supabase as primary pick. EU residency in eu-west-2 (London) / eu-central-1 (Frankfurt) satisfies "EU data residency". GoTrue is OSS + `pg_dump` exit path satisfies "low monthly burn anxiety about lock-in". $25/mo Pro flat to 100k MAU is the cheapest paid floor of any provider with EU residency. Cognito (no hash export) and WorkOS / Clerk (no GA EU region) are eliminated by the user's constraints, not just preferences.

---

### Q3 — £730 marketing copy fix — **Bucket 1**

**Answer:** Adopt PLAN's recommendation as-is: ship (b) WRAP 2026 ~£1,000/household-of-four with a cited link **immediately**, replace with (c) live "FridgeCheck users saved £X last month" once F2 lands.

**Source:** [PLAN.md §6 #3](../../PLAN.md), reinforced by [01-industry-landscape.md §1](01-industry-landscape.md) ("£17 billion per year, or about £1,000 a year for a household of four") and [02-feature-opportunities.md §Specific questions](02-feature-opportunities.md) ("Update the landing-page copy to either cite WRAP 2026 with a working link, or — better — replace the static figure with a live 'FridgeCheck users saved an average of £X last month'").

**Implication for the 2-month launch:** F2 is Tier 2 and will not exist by app-store submission, so (b) is the only viable move for launch copy. (c) becomes a post-launch upgrade.

---

### Q4 — Email transactional vendor — **Bucket 2**

**Answer:** Start on AWS SES. Don't re-evaluate until either deliverability is measurably hurting or volume justifies a Postmark/Resend switch.

**Reasoning:** SES is already a Terraform target ([PLAN.md §6 #4](../../PLAN.md)); user is bootstrapped (every $/mo matters); SES has eu-west-1 / eu-west-2 endpoints satisfying EU residency; transactional volume from a solo-founder launch will be tiny. Postmark and Resend are better products on shared-IP deliverability but at the wrong moment in the company. Use `boto3 SES` per [03-open-source.md §F2](03-open-source.md).

---

### Q5 — Tesco competitive posture: F5 v1 or F14? — **Bucket 1**

**Answer:** Both. They don't conflict — F14 is defensive (rescue-recipe must be reliable), F5 v1 is offensive (cross-retailer neutrality). PLAN already concludes this.

**Source:** [PLAN.md §6 #5](../../PLAN.md) ("Both — they don't conflict") and [02-feature-opportunities.md §Specific questions](02-feature-opportunities.md) which lists F14 + F5 v1 as separate non-overlapping bets.

**2-month-launch caveat:** F14 is S–M effort and is critical-path defensive — keep in scope. F5 v1 is M effort and is *offensive differentiation*; if scope must be cut for the app-store deadline, F5 v1 is the cheapest cut without weakening launch UX (see Q10/QA below).

---

### Q6 — Receipt-scanning vendor (F4, Tier 3) — **Bucket 1**

**Answer:** Defer the vendor decision until F1 lands. When F4 happens, use Anthropic vision (Claude Sonnet 4.6).

**Source:** [PLAN.md §6 #6](../../PLAN.md) ("Defer until F1 lands; until then, line-item parsing has nowhere good to go") + [03-open-source.md §Receipt scanning](03-open-source.md) ("Anthropic vision … Recommended winner when F4 happens" — already have `anthropic` SDK + key + service pattern; cheapest path to ship; dogfoods existing AI plumbing). docTR is the alternative but needs a GPU container, which a bootstrapped solo founder does not want to operate.

**Confidence note:** Claude API pricing on [claude.com/pricing](https://www.claude.com/pricing) was accessed 2026-05-03; per-Mtok numbers are fast-moving — re-verify when F4 actually starts.

---

### Q7 — MAU forecast confidence for end-2026 — **Bucket 2**

**Answer:** Plan for **1k MAU realistic, 10k MAU aspirational** by end-2026. Budget at the 10k tier and you're still on Supabase Free.

**Reasoning:** Solo founder + bootstrapped + brand-new app launching in ~2 months means there is no growth team, no paid acquisition, and no PR machine. Comparable indie pantry apps (Best Before, Nosh) sit in the low-thousands-to-tens-of-thousands user range after years. Tesco AI rolling out late 2026 is a ceiling, not a floor.

**Cost implication:** At 10k MAU, Supabase Auth is **free** (50k MAU on the free tier per [04-auth-providers.md §Supabase pricing](04-auth-providers.md)). The 50k MAU scenario in PLAN ($25/mo Pro + ~$130/mo overage) is a **2027+ planning number, not a 2026 budget line**. For 2026 the auth provider line is £0.

---

### Q8 — Reddit qualitative pulse — **Bucket 2**

**Answer:** Skip pre-launch. Defer to a post-launch iteration cycle.

**Reasoning:** With a 2-month deadline and solo headcount, the marginal value of 10 verbatim Reddit quotes is low compared to (a) what App Store reviews will tell you within 2 weeks of launch and (b) what your own analytics will tell you. The voice-of-customer flagged in [01-industry-landscape.md §4.3](01-industry-landscape.md) — wrong barcode data, data loss across updates, US bias, slow scan UX, silent notifications — is already actionable; you don't need Reddit to confirm it. Spend the hour on something that ships.

---

### Q9 — F11 (account hardening) timing — **Bucket 2**

**Answer:** Pull F11 into Tier 1. Ship before app-store submission.

**Reasoning:** "App-store-ready in 2 months" implies public real-name accounts. Apple App Store Review Guideline 5.1.1(v) requires user-initiated account deletion in any app that lets users create an account; a missing-password-reset flow is also a routine reviewer rejection. [00-codebase-map.md §3](00-codebase-map.md) confirms FridgeCheck has neither password reset nor email verification. Combined with the Q2 decision (Supabase), F11 collapses from M to S effort per [02-feature-opportunities.md F11](02-feature-opportunities.md) ("if we adopt managed auth, F11 collapses from M-effort to S-effort and magic-link login is a near-free addition") — it is now cheap *and* mandatory.

**Plan delta:** Move F11 from Tier 2 to Tier 1 (see "Changes proposed to PLAN.md" below).

---

### F1 / OFF dependency stack — **Bucket 1** (not in PLAN §6 but blocks F1 architecture)

**Answer:** OFF nightly dump (ODbL) → local `products` table; live REST via `httpx.AsyncClient` (skip the official SDK); USDA FoodKeeper for `default_shelf_life_days` + `opened_shelf_life_days` seeds; defer GS1 UK to phase 2.

**Source:** [03-open-source.md §F1](03-open-source.md) ("Recommended F1 stack: Open Food Facts ODbL data dump … with a thin services/product_service.py calling the live OFF REST API for cache-misses through httpx.AsyncClient. Skip the official SDK; defer GS1 UK to phase 2 once revenue justifies a member fee.") and [03-open-source.md §F3](03-open-source.md) ("import the FoodKeeper JSON once, map US category names → our 12 enum values"). Listed here because it un-asks half of Q1 — most of the F1 architecture is decided once licensing scope is set.

---

### F8 / push delivery stack — **Bucket 1**

**Answer:** `pywebpush` (server) + `vite-plugin-pwa` switched to `injectManifest` strategy + `@vite-pwa/workbox-window` (client). New `push_subscriptions` table.

**Source:** [03-open-source.md §F8](03-open-source.md). All MIT/MPL-2.0, all green-or-yellow maintenance, all in stack.

---

## Questions for you

### Q1: ODbL legal review for F1

**Decision needed:** Pay for a 1-hour solicitor review of the ODbL share-alike clause before architecting F1, or self-assess?

**Options:**
- A) **Pay (£200–£500 for a one-off IP/data-licensing solicitor opinion in the UK).** Pro: covers the contamination question if/when you ever ingest Tesco/Sainsbury's data; protects against retroactive licence problems. Con: real spend on a bootstrapped budget; you may never ingest commercial feeds anyway.
- B) **Self-assess from OFF's published ODbL FAQ + your own reading.** Pro: zero spend; OFF's licensing guidance is publicly documented and consumed by other commercial apps. Con: you're personally on the hook if a future GS1 UK / retailer-feed mix triggers a share-alike obligation; corrective work is much more expensive than the up-front review would have been.

**My recommendation:** **B for now**, with a hard rule: **never mix OFF data with any non-share-alike-compatible commercial feed (GS1 UK, scraped retailer SKUs, Pepesto, etc.) until you've taken option A.** The risk only materialises if you blend sources. Pure OFF + crowdsourced edits + USDA FoodKeeper is all share-alike-or-public-domain and stays clean. Park option A as a year-2 expense tied to revenue.

**Your answer:** _____

---

### Q2: App-store packaging approach for the 2-month launch

**Decision needed:** How do you turn the existing PWA into something Apple/Google will accept in their stores, given you have no native iOS/Android expertise on the team?

**Options:**
- A) **PWABuilder (Microsoft, free).** Pro: fastest path; takes a manifest + service worker and produces App Store / Play Store packages in minutes; explicitly designed for the "I have a PWA, I want a store listing" workflow; widely used by indie devs. Con: thinner native shell — push notifications and some platform integrations can be patchy on iOS specifically; you may hit App Store reviewer pickiness.
- B) **Capacitor (Ionic, OSS, MIT).** Pro: real native shell with good Apple App Store track record; first-class Web Push and native notification bridges; large community for solo-founder Stack-Overflow help; you can add native features later without rewriting. Con: ~1–2 week learning curve; Xcode + Apple Developer account ($99/yr) + Android Studio + Google Play Console ($25 one-off) overhead; one more build pipeline to maintain.
- C) **PWA-only, no app store, defer native.** Pro: zero packaging work; aligns with PLAN's recommendation if no native expertise. Con: contradicts the user's stated 2-month target; you lose iOS Web Push reliability (needs PWA *installed* to home screen — discoverability tax); you lose the App Store as a discovery surface.

**My recommendation:** **B (Capacitor).** PWABuilder is tempting but the F8 push story is so central to FridgeCheck's value prop ([01-industry-landscape.md §4.3](01-industry-landscape.md): "notifications fire only in-app, not on the device" is the most-cited NoWaste complaint) that you want a robust native bridge, not a thin wrapper. Capacitor's plugin ecosystem covers Web Push, barcode scanning (you can keep ZXing or swap to a native scanner), and file system; the docs are aimed at exactly your situation (solo dev, web stack, wants stores). Budget 5–7 days for the first build.

**Sources:** PWABuilder docs at <https://docs.pwabuilder.com/> (2026-05-03); Capacitor at <https://capacitorjs.com/> (2026-05-03). Apple Web Push for installed PWAs: Safari 16.4+ per [02-feature-opportunities.md F8](02-feature-opportunities.md). _Low-confidence: I have not re-verified Capacitor's current iOS Web Push plugin compatibility against Safari 17/18 in 2026 — sanity-check during the spike day._

**Your answer:** _____

---

### Q3: Scope vs 2-month timeline

**Decision needed:** PLAN's full Tier 1 (F1 + F8 + F3 + F14) + auth migration is realistically **3–5 months for one engineer**. F1 alone is L-effort and is labelled "the largest item on this list" ([02-feature-opportunities.md F1](02-feature-opportunities.md)). For a 2-month app-store-ready milestone, what's in vs out?

**Options:**
- A) **MVP-trim launch.** In: auth migration to Supabase + F11 (now S-effort) + F8 push + F14 rescue-recipe hardening + minimal F1 (move OFF lookup to backend, add Redis cache, defer the UK overlay seeding). Out for v1: full F1 UK overlay, F3 post-opening, F5 basket bridge, F2 savings. Pro: hits the 2-month target with the safety- and trust-critical work done; UK product-data gap is real but won't block first 1k users from validating the product. Con: you launch with the same Fridgely-style US-skewed scan UX problem; differentiation is weaker.
- B) **Full Tier 1, slip the date.** In: everything PLAN proposes. Pro: launch with the moat in place. Con: 4–5 months minimum solo; cash runway risk; Tesco AI ships broadly later in 2026 and you may miss the window.
- C) **Soft launch (TestFlight / closed beta) at 2 months, public store later.** In: A's scope, but ship to a closed cohort first. Pro: gets real-user feedback before the App Store reviewer rejects you for something silly; lets you defer F1 UK overlay without launch-quality risk. Con: slower to public revenue/PR.

**My recommendation:** **A + C combined** — ship the trim-list (A) into TestFlight/Play closed-track (C) at the 2-month mark, then take 4–8 more weeks to add F1 UK overlay + F3 post-opening before public store launch. The combination buys you real-user feedback and gets the differentiation moat in by public release without missing your stated app-store deadline.

**Your answer:** _____

---

### Q4: F4 receipt scanning — in or out of v1?

**Decision needed:** Receipt scanning is industry-standard ([01-industry-landscape.md §4.1](01-industry-landscape.md)) but is L-effort and Tier 3 in PLAN. Does it ship in the v1 store launch?

**Options:**
- A) **In v1.** Pro: parity with Kitche/NoWaste/Fridgely; bulk-add UX is the highest-friction moment in the current FridgeCheck flow ([02-feature-opportunities.md F4](02-feature-opportunities.md)); can ride the existing Anthropic plumbing (vision via Sonnet 4.6). Con: L-effort; without F1 UK product DB it will misfire on UK own-label items (the Fridgely failure mode); per-receipt API spend is real even at 1k MAU.
- B) **Out of v1, ship later.** Pro: protects the 2-month timeline; matches PLAN's Tier 3 placement. Con: store reviewers will see a less-polished product than competitors.

**My recommendation:** **B (out of v1).** F4 is a ~2-week build on top of F1 quality; without F1 in v1 (Q3 option A trims it), receipt OCR will produce broken line items and you'll get angry reviews. Land F4 in the public-launch wave after TestFlight (Q3 option C), once F1 is seeded.

**Your answer:** _____

---

## Changes proposed to PLAN.md

These reflect contradictions or refinements found during this pass. Not yet applied.

### 1. **PLAN §3 contradicts 03-open-source on `@axe-core/react`** _(real bug, fix before the team executes)_

PLAN §3 "Adopt during Tier 2 / migration" lists:

> `@axe-core/react` + `eslint-plugin-jsx-a11y` | Accessibility CI gate | MIT

But [03-open-source.md §Cross-cutting concerns / Accessibility](03-open-source.md) explicitly flags `@axe-core/react` as **not supporting React 18+** — and FridgeCheck is on React 18.3.1 ([00-codebase-map.md §1](00-codebase-map.md)). Deque points React 18 users at their commercial axe Developer Hub; the OSS substitute is `vitest-axe` + `axe-core` directly, or `@axe-core/playwright` once E2E lands.

**Proposed edit:** in PLAN §3, replace `@axe-core/react` with `vitest-axe + axe-core`. License unchanged (MIT/MPL-2.0).

### 2. **F11 should be in Tier 1, not Tier 2**

Given Q9 above (Apple Store Guideline 5.1.1(v) plus Supabase collapsing F11 from M → S effort), F11 is now both mandatory for launch and cheap. PLAN already hedges this in §1 ("Pull into Tier 1 if Supabase Auth is adopted") — making the change explicit avoids ambiguity.

**Proposed edit:** in PLAN §1 Tier 1 table, add F11 as item 5; remove the conditional "pull into Tier 1 if…" caveat.

### 3. **PLAN §1 Tier 1 ordering vs the 2-month timeline**

PLAN orders F1 → F8 → F3 → F14. With a 2-month app-store-ready target and Q3-option-A trim, the practical order should be:

1. Step 0 prerequisite: passlib → pwdlib swap (PLAN §5 #1).
2. Auth migration (PLAN §2 phases 0–4).
3. F11 (now S-effort, free with Supabase).
4. Move OFF lookup to backend + Redis cache (PLAN §5 #4 — minimum viable F1).
5. F8 push notifications + PWA hardening + Capacitor packaging.
6. F14 rescue-recipe hardening.
7. **Public launch / TestFlight cutover.**
8. Full F1 UK overlay (post-launch).
9. F3 post-opening shelf-life (post-launch).

**Proposed edit:** add a "2-month MVP launch order" subsection to PLAN §1 reflecting the above. Keep the canonical Tier 1/2/3 list as the strategic view.

### 4. **PLAN §2 step 1 (5-user spike) should explicitly cover username-vs-email login**

[04-auth-providers.md §Risks called out](04-auth-providers.md) flags that "We currently allow username login; Supabase Auth is email-first. If any users have distinct username + email, migrate them to email-only first." PLAN §2 doesn't surface this. It's a real pre-cutover step.

**Proposed edit:** add to PLAN §2 step 1 a sub-bullet: "Audit `users.username` vs `users.email`; if any rows differ, run a one-off email-canonicalisation migration before the bulk import."

### 5. **PLAN §5 #6 (`disposition` enum)** should specify which approach

PLAN §5 #6 says "Add `disposition` enum to `pantry_items` (or a new `consumption_events` table)". [02-feature-opportunities.md F2](02-feature-opportunities.md) explicitly recommends "New `consumption_events` table tracking item dispositions". Pick the table approach in PLAN — it's also better for analytics history.

**Proposed edit:** in PLAN §5 #6, replace "(or a new `consumption_events` table)" with "via a new `consumption_events` table per F2".

### 6. **PLAN TL;DR mentions £730 marketing copy is stale but PLAN doesn't list a copy-update task**

The marketing-copy fix (Q3 above) is implicit in §6 #3 but doesn't appear in §5's pre-launch task list. For a 2-month app-store launch this is an item that can fall through the cracks.

**Proposed edit:** add §5 #10 "Update landing-page £730 → WRAP 2026 £1,000-per-household-of-four cite (Q3 option b)" with a link to <https://www.wrap.ngo/media-centre/press-releases/sunday-15-march-average-uk-household-four-will-have-already-wasted>.

### 7. **PLAN doesn't mention a Capacitor/PWABuilder packaging step**

Given the user's app-store target and PLAN's current PWA-only assumption, the packaging step is missing entirely. See Q2 in this doc.

**Proposed edit:** add a new PLAN §8 "App-store packaging" outlining the Capacitor (or PWABuilder) integration as a discrete deliverable.

---

## Sources cited (web, accessed 2026-05-03)

- WRAP 2026 household waste figure — <https://www.wrap.ngo/media-centre/press-releases/sunday-15-march-average-uk-household-four-will-have-already-wasted>
- Claude API pricing — <https://www.claude.com/pricing>
- Supabase asymmetric signing keys — <https://supabase.com/docs/guides/auth/signing-keys>
- Supabase auth issue 1678 — <https://github.com/supabase/auth/issues/1678>
- Supabase pricing — <https://supabase.com/pricing>
- PWABuilder — <https://docs.pwabuilder.com/>
- Capacitor — <https://capacitorjs.com/>
- All other facts from the supplied research files; cited inline as `[file.md §section]`.

