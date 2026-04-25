# frontend/CLAUDE.md — React app

Module-specific guidance. Root `CLAUDE.md` covers the project at large.

---

## Stack

- **React 18** + TypeScript (strict)
- **Vite 5** dev server with HMR; production build outputs to `dist/`
- **Tailwind CSS 3** + CSS custom properties for design tokens
- **TanStack Query v5** for server state
- **react-router-dom v6** with nested routes
- **lucide-react** for all icons (no emoji icons, ever)
- **axios** wrapper at `src/api/client.ts` with token-refresh interceptor
- **@zxing/library** for in-browser barcode scanning (lazy-loaded)
- **clsx** for conditional className composition
- **Vitest** + `@testing-library/react` (test setup in `src/test-setup.ts`)
- **PWA** via `vite-plugin-pwa` (Workbox under the hood)

## Layered architecture

```
Page (pages/*.tsx)         route components, layout assembly
  ↓ uses
Hook (hooks/use*.ts)       TanStack Query hook, returns { data, isLoading, isError, refetch, ...mutations }
  ↓ calls
API wrapper (api/*.ts)     thin axios call returning typed promise
  ↓ via
client (api/client.ts)     axios instance with auth header + 401-refresh
  ↓ to
backend                    FastAPI at /api/v1/...

Cross-cutting:
  contexts/AuthContext     user state + token storage + queryClient.clear() on session change
  components/ui/*          design-system primitives (Button, Input, Card, ...)
  components/<domain>/*    feature components (items/, households/, layout/)
  utils/*                  pure helpers — no React, no async
  types/index.ts           shared types, mirrors backend Pydantic schemas
```

## Where each thing goes

| You're adding... | Touch these |
|------------------|-------------|
| A new page | `src/pages/<X>Page.tsx`, register route in `src/App.tsx` (under `/app/*` if auth-required) |
| A new resource fetch | New file in `src/api/`, new hook in `src/hooks/use<Resource>.ts`, new types in `src/types/index.ts` |
| A new ui primitive | `src/components/ui/<Name>.tsx`. Must use design tokens, support `className` passthrough, set `displayName` if it's a `forwardRef`. |
| A new feature component | `src/components/<domain>/<Name>.tsx`, where `<domain>` is `items` / `households` / `layout` |
| A new util | `src/utils/<purpose>.ts`. Pure functions only — no React, no I/O. Add tests if it's non-trivial. |
| A new icon | Import from `lucide-react`. **Never** add emoji as an icon. |

## Routing

`src/App.tsx`:

```
/                         LandingPage              (public)
/login, /register         auth pages               (public — redirect to /app/dashboard if signed in)
/join/:token              JoinPage                 (auth required, asks for confirmation)
/app/*                    Layout-wrapped routes    (auth required)
  dashboard               DashboardPage
  add-item                AddItemPage
  households              HouseholdPage
  recipes                 RecipesPage
  settings                SettingsPage
  *                       redirect → /app/dashboard
*                         catch-all redirect → /
```

The `/app/*` segment is important — adding an authenticated page means adding a child route inside the `/app/*` `<Routes>`, not a top-level route. Forgetting this means the page will render without the sidebar/bottom-tab Layout.

## TanStack Query conventions

- One hook file per resource: `useAuth.ts`, `useHousehold.ts`, `useItems.ts`, `useRecipes.ts`.
- Query keys: tuple, scoped by resource and id-ish. e.g. `['items', householdId]`, `['rescue-recipes', householdId]`.
- `useQuery` consumers must render every state — `isLoading` (spinner or skeleton), `isError` (with retry button calling `refetch`), empty (with `EmptyState`).
- `useMutation` consumers must:
  - disable submit button while `isPending`
  - surface `onError` inline (use `error` prop on `<Input>` for field errors, alert div for form-level)
  - if doing optimistic updates, implement `onMutate` snapshot → `onError` rollback → `onSettled` invalidate
- `AuthContext` calls `queryClient.clear()` on login/register/logout. Never key a query without the user id if it's user-specific AND you don't want to rely on this clear (defence in depth).

## Design system — non-negotiable rules

