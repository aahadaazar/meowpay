# 0013. Realtime scopes via RLS; subscribe to `ledger_entries`, never `transfers`

**Status:** Accepted · **Date:** 2026-07-15 · **Milestone:** [M4](../milestones/M04-realtime-dashboard.md)

## Context

The dashboard is realtime: a transfer lands and the total, the cat cards, the charts and the
trail all move without a refresh. Supabase Realtime's `postgres_changes` streams row changes
from the WAL straight to the browser.

Two questions have to be answered: **which table** to subscribe to, and **how to scope** the
stream to the reader.

The scoping question got harder with multi-cat humans. With one cat per human, a client filter
like `filter: 'cat_id=eq.<my-cat>'` was sufficient. A human now owns 1..N cats, and a
single-column `eq` cannot express "any of my cats".

## Decision

**Two subscriptions — `wallets` and `ledger_entries` — scoped by RLS rather than by client
filter.**

Subscribe **unfiltered** (or with `in.(…)`) and let **RLS decide which rows the socket is
allowed to deliver** ([0012](0012-rls-ownership-subquery.md)). `transfers` is not published to
realtime at all.

```
wallets         → per-cat balances + the total hero
ledger_entries  → the trail AND the charts
transfers       → no realtime publication
```

### Why RLS scoping rather than a client filter

This is not a workaround for `eq`'s limitations — it is what RLS-as-the-boundary already bought.
The client filter was **only ever a payload optimization**, never a security control: a filter
the client sets is a filter the client can unset. Correctness always rested on RLS, which
applies to realtime the same way it applies to a `SELECT`.

So with N cats per human, dropping the filter costs nothing that was ever load-bearing. Rows the
reader may not see are not delivered — not because the client asked nicely, but because the
policy will not release them.

The obligation: **RLS must be verified by hand with two humans, on realtime specifically**, not
just on reads. A policy that is right for `SELECT` and wrong for the socket looks fine in the
UI until the second human logs in. Also worth confirming at implementation time: the Realtime
version's actual filter support, since `in.(…)` availability has moved between versions.

### Why `ledger_entries` and not `transfers`

`transfers` is the tempting subscription — one row per event, half the traffic. It cannot work,
and the reason is a concrete limitation:

**`postgres_changes` cannot express `sender_cat_id = X OR receiver_cat_id = X`.**

Its filters are a single column against a single operator. A transfer touches the reader on
*either* side, so scoping it needs an OR across two columns. The options would be:

- **Two subscriptions**, one per column, merged client-side — now the client must de-duplicate,
  because a transfer between two of your own cats arrives on both, and it must merge them into
  one logical event with two different meanings (a debit for one cat, a credit for the other).
- **Subscribe unfiltered and filter client-side** — every transfer in the system streams to
  every browser, and RLS on `transfers` would drop them anyway, so it delivers nothing.

**The double-entry design ([0006](0006-ledger-first-money-movement.md)) makes the problem vanish
rather than solving it.** `ledger_entries` has **exactly one row per wallet per transfer**, each
already carrying its own `direction`, `balance_after` and counterparty. There is no OR to
express: a row either belongs to one of your cats or it does not, which is precisely the shape
RLS evaluates. **No OR-merge is ever needed.**

This is where the ledger stops being an accounting nicety and starts paying rent in the frontend.

### Why the entries are denormalized

Realtime payloads carry **only the raw row** — no joins, no expansion. A normalized entry would
arrive as a bag of UUIDs, and the client would have to fetch the counterparty's name before it
could render, turning every realtime event into a round trip and reintroducing the flicker the
subscription existed to remove.

The snapshots (`counterparty_name`, `note`, `source`, `initiated_by`) make each row
**self-describing**, so it renders on arrival. They also let the trail name the **treasury**,
which RLS hides from the client entirely — a join could not resolve it, because the row it
points at is invisible.

## Consequences

- **The dashboard updates from one subscription** for balances and one for history. The charts
  come free: they derive from the same ledger window
  ([0015](0015-client-side-chart-derivation.md)).
- **A missing client filter is not a leak.** The worst case is extra payload, which is the right
  failure mode.
- The welcome grant appears in the trail immediately on cat creation — the first real end-to-end
  moment, and it happens with no extra code.
- **Slightly more traffic than a filtered stream** in principle. In practice RLS drops
  unauthorized rows before delivery, so a browser receives its own rows either way.
- `transfers` still needs no publication — nothing in the UI reads a transfer directly. Its
  outcome reaches the client as the HTTP response to `/transfers/execute`, and its effect reaches
  it as two ledger entries.
- Migration `0007_realtime_publication.sql` publishes exactly two tables. Adding a third is a
  deliberate act.

## Alternatives considered

**Subscribe to `transfers`.** Fewer rows, one event per transfer. Rejected on the mechanism
above: `postgres_changes` cannot express `sender = X OR receiver = X`, so it needs two
subscriptions plus client-side de-duplication and an OR-merge — with a transfer between your own
two cats as the case that breaks naive implementations. `ledger_entries` has one row per wallet
per transfer and needs none of it.

**Client-side `eq` filter per cat, one subscription per cat.** Preserves the old single-cat
pattern. Rejected: N subscriptions per human, opened and closed as cats are created, for a filter
that was never a security control. RLS already scopes it with zero subscriptions.

**Polling on an interval.** Simple, no WebSocket, no publication, no RLS-on-socket to verify.
Rejected: at a poll interval short enough to feel live it is more load than the subscription, and
it still is not live. Realtime was explicitly in scope.

**Backend-pushed SSE/WebSocket from Kotlin.** Kotlin already knows when a transfer completes and
could push to subscribers. Rejected: it means holding connection state in a stateless service
([0011](0011-auth-boundary.md)), re-implementing fan-out and reconnection, and re-implementing
authorization for the push path — all to duplicate a thing Postgres already does correctly.

**Trigger-based notification** (`pg_notify` → backend → client). Rejected: same fan-out and
authorization rebuild as above, plus `pg_notify`'s 8KB payload limit, plus a delivery guarantee
weaker than the WAL-based stream already available.
