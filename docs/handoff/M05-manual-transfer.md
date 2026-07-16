# M5 Handoff — Manual transfer

**Status:** complete on 2026-07-16
**Milestone record:** [M05](../milestones/M05-manual-transfer.md)
**Decision records exercised:** [ADR 0008](../adr/0008-atomic-plpgsql-transfer.md),
[ADR 0009](../adr/0009-idempotency-and-status.md), and
[ADR 0012](../adr/0012-rls-ownership-subquery.md)

## Delivered

- The authenticated dashboard now reads the global, RLS-visible non-system cat roster alongside
  the owner’s wallets. The manual composer offers `From [my cat] → To [any other cat]`, a whole
  positive-treat amount, and an optional 280-character note.
- `ManualTransferForm` uses `react-hook-form` and `zod`. Validation happens before confirmation,
  prevents self-transfers, and retains source as `manual` rather than exposing it as a client
  choice.
- `ConfirmTransferDialog` is a standalone, reusable component for M8. It creates the UUID when
  the form opens the dialog and retains that exact key through confirmation/retry; its local
  submission guard also prevents a slow double-click from producing a second request.
- The frontend calls `POST /api/transfers/execute` with the Supabase access token. A 422 response
  is treated as the durable failed-transfer record defined by ADR 0008, so its
  `failure_reason` reaches the user verbatim instead of being replaced by a generic request
  error. Completed and failed outcomes use Sonner toasts.
- The existing backend remains the money boundary: `TransferService` derives the human from the
  JWT, calls `OwnershipGuard.requireOwnedSender` for the client-supplied sender, rejects system
  recipients and server-only sources, and delegates the atomic movement to `execute_transfer`.

## Tests and verification

- `TransferControllerTests` covers the sender-ownership rejection at the endpoint boundary.
  `manual-transfer-form.test.tsx` covers form validation, exactly-once confirmation submission,
  and verbatim `failure_reason` display.
- The backend suite was run after M5: **16 tests, 0 failures, 0 skipped**. Frontend tests remain
  authored but unrun under the standing CHECKLIST decision.
- `npx tsc --noEmit` passed.
- The live walkthrough remains pending: start both services, sign in as one human with two cats,
  send between them, and confirm the total remains constant while both balances and both ledger
  legs arrive through realtime. Docker Compose was not run.

## Commit trail

- `2db8990 docs(m5): mark manual transfer in progress`
- `d6e12e8 feat(m5): add manual transfer composer`
- `4b6a999 test(m5): cover transfer authorization and confirm flow`
- `ec7d942 docs(m5): mark manual transfer done`
- `a8220b2 test(m5): run backend suite, mark M5 done in checklist`

## Next milestone

M6, [Top-up](../milestones/M06-topup.md), is the next eligible milestone. It adds the trusted
`POST /api/wallet/topup` flow and preset pills on the cat cards. Read M6, ADR 0014, and the UI
design documents before implementation. Preserve M5’s ownership check and keep `topup` server
only: `/transfers/execute` must continue rejecting that source from the browser.

## Worktree note

The worktree was clean when this handoff was recorded; no uncommitted M5 changes remain.
