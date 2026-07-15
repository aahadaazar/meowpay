# 0007. Treasury-backed funding, and the conservation invariant it unlocks

**Status:** Accepted · **Date:** 2026-07-15 · **Milestone:** M2

## Context

Treats have to enter the system somehow. Two places mint them: a **top-up** (a human funds
their cat) and the **welcome grant** (a new cat starts with 500).

The natural implementation is a single-entry credit:

```sql
UPDATE wallets SET balance = balance + 500 WHERE cat_id = :cat;
-- ...and, if we remember, write something to the trail
```

This is where a ledger quietly dies. Money appears from nowhere, and the books no longer
balance — not because of a bug, but by design.

## Decision

**A system account — the MeowPay Treasury — funds every treat entering the system.
Top-up and the welcome grant are literally transfers from treasury → cat.**

```
cats     is_system = true, human_id NULL, name 'MeowPay Treasury'
         partial unique index on (is_system) WHERE is_system  -- exactly one, enforced
wallets  is_system = true
         CHECK (is_system OR balance >= 0)  -- the treasury is exempt
```

The treasury **goes negative** as treats are minted. That is not a bug to be worked around; it
is what a funding account *is*. Its negative balance is the exact count of treats in
circulation, and the `CHECK` exempts it explicitly rather than by accident.

Both funding paths call the same `execute_transfer`
([0008](0008-atomic-plpgsql-transfer.md)) — same idempotency, same locking, same atomicity,
**zero new money-movement code**. The sufficient-funds check is skipped for system senders; that
is the only branch the treasury adds.

**Cat creation is atomic, and the grant goes through the ledger.** `create_cat(human_id, name)`
inserts the cat, its wallet at **0**, then calls
`execute_transfer(treasury → cat, 500, 'Welcome treats', 'welcome_grant')` — all in one
transaction. Setting `balance = 500` directly would break `SUM(ledger) == balance` on the very
first row of the cat's life.

### What this unlocks

```
SUM(all signed ledger entries) == 0
```

**Conservation of treats** — the strongest check in the system, and it exists *only* because
funding goes through the ledger. Under single-entry crediting there is no such statement to
make: minted treats have no counterparty, so the sum is whatever has been minted.

## Consequences

- **Every treat has a provenance.** The trail can answer "where did these come from?" —
  a first entry reading *MeowPay Treasury → Milo, 500, Welcome treats*, not an unexplained
  opening balance.
- Everything reconciles **from row one**. There is no bootstrap moment where the invariant does
  not yet hold.
- **One money-movement path.** Top-up ([0014](0014-topup-as-treasury-transfer.md)), welcome
  grant and cat-to-cat transfer are the same function. A fix to locking or idempotency fixes all
  three; there is no second implementation to keep in sync.
- The treasury is **invisible to clients** — `human_id IS NULL` means the ownership subquery
  matches nothing, so RLS hides it with no special case
  ([0012](0012-rls-ownership-subquery.md)). The trail still names it, from the
  `counterparty_name` snapshot ([0006](0006-ledger-first-money-movement.md)).
- A negative balance in the database looks alarming to anyone who has not read this document.
  Hence the `is_system` flag and the explicit `CHECK` exemption — the schema states the
  intent.
- **Treats are freely mintable.** Top-up creates real value with no payment behind it. This is a
  demo boundary, not a design: real MeowPay would settle against a payment provider and only
  then credit. Called out in the README as a trade-off.

## Alternatives considered

**Single-entry credit on top-up** — `UPDATE wallets SET balance = balance + amount`. One
statement, no treasury, no negative balance to explain. This is the alternative that matters,
and it fails on two counts:

1. **No conservation invariant.** `SUM(all signed entries) == 0` becomes meaningless the moment
   money can appear without a counterparty. The single best assertion about the system's
   correctness — the one that catches a whole class of bugs in one line — is traded away for one
   saved row. Per-wallet reconciliation would survive; the global check would not.
2. **The trail cannot answer where treats came from.** A credit with no counterparty renders as
   *"+500 … from?"*. Either the trail admits it does not know, or it invents a fake counterparty
   in the UI — a lie in the audit log, which is the one place a lie is unaffordable. The
   treasury makes the answer true and boring: it came from the treasury, here is the row.

It also forks money movement: top-up would be its own write path, needing its own idempotency,
its own locking, its own tests — a second chance to get it wrong, for no benefit.

**Treasury with an unbounded positive balance** (seed it with 1,000,000,000). Avoids the
negative balance and the `CHECK` exemption. Rejected: it is a fiction with a cliff. The number is
arbitrary, it will eventually be wrong, and the day it runs out top-ups fail for a reason no one
can explain. A negative treasury balance is *information* — the exact number of treats in
circulation — where a large positive one is a magic constant.

**Mint with no treasury but write both ledger entries anyway**, using a NULL counterparty.
Preserves the trail. Rejected: `counterparty_cat_id` becomes nullable, every consumer needs a
null branch, and `SUM == 0` still fails because only one side is a real wallet. The treasury is
what makes the counterparty non-null everywhere.

**Per-human funding accounts** instead of one global treasury. More realistic — each human's
top-ups draw on their own float. Rejected as scope: it needs a funding-source model and a
settlement story to mean anything, and the conservation invariant works identically with one
account. One treasury, exactly one, enforced by a partial unique index.
