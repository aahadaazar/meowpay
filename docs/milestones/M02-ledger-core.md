# M2 — Ledger core (the centerpiece)

**Type:** enabler · backend + database · **Status:** not started
**ADRs:** [0006](../adr/0006-ledger-first-money-movement.md) ·
[0007](../adr/0007-treasury-backed-funding.md) ·
[0008](../adr/0008-atomic-plpgsql-transfer.md) ·
[0009](../adr/0009-idempotency-and-status.md) ·
[0010](../adr/0010-actor-vs-account.md)

## Scope

The money-movement core. This is where the brief's "small, correct, well-reasoned" bar actually
lives — everything before it is enabling this, everything after it is exercising it.

**Migrations**
- `0001_init_schema.sql` — `humans`, `cats`, `wallets`, treasury seed row.
- `0002_transfers_and_ledger.sql` — `transfers`, `ledger_entries` (append-only: `REVOKE UPDATE,
  DELETE FROM ALL ROLES`).
- `0003_execute_transfer_function.sql` — the atomic transfer function
  ([0008](../adr/0008-atomic-plpgsql-transfer.md)).
- `0004_create_cat_function.sql` — atomic cat creation + welcome grant
  ([0007](../adr/0007-treasury-backed-funding.md)).

**Backend:** `TransferService` (`JdbcClient`; maps the function's result and `failure_reason`
onto a DTO/HTTP response), `GlobalExceptionHandler`, `POST /api/transfers/execute`.

## Tests (Testcontainers Postgres, real migrations)

- Happy path moves both balances and writes two ledger rows.
- Insufficient balance → `failed` row, no balance change.
- Self-transfer → `failed`.
- **Idempotency replay returns the original row — no double-charge.**
- **Per-wallet reconciliation:** `SUM(signed ledger) == balance`.
- **Global conservation:** `SUM(all signed entries) == 0`.
- Concurrent double-send races cleanly (the ordered-lock guarantee in
  [0008](../adr/0008-atomic-plpgsql-transfer.md)).
- Treasury may go negative; a normal wallet may not.
- `execute_transfer` rejects a sender cat not owned by the caller, server-only `source` values,
  and system recipients.
- `create_cat` is atomic and its welcome grant reconciles.

## Verify

No user-facing verify step — this milestone is proven entirely by its test suite.

## Progress log

- not started
