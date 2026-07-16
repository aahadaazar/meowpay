# M7 Handoff — Activity charts

**Status:** complete on 2026-07-16
**Milestone record:** [M07](../milestones/M07-activity-charts.md)
**Decision record:** [ADR 0015](../adr/0015-client-side-chart-derivation.md)

## Delivered

- `frontend/components/charts/derive.ts` derives all activity data from the same visible,
  realtime ledger window as the ledger trail. It performs no I/O and takes an explicit `now` so
  its handling of future-dated rows is deterministic.
- The derivation creates contiguous UTC daily flow buckets, puts `welcome_grant` and `topup`
  credits in the flow, and detects debit/credit pairs with the same transfer ID. Those own-cat
  transfer pairs are excluded from aggregate flow so they net to zero, as required by ADR 0015.
- Recipient totals are derived from debit rows, ordered by amount, limited to seven named cats,
  and fold the remaining recipients into `Other`. Their sequential teal color step is based on
  magnitude rather than rank.
- `TreatFlowChart` renders zero-centered, diverging columns: labelled credits above the baseline
  and labelled debits below it. `TopRecipientsChart` renders horizontal sequential-teal bars.
  Both support keyboard focus and pointer tooltips; the flow card also includes its two-series
  legend.
- `ActivityCharts` derives once with `useMemo` and renders the chart cards 2-up from 768px,
  reflowing to one column below that breakpoint. It is wired into `RealtimeDashboard` directly
  from the existing realtime `entries` state; no backend endpoint, fetch, or subscription was
  added.

## Tests and verification

- `derive.test.ts` covers daily buckets, grants and top-ups, recipient totals and the `Other`
  fold, own-cat net-zero aggregate flow, plus empty, sparse, and dense ledger inputs. Tests were
  authored but deliberately not run, per the repository execution instructions.
- The full backend suite was rerun as a regression check after M7: **17 tests, 0 failures**.
  M7 deliberately adds no backend surface, so this does not replace the deferred frontend tests.
- The required palette validation was attempted in both light and dark modes, but the environment
  has no `node` executable. `npm` resolves to a Windows installation but cannot supply the
  missing runtime.
- The 375 / 768 / 1440px visual pass in both themes could not run because the frontend runtime is
  unavailable. The responsive implementation uses the existing `md` (768px) breakpoint and only
  existing validated chart CSS tokens.

## Commit trail

- `aff534a docs(m7): mark activity charts in progress`
- `4992c2d feat(m7): derive activity chart data from ledger`
- `ca89079 feat(m7): add realtime activity chart cards`
- `7c68879 docs(m7): mark activity charts done`
- `6959247 docs(m7): mark activity charts done, record backend regression check`

## Next milestone

M8, [Agentic NL composer](../milestones/M08-agentic-nl-composer.md), is now the next eligible
milestone. Read M8, ADRs 0016 and 0017, and the relevant auth and transfer contracts before
implementation. Preserve M7's direct manual transfer path: parsing may propose a transfer, but
only the existing confirm dialog may execute it.
