# 0021. The wallet is the account; the treasury is a wallet, not a cat

**Status:** Accepted · **Date:** 2026-07-17 · **Milestone:** [M12](../milestones/M12-treasury-entity-and-human-wallets.md)

**Supersedes [0007](0007-treasury-backed-funding.md).** That ADR's core decision — *every treat
entering the system is funded by a system account, through the ledger* — survives this document
unchanged, and the conservation invariant it unlocks is restated below rather than rebuilt. What
reverses is the treasury's **representation** (a cat) and the **welcome grant** it introduced (see
[0023](0023-funding-path-topup-mints-to-the-human.md)).

## Context

[0007](0007-treasury-backed-funding.md) needed a funding account, and the schema already had a
table of things that hold treats: `cats`. So the treasury became a cat — `is_system = true`,
`human_id NULL`, name `MeowPay Treasury` — and `wallets` was keyed by the thing that owns it:

```sql
wallets  cat_id uuid PRIMARY KEY REFERENCES cats(id)
```

That was the right call for what M2 knew. It cost one row and zero new tables, and RLS hid the
treasury for free ([0012](0012-rls-ownership-subquery.md)): `human_id IS NULL` means the ownership
subquery matches nothing.

It also encoded a claim in the primary key: **only a cat can hold treats.** `is_system` is the
admission that the claim was already false — a flag whose entire job is to mark the one row that
is not really a cat, and which every query about cats then has to filter out (`NOT is_system` in
the RLS roster policy, in both dashboard queries, in `OwnershipGuard`, twice).

M12 makes humans hold treats too. The claim in the primary key is now false in two directions, and
`is_system` cannot stretch to cover it — a human wallet is not a cat with a flag set.

## Decision

**The wallet is the account. It gets its own identity and a `kind`; cats, humans and the treasury
are things a wallet can belong to.**

```sql
CREATE TABLE public.wallets (
    id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind     text NOT NULL,                              -- 'human' | 'cat' | 'treasury'
    human_id uuid REFERENCES public.humans(id) ON DELETE CASCADE,
    cat_id   uuid REFERENCES public.cats(id)   ON DELETE CASCADE,
    balance  bigint NOT NULL DEFAULT 0,
    ...
    CONSTRAINT wallets_kind_check CHECK (kind IN ('human', 'cat', 'treasury')),
    CONSTRAINT wallets_owner_matches_kind CHECK (
        (kind = 'human'    AND human_id IS NOT NULL AND cat_id IS NULL)
     OR (kind = 'cat'      AND cat_id   IS NOT NULL AND human_id IS NULL)
     OR (kind = 'treasury' AND human_id IS NULL     AND cat_id IS NULL)
    ),
    CONSTRAINT wallets_non_treasury_non_negative CHECK (kind = 'treasury' OR balance >= 0)
);

CREATE UNIQUE INDEX wallets_one_per_human      ON public.wallets (human_id) WHERE kind = 'human';
CREATE UNIQUE INDEX wallets_one_per_cat        ON public.wallets (cat_id)   WHERE kind = 'cat';
CREATE UNIQUE INDEX wallets_exactly_one_treasury ON public.wallets ((true)) WHERE kind = 'treasury';
```

**The treasury is a wallet that belongs to nobody.** Not a cat, not a human — `kind = 'treasury'`
with both owner columns NULL. `cats.is_system`, its partial unique index, its `cats_system_ownership`
CHECK, and every `NOT is_system` filter downstream are **deleted**. `cats` becomes a table of cats.

**Money moves between wallets, so the money tables reference wallets:**

```
transfers.sender_wallet_id / receiver_wallet_id  -> wallets(id)
ledger_entries.wallet_id / counterparty_wallet_id -> wallets(id)
```

`counterparty_name` still snapshots a display name ([0006](0006-ledger-first-money-movement.md));
it now resolves per kind — the cat's name, the human's `display_name`, or the literal
`'MeowPay Treasury'`.

**Flow is one-directional, and the route table is the check.** `execute_transfer` resolves both
kinds and permits exactly three routes:

| From | To | Meaning | Source |
|---|---|---|---|
| `treasury` | `human` | top-up — treats enter the system | `topup` |
| `human` | `cat` | a human funds a cat | `manual` / `agent` |
| `cat` | `cat` | a cat sends treats to a cat | `manual` / `agent` |

Anything else — `cat → human`, `cat → treasury`, `human → human`, `treasury → cat` — is a `failed`
row with `failure_reason = 'unsupported_route'`. There is no cash-out and no claw-back. This one
table replaces the `system_recipient` branch, and it replaces it with something stronger: the old
check said *"not into a system account"* and left every other route implicitly legal; this one
enumerates what is legal and denies the rest.

### What survives from 0007, verbatim

```
SUM(all signed ledger entries) == 0
```

**Conservation of treats.** The money graph grew a hop — `treasury → human → cat → cat` instead of
`treasury → cat → cat` — and every hop still has two sides, so the sum is still zero and this is
still the strongest check in the system. The treasury still goes **negative**, and its negative
balance is still the exact count of treats in circulation. The `CHECK` still exempts it explicitly;
it is now keyed on `kind = 'treasury'` rather than an `is_system` boolean, which is the same
exemption stated more precisely.

