# MeowPay — end-to-end tests (Playwright)

Browser-driven tests against the real running stack (frontend + backend + the live hosted
Supabase project in `.env`), covering the milestones marked `done` in
[`docs/MILESTONES.md`](../docs/MILESTONES.md): **M0, M1, M3–M7**. M2 has no UI of its own and is
exercised implicitly through M5/M6. **M8 and M11 are abandoned, M9 is complete, and M10 remains
out of scope for this suite.**

This is a third test layer alongside each milestone's own backend (Testcontainers/Kotlin) and
frontend (vitest) suites — it is the only layer that drives a real browser against the real
deployed app, which is what several milestones' own `Verify` steps call for and could not run
during authoring (no browser was available then — see `docs/milestones/CHECKLIST.md`).

## Why there's a new backend route

MeowPay's login is Supabase email + password (ADR 0011) — GoTrue owns identity, there's no
backend auth endpoint. Several tests need **multiple, independently-authenticated humans** (RLS
isolation, cross-human transfers), which driving the real signup form for each one makes slow.

`frontend/app/api/test/login/route.ts` is a **test-only** route, inert unless
`E2E_TEST_MODE=true`, that mints a **real** Supabase session for a human, given just an email and
display name — the exact anon-key `signUp`/`signInWithPassword` calls the real signup/login forms
make, with a fixed test password and the same duplicate-email fallback `signup-form.tsx` uses. It
skips _filling out the signup form_, not verification: every session it produces is genuinely
JWT-valid and subject to the same backend (`SecurityConfig`) and RLS (ADR 0012) checks as a real
login. No service-role key involved — it's the anon key the app already ships to the browser.

**Never set `E2E_TEST_MODE=true` outside a test run.**

## Setup

1. In the repo root `.env`, set `E2E_TEST_MODE=true`.
2. Bring the stack up (`docker compose up --build`, or `npm run dev` + `./gradlew bootRun`).
3. `cd e2e && npm install`
4. Copy `.env.example` to `.env` if your ports differ from the defaults (`localhost:3000` /
   `localhost:8080`).

## Running

```bash
npx playwright install chromium   # first time only
npm test                          # headless
npm run test:headed               # watch it click through the app
npm run test:ui                   # Playwright's interactive UI mode
```

The visual-regression spec (`tests/m01-m07-visual.spec.ts`) needs baseline screenshots on its
first run:

```bash
npx playwright test m01-m07-visual --update-snapshots
```

Re-run the same command deliberately whenever a real design change should become the new
baseline; otherwise a plain `npm test` diffs against the committed baselines.

## Cleanup

The e2e suite writes real users and ledger rows into the hosted Supabase project in `.env`. To
remove only the test humans afterward, use the backend container's cleanup script:

```bash
docker compose exec backend ./scripts/cleanup_supabase.sh
docker compose exec backend ./scripts/cleanup_supabase.sh --yes
```

The default run is a preview. `--yes` deletes rows for emails matching
`%@meowpay.test` and leaves the schema and `public.app_migrations` history intact. It does not
alter the treasury balance, which may include non-test activity.

## Test data

**Cats are always fresh** — every one is minted with a uniquely-named `uniqueCatName()`
(`fixtures/ids.ts`), never reused, and nothing is ever deleted. This matches the product's own
model: the ledger is append-only and audit-forever by design (ADR 0009), so accumulating rows in
the configured Supabase project across runs is expected, not a leak to clean up. Point this suite
at a scratch/dev Supabase project rather than a real production one.

**Humans are a mix of fresh and reused.** Signup/login is frictionless now (no magic-link rate
limit), so most tests just need an _isolated_ account, not a _never-before-used_ one —
`loginAsFixedHuman(context, "A" | "B")` (`fixtures/auth.ts`) logs into one of two permanent
accounts instead. A test still needs `loginAsNewHuman` if it asserts something only true from a
zero-history starting point: an empty-state UI, an exact row/total count, or an account-wide total
(`totalHeroAmount`, or the unscoped `ledgerRowByCounterparty` locator) — those aren't safe against
a shared account because `playwright.config.ts` runs `fullyParallel`, and another worker can be
acting on the same fixed account at the same moment. Per-cat/per-transfer assertions (`catBalance`,
a dropdown option, a named chart entry) are unaffected by concurrent activity on other cats, so
those are exactly the tests that moved to the two fixed accounts.

## Layout

```
fixtures/
  config.ts          — baseURL / backendURL (defaults to the docker-compose ports)
  ids.ts              — unique email / cat-name generators
  auth.ts             — loginAsNewHuman(context, displayName) / loginAsFixedHuman(context, slot)
                         via the test-login route
  api.ts              — authenticated direct-backend requests, for edge cases the UI has no
                         widget for (ownership rejection, the top-up allowlist/cap)
  dashboard-page.ts    — page-object helpers over the real component markup

tests/
  m00-foundation.spec.ts
  m01-m07-visual.spec.ts        — theme toggle + 375/768/1440px × light/dark screenshots
  m03-auth-and-cat-management.spec.ts
  m04-realtime-dashboard.spec.ts
  m05-manual-transfer.spec.ts
  m06-topup.spec.ts
  m07-activity-charts.spec.ts
```

## What's covered per milestone

- **M0** — unauthenticated `/api/**` returns 401; unauthenticated visits redirect to `/login`.
- **M1** — theme toggle flips `.dark`; visual pass at 375/768/1440px, light + dark.
- **M3** — signup/login form validation; a fresh signup lands on the dashboard with no email
  step; sign-out and log-back-in; a repeat signup with the same email is rejected; a brand-new
  human's empty state; new cats start at zero and are funded from the human wallet; one human's
  cats/balances never appear on another's dashboard (the global recipient roster is the
  deliberate exception — see ADR 0012).
- **M4** — the human-wallet top-up lands in the trail **live, with no page refresh**; the trail
  collapses table → stacked cards below 768px; one human's
  realtime activity is never delivered to another human's socket (ADR 0013).
- **M5** — an own-cat transfer nets the total hero to zero and shows both legs; a cross-human
  transfer moves treats live into the recipient's total; insufficient funds surfaces
  `failure_reason` **verbatim** (`insufficient_funds`, not a friendly message — that's the actual
  backend contract); the receiver field excludes the selected sender; amount validation; a
  concurrently-retried idempotency key never double-charges (ADR 0009); a `senderCatId` the
  caller doesn't own is rejected with 403 `sender_not_owned`.
- **M6** — a top-up mints into the caller's human wallet with no recipient identifier; preset
  pills fill the amount field and keep their 44px touch target; non-positive and over-cap amounts
  are rejected.
- **M7** — top recipients stays empty until the first _sent_ treat even though the flow chart
  already shows the top-up; sending treats populates the chart and its hover tooltip; an
  internal own-cat transfer nets to zero in the flow chart **but still appears** in top
  recipients (derive.ts excludes internal transfers from one and not the other — a real
  distinction in the derivation, not an inconsistency); both charts reflow 2-up → 1-up below
  768px.

## Deliberately not covered here

- **M8 and M11** — abandoned; **M9** has backend/frontend coverage outside this e2e suite;
  **M10** has not started (see `docs/MILESTONES.md`).
- **M2** — no UI of its own; its invariants (conservation, reconciliation, concurrent-transfer
  locking) are proven by the backend's own Testcontainers suite, not by driving a browser.
- The top-up server cap (`TOPUP_MAX`) specifically — it's env-configured and this suite doesn't
  assume a particular deployed value.
