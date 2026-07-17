# M3 — Auth & cat management

**Type:** fullstack · **Status:** done
**ADRs:** [0011](../adr/0011-auth-boundary.md) · [0012](../adr/0012-rls-ownership-subquery.md)

## Scope

The first fullstack slice: a human can log in and create cats, each funded by the welcome
grant.

- **Auth:** Supabase email + password, entirely frontend-side — `signUp({ email, password,
  options: { data: { display_name } } })` on `/signup`, `signInWithPassword({ email, password })`
  on `/login`. Both return a session directly, so a fresh signup lands the human on the dashboard
  with no email step (originally magic-link; replaced 2026-07-17, see
  [0011](../adr/0011-auth-boundary.md) "Why magic-link was dropped"). `middleware.ts` gates on
  **`getUser()`** (revalidates against the Auth server), not `getSession()`. A sign-out button on
  the dashboard header calls `auth.signOut()`.
- **Migrations:** `0005_rls_policies.sql` (RLS on `cats`/`wallets`/`ledger_entries`/`transfers`,
  ownership-subquery — [0012](../adr/0012-rls-ownership-subquery.md)); `0006_new_user_trigger.sql`
  (`auth.users` → `humans` row) — unchanged by the auth-method swap; it fires on any `auth.users`
  insert regardless of method.
- **Backend:** `GET /api/me` (human + cats + balances), `GET /api/cats` (global roster, excludes
  the treasury), `POST /api/cats { name }` → `create_cat`.
- **Frontend:** login page, signup page, sign-out, empty state ("Create your first cat"), "New
  cat" dialog.

## Tests

- **Backend:** `/me` returns only the caller's own cats; the roster excludes the treasury; RLS
  blocks cross-human reads; a new cat's welcome grant reconciles.
- **Frontend:** signup/login form validation; a duplicate-email signup is rejected (both the
  direct-error and the anti-enumeration no-identities shapes); unauthenticated access redirects
  to `/login`; the empty state offers cat creation.

## Verify

One human creates two cats; both appear on the dashboard with 500 treats each.

## Progress log

- not started
- 2026-07-15 — started. Reading auth, RLS, and product-surface contracts before implementation.
- 2026-07-15 — done. Commits 5878990..9f8a0c4 add RLS, the new-user trigger, JWT-protected
  cat-management APIs, magic-link UI, and backend/frontend tests (authored, not run). Verify
  was not runnable: no host Java runtime, services were not already up, and Docker Compose was
  not run per user instruction. Supabase Auth's live JWT signing mode remains to be confirmed
  in the project settings; the decoder remains configurable for either a secret or JWKS.
- 2026-07-15 — **backend verified: 4 tests, 0 failures.** `/me` returns only the caller's cats, the
  roster excludes the treasury, RLS isolates humans, and a new cat's welcome grant reconciles. The
  first run exposed three defects, all fixed:
  - **`CatService.create` returned zero rows — a real production bug.** It called `create_cat(...)`
    and joined `public.wallets` in a single statement; Postgres takes the outer snapshot before the
    function runs, so the wallet the function inserts was invisible to the join. Now two statements.
    M2 missed it by calling `create_cat` without a join.
  - **The RLS test never reached RLS.** The harness recreates schema `public`, dropping the `USAGE`
    grant a real one carries, so `SET ROLE authenticated` failed with *permission denied for schema
    public* before any policy evaluated. Restored the grant alongside the harness's existing Supabase
    emulation — a test-fidelity gap, not a production bug.
  - **A Kotlin/AssertJ `satisfies` overload ambiguity** failed `compileTestKotlin` (and so blocked
    M2's suite as well). Its two inner assertions had therefore never run; they pass now.
  - Knock-on: this milestone's `CatService` broke M0's context tests, which asserted the app boots
    without a datasource. See M0's log.
  UI verify (dashboard walkthrough) still needs a running app + live Supabase. Frontend tests deferred.
- 2026-07-16 — frontend suite run (Node.js became available this session). `login-form.test.tsx`
  and `cat-management-dashboard.test.tsx` pass, alongside the rest of the 24-test frontend suite —
  see [CHECKLIST.md](CHECKLIST.md). The UI dashboard walkthrough still needs a running app + live
  Supabase + a browser, which remains unavailable in this environment.
- 2026-07-17 — **auth method swapped: magic-link → email + password signup/login.** User-driven
  change, not a defect fix — see [0011](../adr/0011-auth-boundary.md) "Why magic-link was
  dropped" for the rationale (no password to demo with; the login e2e test's magic-link send
  timed out and was never root-caused). `login-form.tsx` rewritten for `signInWithPassword`; new
  `signup-form.tsx`/`/signup` page for `signUp`; sign-out button added to the dashboard header
  (nothing called `signOut()` before, so `/login` was unreachable once authenticated);
  `/auth/callback` deleted (no code to exchange — password auth returns a session directly).
  `0006_new_user_trigger.sql` needed **no change** — confirmed it fires on any `auth.users`
  insert, not specifically on magic-link signup. Frontend suite re-run: 40 tests, 0 failures (was
  24 — new signup-form tests, expanded login-form and middleware coverage for the new flow and
  the `/signup` route). Backend suite re-run unchanged, confirming nothing crossed the ADR 0011
  resource-server boundary. Requires a manual Supabase Dashboard setting ("Confirm email" → OFF)
  — flagged under M10 fresh-clone reproducibility in [CHECKLIST.md](CHECKLIST.md). Live-app
  verify (signup → dashboard → sign out → log back in → duplicate-email rejection) and the
  e2e/visual runs are not yet executed — no running stack this session; see CHECKLIST.md.
