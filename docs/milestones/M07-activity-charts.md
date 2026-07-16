# M7 — Activity charts

**Type:** fullstack · **Status:** done
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
- 2026-07-16 — done. Added the pure client-side derivation and its unit tests, plus responsive
  realtime chart cards. Commits aff534a..ca89079. The required palette validator was attempted,
  but Node.js is unavailable; frontend tests remain unrun per instruction and the 375 / 768 /
  1440px visual pass cannot run without a frontend runtime. No backend endpoint was added.
- 2026-07-16 — tests run (backend side). M7 is client-side only (ADR 0015) and adds no backend
  endpoint or backend test suite — `derive.ts`'s tests are frontend-only. Ran the full backend
  suite as a regression check instead: still 17 tests, 0 failures, unchanged from before this
  milestone, confirming M7 introduced no backend regressions. `derive.test.ts` remains unrun,
  matching the standing frontend-test deferral. The 375/768/1440px visual pass still needs a
  live app walkthrough.
