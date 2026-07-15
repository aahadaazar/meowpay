# 0015. Charts derive client-side from the realtime ledger window

**Status:** Accepted · **Date:** 2026-07-15 · **Milestone:** [M7](../milestones/M07-activity-charts.md)

## Context

Two charts: **treat flow over time** (diverging column, credits above the zero line, debits
below) and **top recipients** (horizontal bar). Both are aggregates.

The reflex is a backend endpoint — `GET /api/charts/flow?days=30` — returning pre-aggregated
buckets. It is the normal answer, and here it fights the rest of the design.

The trail already subscribes to `ledger_entries` and holds a window of rows in the client
([0013](0013-realtime-scoping-via-rls.md)). Those rows are the exact input the charts need.

## Decision

**Derive both charts client-side, in a pure function, from the ledger window already fetched for
the trail.** No aggregate endpoint.

```
frontend/components/charts/derive.ts   -- pure, unit-tested, no I/O
```

The realtime ledger subscription feeds the trail **and** the charts from one source. A new
entry arrives; the trail gains a row and both charts re-derive from the same array. **Live for
free** — no cache to invalidate, no second subscription, no endpoint that can disagree with the
table beneath it.

`derive.ts` is **pure**: `(entries, now) → chart data`. No fetching, no clock reads, no Supabase
import. That is what makes it unit-testable without a database or a mocked channel, and it is
where the real correctness risk sits.

**Forms are chosen by the data's job, before color** ([0004](0004-chart-palette-derivation.md)):

| Element | Form | Why not |
|---|---|---|
| Total | **Hero figure** + delta + sparkline | not a one-bar chart |
| Treat flow | **Diverging column, zero-centered** | maps literally onto `ledger_entries.direction` |
| Top recipients | **Horizontal bar** | not a pie; horizontal because cat names are long |
| Trail | **Table** | it is the table view the charts need anyway |

**Above 7 recipients, the tail folds into "Other"** — never a generated 8th hue.

### The subtlety that gets a dedicated test

**Transfers between your own cats net to zero** — in the total hero and in aggregate flow. One
cat's debit is another's credit, and both entries are yours, so they cancel.

This is **correct**, and it looks like a bug the first time it is seen: send 100 treats from Milo
to Luna and the total does not move. It should not. Nothing entered or left the household. The
per-cat cards both move; the total is conserved.

`derive.ts` gets a test asserting exactly that, because it is the behaviour most likely to be
"fixed" into incorrectness by someone who has not read this.

## Consequences

- **The charts cannot disagree with the trail.** One source, one derivation. A server aggregate
  and a client table are two computations over the same data, and they drift.
- **Realtime is free.** No `GET /charts` to re-poll, no cache invalidation on a new entry — the
  array changes and the charts re-render.
- **`derive.ts` is the most testable code in the app.** Daily buckets, recipient totals, the
  "Other" fold, grants and top-ups bucketing correctly, own-cat transfers netting to zero,
  and empty/sparse/dense inputs — all asserted with no I/O.
- **One less endpoint, one less authorization surface.** An aggregate endpoint would need its own
  ownership scoping ([0012](0012-rls-ownership-subquery.md)) — a fourth place to get it wrong.
  The client already has exactly the rows RLS permits.
- **This does not scale to long histories.** The whole window ships to the browser and is
  aggregated there. At a year of dense activity this is wrong: aggregation moves server-side,
  and the charts then need their own scoped endpoint. The design is correct **for the window the
  trail already needs**, and the boundary is exactly the point at which the trail itself would
  need pagination. Called out in the README.
- The charts are bounded by the trail's window. If the trail shows 30 days, the charts show 30
  days. That coupling is a feature — the table view and the chart always agree — until the two
  need different ranges, at which point this ADR is superseded.

## Alternatives considered

**A backend aggregate endpoint** (`GET /api/charts/...` with SQL `GROUP BY`). The conventional
answer, scales indefinitely, and Postgres aggregates far better than JavaScript. Rejected for
this slice on three counts: it is a **second source of truth** free to disagree with the trail
rendered beside it; it is **not live** without either polling it or subscribing to something else
and invalidating it — reintroducing the staleness the realtime design removed; and it needs its
own ownership scoping. The scale argument is real and is the trigger for revisiting this, not a
reason to pre-build it.

**A materialized view refreshed on write.** Fast reads, correct aggregates. Rejected: it adds a
refresh strategy (on trigger? on schedule?) and a staleness window to a dataset that fits in
memory, and the realtime subscription would still have to notice the refresh.

**Recharts' built-in aggregation** rather than a separate `derive.ts`. Fewer lines. Rejected: it
buries the logic — the own-cat-netting rule, the "Other" fold, bucket boundaries — inside chart
config, where it cannot be unit-tested without rendering a component. The pure function is the
whole point; the chart is a renderer.

**Derive in a `useMemo` inside each chart component.** Rejected: it duplicates bucketing across
two components and couples the logic to React's render cycle. One pure module, imported twice.

**A pie chart for top recipients.** Rejected: part-to-whole at a glance only, and recipients are
being *compared*, not summed to a meaningful whole. Cat names are also long, which horizontal
bars handle and pie labels do not.

**A dual-axis chart** showing flow and balance together. Rejected: the alignment of two y-scales
is arbitrary, so the chart invents a correlation that is not in the data. One axis, always. Two
measures means two charts.
