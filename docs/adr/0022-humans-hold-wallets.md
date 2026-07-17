# 0022. Humans hold wallets; every transfer has an actor

**Status:** Accepted · **Date:** 2026-07-17 · **Milestone:** [M12](../milestones/M12-treasury-entity-and-human-wallets.md)

**Supersedes [0010](0010-actor-vs-account.md).** That ADR's central insight — *the actor and the
account are different facts, and conflating them is the modelling error in this domain* — is why
this change is cheap, and it is restated below. Two of its load-bearing claims are now false: **"a
human has no wallet"**, and **the nullable `initiated_by`**.

## Context

[0010](0010-actor-vs-account.md) separated *who acted* from *whose money moved*:

```
transfers.sender_cat_id   -- whose money moved  (the account)
transfers.initiated_by    -- who acted          (the actor, NULLABLE)
```

It rested that split on a sentence: *"A cat cannot authenticate; a human has no wallet."* The first
half is still true. The second half is what M12 is deliberately changing — a human now holds treats,
tops up into their own wallet, and funds cats from it.

The obvious reading is that this collapses the split — if a human is both actor and account, why
keep two columns? It does not, and the reason is the second thing that changed.

`initiated_by` was nullable because of exactly one case: the **welcome grant**, where *nobody
clicked anything*. 0010 called that null "load-bearing" and it was right — the grant genuinely had
no actor. [0023](0023-funding-path-topup-mints-to-the-human.md) removes the welcome grant. Cats are
created empty and funded by a human, on purpose, by clicking.

So the null has no case left, and the split has to be re-justified on its own merits rather than on
the grant's.

## Decision

**A human holds a wallet, and is still not the same thing as the account that holds it.**

```
wallets                     kind = 'human', human_id -> humans(id)   (0021)
transfers.sender_wallet_id  -- whose money moved  (the account)
transfers.initiated_by      -- who acted          (the actor, NOT NULL)
```

The split stays because **the two columns still answer two questions, and they still diverge.**
`sender_wallet_id = <Milo's wallet>` with `initiated_by = <Alice>` is a cat's money moved by a
human — the common case, and unrepresentable if the columns merged. That a *third* row now exists
where they point at the same human (`sender_wallet_id = <Alice's wallet>`, `initiated_by = <Alice>`)
does not merge them; it is one case out of three where two different facts coincide. Collapsing
columns because they sometimes agree is how you lose the cases where they do not.

**`initiated_by` becomes `NOT NULL`.** Every transfer in the system is now somebody clicking:

| Route | Actor |
|---|---|
| `treasury → human` (top-up) | the human who clicked top-up |
| `human → cat` | the human, funding their cat |
| `cat → cat` | the human who owns the sending cat |

There is no actorless movement left, so the column stops being nullable and the null stops being a
fact about the domain. This is the same argument 0010 made, run in the other direction: the null was
correct **because** an actorless event existed. It does not exist, so the null is not correct — it
would be a hole kept open for nothing.

**Ownership is now a question about a wallet, not a cat.** `OwnershipGuard` asked *does this human
own this cat?*. It now asks *is this wallet mine?* — true for my human wallet, and for any wallet
belonging to a cat I own:

```sql
SELECT EXISTS (
    SELECT 1 FROM public.wallets w
    LEFT JOIN public.cats c ON c.id = w.cat_id
    WHERE w.id = :walletId
      AND (w.human_id = :humanId OR c.human_id = :humanId)
)
```

The same predicate, in `auth.uid()` form, becomes the RLS `USING` clause on `wallets`,
`ledger_entries` and `transfers` ([0012](0012-rls-ownership-subquery.md)). One predicate, two
enforcement points, and the treasury falls out of both for free — `kind = 'treasury'` has neither
owner column set, so it matches nothing.

**This is still provenance, never authorization.** 0010's sharpest line is unchanged and worth
repeating because a human wallet makes it *easier* to get wrong: `initiated_by` is what the backend
**writes** from the JWT after the ownership check passes. It is never read to decide anything, and
never accepted from the client. Authorization asks *does the JWT human own `sender_wallet_id`?* —
answered by `OwnershipGuard`, on every money endpoint, every time.

## Consequences

