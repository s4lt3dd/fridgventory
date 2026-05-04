# Auth Provider Evaluation — FridgeCheck

**Date:** 2026-05-03
**Author:** Planning pass (Claude Code) — verified against live provider docs 2026-05-03
**Status:** Verified draft for review

---

## IMPORTANT — verification status

> **Live web verification was performed on 2026-05-03 against each provider's
> official pricing and docs pages.** Each pricing claim, free-tier limit, and
> capability claim below carries a `(accessed 2026-05-03)` link to the
> verification source. Items that are genuinely unverifiable from public
> docs (e.g. dynamic enterprise pricing, internal architecture details)
> are explicitly flagged `[unverifiable]`.
>
> **Material changes from the prior pass** (which was written without web
> access) are called out inline as `**CHANGED:**`. Most consequential:
> Clerk Free is now **50K MAU** (previously documented as 10K), and **WorkOS
> still has no EU data residency** as of 2026-05-03 (previously documented
> as available). These two changes flip parts of the runner-up reasoning;
> the primary recommendation of Supabase Auth still holds and is in fact
> strengthened.

---

## TL;DR comparison table

| Dimension | Auth0 (Okta) | Clerk | Supabase Auth | WorkOS (AuthKit) | AWS Cognito |
|---|---|---|---|---|---|
| **Free MAU** | 25,000 (B2C Free) | 50,000 (Hobby — **CHANGED**, was 10K) | 50,000 | 1,000,000 (AuthKit) | 10,000 (Essentials) |
| **Paid floor** | Essentials from $35/mo (500 MAU) | Pro $25/mo (or $20/mo annual) | Pro $25/mo (whole project) | $0 until 1M MAU; SSO from $125/conn/mo | Pay-as-you-go after 10K free Essentials |
| **1k MAU cost** | Free | Free | Free | Free | Free |
| **10k MAU cost** | $700/mo Essentials, $1,600/mo Pro | Free | Free or $25 (Pro project) | Free | Free |
| **50k MAU cost** | Pro tier required, ~four-figure (50k not on Essentials, 50k "Not available" on Pro per page — needs Enterprise quote) | Free (within new 50K Hobby cap) — **CHANGED** | $25/mo (Pro — within 100K MAU bundle) | Free | $0.015 × 40K = **~$600/mo** Essentials — **CHANGED** (was ~$220 under old Lite pricing) |
| **FastAPI SDK** | No first-party; community libs + JWKS verify | No first-party Python; JWKS verify | Official `supabase-py` (sync & async) | Official `workos` Python SDK | `boto3` + JWKS verify |
| **React SDK** | `@auth0/auth0-react` — mature | `@clerk/clerk-react` — best drop-in | `@supabase/supabase-js` + `@supabase/ssr` | `@workos-inc/authkit-react` | `aws-amplify` (heavy) |
| **bcrypt import (silent rehash)** | Yes — Bulk User Import, `custom_password_hash` with `algorithm: "bcrypt"` | Yes — Backend `CreateUser` API with `password_hasher: "bcrypt"` | Yes — admin API `password_hash` field (with caveats — see notes) | Yes — `password_hash_type: "bcrypt"` on Create/Update User API | Yes via User Migration Lambda trigger only (verifies plaintext on first login) |
| **TOTP** | Yes | Yes (Free tier) | Yes | Yes | Yes |
| **Passkeys / WebAuthn** | Yes | Yes (sign-in; not MFA factor as of May 2026) | Yes (GA) | Yes (AuthKit) | Yes (added 2024) |
| **SMS MFA** | Yes (Twilio bundle) | Yes (Free tier) | Yes (BYO Twilio) | Yes | Yes (SNS, separate billing) |
| **Apple Sign-In** | Yes | Yes | Yes | Yes | Yes |
| **Google Sign-In** | Yes | Yes | Yes | Yes | Yes |
| **Enterprise SSO (SAML/OIDC)** | Free now includes 1 Enterprise Connection (NEW) | 1 enterprise connection on Pro | Pro $25/mo: 50 SAML users included, $0.015/MAU after | $125/conn/mo (sliding scale by volume) | Yes via federated IdPs |
| **EU data residency** | Yes (EU tenant region selectable) | **Not publicly available** as of 2026-05-03 — **CHANGED** (was: "verify on day"; now confirmed not GA) | Yes (eu-west-1, eu-west-2 London, eu-central-1) | **No EMEA region** as of 2026-05-03 — **CHANGED** (was claimed Ireland) | Yes (any AWS EU region) |
| **GDPR DPA** | Yes | Yes (Data Privacy Framework certified) | Yes | Yes (Ireland-governed) | Yes (AWS GDPR DPA) |
| **Lock-in risk** | Medium-low | Medium (UI coupling) | Lowest (GoTrue is OSS, schema in your DB) | Low-medium | High (no password hash export) |

