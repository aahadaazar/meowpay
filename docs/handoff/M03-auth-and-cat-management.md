# M3 Handoff — Auth & cat management

**Status:** complete on 2026-07-15
**Milestone record:** [M03](../milestones/M03-auth-and-cat-management.md)
**Decision records:** [ADR 0011](../adr/0011-auth-boundary.md),
[ADR 0012](../adr/0012-rls-ownership-subquery.md)

## Delivered

- Supabase Auth owns identity through the frontend magic-link flow. The login form sends
  `display_name` as signup metadata, and `auth/callback` exchanges the code for a cookie-backed
  session.
- `frontend/middleware.ts` protects application routes through `supabase.auth.getUser()` — never
  `getSession()` — and redirects unauthenticated visitors to `/login`.
- Migrations `0005` and `0006` enable RLS for domain reads, provide ownership-subquery policies
  for wallets, ledger entries, and transfers, expose only the global non-system cat roster, and
  create a `humans` row when `auth.users` receives a user.
- Client database access is read-only: table writes and public execution of `create_cat` and
  `execute_transfer` are revoked from `anon` and `authenticated`. Kotlin uses the trusted
  database connection for writes.
- `GET /api/me`, `GET /api/cats`, and `POST /api/cats` are implemented. New cats call the
  existing atomic `create_cat` function and therefore receive the reconciled 500-treat welcome
  grant.
- The dashboard currently covers M3’s cat-management slice: it has an empty state, New Cat
  dialog, and balance cards. Realtime state, the total hero, and the ledger trail remain M4
  work.

## Tests authored, not run

- `AuthAndCatManagementIntegrationTests` applies all real migrations in Testcontainers, simulates
  `auth.users` and `auth.uid()`, and covers `/me` ownership shaping, treasury-free roster,
  cross-human RLS isolation, welcome balances, no table writes, and no client function execution.
- Existing `LedgerCoreIntegrationTests` now supplies the test Auth schema and roles needed for
  migrations `0005` and `0006`.
- Frontend tests cover login validation and metadata, middleware redirect behavior, and empty-state
  cat creation affordance.

Tests were intentionally not run, following the milestone method.

## Verification status

M3’s manual check — one human creates two cats and sees both with 500 treats — was not run.
The workspace has no host Java runtime, the services were not already running, and Docker Compose
was not run per the user instruction.

Real Supabase values are present locally, but **the project’s Auth JWT signing mode has not been
confirmed**. Before starting the backend against the project, verify whether Auth uses HS256 or
JWKS and configure exactly one of `SUPABASE_JWT_SECRET` or `SUPABASE_JWT_JWK_SET_URI` accordingly.
`SecurityConfig` already supports both forms.

## Commit trail

- `5878990 docs(m3): mark auth and cat management in progress`
- `4e789a6 feat(m3): add authenticated cat management APIs`
- `15aab4b feat(m3): add magic-link cat management UI`
- `9f8a0c4 fix(m3): restrict database writes to trusted backend`
- `ed7fe82 docs(m3): mark auth and cat management done`

## Next milestone

M4, [Realtime dashboard](../milestones/M04-realtime-dashboard.md), is now eligible. It should
replace M3’s static cat-management display with the total, realtime cat cards, and ledger trail.
Before implementation, read M4 and ADR 0013 in full; its live checks require two humans and the
deployed Realtime filter behavior.

## Worktree note

Pre-existing line-ending-only edits remain in the ADRs, M03–M10 milestone files, and
`frontend/next-env.d.ts`; they were preserved. The M3 milestone file itself is updated in the
working tree and agrees with the committed roadmap status, but it remains alongside those
pre-existing line-ending edits.
