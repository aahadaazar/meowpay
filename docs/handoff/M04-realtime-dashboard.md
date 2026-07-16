# M4 Handoff — Realtime dashboard

**Status:** complete on 2026-07-16
**Milestone record:** [M04](../milestones/M04-realtime-dashboard.md)
**Decision record:** [ADR 0013](../adr/0013-realtime-scoping-via-rls.md)

## Delivered

- Migration `0007_realtime_publication.sql` publishes **only** `wallets` and
  `ledger_entries` to `supabase_realtime`. `transfers` remains unpublished.
- The dashboard is now a server component initial read (`app/dashboard/page.tsx`) handed to
  `RealtimeDashboard`, so authenticated users get their owned cats, balances, and the latest
  100 RLS-visible ledger rows on first paint.
- `use-realtime-wallets` and `use-realtime-ledger` subscribe without client filters. RLS scopes
  both streams; the wallet reducer updates balances and the ledger reducer inserts, updates,
  deletes, and timestamp-sorts rows.
- The dashboard includes the total hero with seven-day delta and sparkline, responsive cat cards,
  a DiceBear-backed ledger trail, labelled direction/source badges, running `balance_after`, and
  a table-to-stacked-card transition at 768px. `app/dashboard/loading.tsx` supplies skeleton UI.
- The M3 New Cat dialog remains available. Its response adds the cat immediately; migration 0007
  then lets the welcome-grant wallet and ledger changes arrive through the realtime read model.
- The Testcontainers harness now emulates Supabase's bootstrap `supabase_realtime` publication
  before replaying migrations. This is test-environment setup only: real Supabase already provides
  that publication.

## Tests and verification

- Frontend tests were authored for mocked realtime channel payloads, state reducers, ledger
  ordering, and the 768px table/card breakpoint. They remain unrun; frontend Vitest currently has
  known harness configuration failures documented in [CHECKLIST.md](../milestones/CHECKLIST.md).
- The backend integration suite was run after adding migration 0007 and is green: **15 tests,
  0 failures, 0 skipped**. It replays all seven real migrations in Testcontainers.
- Migrations `0001`–`0007` have also been applied to the configured live Supabase project. The
  five domain tables exist and RLS is enabled; 0007 applied there without a publication workaround.
- The live UI walkthrough is still pending: run frontend and backend, create a cat, and observe
  the welcome grant appear in the trail. Verify realtime RLS specifically with two humans and
  confirm the deployed Realtime version's multi-cat filter behaviour. No Docker Compose run was
  performed for M4.

## Commit trail

- `afbf230 docs(m4): mark realtime dashboard in progress`
- `489d1bc feat(m4): publish wallet and ledger realtime streams`
- `4650a3b feat(m4): add realtime dashboard read model`
- `b2e007c test(m4): cover realtime reducers and responsive trail`
- `899ef75 docs(m4): mark realtime dashboard done`
- `a6054e5 test(m4): emulate supabase_realtime publication in integration harness`
- `cab3bf4 docs(checklist): record migrations applied to live Supabase project`

## Next milestone

M5, [Manual transfer](../milestones/M05-manual-transfer.md), is eligible. It should add the
manual From/To composer and confirm dialog on top of this live read model. Read M5 in full and
the ADRs it exercises — [0008](../adr/0008-atomic-plpgsql-transfer.md),
[0009](../adr/0009-idempotency-and-status.md), and
[0012](../adr/0012-rls-ownership-subquery.md) — before implementation. The idempotency key must
be minted when M5's confirm dialog opens, and the server must re-check ownership of the supplied
sender cat.

## Worktree note

`frontend/package-lock.json` remains untracked. It is a pre-existing, platform-specific lockfile;
do not commit it unchanged. See the M10 reproducibility flag in
[CHECKLIST.md](../milestones/CHECKLIST.md).
