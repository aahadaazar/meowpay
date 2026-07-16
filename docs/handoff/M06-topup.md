# M6 Handoff — Top-up

**Status:** complete on 2026-07-16
**Milestone record:** [M06](../milestones/M06-topup.md)
**Decision record:** [ADR 0014](../adr/0014-topup-as-treasury-transfer.md)

## Delivered

- `POST /api/wallet/topup { idempotencyKey, catId, amount }` is JWT-protected and derives the
  initiating human from the token. It requires ownership of the target cat, accepts only the
  `100`, `500`, and `1000` presets, and independently enforces `TOPUP_MAX` (default `1000`).
- Top-ups reuse `execute_transfer` with the fixed treasury UUID as sender and `source='topup'`.
  There is no second money-movement path. The browser cannot assert that provenance:
  `/api/transfers/execute` continues to reject `topup` and `welcome_grant` sources.
- `OwnershipGuard.requireOwnedCat` supplies the server-side target ownership check without
  changing M5's existing sender-ownership error contract.
- `TopupPresets` renders +100, +500, and +1000 controls on each owned cat card. The pills wrap,
  retain the 44px shared button target, mint an idempotency key for each click intent, and prevent
  concurrent duplicate submissions. The dashboard submits them with the Supabase access token and
  receives balance/trail changes through the existing realtime subscriptions.

## Tests and verification

- `LedgerCoreIntegrationTests` includes *"top up accepts presets preserves conservation and
  enforces ownership plus server policy"*. It covers every preset, the off-allowlist rejection,
  the independent cap, target ownership, treasury delta, per-wallet reconciliation, and global
  conservation.
- The backend suite was run after M6: **17 tests, 0 failures, 0 skipped**. Frontend tests are
  authored in `topup-presets.test.tsx` (presets render/submit; row wraps without shrinking) but
  remain unrun per instruction.
- The live walkthrough remains pending: Java is unavailable in this environment, so the backend
  cannot start. Top up an empty wallet with both services running and confirm the cat balance,
  total, and ledger trail update through realtime without a refresh. Docker Compose was not run.
- `npx tsc --noEmit` is currently blocked by three pre-existing errors in the M4/M5 confirmation
  dialog and realtime hooks; none name M6 files.

## Commit trail

- `afe0dab docs(m6): mark top-up in progress`
- `63a905a feat(m6): add trusted wallet top-ups`
- `3d9c4a5 docs(m6): mark top-up done`

## Next milestone

M7, [Activity charts](../milestones/M07-activity-charts.md), is now the next eligible milestone.
It derives client-side charts from the existing visible ledger window. Read M7, ADR 0015, the
design documents, and run the palette validator in both modes before building chart marks.

## Worktree note

At handoff creation, `docs/milestones/CHECKLIST.md` and `docs/milestones/M06-topup.md` have
uncommitted tracking updates that record the successful M6 backend run. They are intentionally
preserved and not included in this handoff commit.
