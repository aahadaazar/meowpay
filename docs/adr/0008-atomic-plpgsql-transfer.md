# 0008. `execute_transfer` — one atomic plpgsql function; failures are INSERTed, not RAISEd

**Status:** Accepted · **Date:** 2026-07-15 · **Milestone:** M2

## Context

A transfer must: check idempotency, validate the request, lock both wallets, check funds, write
a transfer row, write two ledger entries, update two balances — and either all of it happens or
none of it does ([0006](0006-ledger-first-money-movement.md)).

Done from Kotlin, that is seven round trips inside a transaction the application manages, with
lock ordering the application must get right, and a window between "check funds" and "update
balance" that only a correctly-scoped `FOR UPDATE` closes.

## Decision

**One plpgsql function, `SECURITY DEFINER`, with a pinned `search_path`, called in a single
round trip.**

```
execute_transfer(idempotency_key, sender, receiver, amount, note, source, initiated_by)
```

1. `idempotency_key` exists → **return that row as-is** ([0009](0009-idempotency-and-status.md))
2. `amount <= 0` or `sender = receiver` → **insert** `status='failed'` + `failure_reason`, return
3. Lock **both wallet rows in one statement, ordered by `cat_id`** (`FOR UPDATE`)
4. Insufficient balance → **insert** `failed`, return. *Skipped for system senders*
   ([0007](0007-treasury-backed-funding.md))
5. Else → insert `completed`; insert **two** `ledger_entries` (each with its `balance_after`);
   update both balances; return

**No exceptions for expected business outcomes. Only unexpected database errors raise.**

Three details carry more weight than their size suggests:

**`SECURITY DEFINER` with a pinned `search_path`.** An unpinned `search_path` on a
`SECURITY DEFINER` function is a known **privilege-escalation vector** — a caller who can create
objects can shadow a table name and have it resolved with the definer's rights. It is pinned
explicitly.

**Locking both rows in one ordered statement** — `WHERE cat_id IN (a,b) ORDER BY cat_id FOR
UPDATE` — rather than two `SELECT ... FOR UPDATE`s. Two statements let A→B and B→A grab locks in
opposite orders and deadlock. A single ordered statement means every transaction in the system
acquires wallet locks in the same order. This **eliminates** the deadlock rather than mitigating
it: there is no retry loop, no `deadlock_timeout` to tune, because the cycle cannot form.

**One implicit transaction.** A plpgsql function runs inside one — atomic on the happy path
*and* the failed path, with no explicit `BEGIN`/`COMMIT` for the application to get wrong.

### Why failures are INSERTed rather than RAISEd

This is the decision most likely to look wrong at first glance. `RAISE EXCEPTION 'insufficient
funds'` is the idiomatic thing to write, and it is exactly the thing that cannot work here.

**A `RAISE` rolls back the very audit row you wanted to keep.**

The function's whole purpose is that the attempt is recorded. Raising an exception aborts the
transaction the function runs in — including the `INSERT` of the `status='failed'` row written
moments earlier. The failure would be reported to the caller and **erased from the database in
the same motion**. What survives is an error string in an HTTP response and a log line; what is
lost is the record that a transfer was attempted and refused, and why.

That record is not decoration. "You tried to send 500 and had 430" is the answer to a support
question, and it is precisely the class of event an audit trail exists to hold. A ledger that
records only successes is a ledger with a blind spot exactly where the interesting things
happen.

So: an **insufficient balance is not an error — it is an outcome.** The system worked correctly
and the answer was no. It commits, with a `failure_reason`, and the caller reads the returned
row. Exceptions are reserved for things that genuinely mean *the database is not in a state I
understand* — a constraint violation, a missing wallet — where rolling back is the right
response.

## Consequences

- **One round trip.** Latency is one call; there is no partially-applied state, because there is
  no window in which the application holds a half-finished transaction.
- **Atomicity is the database's, not the application's.** Kotlin cannot forget to open a
  transaction, and a crash mid-call cannot leave one balance moved.
- **Deadlock is structurally impossible**, not merely unlikely.
- **Failed attempts are durable and queryable.** `transfers` holds the full outcome history;
  `TransferService` maps `status`/`failure_reason` onto an HTTP response.
- **Business logic lives in SQL.** It is not unit-testable in Kotlin, needs migrations to change,
  and is invisible to a reviewer reading only the backend. Mitigated: it is tested against real
  Postgres via Testcontainers running the real migrations — which is a *better* test than mocking
  a repository, because it exercises the actual locks and constraints.
- Two people must understand plpgsql. Accepted: the alternative is that two people must get
  distributed lock ordering right, which is harder.

## Alternatives considered

**`RAISE EXCEPTION` on business failures.** Idiomatic, and how most examples are written.
Rejected on the mechanism above: it destroys the failed-transfer row along with the transaction.
Every workaround costs more than the design — a second connection outside the transaction (now
the audit row commits even when the transfer succeeds, and can be orphaned), or an exception
handler that re-inserts after rollback (the handler runs in the aborted transaction; the insert
has to happen *before* the raise, which is where it already is — so the raise is doing nothing
but discarding it). Returning a row is simply what the function already has to do.

**Orchestrate in Kotlin with `@Transactional`.** Testable in Kotlin, visible to a reviewer,
no plpgsql. Rejected: seven round trips per transfer; lock ordering becomes application
convention rather than a single statement; and `@Transactional` self-invocation and
propagation semantics are a well-known source of silently non-transactional code. The riskiest
code in the product should not depend on a proxy being applied.

**Serializable isolation instead of explicit locks.** Postgres would detect the conflict and
abort one transaction. Rejected: it converts a lock wait into a serialization failure the
application must catch and retry — so the retry loop is back, and now the failed-attempt row is
rolled back by the retry too. `FOR UPDATE` in a fixed order gives the same guarantee with
blocking instead of aborting.

**Advisory locks** keyed on the wallet ids. Works, and avoids row-lock contention. Rejected:
advisory locks are held outside the transaction's own visibility rules and must be released
explicitly; forgetting leaks a lock for the connection's lifetime. Row locks release with the
transaction, which is the property wanted.

**Optimistic concurrency** — a version column, retry on conflict. Rejected: under the double-send
race this ADR is designed for, it converts a clean block into a retry storm, and every retry must
re-run the idempotency check to avoid double-charging. Pessimistic locking is the right shape for
short critical sections over hot rows.
