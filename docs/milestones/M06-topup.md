# M6 — Top-up

**Type:** fullstack · **Status:** done
**ADR:** [0014](../adr/0014-topup-as-treasury-transfer.md)

## Scope

Funding a wallet — implemented as a transfer from the treasury, not a new write path
([0007](../adr/0007-treasury-backed-funding.md), [0014](../adr/0014-topup-as-treasury-transfer.md)).

- `POST /api/wallet/topup { idempotencyKey, catId, amount }` — validates the target cat is
  owned by the caller, and the amount against a preset allowlist plus a server-side cap; calls
  `execute_transfer(treasury → cat, source='topup', initiated_by=human)`.
- **Frontend:** preset pills (+100 / +500 / +1000) on each cat card.

## Tests

- **Backend:** allowlisted presets succeed; an off-allowlist or over-cap amount is rejected;
  topping up a cat that isn't the caller's is rejected; conservation is preserved
  (`SUM(all signed entries) == 0` still holds); the treasury balance goes further negative by
  exactly the minted amount.
- **Frontend:** presets render and submit; the pill row wraps rather than shrinks below the
  44px touch target on mobile.

## Verify

Top up an empty wallet from the dashboard; the balance and total update live, with no refresh.

## Progress log

- 2026-07-16 — started. M6 marked in progress; reviewed ADR 0014, the M5 handoff, and the product UI design rules.
- 2026-07-16 — done. Commits afe0dab..63a905a add the trusted top-up endpoint, server-side ownership/allowlist/cap checks, treasury-backed transfer reuse, wrapping preset pills, and backend/frontend tests. Test suites were authored but not run per instruction. Verify step could not run: Java is unavailable, so the backend and live dashboard cannot start. Frontend TypeScript checking is also blocked by three existing errors in the M4/M5 dialog and realtime hooks, none in M6 files.
