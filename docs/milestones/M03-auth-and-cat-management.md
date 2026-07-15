# M3 — Auth & cat management

**Type:** fullstack · **Status:** not started
**ADRs:** [0011](../adr/0011-auth-boundary.md) · [0012](../adr/0012-rls-ownership-subquery.md)

## Scope

The first fullstack slice: a human can log in and create cats, each funded by the welcome
grant.

- **Auth:** Supabase magic-link, entirely frontend-side —
  `signInWithOtp({ options: { data: { display_name } } })` carries the human's display name.
  `auth/callback` exchanges the code for a session. `middleware.ts` gates on **`getUser()`**
  (revalidates against the Auth server), not `getSession()` ([0011](../adr/0011-auth-boundary.md)).
- **Migrations:** `0005_rls_policies.sql` (RLS on `cats`/`wallets`/`ledger_entries`/`transfers`,
  ownership-subquery — [0012](../adr/0012-rls-ownership-subquery.md)); `0006_new_user_trigger.sql`
  (`auth.users` → `humans` row).
- **Backend:** `GET /api/me` (human + cats + balances), `GET /api/cats` (global roster, excludes
  the treasury), `POST /api/cats { name }` → `create_cat`.
- **Frontend:** login page, empty state ("Create your first cat"), "New cat" dialog.

## Tests

- **Backend:** `/me` returns only the caller's own cats; the roster excludes the treasury; RLS
  blocks cross-human reads; a new cat's welcome grant reconciles.
- **Frontend:** login form validation; unauthenticated access redirects to `/login`; the empty
  state offers cat creation.

## Verify

One human creates two cats; both appear on the dashboard with 500 treats each.