- **The actor/account split earns its keep on the case it was built for**, not on the welcome
  grant. "Milo sent 50 treats, Alice clicked it" is still two facts, still two columns, still
  renderable without a join.
- **`transfers.source` loses `welcome_grant`.** The CHECK on both `transfers` and `ledger_entries`
  becomes `('manual', 'agent', 'topup')`. `topup` remains server-only
  ([0023](0023-funding-path-topup-mints-to-the-human.md)); with the grant gone it is the only
  server-only value left, and `/transfers/execute` still rejects it from a client.
- **Consumers lose a null branch.** `initiated_by` is always present, so *"by you"* is a
  comparison against `auth.uid()` with no "or nobody" arm — in the trail, and in any future
  attribution.
- **The trail's vocabulary changes.** *"Welcome treats"* (no actor) is gone. The first row of a
  cat's life is now *"Alice → Milo, 500, topped up by you"* — an explicit act with an actor,
  which is a truer first row than a system grant was.
- **A human's own wallet is a new realtime and RLS surface.** Every policy that reached ownership
  *through* `cats.human_id` needs the second arm above, and the two-human RLS check
  (`AGENTS.md`, Implementation-time checks, M3/M4) must be re-run against it: no cross-human
  wallet leakage, treasury invisible to both.
- **`initiated_by NOT NULL` closes a door 0010 left open on purpose.** If system-initiated
  movement ever returns — a scheduled allowance, a promotional grant — this column goes nullable
  again and that is a new ADR, not a silent migration. The alternative (leave it nullable now,
  just in case) is a speculative state, and [0009](0009-idempotency-and-status.md) already
  refused that trade for `pending` for the same reason: a state that exists only in the type and
  never in the data is how a column becomes a lie.
- **Humans are deletable with a wallet attached**, which they were not before. `ON DELETE CASCADE`
  from `wallets.human_id` would silently destroy the balance side of an append-only ledger's
  counterparty. Not a live risk — nothing deletes humans — but the ledger's `ON DELETE RESTRICT`
  discipline ([0006](0006-ledger-first-money-movement.md)) is what stops it mattering, and it is
  named here so a future "delete my account" feature meets this note rather than discovering it.

## Alternatives considered

**Merge the columns — the sender *is* the actor now.** Drop `initiated_by`; derive the actor from
`sender_wallet_id`. Tempting exactly because top-up and human→cat make them identical. Rejected: it
is wrong for `cat → cat`, which is most of the product. The sender is Milo's wallet and the actor is
Alice; deriving the actor from the wallet means walking `cats.human_id` at read time — which 0010
already rejected, and for a reason that did not go away: it answers *"who owns this cat now"* where
the audit question is *"who acted then"*. The snapshot is the whole point of an append-only log.

**Keep `initiated_by` nullable.** Costs nothing today, and keeps the door open for system-initiated
movement later. Rejected: a nullable column is a claim that the null occurs, and it no longer does.
Every consumer would keep a branch for a case the database cannot produce — untested by
construction, and quietly wrong the first time someone reasons from the schema instead of from this
document. `NOT NULL` is the schema stating what is true; widening it later is one migration and one
honest ADR.

**Give the human wallet to a hidden "owner cat" instead** — one system-ish cat per human, so
`wallets.cat_id` survives and nothing renames. Rejected: it is
[0010](0010-actor-vs-account.md)'s already-rejected "system human" inverted, and it fails the same
way. The fake cat must be hidden from the roster, the composer's To picker, the cat count, the
charts and the trail's name resolution — the exact `NOT is_system` special-casing that
[0021](0021-wallet-is-the-account.md) just deleted, re-introduced per human instead of once
globally. Inventing an entity to avoid a rename is how a schema stops describing its domain.

**Let a human own a wallet per cat** — a funding sub-account per cat, rather than one wallet the
human spends from. More granular, and it makes "how much have I put into Milo" a balance rather than
a query. Rejected as scope and as product: the human tops up **once** and decides where treats go
afterwards, which is the whole shape of the flow M12 is building. Per-cat funding buckets would ask
the human to make that decision at top-up time instead, and the "where are my treats" question is
already answered by the distribution breakdown
([M12](../milestones/M12-treasury-entity-and-human-wallets.md)) — derived from balances at read
time, no schema needed.