## Consequences

- **`cats` is a table of cats.** No flag, no partial index, no `NOT is_system` filter in the RLS
  roster policy, the two dashboard queries, or `OwnershipGuard`. The special case is gone rather
  than relocated — the treasury is not an exception to cats, it is simply not one.
- **The treasury stays invisible to clients for the same reason it always did**, and with *less*
  machinery: `kind = 'treasury'` has no `human_id` and no `cat_id`, so the ownership predicate
  matches nothing ([0012](0012-rls-ownership-subquery.md)). The trail still names it, from the
  `counterparty_name` snapshot.
- **One route check instead of scattered guards.** Legality is a property of `(sender.kind,
  receiver.kind)`, decided in one place, and a new route is a new row in that table plus a test —
  not a new branch hunted across the service layer.
- **`wallet_id` is the universal handle**, which is what lets `/transfers/execute` serve both
  `human → cat` and `cat → cat` with no branch ([0023](0023-funding-path-topup-mints-to-the-human.md))
  and lets the composer's From picker list your wallet and your cats as one homogeneous list.
- **Every money column is renamed.** `sender_cat_id`, `receiver_cat_id`, `wallet_cat_id`,
  `counterparty_cat_id` and the DTO/TypeScript fields mirroring them all change. Migrations
  0001–0007 are **rewritten in place** rather than patched forward — the hosted project is empty,
  so there is no data to preserve and no reason to ship a rename scar. M2's milestone doc and the
  superseded ADRs remain the record of what was built then; they are not retro-edited.
- **A wallet lookup is one hop further away.** Code that had a `cat_id` in hand and could use it
  directly as a wallet key now resolves the cat's wallet first. It is an indexed read on a partial
  unique index, and it is the cost of the primary key no longer lying.
- **Realtime is unchanged in mechanism.** `wallets` and `ledger_entries` stay in the publication;
  RLS scopes the rows ([0013](0013-realtime-scoping-via-rls.md)). A human's own wallet row now
  arrives on the same channel as their cats' — the client keys on `wallet.id` instead of
  `wallet.cat_id`.

## Alternatives considered

**Keep `wallets.cat_id` as the key; add a nullable `human_id` beside it.** The smallest possible
diff — no new identity column, no renamed foreign keys, `transfers.sender_cat_id` keeps working for
cat senders. Rejected: it does not survive first contact with `human → cat`. A transfer's sender is
now *either* a cat or a human, so `sender_cat_id` must either become nullable and be joined by a
second nullable `sender_human_id` — two columns where one fact belongs, and a CHECK to stop both
being set — or keep its name while sometimes holding a human. The first doubles every money column
and every consumer's null-branching; the second is a column that lies. The rename is the honest
version of the same change, and it is mechanical.

**A separate `accounts` table; wallets hang off it.** The textbook shape, and the one this ADR is
closest to. `accounts (id, kind, cat_id, human_id)` with `wallets (account_id, balance)`. Rejected
as a distinction without a difference *here*: the two tables would be 1:1 forever, so every read
pays a join to express a split that buys nothing. An account exists to let one owner hold several
wallets (a current account and a savings account), and MeowPay has no such concept and no route to
one. When it does, `wallets` splits then, with the data to justify the shape. This ADR is the same
model with the join already collapsed.

**A `treasury` table with exactly one row.** The most literal reading of "treasury is a separate
entity". Rejected: a singleton table is a `kind` with extra steps, and it is worse in the place that
matters — the treasury would no longer be *in* `wallets`, so it could not be a `sender_wallet_id`.
Either the money tables grow a nullable `sender_treasury_id` (the polymorphic problem, back again),
or the treasury gets a wallet row anyway and the table is redundant. The treasury being a wallet is
what keeps `SUM == 0` expressible as one query over one table.

**Model the fictional bank account as a real ledger entity**, so top-up is `bank → treasury` then
`treasury → human`. More faithful to how a payment processor's float actually works: the treasury
would hold real received money and net to zero rather than run negative. Rejected: it relocates the
mint without eliminating it — the *bank* now goes infinitely negative, and it is a fake account with
no settlement behind it, so nothing has been made more true. It also costs two transfers per top-up
and needs a per-human bank account to mean anything, which is
[0007](0007-treasury-backed-funding.md)'s already-rejected per-human funding accounts wearing a hat.
The bank stays fiction, and it stays in the UI where fiction is honest — a `···· 4242` label, not a
row. The demo boundary 0007 named (treats are freely mintable, nothing settles behind them) is
unchanged and still called out in the README.

**Enumerate forbidden routes instead of permitted ones** — keep a `system_recipient`-style deny
list. Rejected: a deny list is only correct while nobody adds a `kind`. The day a fourth kind
appears, every route into it is legal by default and nothing fails until someone notices. The
permit table fails closed, which is the direction a money rule should fail.
