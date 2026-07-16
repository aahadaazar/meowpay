# M7 — Activity charts

**Type:** fullstack · **Status:** in progress
**ADR:** [0015](../adr/0015-client-side-chart-derivation.md)

## Scope

Two charts, both derived client-side from the same realtime ledger window the trail already
holds — no aggregate endpoint ([0015](../adr/0015-client-side-chart-derivation.md)).

- **`treat-flow-chart`** — diverging column, zero-centered, credits above / debits below
  ([0004](../adr/0004-chart-palette-derivation.md)).
- **`top-recipients-chart`** — horizontal bar, sequential teal ramp, tail beyond 7 recipients
  folds into "Other".
- Tooltips, legend, the validated palette in both modes, 2-up → 1-up reflow below 768px.
- `derive.ts` — the pure derivation function both charts (and their tests) run on.

## Tests

- **Frontend:** `derive.ts` is pure and unit-tested with no I/O — daily buckets; recipient
  totals plus the "Other" fold; grants and top-ups bucket correctly; **internal transfers
  between a human's own cats net to zero in the aggregate flow**
  (the subtlety flagged in [0015](../adr/0015-client-side-chart-derivation.md)); empty, sparse,
  and dense inputs all produce sane output.

## Verify

No dedicated verify step beyond the test suite and a visual pass at 375 / 768 / 1440px in both
themes — the same layout check M1 establishes.

## Progress log

- 2026-07-16 — started. Reading chart and design decisions; implementation pending.
