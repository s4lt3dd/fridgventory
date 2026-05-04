# Claude Code Skills — Candidate Research for FridgeCheck

Research date: 2026-05-03
Researcher: Claude (Opus 4.7, 1M context)
Existing skill in use: `ui-ux-pro-max` (kept; complementary to all candidates below)

---

## Methodology and caveats

- Goal: find verifiable, currently maintained Claude Code skills relevant to FridgeCheck's stack (FastAPI/Postgres/Redis backend, React+Vite+TS frontend, Docker on AWS ECS Fargate).
- Sources attempted: Anthropic's official `anthropics/skills` repo, Anthropic docs, Anthropic blog, Claude Code docs, the Anthropic news page, community awesome-lists (`hesreallyhim/awesome-claude-code`), and known community authors (`obra/superpowers`, `wshobson/agents`, `davidteren/claude-skills`).
- Tooling constraints in this session: WebSearch was unavailable. WebFetch was permitted for `github.com/anthropics/skills/**` and the main `anthropics/claude-code` README, but **denied** for community repos (`hesreallyhim/*`, `obra/*`, `wshobson/*`, `davidteren/*`), Anthropic docs (`docs.claude.com`, `support.claude.com`), and the Anthropic news blog. `gh` CLI / Bash network calls were also blocked.
- Per the brief, **anything I could not verify with a working URL has been omitted** rather than guessed at. As a result this report is dominated by Anthropic's first-party skills repo, which is the only source that responded reliably from this environment. A follow-up research pass from an environment with broader network access would be valuable to evaluate community plugins (Jesse Vincent's `superpowers`, `wshobson/agents`, the `awesome-claude-code` index, etc.).
- All facts below were retrieved from `github.com/anthropics/skills` and its `SKILL.md` files between 18:30 and 18:45 UTC on 2026-05-03.

### Repo-level facts for `anthropics/skills`

- URL: <https://github.com/anthropics/skills> (accessed 2026-05-03)
- Stars: ~128k. Forks: ~15k. Owner: Anthropic.
- License: Apache-2.0 for code skills; some document-handling skills are source-available.
- Layout: `skills/<skill-name>/SKILL.md` plus optional `scripts/`, `references/`, `assets/`.
- Activation in Claude Code: copy the skill folder into `.claude/skills/<skill-name>/` (project-local) or `~/.claude/skills/<skill-name>/` (user-global). The `SKILL.md` YAML frontmatter (`name`, `description`) is what Claude reads to decide when to trigger. Anthropic's hosted Plugin Marketplace also exposes some of these via `/plugin install` but the filesystem method works for any of them by cloning/copying.

---

## Summary table

