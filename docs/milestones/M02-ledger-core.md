# M2 — Ledger core (the centerpiece)

**Type:** enabler · backend + database · **Status:** done
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
- 2026-07-15 — started. Preparing Supabase connectivity and the ledger migrations.
- 2026-07-15 — done. Commits e13c428..fd9765c. Migrations 0001-0004, startup
  database availability check, `/api/transfers/execute`, and Testcontainers coverage were
  authored. Verify step not run here: M2 is proven by its test suite, tests are not run unless
  asked, and this shell has no Java runtime (`JAVA_HOME` unset and no `java` on `PATH`).
- 2026-07-15 — **verified. Suite run for the first time: 9 tests, 0 failures, 0 skipped**, against a
  real Postgres with the real migrations applied. Both invariants hold — per-wallet
  `SUM(signed ledger) == balance` and global `SUM(all signed entries) == 0`. Also covered:
  idempotency replay, concurrent double-send, the treasury negative-balance asymmetry, and the
  ownership/`source`/system-recipient rejections. **The ledger core needed no fixes.** Ran under
  Temurin 21 + Docker 28.1.1. One unrelated blocker had to be cleared first: a Kotlin/AssertJ
  `satisfies` overload ambiguity in M3's test file failed `compileTestKotlin`, which compiles all
  test sources together and so blocked this suite too.
