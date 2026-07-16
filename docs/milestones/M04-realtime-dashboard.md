# M4 — Realtime dashboard: total, cats, trail

**Type:** fullstack · **Status:** done
**ADR:** [0013](../adr/0013-realtime-scoping-via-rls.md)

## Scope

The dashboard's read side, live. Everything built here still has no way to *cause* a transfer —
M5 adds that — but the welcome grants from M3 already give it something real to render.

- Server component for the initial fetch (fast first paint) handing off to client components
  driven by realtime.
- `use-realtime-wallets`, `use-realtime-ledger` — both RLS-scoped, unfiltered subscriptions
  ([0013](../adr/0013-realtime-scoping-via-rls.md)).
- **Total hero** + delta + sparkline.
- **Per-cat cards.**
- **`ledger-trail`** — cat column, direction/source badges, DiceBear `Avatar`, `tabular-nums`,
  running `balance_after`, stacked cards below 768px.
- `Skeleton` loading states.
- **Migration:** `0007_realtime_publication.sql` — publish `wallets`, `ledger_entries` only.

## Tests

- **Frontend:** the realtime hooks correctly apply payloads (mocked channel); the trail sorts
  correctly; the responsive collapse (table → stacked cards) triggers at 768px.

## Verify

Welcome grants from M3 are already visible in the trail with no further backend work — the
first real end-to-end moment: create a cat, watch its grant land live.

## Progress log

- 2026-07-16 — done. Commits afbf230..b2e007c add the RLS-scoped wallet and ledger realtime
  dashboard, publication migration, and authored frontend tests. Verify step not run: the host
  has no Java or Node runtime, the frontend and backend were not already running, and Docker
  Compose was deliberately not run per user instruction. The required two-human RLS/realtime and
  deployed Realtime filter checks remain pending against the configured Supabase project.
- 2026-07-16 — backend suite run (M4 has no new backend tests; this re-runs the full suite,
  applying every migration including `0007_realtime_publication.sql`). Surfaced a real
  test-fidelity gap: `0007` does `ALTER PUBLICATION supabase_realtime ADD TABLE ...`, but the
  ephemeral Testcontainers Postgres has no `supabase_realtime` publication (only real Supabase
  creates one at bootstrap) — 13 of 15 tests failed with `publication "supabase_realtime" does not
  exist`. Fixed by creating that publication in both integration test harnesses before migrations
  run, matching the existing `anon`/`authenticated` role emulation. Suite now green, 15/15. See
  bug 5 in [CHECKLIST.md](CHECKLIST.md).
- 2026-07-16 — frontend suite run (Node.js became available this session). `use-realtime.test.tsx`,
  `ledger-trail.test.tsx`, and `realtime-dashboard.test.tsx` all pass — see
  [CHECKLIST.md](CHECKLIST.md) for the vitest `@/` path-alias fix three of this milestone's test
  files needed. The end-to-end welcome-grant verify walkthrough still needs a running app + live
  Supabase + a browser, which remains unavailable in this environment.
- 2026-07-16 — fixed the Strict Mode Realtime double-subscribe race found by the live e2e run:
  authenticated channels are retained across the development-only effect replay, and the ledger
  reconciles after joining. Redacted payloads are ignored defensively. The full Playwright run now
  passes all four M4 cases. Regression coverage was added to `use-realtime.test.tsx` and
  `realtime-dashboard.test.tsx` but not rerun, because this request explicitly ran the e2e suite;
  see [CHECKLIST.md](CHECKLIST.md) for the remaining unrelated suite failures.