| Name | Category | Source | License | Confidence |
|------|----------|--------|---------|------------|
| webapp-testing | Testing (E2E / Playwright) | [anthropics/skills/skills/webapp-testing](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) | Apache-2.0 | High |
| skill-creator | Tooling / DX | [anthropics/skills/skills/skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) | Apache-2.0 | High |
| mcp-builder | DevOps / integration | [anthropics/skills/skills/mcp-builder](https://github.com/anthropics/skills/tree/main/skills/mcp-builder) | Apache-2.0 | High |
| frontend-design | Frontend / React | [anthropics/skills/skills/frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Apache-2.0 | Medium (overlap with `ui-ux-pro-max`) |
| claude-api | Backend / Python+TS LLM code | [anthropics/skills/skills/claude-api](https://github.com/anthropics/skills/tree/main/skills/claude-api) | Apache-2.0 | High |
| doc-coauthoring | Documentation / ADRs | [anthropics/skills/skills/doc-coauthoring](https://github.com/anthropics/skills/tree/main/skills/doc-coauthoring) | Apache-2.0 | Medium |
| web-artifacts-builder | Frontend prototyping | [anthropics/skills/skills/web-artifacts-builder](https://github.com/anthropics/skills/tree/main/skills/web-artifacts-builder) | Apache-2.0 | Low (Claude.ai-artifact focused) |
| theme-factory | Design tokens / theming | [anthropics/skills/skills/theme-factory](https://github.com/anthropics/skills/tree/main/skills/theme-factory) | Apache-2.0 | Low (overlaps design-system/MASTER.md) |

---

## webapp-testing

- **Purpose (one line):** Playwright-based browser automation for verifying frontend behaviour, capturing screenshots, and reading browser console logs against a local dev server.
- **Source:** <https://github.com/anthropics/skills/tree/main/skills/webapp-testing> (accessed 2026-05-03)
- **Author/org:** Anthropic. Part of `anthropics/skills` (~128k stars).
- **License:** Apache-2.0.
- **What it actually does:**
  - Ships a `scripts/with_server.py` helper that boots one or many dev servers (e.g. Vite + FastAPI), waits for ports, runs an automation script, then tears the servers down. Multi-server mode is first-class.
  - Provides a "reconnaissance-then-action" pattern: first screenshot the page and dump `page.content()` to discover real selectors, then write the actual interaction script. This is a deliberate guard against flaky locator guesses.
  - Reference scripts in `examples/` for element discovery, static-HTML automation via `file://`, and capturing console logs during automation.
  - Hard rule baked in: always `wait_for_load_state('networkidle')` before introspecting dynamic apps. Useful because Vite + TanStack Query apps (like FridgeCheck) rarely have content ready on `domcontentloaded`.
- **Why it helps FridgeCheck specifically:**
  - Today the project has **no end-to-end tests at all**. `frontend/CLAUDE.md` notes "vitest if configured" but nothing covers a real browser flow.
  - Critical user journeys are exactly the kind of thing this skill exercises well: register → create household → add item via barcode scan → see urgency colours change → trigger rescue-recipe flow when 3+ items expire within 3 days.
  - Multi-server mode matches the existing dev topology (api on 8000, frontend on 5173) so a single Playwright script can drive both sides without us hand-rolling startup orchestration.
- **Install / activation:**
  1. `git clone https://github.com/anthropics/skills.git /tmp/anthropic-skills`
  2. `cp -R /tmp/anthropic-skills/skills/webapp-testing .claude/skills/webapp-testing`
  3. `pip install playwright && playwright install chromium` inside the api container or a local venv. (Or add to a new `tests/e2e/` Python project — Playwright is heavier than the current backend deps.)
  4. Confirm Claude Code lists it: it should auto-trigger on prompts like "test the add-item flow end-to-end".
- **Conflicts with existing skills:** None. `ui-ux-pro-max` is design-time; this is runtime verification. They compose well — design with one, verify with the other.
- **Confidence: High.** SKILL.md was retrieved verbatim. Description, helper script, and Playwright pattern are exactly as quoted.

## skill-creator

- **Purpose (one line):** Authoring loop for Claude skills — capture intent, write SKILL.md, run evals, optimise the description so it triggers reliably, and package as `.skill`.
- **Source:** <https://github.com/anthropics/skills/tree/main/skills/skill-creator> (accessed 2026-05-03)
- **Author/org:** Anthropic.
- **License:** Apache-2.0.
- **What it actually does:**
  - Walks an 8-step workflow: capture intent → interview → write SKILL.md → run test cases (with-skill vs baseline, in parallel) → grade → iterate → optimise description → package.
  - Keeps SKILL.md ≤500 lines and pushes "imperative form" and "pushy descriptions" to fight under-triggering.
  - Provides `eval-viewer/generate_review.py` for human-readable eval results and `scripts/run_loop` for trigger-accuracy optimisation against a should-trigger / shouldn't-trigger eval set.
  - `scripts/package_skill` produces a distributable `.skill` file.
- **Why it helps FridgeCheck specifically:**
  - The team is clearly going to add more skills (this whole document is a search for them). Having a first-class authoring tool means future custom skills — e.g. a FridgeCheck-specific "alembic-migration-reviewer" — are written with evals from day one rather than as one-shot prompts.
  - The eval harness is the only structured way I've seen to keep skill descriptions from drifting; very useful as the team grows past one user.
- **Install / activation:**
  1. Copy `skills/skill-creator/` to `.claude/skills/skill-creator/`.
  2. Triggers on prompts like "create a new skill for X" or "improve the trigger description on `ui-ux-pro-max`".
  3. Optional: install Python deps it uses for the eval viewer (standard library mostly; check `scripts/`).
- **Conflicts:** None. Strictly a meta-tool.
- **Confidence: High.** SKILL.md retrieved.

## mcp-builder

- **Purpose (one line):** Structured guide for building Model Context Protocol servers (Python FastMCP or TypeScript MCP SDK) with proper tool naming, pagination, error messages, and 10-question evaluations.
- **Source:** <https://github.com/anthropics/skills/tree/main/skills/mcp-builder> (accessed 2026-05-03)
- **License:** Apache-2.0.
- **What it actually does:**
  - Four-phase process: Research → Implement → Review/Test → Evaluations.
  - Pulls live MCP spec + SDK READMEs from the Model Context Protocol GitHub orgs.
  - Enforces conventions: action-oriented tool names with consistent prefixes (`fridge_list_items`, `fridge_create_item`), `readOnlyHint` / `destructiveHint` annotations, structured + text responses, pagination.
  - Forces the author to write 10 read-only, multi-step, verifiable evaluation questions before shipping the server. This is more discipline than most MCP servers ship with.
- **Why it helps FridgeCheck specifically:**
  - Plausible near-term need: a "FridgeCheck MCP" so household members on Claude.ai can ask "what's expiring this week?" without leaving the chat. The backend is already cleanly factored (repositories + services), so wrapping it in MCP is mostly schema work — exactly what this skill accelerates.
  - Even without an external server, the design discipline (consistent prefixes, error messages with next-steps, pagination) maps onto the team's existing FastAPI route conventions.
- **Install / activation:**
  1. Copy `skills/mcp-builder/` into `.claude/skills/mcp-builder/`.
  2. Triggers on "build an MCP server for…", "expose this API as MCP tools".
- **Conflicts:** None.
- **Confidence: High.** SKILL.md retrieved verbatim.

## claude-api

- **Purpose (one line):** Opinionated guide for writing Anthropic SDK code (Python or TS), with prompt-caching, adaptive thinking, streaming, and migration between Claude versions baked in.
- **Source:** <https://github.com/anthropics/skills/tree/main/skills/claude-api> (accessed 2026-05-03)
- **License:** Apache-2.0.
- **What it actually does:**
  - Detects project language from files, then reads `{lang}/claude-api/README.md` rather than guessing.
  - Defaults: model `claude-opus-4-7`, `thinking: {type: "adaptive"}`, streaming on for long outputs.
  - Hard rules it enforces: never edit non-Anthropic SDK code (checks for `openai`/`langchain_openai` first), `budget_tokens` is illegal on Opus 4.7 (adaptive only), prefix-cache is byte-strict.
  - Knows the Managed Agents (beta) surface and when to recommend it vs raw API + tool use.
- **Why it helps FridgeCheck specifically:**
  - Rescue Recipes already calls Anthropic. The current implementation uses `claude-sonnet-4-20250514` (per CLAUDE.md). This skill's migration guidance is exactly the path to bump it to `claude-opus-4-7` or `sonnet-4-7` cleanly.
  - It would have caught the missing prompt-caching on the rescue-recipes prompt — caching the system prompt + recipe-format instructions across users would meaningfully reduce token spend at fleet-scale (3+ items × 10-min Redis TTL, plenty of cache reuse).
  - Streaming defaults align with the UX goal of "show recipe titles as they appear" rather than a 5-second blank screen.
- **Install / activation:**
  1. Copy `skills/claude-api/` to `.claude/skills/claude-api/`.
  2. Auto-triggers when a file imports `anthropic` or `@anthropic-ai/sdk`. The active session already has a similar trigger mapping listed under `claude-api` — confirm there's no name collision before installing.
- **Conflicts:** Possible **name collision** with the bundled `claude-api` skill already listed in this Claude Code build's environment. Verify with `ls .claude/skills/` before adding; if Anthropic ships it as a bundled skill, no install is needed at all.
- **Confidence: High.** SKILL.md retrieved.

## doc-coauthoring

- **Purpose (one line):** Three-stage workflow for collaboratively writing structured docs (PRDs, RFCs, ADRs, technical specs) with a "reader-Claude" review pass to catch ambiguities.
- **Source:** <https://github.com/anthropics/skills/tree/main/skills/doc-coauthoring> (accessed 2026-05-03)
- **License:** Apache-2.0.
- **What it actually does:**
  - Stage 1 — context gathering: 5–10 clarifying questions, info-dump background until edge cases are understood.
  - Stage 2 — refinement: per section, brainstorm 5–20 options, curate, draft, iterate via `str_replace`, then a "what can be removed" pass after 3 iterations.
  - Stage 3 — reader testing: spawn a fresh Claude with no context, have it generate 5–10 reader questions, identify ambiguities and false assumptions, then loop fixes back.
- **Why it helps FridgeCheck specifically:**
  - The repo already has `docs/ARCHITECTURE.md`, `docs/research/`, `CONTRIBUTING.md` and a strong CLAUDE.md culture. Future ADRs (e.g. "switch JWT refresh to httpOnly cookies", "introduce a job broker") are exactly the kind of doc this skill is designed for.
  - The reader-Claude pass is the closest thing to a "design review" the project will get without a second engineer.
- **Install / activation:**
  1. Copy `skills/doc-coauthoring/` into `.claude/skills/doc-coauthoring/`.
  2. Triggers on prompts like "write an ADR for…", "draft a PRD for the offline-mode feature".
- **Conflicts:** None.
- **Confidence: Medium.** Verified, but the ROI depends on actually writing more long-form docs — which the team may or may not do regularly.

## frontend-design

- **Purpose (one line):** Generates distinctive, non-generic frontend code with strong opinions on typography, motion, and atmosphere.
- **Source:** <https://github.com/anthropics/skills/tree/main/skills/frontend-design> (accessed 2026-05-03)
- **License:** Apache-2.0.
- **What it actually does:**
  - Forces a "BOLD aesthetic direction" choice (brutalist, retro-futuristic, luxury, art-deco, …) before any code.
  - Bans generic fonts (Inter/Roboto/Arial), purple-gradient-on-white, uniform `rounded-md` on everything, and "predictable centred layouts".
  - Pushes Motion library for React, atmosphere via gradient meshes / noise / shadows / custom cursors.
- **Why it helps FridgeCheck specifically:**
  - Useful for the marketing landing page (the £730/year saving claim is a hook that deserves a distinctive visual treatment) and for one-off campaign pages.
  - **However**, FridgeCheck's design system is locked: `design-system/fridgecheck/MASTER.md`, `index.css :root` tokens, and Tailwind colour keys are explicitly listed as "do not change without good reason" in CLAUDE.md. This skill's instinct is to override the design system, which is the wrong call for product surfaces.
- **Install / activation:**
  1. Copy `skills/frontend-design/` to `.claude/skills/frontend-design/`.
  2. Consider scoping by editing the SKILL.md description so it only triggers for `pages/marketing/**` or `pages/landing/**`, not the in-app dashboard.
- **Conflicts with existing skills:** **Real overlap with `ui-ux-pro-max`** — both want to drive UI direction. Recommend picking one or constraining `frontend-design` to marketing pages only.
- **Confidence: Medium.** Skill itself is verified, but value is conditional on the team having marketing-page work and willingness to constrain it away from product UI.

## web-artifacts-builder

- **Purpose (one line):** Bootstraps React+Vite+Tailwind+shadcn/ui projects and bundles them into a single self-contained `bundle.html` artifact.
- **Source:** <https://github.com/anthropics/skills/tree/main/skills/web-artifacts-builder> (accessed 2026-05-03)
- **License:** Apache-2.0.
- **What it actually does:**
  - `scripts/init-artifact.sh <name>` scaffolds Vite + TS + Tailwind 3.4.1 + 40 pre-installed shadcn/ui components + path aliases.
  - `scripts/bundle-artifact.sh` produces a single inlined HTML file.
- **Why it helps FridgeCheck specifically:**
  - Marginal. The frontend already exists, has Tailwind, and is **not** shadcn/ui-based. The single-HTML bundling target is for Claude.ai artifacts, not a production app.
  - Could be useful for one-off internal tools (e.g. "show me a quick admin dashboard for Postgres item counts") but a Vite project + nginx already does that.
- **Install / activation:** Copy folder into `.claude/skills/`. Triggers on "build me a quick artifact / mini-app".
- **Conflicts:** Mild — its shadcn-first opinion fights the project's existing Tailwind+CSS-vars design system.
- **Confidence: Low.** Verified, but poorly matched to a fully built React app.

## theme-factory

- **Purpose (one line):** Apply one of 10 named visual themes (or a custom theme) to artifacts — colour palettes + font pairings.
- **Source:** <https://github.com/anthropics/skills/tree/main/skills/theme-factory> (accessed 2026-05-03)
- **License:** Apache-2.0.
- **What it actually does:** Picks from "Ocean Depths", "Modern Minimalist", "Tech Innovation", etc., each with hex palette + heading/body font pairing. Can also produce custom themes.
- **Why it helps FridgeCheck specifically:** Marginal at best. FridgeCheck has its own design tokens locked in `index.css :root` and `tailwind.config.js`. A theme-swap skill would tempt churn on those tokens.
- **Install / activation:** Copy folder. Triggers on "theme this", "restyle as X".
- **Conflicts:** Will fight the design system if not scoped.
- **Confidence: Low.** Verified existence but low fit; mentioned for completeness only.

---

## Skills I tried to verify but could NOT reach from this environment

These may well be excellent and worth a follow-up pass from a less-restricted environment — I have **omitted them from any recommendation** because the brief required a working URL.

- `hesreallyhim/awesome-claude-code` — the canonical community index. WebFetch denied.
- `obra/superpowers` (Jesse Vincent) — frequently cited skill collection. WebFetch denied.
- `wshobson/agents` — large public agents collection. WebFetch denied.
- `davidteren/claude-skills` — community skills. WebFetch denied.
- Anthropic docs at `docs.claude.com/en/docs/claude-code/plugins-marketplaces` and `support.claude.com/en/articles/12512198-creating-custom-skills` — both denied. The plugin-marketplace install path (`/plugin install`) exists per the `anthropics/skills` README but exact marketplace catalogue could not be enumerated from here.
- Specific gaps not filled: a verified pytest skill, a verified OWASP / dependency-audit skill, a verified Alembic-migration safety skill, a verified accessibility / WCAG audit skill, a verified Lighthouse / bundle-size skill, a verified Terraform skill, a verified observability/logging skill. I am not aware of first-party Anthropic skills covering these categories at 2026-05-03.

**Action item for follow-up research:** Re-run this brief from an environment with WebSearch + unrestricted WebFetch to fill those gaps before deciding whether to build them as custom skills via `skill-creator`.

---

## Second pass attempted 2026-05-03 (later same day) — also blocked

A follow-up pass was opened with the explicit instruction that "web is now enabled" and a target list including `obra/superpowers`, `anthropics/skills` siblings, `wshobson/agents`, `hesreallyhim/awesome-claude-code`, `davidteren/claude-skills`, the Anthropic plugin marketplace, and domain-specific searches (pytest, vitest, alembic, OWASP, accessibility, Lighthouse, dependabot, react-testing, fastapi). The intent was to expand the catalogue with verified community skills.

In practice, every network-capable tool in the second-pass session was denied at runtime:

- `WebSearch` — denied.
- `WebFetch` — denied for all attempted URLs (`github.com/obra/superpowers`, `github.com/hesreallyhim/awesome-claude-code`, `github.com/wshobson/agents`).
- `Bash` (which would have allowed `gh repo view`, `gh search repos`, `curl`) — denied.
- `PowerShell` (Windows host) — denied.

No community skill could be verified against a live URL on that pass.

---

## Third pass 2026-05-03 (same day) — web access restored, expansion completed

After `.claude/settings.json` was updated to permit `WebSearch` and `WebFetch`, both tools were verified working in this session. The catalogue below was assembled from live fetches against `raw.githubusercontent.com/...SKILL.md` and the relevant repository landing pages between roughly 19:30 and 20:00 UTC on 2026-05-03. Anything that could not be confirmed against a working URL on that timeline is still omitted.

Anthropic's first-party `anthropics/skills` repo has also expanded since the first pass — the live folder listing on 2026-05-03 contains 17 skills, including new entries `algorithmic-art`, `brand-guidelines`, `canvas-design`, `internal-comms`, and `slack-gif-creator`. None of those new first-party skills change the recommendation for FridgeCheck (they are creative/comms-oriented), but they are noted for completeness.

### Source-repo facts (verified 2026-05-03)

| Repo | Stars | License | Last activity | URL |
|------|-------|---------|--------------|-----|
| `obra/superpowers` | ~177k | MIT | v5.0.7 released 2026-03-31 | <https://github.com/obra/superpowers> (accessed 2026-05-03) |
| `wshobson/agents` | ~34.7k | MIT | active main branch | <https://github.com/wshobson/agents> (accessed 2026-05-03) |
| `Jeffallan/claude-skills` | ~8.7k | MIT | v0.4.14 on 2026-05-01 | <https://github.com/Jeffallan/claude-skills> (accessed 2026-05-03) |
| `trailofbits/skills` | ~5k | CC-BY-SA-4.0 | actively maintained | <https://github.com/trailofbits/skills> (accessed 2026-05-03) |
| `lackeyjb/playwright-skill` | ~2.6k | MIT | v4.1.0 on 2025-12-02 | <https://github.com/lackeyjb/playwright-skill> (accessed 2026-05-03) |
| `supabase/agent-skills` | ~2k | MIT | active (TypeScript) | <https://github.com/supabase/agent-skills> (accessed 2026-05-03) |
| `addyosmani/web-quality-skills` | ~1.8k | MIT | active main branch | <https://github.com/addyosmani/web-quality-skills> (accessed 2026-05-03) |
| `cloudflare/skills` | ~1.4k | Apache-2.0 | active main branch | <https://github.com/cloudflare/skills> (accessed 2026-05-03) |

Anthropic released the Skills format as an open standard in December 2025; all of the above use the same `SKILL.md` + optional `scripts/`/`references/` layout that Claude Code already understands, so installation is the same `cp` flow as the first-party skills (or `claude install-skill <repo-url>` where the repo ships a marketplace manifest).

---

## Community skills (verified 2026-05-03)

### Summary table

| Name | Source repo | License | Category | Confidence |
|------|-------------|---------|----------|------------|
| test-driven-development | obra/superpowers | MIT | Workflow / testing discipline | High |
| systematic-debugging | obra/superpowers | MIT | Debugging discipline | High |
| verification-before-completion | obra/superpowers | MIT | QA gate | High |
| requesting-code-review / receiving-code-review | obra/superpowers | MIT | Review workflow | Medium |
| using-git-worktrees | obra/superpowers | MIT | Workflow | Medium |
| fastapi-expert | Jeffallan/claude-skills | MIT | Backend / Python | High |
| postgres-pro | Jeffallan/claude-skills | MIT | Database | High |
| test-master | Jeffallan/claude-skills | MIT | Testing | High |
| security-reviewer | Jeffallan/claude-skills | MIT | Security audit | High |
| code-reviewer | Jeffallan/claude-skills | MIT | Code review | High |
| terraform-engineer | Jeffallan/claude-skills | MIT | IaC / AWS | Medium |
| playwright-expert | Jeffallan/claude-skills | MIT | E2E testing | Medium (overlap) |
| react-expert | Jeffallan/claude-skills | MIT | Frontend | Medium (overlap) |
| modern-python | trailofbits/skills | CC-BY-SA-4.0 | Python tooling | High |
| static-analysis | trailofbits/skills | CC-BY-SA-4.0 | Security / SAST | High |
| supply-chain-risk-auditor | trailofbits/skills | CC-BY-SA-4.0 | Dependency audit | High |
| insecure-defaults | trailofbits/skills | CC-BY-SA-4.0 | Security review | Medium |
| agentic-actions-auditor | trailofbits/skills | CC-BY-SA-4.0 | CI/CD security (GitHub Actions) | Medium |
| accessibility | addyosmani/web-quality-skills | MIT | WCAG 2.2 / a11y | High |
| core-web-vitals | addyosmani/web-quality-skills | MIT | Web performance | High |
| performance | addyosmani/web-quality-skills | MIT | Web performance | Medium |
| best-practices | addyosmani/web-quality-skills | MIT | Lighthouse "Best Practices" audits | Medium |
| seo | addyosmani/web-quality-skills | MIT | SEO / structured data | Low |
| web-perf | cloudflare/skills | Apache-2.0 | Lighthouse / Core Web Vitals (Chrome DevTools MCP) | Medium |
| playwright-skill | lackeyjb/playwright-skill | MIT | Browser automation | Medium (overlap with `webapp-testing`) |
| supabase / supabase-postgres-best-practices | supabase/agent-skills | MIT | Postgres / Supabase | Low (Supabase-tilted; FridgeCheck uses raw Postgres) |

---

### test-driven-development (obra/superpowers)

- **Purpose (one line):** Enforce strict red-green-refactor: no production code without a failing test you watched fail.
- **Source:** <https://github.com/obra/superpowers/tree/main/skills/test-driven-development> (accessed 2026-05-03)
- **Author/org:** Jesse Vincent (`obra`). Part of `superpowers` (~177k stars).
- **License:** MIT.
- **What it actually does:** Walks the Red → Verify-Red → Green → Verify-Green → Refactor cycle as hard rules; bans pre-written "reference" implementations; demands one behaviour per test, descriptive names, real code over mocks where possible. Lists common rationalisations ("I'll test afterward", "too simple to test") and rejects them by name. SKILL.md retrieved verbatim from `raw.githubusercontent.com`.
- **Why it helps FridgeCheck specifically:**
  - The codebase already has pytest scaffolding (`backend/tests/test_auth/items/households`) but no enforcement that new features land with tests first. This skill gives Claude a non-negotiable rule that "implement repository → service → route → schema" sequences come with a failing test at each step.
  - The Rescue Recipes endpoint and the APScheduler expiry-notification job are exactly the surfaces where tests-after tends to drift — TDD discipline catches this.
- **Conflicts:** None. Slightly stricter than `test-master` from Jeffallan; pair them (`test-master` for "what to test" patterns, this for "when to write the test").
- **Confidence: High.** Full SKILL.md retrieved.

### systematic-debugging (obra/superpowers)

- **Purpose (one line):** Four-phase debugging discipline — root cause first, no fixes until data flow is traced.
- **Source:** <https://github.com/obra/superpowers/tree/main/skills/systematic-debugging> (accessed 2026-05-03)
- **License:** MIT.
- **What it does:** Phases are Root Cause Investigation → Pattern Analysis → Hypothesis & Testing → Implementation. Hard stop after a third failed fix attempt — must reconsider architecture, not try a fourth patch. Demands a failing test reproducing the bug before any code change.
- **Why it helps FridgeCheck specifically:**
  - Async SQLAlchemy + APScheduler + Redis is a stack where bugs hide in lifecycle ordering. The "trace data flow backward to the source" rule is the right instinct for "why is the worker scheduling jobs against a closed engine?"-class bugs.
  - The "create a failing test for the bug first" rule slots cleanly into the existing pytest-asyncio harness.
- **Conflicts:** None.
- **Confidence: High.** SKILL.md retrieved verbatim.

### verification-before-completion (obra/superpowers)

- **Purpose (one line):** Pre-completion checklist — don't claim "done" without running tests, building, and re-reading the diff.
- **Source:** <https://github.com/obra/superpowers/tree/main/skills/verification-before-completion> (accessed 2026-05-03)
- **License:** MIT.
- **What it does:** Forces a verification pass before declaring a task finished. The repo's README explicitly markets this skill as the partner to TDD.
- **Why it helps FridgeCheck specifically:** `frontend/CLAUDE.md` already says "Always run `npm run build` before declaring a frontend change done. Vite dev mode is forgiving in ways the production build is not." This skill mechanises that rule (and the equivalent `pytest` pass on the backend) for every change Claude makes, not just frontend ones.
- **Conflicts:** None.
- **Confidence: High** (skill listed in the public skills directory; description verified).

### requesting-code-review / receiving-code-review (obra/superpowers)

- **Purpose (one line):** Two paired skills covering how to ask for and respond to review feedback inside an agent loop.
- **Source:** <https://github.com/obra/superpowers/tree/main/skills/requesting-code-review> and `…/receiving-code-review` (accessed 2026-05-03)
- **License:** MIT.
- **What it does:** Listed in the superpowers skills index. Pair with Jeffallan's `code-reviewer` to get both "the reviewer" and "the author behaviour" sides of the loop.
- **Why it helps FridgeCheck specifically:** PRs into `dev` are the standard branch flow per `CONTRIBUTING.md` — these skills help structure the back-and-forth without requiring a second human reviewer for solo work.
- **Conflicts:** None.
- **Confidence: Medium.** Existence verified, individual SKILL.md texts not retrieved in this pass.

### using-git-worktrees (obra/superpowers)

- **Purpose (one line):** Workflow guide for parallelising work via `git worktree`.
- **Source:** <https://github.com/obra/superpowers/tree/main/skills/using-git-worktrees> (accessed 2026-05-03)
- **License:** MIT.
- **Why it helps FridgeCheck specifically:** This very session is running inside `.claude/worktrees/stupefied-lalande-392637`. The skill formalises that pattern (one worktree per Claude task) so concurrent agents don't trample shared `node_modules` / `.venv` state.
- **Confidence: Medium.** Listed in the public directory.

---

### fastapi-expert (Jeffallan/claude-skills)

- **Purpose (one line):** FastAPI + Pydantic v2 + async SQLAlchemy + JWT specialist with a mandatory async-only / type-hints-everywhere policy.
- **Source:** <https://github.com/Jeffallan/claude-skills/tree/main/skills/fastapi-expert> (accessed 2026-05-03)
- **License:** MIT.
- **What it does (from SKILL.md):** Covers REST endpoint creation, Pydantic v2 (`field_validator`, `model_validator`, `model_config`), async SQLAlchemy ops, JWT via `OAuth2PasswordBearer`, WebSockets, OpenAPI generation. Bans synchronous DB calls and mixed sync/async. Workflow: requirements → schemas → async endpoints with DI → security → pytest checkpoints after each endpoint group → confirm `/docs`.
- **Why it helps FridgeCheck specifically:**
  - Hits the exact stack: `backend/CLAUDE.md` lists FastAPI 0.111, Pydantic v2, async SQLAlchemy 2, JWT — this skill encodes those as defaults so Claude doesn't drift to sync calls or pre-Pydantic-v2 syntax.
  - The "test after each endpoint group" workflow maps onto the existing `tests/test_auth.py / test_items.py / test_households.py` layout.
- **Conflicts:** None major. Mild overlap with the bundled `claude-api` skill, which is API-client-focused, not server-side.
- **Confidence: High.** Full SKILL.md retrieved.

### postgres-pro (Jeffallan/claude-skills)

- **Purpose (one line):** Postgres performance specialist — `EXPLAIN (ANALYZE, BUFFERS)`, index strategy, replication, VACUUM tuning.
- **Source:** <https://github.com/Jeffallan/claude-skills/tree/main/skills/postgres-pro> (accessed 2026-05-03)
- **License:** MIT.
- **What it does (from SKILL.md):** Workflow: Analyse (EXPLAIN) → Index design (B-tree/GIN/GiST/BRIN) → Query rewriting → Replication setup → Maintenance. Hard rules: `CREATE INDEX CONCURRENTLY` in prod, `ANALYZE` after bulk changes, no bare `SELECT *`, no global autovacuum off.
- **Why it helps FridgeCheck specifically:**
  - `/households/{id}/items` aggregation (the grouped-by-bucket response — see "Common gotcha #6") is exactly the kind of query that benefits from explicit index strategy on `(household_id, expires_at)`.
  - As the user table grows, the JWT refresh-token store in Redis plus token revocation lookups in Postgres will need tuning.
- **Conflicts:** None.
- **Confidence: High.** SKILL.md retrieved.

### test-master (Jeffallan/claude-skills)

- **Purpose (one line):** Cross-stack testing specialist — pytest, Jest/vitest, Supertest, k6, security testing, with explicit anti-patterns.
- **Source:** <https://github.com/Jeffallan/claude-skills/tree/main/skills/test-master> (accessed 2026-05-03)
- **License:** MIT.
- **What it does (from SKILL.md):** Workflow: scope → strategy → write tests → execute (with flaky-test quarantine) → report. Bans testing implementation internals, production data in tests, success-only branches. Requires specific assertions, mocked externals, order-independent tests. Coverage spans pytest, Jest, Supertest, k6 perf, OWASP security testing.
- **Why it helps FridgeCheck specifically:**
  - The repo has pytest scaffolding but `frontend/CLAUDE.md` notes vitest is "if configured" — this skill gives Claude opinionated defaults to actually configure it.
  - The "happy paths AND error/edge cases" rule is what's been missing on the rescue-recipes endpoint (currently "happy path returns recipes" with thin coverage of the 503 / cache-miss / Anthropic-key-absent branches).
- **Conflicts:** Pairs naturally with `test-driven-development` (when) and `webapp-testing` (E2E surface).
- **Confidence: High.** SKILL.md retrieved.

### security-reviewer (Jeffallan/claude-skills)

- **Purpose (one line):** Five-stage security audit — attack surface → automated scans (Semgrep/Bandit/Gitleaks/Trivy) → manual review → severity validation → remediation report.
- **Source:** <https://github.com/Jeffallan/claude-skills/tree/main/skills/security-reviewer> (accessed 2026-05-03)
- **License:** MIT.
- **What it does (from SKILL.md):** Runs Semgrep, Bandit (Python SAST), Gitleaks (secrets), Trivy (containers/deps); requires manual review on top; outputs CVSS-scored finding tables; covers OWASP Top 10, CWE, CIS benchmarks. Forbids active testing without authorisation, ignoring low-severity, or causing service disruption.
- **Why it helps FridgeCheck specifically:**
  - The "Common gotchas" section of `CLAUDE.md` already flags JWT in localStorage and `ANTHROPIC_API_KEY` containment as live concerns. Bandit + Semgrep on `backend/app/**`, Gitleaks on the whole repo (we already had a "did the API key sneak into `frontend/`?" worry), and Trivy on the `docker/api/Dockerfile` image are exactly the right tools.
  - There is currently no scheduled security-review skill in the repo; this fills the verified gap from the first pass.
- **Conflicts:** Overlaps slightly with the bundled `security-review` slash-command. Treat the skill as the deeper audit, the slash-command as the per-PR quick check.
- **Confidence: High.** SKILL.md retrieved.

### code-reviewer (Jeffallan/claude-skills)

- **Purpose (one line):** Five-dimension PR review (context, structure, details, tests, feedback) with categorised, prioritised output.
- **Source:** <https://github.com/Jeffallan/claude-skills/tree/main/skills/code-reviewer> (accessed 2026-05-03)
- **License:** MIT.
- **What it does (from SKILL.md):** Targets SQL injection, XSS, insecure deserialisation, N+1 queries, magic numbers, missing edge-case coverage. OWASP Top 10 baseline. Output is structured: critical → major → minor → praise → questions → verdict.
- **Why it helps FridgeCheck specifically:** The team relies on Dependabot auto-bumps already (recent commits are dep PRs); a structured review skill complements that on human-authored PRs into `dev`. The N+1 detection is particularly relevant given async SQLAlchemy lazy-loading footguns.
- **Conflicts:** Mild with `superpowers/requesting-code-review` and `superpowers/receiving-code-review` — those are workflow, this is content. Use both.
- **Confidence: High.** SKILL.md retrieved.

### terraform-engineer (Jeffallan/claude-skills)

- **Purpose (one line):** Production-grade Terraform: modules, remote state with locking, validation pipeline (`fmt` → `validate` → `tflint`).
- **Source:** <https://github.com/Jeffallan/claude-skills/tree/main/skills/terraform-engineer> (accessed 2026-05-03)
- **License:** MIT.
- **What it does (from SKILL.md):** Six steps: requirements → modules → remote state → security controls → validation (fmt/validate/tflint, must pass cleanly) → plan & apply. Bans plain-text secrets, local state in prod, committed `.terraform/`. Has explicit recovery paths for state drift, auth failures, dependency conflicts.
- **Why it helps FridgeCheck specifically:** `terraform/modules/` and `terraform/envs/{dev,prod}` already exist targeting AWS ECS Fargate. This skill keeps Claude on the project's existing module conventions and forces tflint runs that the CI may or may not be enforcing today.
- **Conflicts:** None.
- **Confidence: Medium.** SKILL.md retrieved; ROI depends on how often Claude is actually asked to touch Terraform.

### playwright-expert (Jeffallan/claude-skills) and lackeyjb/playwright-skill

- **Purpose (one line):** Two community alternatives to Anthropic's `webapp-testing` for browser automation.
- **Sources:** <https://github.com/Jeffallan/claude-skills/tree/main/skills/playwright-expert> and <https://github.com/lackeyjb/playwright-skill> (both accessed 2026-05-03)
- **Licenses:** MIT (both).
- **What they do:** `lackeyjb/playwright-skill` (v4.1.0, ~2.6k stars) is the most popular community Playwright skill — autonomous code generation, visible browser by default, progressive doc loading, slow-motion 100ms for visibility. Implements the open Agent Skills spec.
- **Why it helps FridgeCheck specifically:** Marginal vs `webapp-testing`. The Anthropic skill already includes the multi-server `with_server.py` helper which matches the api+frontend topology better than these alternatives. Listed for completeness so the team knows the alternatives exist if `webapp-testing` ever lags behind upstream Playwright.
- **Conflicts:** Direct overlap with `webapp-testing`. Pick one.
- **Confidence: Medium.**

### react-expert (Jeffallan/claude-skills)

- **Purpose (one line):** React 18+ specialist (hooks, suspense, server components, performance).
- **Source:** <https://github.com/Jeffallan/claude-skills/tree/main/skills/react-expert> (accessed 2026-05-03)
- **License:** MIT.
- **Why it helps FridgeCheck specifically:** Marginal. `ui-ux-pro-max` already covers the design side. This skill would help on TanStack Query optimisation and Suspense usage but isn't a clear gap today.
- **Conflicts:** Overlap with `ui-ux-pro-max` and the existing design-system lock.
- **Confidence: Medium.** Existence verified in folder listing; full SKILL.md not retrieved in this pass.

---

### modern-python (trailofbits/skills)

- **Purpose (one line):** Modern Python tooling — `uv`, `ruff`, `ty`, `pytest` — with security-aware best practices.
- **Source:** <https://github.com/trailofbits/skills/tree/main/plugins/modern-python> (accessed 2026-05-03)
- **Author/org:** Trail of Bits (security firm).
- **License:** CC-BY-SA-4.0.
- **What it does:** Encodes Trail of Bits' Python conventions — `uv` for venvs/locking, `ruff` for lint+format, `ty` for typing, `pytest` for tests — with security defaults baked in.
- **Why it helps FridgeCheck specifically:**
  - Backend already uses `pyproject.toml` with hatchling + ruff + mypy + pytest. This skill aligns Claude with that toolchain and would surface drift (e.g. someone proposing `black` instead of `ruff format`).
  - The "Common gotchas" file pins `bcrypt==4.0.1` for a hard reason; security-aware tooling is the right house style for a project that documents footguns this carefully.
- **Conflicts:** None major; the toolchain matches the repo's existing `pyproject.toml`.
- **Confidence: High** (folder verified via search results pointing at `plugins/modern-python`).

### static-analysis (trailofbits/skills)

- **Purpose (one line):** SAST workflow with CodeQL, Semgrep, and SARIF result parsing.
- **Source:** <https://github.com/trailofbits/skills/tree/main/plugins/static-analysis> (accessed 2026-05-03)
- **License:** CC-BY-SA-4.0.
- **What it does:** Runs CodeQL or Semgrep against a target, parses SARIF, helps Claude triage findings.
- **Why it helps FridgeCheck specifically:** Pairs with `security-reviewer` (which calls Semgrep) by adding CodeQL on top. CodeQL via GitHub Advanced Security is free for public repos — fits the existing GitHub Actions CI in `.github/workflows/`.
- **Conflicts:** Tool overlap with `security-reviewer`'s Semgrep step. Use `security-reviewer` for the audit narrative, `static-analysis` when CI fails on a SARIF finding.
- **Confidence: High.**

### supply-chain-risk-auditor (trailofbits/skills)

- **Purpose (one line):** Audit the dependency supply chain — third-party threat landscape, typosquatting, abandoned maintainers.
- **Source:** <https://github.com/trailofbits/skills/tree/main/plugins/supply-chain-risk-auditor> (accessed 2026-05-03) — folder existence and purpose confirmed via the repo README and search results; raw SKILL.md path returned 404 at fetch time, so the full text is not quoted here.
- **License:** CC-BY-SA-4.0.
- **What it does:** Reviews `pyproject.toml` / `requirements.txt` / `package.json` dependencies for risk signals beyond what Dependabot's CVE feed catches — author churn, install-script behaviours, suspicious version jumps.
- **Why it helps FridgeCheck specifically:**
  - The repo already has Dependabot PRs in flight (recent commits include `aws-actions/configure-aws-credentials` 4→6, `python-multipart` 0.0.9→0.0.26, `sqlalchemy` 2.0.30→2.0.49). This skill is the human-judgement layer on top of those bumps.
  - The single dev-time `bcrypt==4.0.1` pin is exactly the kind of "do not blindly upgrade" call this skill exists to make.
- **Conflicts:** None.
- **Confidence: Medium** (folder verified, full SKILL.md not retrieved).

### insecure-defaults and agentic-actions-auditor (trailofbits/skills)

- **Sources:** <https://github.com/trailofbits/skills> repo listing under `plugins/` (accessed 2026-05-03).
- **License:** CC-BY-SA-4.0.
- **What they do:** `insecure-defaults` flags credentials and unsafe configurations across a codebase. `agentic-actions-auditor` reviews GitHub Actions workflows for security issues (script injection in `${{ ... }}`, over-broad `permissions:`, third-party action pinning).
- **Why they help FridgeCheck specifically:** The repo runs GitHub Actions for CI/deploy/release; `agentic-actions-auditor` would have caught (or now catches) the well-known `pull_request_target` + workflow injection class of bug if it were ever introduced. `insecure-defaults` complements `security-reviewer` by being targeted rather than full-audit.
- **Confidence: Medium** (folder existence confirmed; descriptions paraphrased from the repo overview).

---

### accessibility (addyosmani/web-quality-skills)

- **Purpose (one line):** WCAG 2.2-aligned a11y review across POUR principles, with axe-core + Lighthouse integration.
- **Source:** <https://github.com/addyosmani/web-quality-skills/tree/main/skills/accessibility> (accessed 2026-05-03)
- **Author/org:** Addy Osmani (Google Chrome DevRel lead).
- **License:** MIT.
- **What it does (from SKILL.md):** Frames accessibility around Perceivable / Operable / Understandable / Robust. Conformance levels A / AA (legal floor in many jurisdictions) / AAA. Hard rules: 4.5:1 contrast for normal text, 24×24 CSS-pixel touch targets, native HTML over ARIA, full keyboard nav, captions on media. Testing combines automated (Lighthouse, axe-core) with manual keyboard / screen-reader / 200%-zoom passes. Stack-agnostic (React/Vue/Svelte/etc.).
- **Why it helps FridgeCheck specifically:**
  - Pantry-tracking apps are used by older household members and people with low vision (literally reading expiry dates) — accessibility is product-relevant, not just compliance.
  - `frontend/index.css` already has reduced-motion handling, suggesting the team cares; this skill formalises the rest of WCAG.
  - `ui-ux-pro-max` is a design-direction skill, not a WCAG auditor — these are complementary, not competing.
- **Conflicts:** None.
- **Confidence: High.** SKILL.md retrieved verbatim.

### core-web-vitals (addyosmani/web-quality-skills)

- **Purpose (one line):** LCP / INP / CLS optimisation specialist.
- **Source:** <https://github.com/addyosmani/web-quality-skills/tree/main/skills/core-web-vitals> (accessed 2026-05-03)
- **License:** MIT.
- **What it does:** Targets LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 with framework-agnostic patterns.
- **Why it helps FridgeCheck specifically:** The marketing landing page (anchored on the £730/year claim) lives or dies by LCP for SEO. Vite + nginx static-serve is a fast baseline, but image-heavy hero sections and the barcode-scanning ZXing bundle on the add-item page are LCP/INP risks worth measuring.
- **Conflicts:** Functional overlap with `cloudflare/skills/web-perf` (below); see the cross-comparison there.
- **Confidence: High** (sibling SKILL.md verified for the same repo).

### performance, best-practices, seo (addyosmani/web-quality-skills)

- **Sources:** <https://github.com/addyosmani/web-quality-skills/tree/main/skills/{performance,best-practices,seo}> (accessed 2026-05-03)
- **License:** MIT.
- **What they do:** `performance` is broader runtime/resource optimisation; `best-practices` covers Lighthouse's "Best Practices" audits (HTTPS, modern APIs, console errors, deprecated APIs); `seo` covers structured data, meta tags, crawlability.
- **Why they help FridgeCheck specifically:** `performance` and `best-practices` are useful supplements to `core-web-vitals`. `seo` only matters once the marketing page is a deliberate growth surface — defer until then.
- **Confidence:** Medium (`performance`, `best-practices`); Low (`seo`).

### web-perf (cloudflare/skills)

- **Purpose (one line):** Performance auditor that runs against a live URL via the Chrome DevTools MCP server.
- **Source:** <https://github.com/cloudflare/skills/tree/main/skills/web-perf> (accessed 2026-05-03)
- **License:** Apache-2.0.
- **What it does (from SKILL.md):** Captures performance traces and Lighthouse scores via Chrome DevTools MCP, identifies render-blocking resources, network dependency chains, layout shifts. Halts if the MCP server isn't configured (`chrome-devtools` entry in MCP settings).
- **Why it helps FridgeCheck specifically:**
  - Different-shaped tool from `addyosmani/web-quality-skills`: that one ships rules and patterns; this one drives an actual live audit. Use the addyosmani skills to write the code and `web-perf` to measure it.
  - Requires the Chrome DevTools MCP server — a prerequisite this team would need to add to `.claude/settings.json`. Worth doing once for both this skill and any future browser-based debugging.
- **Conflicts:** Complementary to `addyosmani/web-quality-skills/core-web-vitals`, not redundant — pattern-vs-measurement split.
- **Confidence: Medium.** SKILL.md key parts retrieved; install requires MCP server addition.

---

### supabase / supabase-postgres-best-practices (supabase/agent-skills)

- **Purpose (one line):** Supabase-flavoured Postgres skills (auth, RLS, edge functions, migrations).
- **Source:** <https://github.com/supabase/agent-skills> (accessed 2026-05-03)
- **License:** MIT.
- **What it does:** Two skills. `supabase` is the umbrella (DB, auth, edge functions, realtime, storage, vectors, cron, queues, client libs, SSR). `supabase-postgres-best-practices` covers query performance, connection management, schema design, concurrency, RLS, data access, monitoring.
- **Why it helps FridgeCheck specifically:**
  - **Low fit.** FridgeCheck uses raw Postgres + asyncpg + Alembic, not Supabase. The `supabase-postgres-best-practices` skill has some transferable Postgres advice but is interleaved with Supabase-specific RLS/auth patterns that don't apply.
  - Listed for completeness because it kept appearing in searches as a "Postgres skill" — but `Jeffallan/postgres-pro` is the better-fit recommendation here.
- **Conflicts:** Worse fit than `postgres-pro` for the same job.
- **Confidence: Low** (fit, not existence — existence is verified).

---

## Skills explicitly searched for but NOT confirmed as standalone skills on 2026-05-03

- **Dedicated Alembic-migration safety skill.** No standalone skill verified. Closest: `Jeffallan/postgres-pro` (covers production-safe DDL like `CREATE INDEX CONCURRENTLY`) and `Jeffallan/fastapi-expert` (covers SQLAlchemy patterns). For Alembic-specific guard-rails (e.g. enum-value migrations per gotcha #4 in `CLAUDE.md`), this is still a candidate to build with `skill-creator`.
- **Dedicated Dependabot config skill.** None found. `trailofbits/supply-chain-risk-auditor` covers the manual review side; Dependabot configuration itself remains a YAML editing task.
- **Dedicated react-testing-library skill.** None found. `Jeffallan/test-master` mentions Jest patterns; vitest + RTL specifics are not encoded as a standalone skill.
- **Dedicated FridgeCheck-style "rescue-recipes Anthropic-call optimiser" skill.** Doesn't exist (and shouldn't — that's a custom skill candidate via `skill-creator`).

---

## Recommended starter pack (re-evaluated 2026-05-03)

Order is install priority. The pack expands from 5 skills (first pass) to 9, with two changes in priority based on the community options now verified.

1. **`webapp-testing`** (anthropics/skills) — Still #1. Multi-server `with_server.py` is the best fit for FridgeCheck's api+frontend dev topology, and the project still has zero E2E tests. Highest-ROI install.
2. **`test-driven-development`** (obra/superpowers) — **New addition, jumps to #2.** With pytest scaffolding already present, the limiting factor isn't tooling, it's the discipline that new code lands with tests first. This skill encodes that as a non-negotiable.
3. **`fastapi-expert`** (Jeffallan/claude-skills) — **New addition.** Direct stack match (FastAPI + Pydantic v2 + async SQLAlchemy + JWT). Steers Claude away from sync-over-async drift and pre-Pydantic-v2 syntax. Higher day-to-day value than the previously-#3 `claude-api`.
4. **`security-reviewer`** (Jeffallan/claude-skills) — **New addition.** First-pass had no verified security skill; this one runs Semgrep + Bandit + Gitleaks + Trivy + manual review. Particularly relevant given the JWT-in-localStorage and `ANTHROPIC_API_KEY`-containment concerns already documented in `CLAUDE.md`.
5. **`accessibility`** (addyosmani/web-quality-skills) — **New addition.** WCAG 2.2 audit skill with axe-core/Lighthouse integration. Pantry-tracking is a use-case where a11y is product-quality, not just compliance.
6. **`skill-creator`** (anthropics/skills) — Force multiplier, kept from first pass. Now even more relevant given the verified gaps above (Alembic-migration safety, Dependabot config, RTL-specific testing) that should be authored as custom skills.
7. **`claude-api`** (anthropics/skills) — Demoted from #3 to #7. Still relevant for the Rescue Recipes feature, but `fastapi-expert` provides more day-to-day value. Verify name collision with the bundled `claude-api` skill before installing.
8. **`mcp-builder`** (anthropics/skills) — Strategic, kept from first pass. Most useful when/if a FridgeCheck MCP server is on the roadmap.
9. **`postgres-pro`** (Jeffallan/claude-skills) — **New addition.** Cheap install, big payoff once the items table or refresh-token activity grows enough that EXPLAIN-driven indexing pays off.

**Tier 2 (install when the matching surface area becomes hot):**

- **`systematic-debugging`** (obra/superpowers) — install when async lifecycle bugs start showing up.
- **`code-reviewer`** (Jeffallan/claude-skills) — install when PR volume exceeds one human reviewer's bandwidth.
- **`core-web-vitals`** + **`web-perf`** — install before the marketing landing page becomes a growth surface.
- **`modern-python`** (trailofbits/skills) — install if the team adopts a stricter Python style review than the existing ruff/mypy config.
- **`supply-chain-risk-auditor`** (trailofbits/skills) — install when a Dependabot PR ever needs more than a glance.
- **`terraform-engineer`** (Jeffallan/claude-skills) — install when Terraform changes become more than rare.
- **`verification-before-completion`** (obra/superpowers) — useful but largely reproduces `frontend/CLAUDE.md`'s "always run `npm run build`" rule. Optional.

**Skills explicitly NOT recommended (unchanged from first pass plus the new candidates):**

- `frontend-design` (anthropics) — overlaps `ui-ux-pro-max` and fights the locked design system.
- `theme-factory` (anthropics) — same.
- `web-artifacts-builder` (anthropics) — Claude.ai artifact format, not a production-app fit.
- `lackeyjb/playwright-skill` and `Jeffallan/playwright-expert` — direct overlap with `webapp-testing`; pick one.
- `react-expert` (Jeffallan) — overlaps `ui-ux-pro-max`.
- `supabase` and `supabase-postgres-best-practices` — wrong stack.
- `seo` (addyosmani) — defer until marketing-page work justifies it.

The starter pack therefore expanded from 5 to 9 skills, with `test-driven-development`, `fastapi-expert`, `security-reviewer`, `accessibility`, and `postgres-pro` newly recommended; `claude-api` demoted but kept; `mcp-builder` and `doc-coauthoring` retained (the latter as optional). The first-pass core (`webapp-testing`, `skill-creator`, `claude-api`, `mcp-builder`) all survive the re-evaluation; only their relative ranking changed.
