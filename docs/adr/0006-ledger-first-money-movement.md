# 0006. Ledger-first money movement; `wallets.balance` is a derived cache

**Status:** Accepted · **Date:** 2026-07-15 · **Milestone:** M2

## Context

The obvious way to move treats is two `UPDATE`s in a transaction:

```sql
UPDATE wallets SET balance = balance - 10 WHERE cat_id = sender;
UPDATE wallets SET balance = balance + 10 WHERE cat_id = receiver;
```

It is correct, atomic, and fast. It is also what a wallet product looks like right before it
becomes unauditable: the balance is the only fact, so **the history is gone**. "Why is my
balance 430?" has no answer. A bug that moves money the wrong way leaves no trace of what it
did. And the app needs an activity trail anyway — under two-`UPDATE`s, that trail would have to
be a *second*, parallel record of the same event, which can silently disagree with the balances
it claims to explain.

The brief calls this "an ordinary money-movement product — the shape of what we build for
real." The shape of what gets built for real is a ledger.

## Decision

**Double-entry `ledger_entries` is the source of truth. `wallets.balance` is a derived cache.**

Every movement writes **two** rows — a `debit` on the sender's wallet, a `credit` on the
receiver's — each carrying `amount`, a `balance_after` snapshot, and its counterparty. Balances
are then updated to match. The entries are the record; the balance is a fast read of what the
entries already imply.

`ledger_entries` is **append-only**: `REVOKE UPDATE, DELETE FROM ALL ROLES`. Not convention — a
grant. A correction is a new compensating entry, never an edit.

This buys an invariant that can be asserted rather than hoped for:

```
per wallet:  SUM(signed entries) == wallets.balance
globally:    SUM(all signed entries) == 0
```

The second is conservation of treats, and it only holds because funding also goes through the
ledger ([0007](0007-treasury-backed-funding.md)).

**Entries are denormalized** — `counterparty_cat_id`, `counterparty_name`, `note`, `source`,
`initiated_by` are copied onto each row.

## Consequences

- **The trail is the ledger**, not a parallel log. It cannot disagree with the balances,
  because the balances are computed from it. One record, one truth.
- Reconciliation is a **test assertion**, not an aspiration — every backend test that moves
  money re-asserts both invariants. A bug in `execute_transfer` fails a reconciliation test, not
  a customer.
- `balance_after` makes each row self-explaining: the trail shows a running balance without
  recomputing a window function over history.
- **Reconciliation is not user-facing.** The *trail* is; the *check* is asserted only in backend
  tests. A "your books balance" badge is a developer's comfort, not a user's need.
- **Writes cost more.** One transfer is two entry inserts plus two balance updates instead of
  two updates. At this scale, irrelevant; at real scale, the correct trade and the reason banks
  make it.
- The cache can drift if anything writes `wallets.balance` outside `execute_transfer`. Mitigated
  structurally: **no client-facing INSERT/UPDATE grants exist anywhere**, so there is exactly
  one writer ([0008](0008-atomic-plpgsql-transfer.md)).

### Why denormalized entries are correct, not a shortcut

An append-only log records **what was true at the time**. A bank statement shows the payee's
name as of the transaction, not their name today — renaming a cat must not rewrite history. So
the snapshot is the *right* semantics, and it pays three ways:

1. Rows are **self-describing**, which is what lets realtime render with **no joins** —
   `postgres_changes` payloads carry only the raw row ([0013](0013-realtime-scoping-via-rls.md)).
2. The trail can **name the treasury** even though RLS hides it from clients
   ([0012](0012-rls-ownership-subquery.md)) — the name is on the row, not behind a join.
3. Charts derive from the ledger window already fetched for the trail
   ([0015](0015-client-side-chart-derivation.md)).

## Alternatives considered

**Two `UPDATE`s in a transaction; no ledger.** Fastest to write, and correct for balances.
Rejected: it answers "how much" and never "why". The trail would become a second record of the
same event, free to drift from the balances it explains — and the global conservation invariant,
the single strongest check on the whole system, could not exist.

**Ledger only; compute balances on read** (`SUM(entries)` per wallet). Purest — no cache, no
drift, impossible to disagree. Genuinely tempting, and correct at this data volume. Rejected: the
balance is read on every page load, every realtime tick, and inside `execute_transfer`'s own
sufficient-funds check, while entries grow without bound. It also gives up the `CHECK (balance
>= 0)` constraint — with no balance column, the database can no longer enforce non-negativity;
it would move into application code, which is exactly where money rules go to rot. The cache is
kept **and** validated by the reconciliation tests, which recover the purity as an assertion.

**Single-entry ledger** — one row per transfer with sender, receiver and amount. Half the rows,
and the trail can still be rendered. Rejected for two concrete reasons: `SUM(entries) == 0`
becomes unexpressible (there is nothing to sum to zero), and each wallet's view of its own
history requires `sender = X OR receiver = X` — which is why realtime would then need a
client-side OR-merge that `postgres_changes` cannot express
([0013](0013-realtime-scoping-via-rls.md)). Double-entry gives exactly one row per wallet per
transfer, and everything downstream gets simpler.

**Event sourcing with a projection.** The full version of this idea. Rejected as
over-engineering for a half-day slice: it needs a projection rebuild story, event versioning and
replay tooling to pay off. Double-entry is the 90% of the benefit that fits in the schema.
