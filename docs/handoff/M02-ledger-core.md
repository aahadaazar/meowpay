# M2 Handoff - Ledger core

**Status:** complete on 2026-07-15  
**Milestone record:** [M02](../milestones/M02-ledger-core.md)  
**Decision records:** [ADR 0006](../adr/0006-ledger-first-money-movement.md),
[ADR 0007](../adr/0007-treasury-backed-funding.md),
[ADR 0008](../adr/0008-atomic-plpgsql-transfer.md),
[ADR 0009](../adr/0009-idempotency-and-status.md),
[ADR 0010](../adr/0010-actor-vs-account.md)

## Delivered

- Supabase ledger migrations `0001` through `0004` now exist in `supabase/migrations/`, covering
  humans, cats, wallets, treasury seed data, transfers, append-only ledger entries,
  `execute_transfer`, and atomic cat creation with welcome grant.
- `POST /api/transfers/execute` is implemented through
  `backend/src/main/kotlin/com/meowpay/web/TransferController.kt` and
  `backend/src/main/kotlin/com/meowpay/service/TransferService.kt`.
- Transfer execution maps the SQL function result directly back to HTTP, preserving
  idempotency, `failed` outcomes, and `failure_reason` without relying on raised SQL
  exceptions for business-rule failures.
- Ownership checks happen server-side from the JWT subject plus client-supplied `senderCatId`
  through `OwnershipGuard`, and client requests cannot use the server-only `source` values
  `topup` or `welcome_grant`.
- Backend startup now performs a database availability check through
  `DatabaseConnectionVerifier`, which runs `SELECT 1` and fails fast when `SUPABASE_DB_URL`
  is missing or unreachable.

## Tests authored, not run

- `backend/src/test/kotlin/com/meowpay/LedgerCoreIntegrationTests.kt` covers:
  happy path transfer behavior, insufficient funds, self-transfer failure, idempotency replay,
  per-wallet reconciliation, global conservation, treasury negative-balance allowance, normal
  wallet overdraft rejection, ownership enforcement, system-recipient rejection, server-only
  source rejection, and atomic `create_cat` behavior.
- Existing backend context and security tests from M0 remain in place alongside the M2 suite.

Tests were intentionally not executed, following the milestone method.

## Verification status

M2's verify step is test-suite based, so there was no separate manual UI or API verification
step to run. The tests were authored but not executed. At milestone completion, this workspace
had no host Java runtime available, so local non-Docker execution was not possible.

For runtime behavior, the backend now proves Supabase connectivity at startup, but there is
still no dedicated live database health endpoint. `GET /api/health` currently returns a static
`{"status":"ok"}` response and does not re-check the database on each request.

## Commit trail

- `e13c428 docs(m2): mark ledger core in progress`
- `81538ab feat(m2): verify database connection at startup`
- `9d3ed63 feat(m2): add ledger core migrations`
- `c0b28fd feat(m2): add transfer execution endpoint`
- `fd9765c test(m2): cover ledger transfer invariants`
- `f95d146 docs(m2): mark ledger core done`

## Follow-on runtime notes

After M2 was completed, local Docker development was tuned to reduce repeated dependency work:

- `fd9f42a perf(dev): cache frontend and gradle dependencies`
- `4408028 chore(dev): ignore local gradle cache`
- `83d88b9 perf(dev): move backend gradle work into image build`

Those commits are not part of the M2 milestone scope, but they affect local startup behavior.
Frontend runtime `npm install` was moved out of container boot. Backend startup is moving in the
same direction, though the new backend image path still needs a clean end-to-end Docker build
verification after the latest Dockerfile fix.

## Next milestone

M3, [Auth & cat management](../milestones/M03-auth-and-cat-management.md), is the next eligible
milestone. Before implementation, read its milestone file plus ADRs 0011 and 0012 in full.
M3 must confirm the actual Supabase JWT signing mode before finalizing `SecurityConfig`, and it
owns the first real authenticated cat-management flows.

## Worktree note

At handoff, unrelated pre-existing edits remain in the ADR files and M03-M10 milestone files.
They were not altered by M2 and should be preserved while continuing the work.