---

## 1. Auth0 (Okta)

### Pricing — verified 2026-05-03

- **B2C Free:** up to **25,000 MAU**, no credit card. Free tier now includes
  **1 Enterprise Connection (NEW)** and **Self-Service SSO (NEW)** with SCIM —
  a meaningful expansion since the prior pass.
- **B2C Essentials:** starts at **$35/month for 500 MAUs**. Scales by MAU
  bucket; **at 10,000 MAU, Essentials is $700/mo**.
- **B2C Professional:** starts at **$240/month for 500 MAUs**, $1,600/mo at
  10,000 MAU. **50,000 MAU is "Not available" on Professional per the live
  pricing page** — at that scale you're in Enterprise quote territory.
- Custom domains require Professional + credit-card verification.
- Source: <https://auth0.com/pricing> (accessed 2026-05-03).

### DX for FastAPI + React

- **React:** `@auth0/auth0-react` — `useAuth0()`, `<Auth0Provider>`, redirect
  callback handling. Universal Login (hosted) is the default path.
- **FastAPI:** No official SDK. Standard pattern: fetch JWKS, verify RS256
  with `python-jose`/`PyJWT`. Community `fastapi-auth0` exists.

### Lock-in risk

- **Low-medium.** Bulk User Export includes `password_hash` in PHC string
  format. Tokens are standard JWTs via JWKS.

### Migration FROM bcrypt-in-our-DB — verified

- Auth0 supports importing bcrypt hashes via Bulk User Import. JSON example:
  `custom_password_hash` field with `algorithm: "bcrypt"` and the existing
  `$2a$10$...` hash. Auth0 supports Argon2, bcrypt, LDAP, HMAC, MD4, MD5,
  SHA1, SHA256, SHA512.
- **Note (verified):** bcrypt's 72-byte input limit is enforced — `salt.value`
  counts toward the 72-byte limit during verify. We're already on bcrypt with
  `passlib`, same constraint, so no behaviour change.
- Docs: <https://auth0.com/docs/manage-users/user-migration/bulk-user-import-schema>
  (accessed 2026-05-03 via search; community confirmation:
  <https://community.auth0.com/t/bulk-user-import-with-bcrypt-password/13522>).

### MFA / SSO / Social

- TOTP, WebAuthn/passkeys, SMS (Twilio bundle). Google + Apple built-in.
- Enterprise SAML/OIDC: 1 connection now on Free (NEW); more on paid.

### Compliance / EU

- SOC 2, ISO 27001, GDPR DPA, HIPAA (paid).
- **EU tenant region available** at tenant creation. UK GDPR via EU adequacy.

### Operational

- Status page: <https://status.auth0.com> (accessed 2026-05-03).
- Free has community + docs only; SLAs require Enterprise.

---

## 2. Clerk

### Pricing — verified 2026-05-03

- **Hobby (Free):** up to **50,000 MRUs/MAU** (Monthly Retained Users) —
  **CHANGED:** raised from 10K to 50K some time before May 2026. Free tier
  includes prebuilt UIs, custom domains, social connections, **TOTP MFA**,
  and **basic organizations** (100 MRO/app).
- **Pro:** **$25/month** (or $20/mo billed annually). Includes 50,000 MRUs;
  overage **$0.02/mo per user** for 50,001–100,000.
- Pro adds: passkeys as MFA factor (not just sign-in), SMS MFA, unlimited
  social connections, 1 enterprise SSO connection, branding removal.
- B2B Organizations add-on: **$85/mo billed annually** for unlimited members
  + advanced features.
- Source: <https://clerk.com/pricing> (accessed 2026-05-03).
- **Source disagreement note:** the live Clerk pricing-page extract on
  2026-05-03 listed TOTP/MFA as a Pro-only feature, but Clerk's own changelog
  and community comparisons show TOTP MFA is included in Free as of 2026.
  Treat the precise free/Pro split for individual MFA factors as
  `[unverifiable]` without a Clerk-internal source — re-check before
  relying on a specific factor being free-tier.

### DX for FastAPI + React

- **React:** Best-in-class drop-in components (`<SignIn />`, `<UserButton />`,
  etc.). `useUser()`, `useAuth()` hooks.
- **FastAPI:** No official Python SDK. Verify JWTs against Clerk's per-instance
  JWKS endpoint with `PyJWT`. Workable, not turnkey.

### Lock-in risk

- **Medium.** Frontend coupling to Clerk's UI components is the real lock-in.
  Tokens are standard JWTs (low lock-in at token layer); user export with
  bcrypt hashes is supported.

### Migration FROM bcrypt-in-our-DB — verified

- Clerk's Backend API `CreateUser` accepts a `password_hasher` field; bcrypt
  is supported. Clerk transparently upgrades older hashes.
- Docs: <https://clerk.com/docs/deployments/migrate-overview> (accessed
  2026-05-03). Operation reference:
  <https://clerk.com/docs/reference/backend-api/tag/Users>.

