# 0009. Idempotency key and a two-state status machine

**Status:** Accepted · **Date:** 2026-07-15 · **Milestone:** [M2](../milestones/M02-ledger-core.md)

## Context

The double-click is not an edge case; it is the default behaviour of a real user on a slow
connection. So is the browser retry, the flaky-network resubmit, and the impatient refresh. Each
one sends the same transfer twice, and a wallet that moves money twice for one intent is broken
in the way that matters most.

The transfer also has outcomes other than success — insufficient funds, self-transfer, a
non-positive amount — and those attempts are recorded rather than discarded
([0008](0008-atomic-plpgsql-transfer.md)). That means `transfers` needs a status, and the set of
statuses is a design decision.

## Decision

**A client-generated `idempotency_key uuid`, `UNIQUE NOT NULL` on `transfers`.**

The client generates one UUID **per submission intent** — when the confirm dialog opens, not
when the request fires. Retries of that intent carry the same key.

`execute_transfer` checks it first, before validation or locking: **if the key exists, return
that row as-is.** Not "reject as duplicate" — *return the original outcome*. A retry is a
question ("what happened to this?"), and the answer is the same answer as the first time.

The uniqueness is enforced by a **database constraint**, not a `SELECT` first. Two concurrent
requests with the same key cannot both pass a check-then-insert; only one can hold the unique
index.

**Status is exactly two states, and it is terminal:**

```
status ∈ ('completed', 'failed')
```

There is no `pending`. A transfer is decided inside one function call, inside one transaction —
it is never observed mid-flight. `failed` rows carry `failure_reason`; both states are final and
nothing ever transitions.

## Consequences

- **A retried or double-clicked submission can never double-move money.** The second call is a
  read.
- Idempotency is enforced by the same mechanism regardless of concurrency — the unique index
  does not care whether the two calls are 10ms or 10 minutes apart.
- The check is **first**, so a replay costs one indexed lookup and never takes a wallet lock.
- **Two states means no state machine to maintain** — no transition table, no reaper for stuck
  rows, no "pending for 3 days" support case. The status column is a fact, not a lifecycle.
- **The key must be generated at intent, not at send.** A key generated per HTTP request makes
  the whole mechanism a no-op — every retry gets a fresh key and money moves twice. This is the
  one place the client can break the guarantee, and it is why the dialog owns the key.
- Keys are never garbage-collected. `transfers` grows forever, which is also true of the ledger
  and is correct for an audit record.
- A client that reuses a key for a genuinely *different* transfer silently gets the old row back.
  Acceptable: the key means "this intent", and reusing it is a client bug that fails safe —
  toward not moving money.

## Alternatives considered

**No idempotency; rely on the UI disabling the button.** What most demos do. Rejected: the
disabled button is a client-side hope, defeated by a network retry, a refresh, a second tab, or
a `curl`. The guarantee has to live where the money moves.

**Server-generated key returned by a "prepare" call**, then spent by "execute". Rejected: it is
two round trips and moves the problem — the prepare call is now itself non-idempotent, and an
abandoned prepare leaves a dangling key. Client-generated is one call, and a UUID collision is
not a real risk.

**Natural-key deduplication** — treat `(sender, receiver, amount, note)` inside a time window as
a duplicate. No client changes at all. Rejected: it is wrong in both directions. Two *intentional*
identical sends (10 treats twice for two different favours) are silently collapsed into one —
the system refusing a legitimate transfer with no way for the user to insist. And the window is
arbitrary: 5 seconds is too short for a slow retry, 60 too long for a real second send. A key
states intent explicitly rather than guessing at it.

**`SELECT` for the key, then `INSERT` if absent.** The obvious implementation. Rejected: it is a
check-then-act race. Two concurrent double-clicks both `SELECT` nothing and both `INSERT`. The
`UNIQUE` constraint is the only version of this that is actually atomic — which is why the
constraint is the mechanism and the `SELECT` is only a fast path.

**Add a `pending` state** for realism, or for a future async settlement path. Rejected: nothing
in the system can observe a transfer mid-flight — it is decided inside one transaction — so
`pending` would be a state that exists only in the type and never in the data. Speculative states
are how a status column becomes a lie. When settlement genuinely becomes asynchronous, that is a
new ADR and a real transition, not a placeholder added early.

**A separate `idempotency_keys` table** with its own lifecycle and TTL. Rejected: it is a second
source of truth about whether a transfer happened, needing its own consistency story with
`transfers`. The key lives on the row it identifies.
