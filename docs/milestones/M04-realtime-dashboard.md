# M4 — Realtime dashboard: total, cats, trail

**Type:** fullstack · **Status:** not started
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