The single source of truth is `design-system/fridgecheck/MASTER.md`. Read it before any visual change.

### Tokens

CSS custom properties in `src/index.css` `:root` are the source. They're exposed to Tailwind via `tailwind.config.js`. **Components reference them only through Tailwind utilities** — not raw `var(--...)` and never raw hex.

| Concept | Token | Tailwind utility |
|---------|-------|------------------|
| Primary brand | `--color-primary` `#DC2626` | `text-primary`, `bg-primary`, `border-primary` |
| Secondary | `--color-secondary` `#F87171` | `text-secondary`, `bg-secondary` |
| CTA / accent | `--color-accent` `#CA8A04` | `bg-accent`, `text-accent` |
| Surface (cards) | `--color-surface` `#FFFFFF` | `bg-surface` |
| Subtle bg | `--color-surface-subtle` `#FEF2F2` | `bg-surface-subtle` |
| Border | `--color-border` `#FECACA` | `border-border` |
| Body text | `--color-text-primary` `#450A0A` | `text-text-primary` |
| Muted text | `--color-text-muted` `#7F1D1D` | `text-text-muted` |
| Expiry safe | `--color-expiry-safe` `#16A34A` | `bg-expiry-safe`, `text-expiry-safe` |
| Expiry warning | `--color-expiry-warning` `#CA8A04` | `bg-expiry-warning`, `text-expiry-warning` |
| Expiry danger | `--color-expiry-danger` `#DC2626` | `bg-expiry-danger`, `text-expiry-danger` |

Spacing: `--space-xs/sm/md/lg/xl/2xl/3xl`. Radii: `--radius-sm/md/lg/xl`. Shadows: `--shadow-sm/md/lg/xl`. Use Tailwind utilities or `var()` in CSS.

### Hard rules

1. **No raw hex in `.tsx`/`.ts` files** outside `<svg>` blocks. Inline SVG illustrations may use hex.
2. **No emoji as icons.** lucide-react only.
3. **All clickable elements** have `cursor-pointer` and a `transition` of 150–300ms.
4. **Focus rings** use `focus-visible:` (not `focus:`) so they only show on keyboard nav. Ring colour is `ring-primary/20`.
5. **`prefers-reduced-motion`** is respected globally in `src/index.css` — don't add new transitions/transforms that bypass that block.
6. **Responsive at 375 / 768 / 1024 / 1440.** Test mentally before merging. Avoid fixed widths, unwrapped flex rows with long children, anything that can horizontally overflow at 375px.
7. **Hover state lifts** use `translateY(-2px)` (the `.hover-lift` utility), never `scale(...)` — scale shifts layout.
8. **Typography:** body `font-sans` = Quicksand; display `font-display` = Caveat for big headings only. Google Fonts loaded once in `index.html` head — never duplicate in CSS or components.

## UI primitives — what's available

In `src/components/ui/`:

| Component | Notes |
|-----------|-------|
| `Button` | variants: `primary` (gold), `secondary` (red outline), `ghost`, `danger`. sizes: `sm`/`md`/`lg`. Pass `className` to extend. |
| `Input` | Props: `label`, `error`, `hint`. Use `error` for inline validation messages. 16px text size (prevents iOS zoom). |
| `Card` | `bg-surface`, rounded-2xl, `shadow-md`. Pass `hover` prop for the lift treatment. |
| `Badge` | Accepts `urgency: 'safe' \| 'warning' \| 'danger'` (or legacy 4-tier `UrgencyLevel`). Optionally `expiryDate` for "Today!"/"Tomorrow" labels. |
| `Modal` | Renders to body via portal, focus-trap, ESC to close, click-outside to close. |
| `LoadingSpinner` | Sizes `sm`/`md`/`lg`. Color inherits. |
| `EmptyState` | Props: `icon`, `title`, `description`, `action`. Use this anywhere data can be empty. |
| `CategoryIcon` | Maps `ItemCategory` → lucide icon. Use for any item-category visual. |
| `ErrorBoundary` | Wraps the app in `App.tsx`. Don't add another. |

Don't reinvent these. If you need a variant, extend the existing component (a new `variant` prop, not a new file).

## Auth + token handling

