# 0010. Actor vs. account — `initiated_by` records who acted, not whose money moved

**Status:** Accepted · **Date:** 2026-07-15 · **Milestone:** [M2](../milestones/M02-ledger-core.md)

## Context

MeowPay has two kinds of subject, and conflating them is the classic modelling error in this
domain:

- A **human** is the authenticated account. It owns 1..N cats.
- A **cat** has a wallet. Money moves between cats.

So "who sent this?" is ambiguous. *Milo* sent it — the wallet was debited. And *Alice* sent it —
she clicked the button. Both are true, and they are different facts. A cat cannot authenticate;
a human has no wallet.

The welcome grant sharpens the problem: nobody clicked anything. The system did it, on cat
creation ([0007](0007-treasury-backed-funding.md)).

## Decision

**Model the actor separately from the account.**

```
transfers.sender_cat_id     -- whose money moved  (the account)
transfers.initiated_by      -- who acted          (the actor: uuid -> humans, NULLABLE)
```

`initiated_by` is **nullable, and the null is load-bearing**: a `welcome_grant` has **no actor
— the system did it.** That is a fact about the event, not missing data. Modelling it as a
"system human" would be inventing an actor to avoid a null that is telling the truth.

`initiated_by` is **denormalized onto `ledger_entries`** along with the other snapshot fields
([0006](0006-ledger-first-money-movement.md)), so the trail can say **"topped up by you"** by
comparing the entry's `initiated_by` against the reader's own auth uid — with no join, which is
what lets realtime rows render on arrival ([0013](0013-realtime-scoping-via-rls.md)).

**This is a provenance record, never an authorization input.** Authorization asks a different
question — *does the JWT human own `sender_cat_id`?* — answered by `OwnershipGuard` on every
money endpoint ([0012](0012-rls-ownership-subquery.md)). `initiated_by` is what the backend
*writes* after that check passes, from the JWT. It is never read to decide anything, and never
accepted from the client.

## Consequences

- **The trail can say who.** "Topped up by you" vs. "Topped up by Alice" vs. "Welcome treats"
  (no actor) are three different rows, distinguishable without a join.
- The audit answer to "who moved this money?" is complete: the cat whose balance changed **and**
  the human who caused it.
- **One human with two cats sends between them, and the model stays honest** — same actor, two
  different accounts. Which is also why demoing needs no second browser session.
- The null actor is meaningful and must stay nullable. A `NOT NULL` here would force a fake
  system human into `humans`, which then leaks into any query that lists humans.
- **`sender_cat_id` is client-supplied** — the composer picks which of your cats sends — so it
  is attacker-controlled. This is a *new* authorization surface: previously the sender was
  JWT-derived and unforgeable. It is the most likely place to introduce a hole and gets dedicated
  tests on every money endpoint (`/transfers/execute`, `/wallet/topup`, `/composer/parse`).
- `initiated_by` on `ledger_entries` is denormalized, so a human's display name is snapshotted
  per row and does not follow a rename. Correct for an audit log — the same reasoning as
  `counterparty_name`.

## Alternatives considered

**One `users` table; cats are just wallets on a user.** Simpler — one identity, no actor/account
split. Rejected: it makes "cats send each other treats" unrepresentable as written. The brief's
domain is explicit — humans top up, cats send — and a human with two cats sending between them is
a real flow the product needs. Collapsing the two subjects means either a human can only have one
cat, or the sender of a transfer is a human and the cat is decoration.

**Cats authenticate; drop humans entirely.** Each cat is a login. Rejected: it contradicts the
brief ("their humans top it up") and makes multi-cat ownership impossible without account
switching — which then requires the global "acting as" switcher the design deliberately avoids
(the composer carries `From [my cat] → To [any cat]` instead).

**`initiated_by` as text** — "user", "system", "agent". Rejected: it conflates *who* with *how*.
`source` already records how (`manual`/`agent`/`topup`/`welcome_grant`), and a text actor cannot
be compared to `auth.uid()` to render "by you". They are two columns because they answer two
questions.

**A system human row for the welcome grant** (`initiated_by = <system uuid>`), keeping the column
`NOT NULL`. Tidier — no nullable FK, no null branch in consumers. Rejected: it fabricates an
actor for an event that genuinely had none, and that fiction then has to be hidden from every
human-listing query and every "by you" comparison — the same special-casing the treasury avoids
by being unowned. NULL already means "no actor", and it means it accurately.

**Derive the actor from the cat's owner at read time** (`cats.human_id`), no column at all.
Rejected: it is wrong the moment ownership is transferable, and it cannot express the welcome
grant (whose actor is nobody, not the cat's owner). It answers "who owns this cat *now*", where
the audit question is "who acted *then*" — the same reason the entries are snapshotted.