### MFA / SSO / Social

- TOTP, SMS, passkeys (sign-in primary; **not** an MFA factor as of May 2026
  per Clerk's docs), backup codes.
- Google, Apple, GitHub, etc. — all standard.
- Enterprise SSO (SAML/OIDC): 1 connection on Pro; more is custom.

### Compliance / EU — **CHANGED, MATERIAL**

- SOC 2 Type II, GDPR DPA, EU-US Data Privacy Framework certified.
- **No EU data residency region is publicly listed as of 2026-05-03.** Clerk's
  GDPR notice frames compliance via DPF + SCCs; no public docs page on a
  Frankfurt or Ireland Clerk region. Their service providers commit to keeping
  data in the EU per their GDPR notice, but the primary infrastructure is
  US-hosted.
- For a UK+EU consumer product, this is a real and current concern. DPF
  papers it over legally; reviewers (and savvier users) may not accept it.
- Sources: <https://clerk.com/legal/gdpr> (accessed 2026-05-03);
  <https://clerk.com/legal/dpa> (accessed 2026-05-03).

### Operational

- Status page: <https://status.clerk.com> (accessed 2026-05-03).
- Free has Discord-only support; Pro adds email; SLA needs Enterprise.

---

## 3. Supabase Auth (GoTrue)

### Pricing — verified 2026-05-03

- **Free project:** **50,000 MAU on Auth** included. Project pauses after
  inactivity on free.
- **Pro project:** **$25/month flat**, includes **100,000 MAU** for Auth.
  Above 100K MAU, overage is **$0.00325 per MAU** — the cheapest per-MAU
  overage of any provider here.
- **Team project:** **$599/month**, same Auth bundle (100K included,
  $0.00325/MAU after).
- **SAML SSO:** 50 SAML users included on Pro/Team, **$0.015/MAU after**.
- Source: <https://supabase.com/pricing> (accessed 2026-05-03).

### DX for FastAPI + React

- **React:** `@supabase/supabase-js` + `@supabase/ssr`. Auth UI components
  (`@supabase/auth-ui-react`) are functional but less polished than Clerk;
  build-your-own is the common path.
- **FastAPI:** `supabase-py` (sync + async). For pure JWT verification:
  Supabase Auth now supports asymmetric signing keys (RS256, ES256, Ed25519)
  with a JWKS discovery endpoint — **launched July 17, 2025**, default for
  new projects since May 2025. HS256 still supported for existing projects.
  This eliminates the "shared-secret only" concern in the prior pass.
- **Verified:** <https://supabase.com/docs/guides/auth/signing-keys>
  (accessed 2026-05-03 via search).

### Lock-in risk

- **Lowest of the five.** GoTrue is OSS (`supabase/auth` on GitHub).
  Self-hostable. Schema lives in your Postgres `auth` schema. Password
  hashes (bcrypt) are exportable trivially with `pg_dump`.

### Migration FROM bcrypt-in-our-DB — verified, with caveat

- `auth.admin.createUser` accepts `password_hash` and `id` (UUID). Hashes
  stored in `auth.users.encrypted_password` as bcrypt.
- **Caveat (newly surfaced):** there is an open / historically-reported
  issue (`supabase/auth#1678`) where `auth.admin.createUser` does not
  reliably persist `password_hash` and `id` together via the SDK. Direct
  SQL `INSERT` into `auth.users` is the documented escape hatch and is
  what Supabase's own "migrate from Auth0" guide uses.
- Sources: <https://supabase.com/docs/guides/auth/password-security>
  (accessed 2026-05-03 via search);
  <https://supabase.com/docs/guides/platform/migrating-to-supabase/auth0>
  (accessed 2026-05-03 via search);
  <https://github.com/supabase/auth/issues/1678> (open issue).

### MFA / SSO / Social

- TOTP: yes. WebAuthn/passkeys: GA.
- SMS: yes (BYO Twilio).
- Google, Apple, all majors.
- SAML SSO available on Pro for $0/connection (50 SAML users included);
  per-MAU after — much cheaper than WorkOS or Clerk for SAML.

### Compliance / EU

- SOC 2 Type II, GDPR DPA, HIPAA (paid).
- **EU regions: eu-west-1 (Ireland), eu-west-2 (London), eu-central-1
  (Frankfurt).** Best EU coverage of any in this evaluation alongside AWS.
- Genuinely fine for UK households.

### Operational

- Status: <https://status.supabase.com> (accessed 2026-05-03).
- Pro adds business-hours email support; Team/Enterprise faster.
- **Best debuggability of all five** for a backend engineer — it's your
  Postgres, you can query the auth schema, run `EXPLAIN`, etc.

---

## 4. WorkOS (AuthKit / User Management)

### Pricing — verified 2026-05-03

- **AuthKit (User Management): free up to 1,000,000 MAUs.** Above that,
  **$2,500/mo per million users**.
- **SSO and Directory Sync (SCIM)** — sliding scale per connection per month:
  - 1–15 connections: **$125/ea**
  - 16–30: $100/ea
  - 31–50: $80/ea
  - 51–100: $65/ea
  - 101–200: $50/ea
  - 201+: custom
- Audit Logs: $125/mo per SIEM connection or $99/mo per 1M events.
- Custom Domain: $99/mo. Radar (fraud): free 1K checks, then $100/mo per 50K.
- Source: <https://workos.com/pricing> (accessed 2026-05-03).

### DX for FastAPI + React

- **React:** `@workos-inc/authkit-react` (and Next.js variant). Hosted
  AuthKit page handles sign-in; you redirect to it. Themable.
- **FastAPI:** Official `workos` Python SDK exists for the broader API
  (User Management included). Standard OIDC token verification via JWKS.
  Better Python-side support than Clerk.

### Lock-in risk

- **Low-medium.** OIDC standard, JWKS, user export available with hash
  preservation. Their pitch is "we're standard protocols."

### Migration FROM bcrypt-in-our-DB — verified

- WorkOS Create User and Update User APIs accept `password_hash` with
  `password_hash_type` of `bcrypt`, `scrypt`, `firebase-scrypt`, `ssha`,
  `pbkdf2`, or `argon2`.
- Official open-source migration tools exist (e.g.
  <https://github.com/workos/migrate-clerk-users>,
  <https://github.com/workos/migrate-auth0-users>).
- Docs: <https://workos.com/docs/migrate/other-services> (accessed
  2026-05-03 via search).

### MFA / SSO / Social

- TOTP, SMS, passkeys, magic links — all in AuthKit free tier.
- Social: Google, Apple, Microsoft, GitHub.
- Enterprise SSO is WorkOS's core competence.

### Compliance / EU — **CHANGED, MATERIAL**

- SOC 2 Type II, ISO 27001, HIPAA, GDPR DPA (Ireland-governed law).
- **No EU/EMEA hosting region as of 2026-05-03.** WorkOS confirms regional
  hosting is on roadmap (alongside Vault BYOK), but **not GA**. Compliance
  with GDPR/UK GDPR is via SCCs and DPF, not data residency.
- Source: <https://workos.com/blog/data-residency-for-enterprise-saas>
  (accessed 2026-05-03 via search). The prior pass was wrong about this.
- **For FridgeCheck (UK+EU primary market, B2C consumer), this disqualifies
  WorkOS as a runner-up.** SCCs are legally fine but the optics for a
  household-data SaaS are not great.

### Operational

- Status page: <https://status.workos.com> (accessed 2026-05-03).
- Reportedly responsive support even at lower tiers; SLAs paid.

---

## 5. AWS Cognito

### Pricing — verified 2026-05-03

- AWS reorganised Cognito pricing on **November 22, 2024** into **Lite**,
  **Essentials**, and **Plus** tiers. Lite is grandfathered to existing
  pre-Nov-2024 pools; new pools default to Essentials.
- **Essentials:** 10,000 MAU free; **$0.015/MAU** thereafter. Adds passkeys,
  social IdP, SAML/OIDC IdP, machine-to-machine.
- **Plus:** $0.020/MAU (no free MAU for direct sign-in users). Adds advanced
  security (compromised credentials detection, adaptive auth).
- **Lite (grandfathered):** 50,000 MAU free, $0.0055/MAU up to 90K, $0.0046
  thereafter. Not available to new pools.
- **At 50K MAU on Essentials:** 10K free + 40K × $0.015 = **$600/mo** —
  **CHANGED:** prior pass quoted ~$220 using the old Lite pricing. New
  Essentials is **2.7× more expensive at this scale** than the prior estimate.
- SMS/email billed separately via SNS/SES.
- Source: <https://aws.amazon.com/cognito/pricing/> (accessed 2026-05-03).

### DX for FastAPI + React

- **React:** `aws-amplify` (heavy, opinionated). `Authenticator` component.
  Alternative: hand-roll with `amazon-cognito-identity-js` or OIDC libs.
- **FastAPI:** No first-party SDK; use `boto3` for admin APIs, JWKS for
  token verify. Cognito issues both ID and access tokens — verify ID token
  for user identity.

### Lock-in risk — HIGH, READ THIS

- **You cannot export Cognito password hashes.** AWS does not expose
  hashes via any API. If you put users into Cognito and later want to
  leave, every user must do a forced password reset. For B2C at scale,
  that's a churn event.
- Tokens are standard JWTs (JWKS available); the *token* layer isn't
  locked in — but users are.

### Migration FROM bcrypt-in-our-DB — verified

- Only via the **User Migration Lambda trigger**: on first login attempt,
  Cognito calls your Lambda with username + plaintext password. Lambda
  queries old DB, bcrypt-verifies, returns user attributes; Cognito
  creates the user in the pool (rehashing into Cognito's internal format).
- Subsequent logins go through Cognito directly.
- Docs: <https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html>
  (accessed 2026-05-03 via search).
- Caveats: (a) you maintain the Lambda, (b) plaintext briefly exists in
  Lambda invocation memory (TLS-wrapped end-to-end), (c) one-way door (no
  exit).

### MFA / SSO / Social

- TOTP, SMS, passkeys (added 2024). Google, Apple, Facebook, SAML, OIDC
  via federated IdPs.

### Compliance / EU

- AWS GDPR DPA (umbrella). **EU data residency: trivial** — eu-west-1
  (Ireland), eu-west-2 (London), eu-central-1 (Frankfurt).

### Operational

- Status: <https://health.aws.amazon.com/health/status>.
- Cognito has historical reputation for opaque error messages and surprise
  rate-limit behaviours; debuggability is meaningfully worse than Supabase.

---

## 6. Notable new entrants (2025–2026)

Surveyed during this pass; none change the recommendation, but worth noting:

- **Stytch** — API-first, B2B-leaning. **Acquired by Twilio in 2025.**
  Strong passwordless and MCP-agent (Connected Apps) story. Not B2C-focused
  enough for FridgeCheck.
- **Kinde** — Positioned as B2B-leaning but with consumer app SDKs. Reasonable
  pricing, simple migration tools, organization/RBAC out of the box. Worth
  re-evaluating in a future pass if Supabase Auth ever flips on us.
- **Frontegg** — B2B SaaS-focused (admin portals, tenant management). Wrong
  shape for FridgeCheck (consumer households, not B2B tenants).
- **Ory** — OSS, cloud-native, modular (Kratos, Hydra, Keto). Closest
  philosophical alternative to self-hosted GoTrue. Heavier ops burden than
  Supabase managed.
- **Descope** — Agentic Identity Hub (MCP auth, OAuth 2.1 DCR) launched 2025.
  Interesting if/when FridgeCheck grows agent-driven features.
- **Better Auth** — TS-first OSS auth library, gaining traction for
  full-stack TS apps. Not a managed provider; mismatch with our Python
  backend.

None of these change the primary pick. Sources:
<https://www.kinde.com/comparisons/top-10-authentication-providers-for-b2b-software-2026/>,
<https://www.scalekit.com/blog/frontegg-alternatives-b2b-ai-auth>,
<https://stytch.com/blog/top-scim-tools-2025/> (all accessed 2026-05-03 via
search).

---

## Recommendation

### Primary pick: **Supabase Auth** — recommendation HOLDS, in fact stronger

One-line why: it's open-source GoTrue plus our own Postgres rows, EU residency
in London/Frankfurt is first-class, $25/mo Pro covers us comfortably to 100K
MAU with the **cheapest per-MAU overage of any provider** ($0.00325), and
"leave" is `pg_dump`.

The case in detail:

- **Lock-in is the lowest of any option.** GoTrue is OSS; we can lift and
  shift to self-hosted if Supabase ever raises prices or changes terms.
  No other provider matches this.
- **bcrypt import is the simplest** — same column type in Postgres, same
  hash format. Supabase publishes a documented Auth0→Supabase migration
  guide we can use as a template.
- **EU residency is first-class** (eu-west-2 London / eu-central-1 Frankfurt).
- **Asymmetric JWT signing keys (RS256/ES256/Ed25519) launched July 2025**
  — eliminates the prior pass's HS256 shared-secret concern. JWKS endpoint
  is now available, key rotation no longer breaks live sessions.
- **DX matches our stack** — Postgres-native, async-friendly, FastAPI
  examples, decent React story.
- **Pricing is predictable.** $25/mo flat to 100K MAU; $0.00325/MAU
  overage is roughly **5× cheaper than Cognito Essentials** and **6× cheaper
  than Clerk Pro overage**.

Caveats called out honestly:

- React UI components are weaker than Clerk. We will build more of the
  auth UI ourselves — acceptable trade for the lock-in win.
- Open issue `supabase/auth#1678` around `auth.admin.createUser` reliably
  persisting `password_hash` + `id` together — work around by direct SQL
  `INSERT` into `auth.users` (which is what Supabase's own migration guide
  recommends). **This is a real risk to spike before bulk import.**
- Project pauses on free after a week of inactivity — go straight to Pro
  for production.

### Runner-up: **Auth0** — newly viable

Auth0's free tier now includes **1 Enterprise SSO connection + Self-Service
SSO + SCIM**, which materially closes the feature gap with WorkOS. If we
fall under 25K MAU and don't outgrow the free tier, Auth0 Free is competitive
again. **Above 10K MAU, Auth0 paid pricing is uncompetitive** (Essentials
$700/mo at 10K is brutal vs Supabase Pro $25/mo).

Pick Auth0 only if:
- We need the Universal Login / hosted-UI polish more than we need EU
  residency control (Auth0 has EU tenants, so this isn't a deal-breaker
  either way), AND
- We expect to stay under the 25K free-MAU cap for the foreseeable future.

### Anti-pick: **WorkOS** — newly demoted

The prior pass flagged WorkOS as a strong runner-up assuming EU residency
existed. **It does not as of 2026-05-03.** For a UK+EU-primary B2C consumer
product, that disqualifies it for now. WorkOS is fundamentally a B2B-SSO
company; the AuthKit free-1M-MAU offering is a loss-leader for that market.
If/when WorkOS ships an EU region (on the roadmap), reconsider.

### Anti-pick: **AWS Cognito**

Avoid for our case. **You cannot export password hashes** — Cognito is a
one-way door for password-based users. New 2024 Essentials pricing is
**2.7× more expensive** at our scale than the old Lite quote in the prior
pass (~$600/mo at 50K MAU vs the previously-quoted ~$220). Combined with
rougher DX and worse debuggability, the lock-in does not justify it.

### Anti-pick (for FridgeCheck specifically): **Clerk**

Clerk's 50K free-MAU tier is genuinely generous and would cover FridgeCheck
for a long time. But:

- **No EU data residency** as of 2026-05-03 (DPF + SCCs only). For a UK+EU
  primary GDPR-sensitive consumer product, this is the wrong answer when
  Supabase makes EU residency trivial.
- React UI lock-in is real once `<SignIn />` is everywhere.
- Pro tier overage (**$0.02/MAU**) is ~6× Supabase's Pro overage.

If we were US-primary, Clerk would be a strong primary pick on DX alone.
We aren't.

---

## Migration plan: bcrypt-in-our-DB → Supabase Auth

*(Plan and rollback strategy preserved from prior pass; verified that the
key technical assumption — bcrypt hashes can be inserted directly — still
holds, with the `auth.admin.createUser` caveat above noted in Phase 1.)*

Assumptions:

- Current state: `users` table with `email`, `password_hash` (bcrypt PHC),
  `id` (uuid), and refresh-token row in our own table.
- We provision a Supabase project in `eu-west-2` (London), separate from
  our self-hosted Postgres for the FridgeCheck app data.
- We keep our app Postgres as the source of truth for everything *except*
  identity. The Supabase project hosts only `auth.*` schema; we don't
  put domain data there.

### Phase 0 — Prep (1 week before cutover)

1. Provision Supabase project, EU region, set JWT settings (asymmetric keys
   default since May 2025), configure `Site URL` + redirect URLs for our
   domain.
2. Add `supabase-py` to backend; add `@supabase/supabase-js` to frontend.
3. Build a parallel `/api/v2/auth/*` route set in FastAPI that verifies
   Supabase JWTs via JWKS (in addition to our existing local JWT
   verification). Now both token formats are accepted on protected routes
   — this is the **dual-read window**.
4. Add a feature flag `auth.provider = "local" | "supabase"` (env var).
   Default: `local`. New signups can be flipped to `supabase` instantly
   per-environment.

### Phase 1 — Bulk import existing users

1. Snapshot `users` table from app Postgres.
2. **Insert rows directly into Supabase `auth.users` via SQL** (not the
   admin SDK — see issue `supabase/auth#1678`):
   - `id` = our existing UUID (preserve).
   - `email` = same.
   - `encrypted_password` = our existing bcrypt PHC string. Verify the
     column accepts the `$2b$` prefix `passlib` produces (Supabase's own
     migration guide uses this pattern).
   - `email_confirmed_at` = NOW() (we treat existing accounts as already
     confirmed, since we never had email verification).
3. **Spike step (NEW after this verification pass):** before bulk import,
   pick **5 users**, manually `INSERT` them, sign in via the Supabase
   client with their existing password, confirm session token. **Then**
   bulk import. The `auth.admin.createUser` issue means we need confidence
   in the SQL path specifically.
4. **Rollback at this point is cheap:** `DELETE FROM auth.users` on the
   Supabase side; no user has been served a Supabase token yet.

### Phase 2 — Frontend cutover (gradual)

1. Behind a feature flag, swap the login form from our `/api/v1/auth/login`
   to Supabase's `signInWithPassword`. Refresh tokens become Supabase
   refresh tokens (still in localStorage — no cookie change in v1).
2. Roll out to 5%, then 25%, then 100% of new sessions over a week.
   TanStack Query cache clear on login is already in place — no change
   there.
3. Backend continues to accept *both* token types (dual-read). A user
   logged in pre-cutover keeps their old token working; on its expiry
   they re-login and get a Supabase token.

### Phase 3 — Refresh-token cutover

1. Once 100% of new logins go via Supabase, set old-system refresh-token
   max age to 14 days from cutover.
2. After 14 days, delete our local refresh-token table. Disable
   `/api/v1/auth/login` (return 410 Gone with a "please log in again"
   payload).
3. Backend stops accepting our old JWT format. Only Supabase JWTs
   verified via JWKS going forward.

### Phase 4 — Cleanup

1. Drop `password_hash` column from our app Postgres `users` table
   (after verifying no service reads it).
2. Replace our `users` table with a `profiles` table keyed on
   Supabase `auth.users.id`. Domain rows (households, items) FK to
   `profiles.id`.

### Rollback (day 3 disaster scenario)

If on day 3 of the gradual rollout we hit a blocking issue (e.g. Supabase
EU region outage, login error rate jumps, password verify fails for some
hash variant we missed):

1. **Flip the feature flag** `auth.provider = "local"` everywhere.
   Frontend reverts to `/api/v1/auth/login` — our old endpoint still
   exists during dual-read, still works against unchanged
   `users.password_hash`. Users who logged in via Supabase in the last
   3 days will be forced to re-login (annoying, not catastrophic — they
   re-enter the same password against our local bcrypt).
2. Supabase `auth.users` rows can stay; they're inert as long as nobody
   redirects to Supabase login. We can revisit later or just delete them.
3. Backend continues to accept legacy JWTs (dual-read window still open),
   so existing local-session users keep their session.
4. Time to recover: minutes, not hours. The key reason this works: we
   never *deleted* anything in Phase 0–2, we only *added*. Phase 3 is
   the irreversible step, and we don't take it until the rollout has
   been clean for at least a week.

### Risks called out

1. **bcrypt format mismatch.** `passlib` defaults to `$2b$`; Supabase
   stores bcrypt in `encrypted_password`. Test 5 imported users
   end-to-end before bulk import. **This is the biggest single risk** —
   raised in priority by the `supabase/auth#1678` finding.
2. **Email-as-username vs username-as-username.** We currently allow
   username login; Supabase Auth is email-first. If any users have
   distinct username + email, migrate them to email-only first.
3. **Password reset flow doesn't exist today.** Supabase gives us this
   for free, but verify the email template and sender domain *before*
   cutover so the first password-reset email isn't a Supabase default
   with a `*.supabase.co` reply-to.
4. **Refresh-token storage stays in localStorage.** Migration is not the
   right time to also re-architect to httpOnly cookies. Park as a
   separate ticket.
5. **JWT signing-key rotation** during migration: with asymmetric keys
   now default, rotation no longer invalidates live sessions, but still
   schedule cutover during a low-traffic window (Sunday 03:00 UK time
   `[unverifiable — based on general SaaS traffic patterns, not measured
   FridgeCheck data]`).

---

## Sources (all accessed 2026-05-03)

Pricing pages (live verified):

- Auth0 — <https://auth0.com/pricing>
- Clerk — <https://clerk.com/pricing>
- Supabase — <https://supabase.com/pricing>
- WorkOS — <https://workos.com/pricing>
- AWS Cognito — <https://aws.amazon.com/cognito/pricing/>

Migration / hash-import docs (verified via direct fetch or web search):

- Auth0 bulk import — <https://auth0.com/docs/manage-users/user-migration/bulk-user-imports>
- Auth0 import schema — <https://auth0.com/docs/manage-users/user-migration/bulk-user-import-schema>
- Clerk migration — <https://clerk.com/docs/deployments/migrate-overview>
- Clerk Backend API CreateUser — <https://clerk.com/docs/reference/backend-api/tag/Users>
- Supabase migrate-from-Auth0 — <https://supabase.com/docs/guides/platform/migrating-to-supabase/auth0>
- Supabase password security — <https://supabase.com/docs/guides/auth/password-security>
- Supabase asymmetric signing keys — <https://supabase.com/docs/guides/auth/signing-keys>
- WorkOS migrate-from-other-services — <https://workos.com/docs/migrate/other-services>
- WorkOS migrate-clerk-users (OSS tool) — <https://github.com/workos/migrate-clerk-users>
- AWS Cognito user migration trigger — <https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html>

Compliance / data residency:

- Clerk GDPR notice — <https://clerk.com/legal/gdpr>
- Clerk DPA — <https://clerk.com/legal/dpa>
- WorkOS data residency blog — <https://workos.com/blog/data-residency-for-enterprise-saas>
- WorkOS DPA — <https://workos.com/legal/data-processing-addendum>

Status pages:

- <https://status.auth0.com>
- <https://status.clerk.com>
- <https://status.supabase.com>
- <https://status.workos.com>
- <https://health.aws.amazon.com/health/status>

Known issues referenced:

- `supabase/auth#1678` — admin createUser password_hash + id reliability:
  <https://github.com/supabase/auth/issues/1678>