- Tokens live in `localStorage` under keys defined in `src/api/client.ts` (`fridgecheck_access_token`, `fridgecheck_refresh_token`).
- Axios interceptor catches 401, attempts a single refresh, retries the original request once. On second 401 → clear tokens, the next route guard will redirect to `/login`.
- `AuthContext` is the only place that should mutate token state. Don't read/write localStorage from random components.
- `useAuth()` returns `{ user, isAuthenticated, isLoading, login, register, logout }`.

`ProtectedRoute` in `App.tsx` gates `/app/*`. Auth pages internally check `isAuthenticated` and redirect to `/app/dashboard`.

## Adding a barcode-scanned field

The barcode flow lives in `src/components/items/ItemForm.tsx` + `BarcodeScanner.tsx` + `src/api/openFoodFacts.ts` + `src/utils/categoryMapping.ts`.

If you extend prefill (e.g. add brand or unit guess):
1. Update `ProductInfo` type in `openFoodFacts.ts`.
2. Update the mapping in the same file.
3. Update `handleBarcodeDetected` in `ItemForm.tsx` to consume new fields.
4. Don't break the manual-entry path — prefill is additive and editable.

## Calling Anthropic Claude — DON'T

`ANTHROPIC_API_KEY` lives only on the backend. The frontend hits `POST /api/v1/recipes/rescue` via `src/api/rescueRecipes.ts` and `useRescueRecipes` in `src/hooks/useRecipes.ts`. If you ever find yourself wanting to import `@anthropic-ai/sdk` here — **stop**, route it through the backend.

## Form validation

Validation helpers live in `src/utils/validation.ts`:
- `isValidEmail(value: string): boolean` — `.includes('@')` (intentionally permissive)
- `isValidPassword(value: string): boolean` — min 8 chars
- `isPositiveQuantity(value: number): boolean`
- `isNotPastDate(value: string): boolean`

Pattern in forms:
```tsx
const [emailError, setEmailError] = useState<string | null>(null);
// ...
<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
  error={emailError ?? undefined}
/>
```

Set the error on submit if the value is invalid; clear it on change.

## Testing

```bash
docker compose exec frontend npm test          # vitest (watch off in CI)
docker compose exec frontend npm run build     # type-check + production build (always run before merging)
```

`src/test-setup.ts` wires up `@testing-library/jest-dom` matchers. Mock TanStack Query with a fresh `QueryClient` per test, no retries.

## Performance + bundle hygiene

- Lazy-load heavy routes/components with `React.lazy()` + `<Suspense>`. The barcode scanner is lazy-loaded — keep it that way (it pulls in @zxing/library, ~600KB).
- Don't add new top-level deps lightly. Check existing primitives first.
- The chunk-size warning at 500KB is a regression signal — investigate before merging if it appears.

## Common gotchas

1. **API contract drift.** `/households/{id}/items` returns a grouped object, not an array. `itemsApi.list` flattens it. If you change the backend shape, update the wrapper.
2. **HMR doesn't pick up new deps.** Adding a package to `package.json` requires installing inside the container (`docker exec fidgecheck-frontend-1 npm install`) and restarting Vite.
3. **Camera scanning needs HTTPS or localhost.** On a deployed staging URL, you need TLS.
4. **The `/join/:token` page asks for confirmation.** Don't restore the previous auto-join behaviour — it caused a real cross-account membership leak.
5. **Tailwind purges aggressively.** Class names built dynamically (`bg-${color}-500`) won't survive purge. Always use full class names or list them in `safelist` in `tailwind.config.js`.

## Don't do this

- ❌ Inline hex colours in components.
- ❌ Emoji icons.
- ❌ `style={{...}}` for things Tailwind can do.
- ❌ Direct `localStorage` access for tokens — go through `AuthContext` / `client.ts`.
- ❌ `useEffect` for things that should be a TanStack Query.
- ❌ Importing `@anthropic-ai/sdk` in frontend code.
- ❌ Adding routes outside the `/app/*` guard if they need auth.
- ❌ Changing routing without updating every NavLink (sidebar, bottom-tab, landing-page CTAs, auth-page redirects).
- ❌ Skipping `npm run build` before declaring a change done.
