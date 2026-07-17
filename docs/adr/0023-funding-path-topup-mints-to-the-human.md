# 0023. Top-up mints to the human; cats are funded by an ordinary transfer

**Status:** Accepted · **Date:** 2026-07-17 · **Milestone:** [M12](../milestones/M12-treasury-entity-and-human-wallets.md)

**Supersedes [0014](0014-topup-as-treasury-transfer.md).** Its structural decision — *a top-up is
not a new operation, it is a transfer through the same `execute_transfer`* — survives verbatim and
is the reason this milestone adds no money-movement code. Two things reverse: **what a top-up
targets** (a human's wallet, not a cat), and **the preset allowlist**.

## Context

[0014](0014-topup-as-treasury-transfer.md) made a top-up `treasury → cat`, chosen from three preset
pills on the cat card. Treats entered the system already allocated: there was no moment where a
human held treats and decided where they went, because a human could not hold treats
([0010](0010-actor-vs-account.md)).

M12 introduces that moment. Money enters at the human ([0021](0021-wallet-is-the-account.md),
[0022](0022-humans-hold-wallets.md)), and allocation becomes a separate, explicit act. That splits
one flow into two, and each half needs its own answer to *who decides the amount is allowed*.

The trust question 0014 identified has not moved an inch: **the presets are rendered by the client.
The endpoint takes JSON from the internet.**

## Decision

### The money path

```
treasury ──topup──▶ human wallet ──send──▶ cat wallet ──send──▶ cat wallet
```

**Top-up: `POST /api/wallet/topup { idempotencyKey, amount }` → `execute_transfer(treasury → my
wallet, source='topup', initiated_by=<jwt human>)`.**

No `catId`. The target is the caller's own wallet, resolved server-side from the JWT — it is not a
parameter, so it is not an authorization surface. This is the *one* place a client-supplied
identifier got **removed** by M12, and it is worth noticing: the endpoint whose sender is the
treasury now takes no identifiers at all.

**Funding a cat: `POST /api/transfers/execute { idempotencyKey, senderWalletId, receiverWalletId,
amount, note, source }`.** `human → cat` and `cat → cat` are the same request with a different
sender kind. One endpoint, one route check ([0021](0021-wallet-is-the-account.md)), one ownership
check, no branch.

### Top-up stays a separate endpoint, and that is not an inconsistency

[0022](0022-humans-hold-wallets.md) makes every wallet a `wallet_id`, which is exactly what lets
`human → cat` and `cat → cat` merge. The obvious next step is to merge top-up in too — it is a
transfer, it has a `sender_wallet_id`, the route table already permits `treasury → human`.

**No.** `/transfers/execute` takes its sender **from the client** and authorizes it against the JWT.
That check is *"is this wallet mine?"*, and the treasury is nobody's — so a merged endpoint would
need a carve-out permitting one specific unowned wallet as a sender, which is the ownership guard
having an exception, on the money endpoint, for the account that mints treats. Any bug in that
carve-out is unlimited minting.

Instead the treasury sender is **not expressible** over HTTP. `/wallet/topup` hardcodes it and
accepts no sender; `/transfers/execute` requires an owned sender and has no exception. The two
endpoints share `execute_transfer` — same idempotency, same ordered locking, same atomicity
([0008](0008-atomic-plpgsql-transfer.md), [0009](0009-idempotency-and-status.md)) — and differ only
in what they let the internet name. **Sharing the write path is the goal; sharing the parameter
surface is the risk.** 0014 drew this line for `source`; this draws it for the sender.

### The amount policy

**Top-up takes a free amount, bounded server-side by `0 < amount <= TOPUP_MAX`.** The presets
(+100 / +500 / +1000) remain, demoted to **shortcuts that fill the field**. The allowlist is gone.

This reverses 0014's most-argued decision, so the reason has to be better than "the design changed".
0014 rejected a range check because *"the product ships presets, so the allowlist is the precise
statement of the policy, and precision is free here"*. That was sound. Precision is no longer free:
the product now ships a **free-entry field**, so an allowlist cannot express the policy at all —
it would reject the field's entire purpose. The cap, which 0014 kept as a second, independent bound,
becomes the *only* bound, and that is the honest statement of what the product now permits.

The second bound has not vanished so much as it has been re-earned: `execute_transfer` independently
rejects `amount <= 0` as `invalid_amount`, so the endpoint's cap check and the function's sign check
are still two separate things saying no.

**Funding a cat is bounded by the balance, and the balance check lives in the database.** The
composer disables submit and shows the shortfall when the amount exceeds the selected sender's
balance. **That is an affordance, not a control** — the same distinction 0014 drew for the pills,
and it costs nothing to honour here because `execute_transfer` already returns `insufficient_funds`
as a durable `failed` row. The client check exists so the user finds out before submitting; the
server check exists because the client's does not.

### What no longer exists

**The welcome grant is removed.** `create_cat` inserts the cat and its wallet at **0**, and stops —
no `execute_transfer` call, no 500 treats, no `welcome_grant` source. A cat gets treats when a human
sends them.

0007 introduced the grant to make cat creation reconcile from row one, and that reasoning was
correct *for a grant*. A cat created at 0 with no ledger rows reconciles trivially and for a better
reason: `SUM(signed entries) == balance` holds as `0 == 0`. There is no bootstrap moment to
paper over, because nothing was minted.

## Consequences

- **Still zero new money-movement code.** Top-up, human→cat and cat→cat are one function. 0014's
  central claim survives the whole restructure, which is the clearest evidence it was the right
  call.
- **Top-ups are still idempotent for free**, still reconcile for free, and the treasury still goes
  further negative by exactly the amount minted — now asserted against a human's wallet instead of
  a cat's.
- **First run is empty, on purpose.** A new human has no cats, no treats, no ledger rows and no
  charts. The flow is *sign up → top up → create a cat → fund it*, and the empty states must
  narrate that path rather than promise a grant. This is a real cost — the old first-run showed a
  populated trail immediately — paid to make "humans fund cats" true rather than decorative.
- **`create_cat` gets simpler and stays `SECURITY DEFINER`.** It no longer moves money, but it
  still writes two tables atomically and there are still **no client-facing INSERT grants**
  ([0006](0006-ledger-first-money-movement.md), [0012](0012-rls-ownership-subquery.md)). Its
  failure mode shrinks: it can no longer fail because a *grant* failed.
- **`amount` is still an integer of treats.** No currency, no decimals, no rounding — the float-money
  bug class is still absent by construction, and a free-entry field is where it would have entered.
  The field parses to an integer or refuses.
- **The client can now express an amount the server will reject**, which the pills could not. That
  is the price of the field, and it is why `TOPUP_MAX` is enforced server-side and surfaced as a
  real error rather than assumed away.
- **Treats are still freely mintable**, and the free field makes the demo boundary louder: a human
  mints `TOPUP_MAX` by typing it. Unchanged from 0014 — real MeowPay authorizes with a payment
  provider and credits **only** on settlement, which makes top-up asynchronous and introduces the
  `pending` state [0009](0009-idempotency-and-status.md) deliberately does not have. The bank
  account in the UI is fiction with no ledger entity behind it
  ([0021](0021-wallet-is-the-account.md)). Called out in the README.

## Alternatives considered

**Keep top-up targeting the cat; give the human a wallet that only receives.** Preserves the
one-click cat funding flow, and 0014's pills never move. Rejected: it makes the human wallet
decorative — treats would enter at the cat and the human's balance would only ever be 0, so
"humans top up, then fund cats" would be a story the UI tells while the data does something else.
If the human wallet is not on the path money takes, it should not exist.

**Merge top-up into `/transfers/execute`** with a permitted `treasury` sender. One money endpoint,
which is aesthetically the conclusion [0021](0021-wallet-is-the-account.md) is driving toward.
Rejected above: it puts an exception in the ownership guard on the minting path. The route table
permits `treasury → human` at the *function* level, where the sender is trusted; the HTTP boundary
is where the sender stops being trusted, and that is where the two endpoints have to diverge.

**Keep the allowlist and drop the free field.** No reversal needed, and 0014's precision argument
stands as written. Rejected on product grounds: with allocation now a separate step, top-up is the
one place a human states how much they are putting in, and three fixed values is the wrong shape for
that — it forces a human wanting 700 to click twice and land on 600 or 1100. The field is the
feature; the allowlist was precise about a policy that no longer exists.

**Free field on top-up with no cap** — the treasury is fiction anyway, so why bound it. Rejected:
`TOPUP_MAX` is the only remaining server-side statement about how much a single request may mint,
and an unbounded mint endpoint is the kind of thing that is fine in a demo right up until the demo
is the thing being reviewed. A bound that exists is also a bound that gets tested.

**Client-side balance check only for cat funding** — trust the disabled submit button. Rejected
outright, for the reason 0014 gave about the pills and 0009 gave about the disabled button: the
control is HTML. `insufficient_funds` already exists in `execute_transfer`, is already a durable
`failed` row, and is already tested. Not using it would be choosing the weaker of two checks that
are both already written.

**Keep a welcome grant, funded from the human's wallet.** Cat creation stays celebratory, and the
grant now has an actor, so [0022](0022-humans-hold-wallets.md)'s `NOT NULL` still holds. Rejected:
it makes `create_cat` fail when the human has under 500 treats — creating a cat would depend on your
balance, which is a surprising coupling, and the alternative (create the cat, skip the grant
silently) means the operation sometimes does half of what it says. Funding is one click away in the
composer; it does not need to be smuggled into cat creation.
