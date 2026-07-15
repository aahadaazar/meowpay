# 0014. Top-up is a treasury transfer; the amount policy is server-side

**Status:** Accepted · **Date:** 2026-07-15 · **Milestone:** [M6](../milestones/M06-topup.md)

## Context

A human tops up one of their cats from preset pills on the cat card: **+100 / +500 / +1000**.

Two questions: what *is* a top-up in the data model, and who decides the amount is allowed.

The second is the trust question. The presets are rendered by the client. A client-rendered
allowlist is a UI affordance, not a control — the endpoint is reachable with any number in it,
including `999999999`, or a negative one.

## Decision

**`POST /api/wallet/topup { idempotencyKey, catId, amount }` → `execute_transfer(treasury → cat,
source='topup', initiated_by=<jwt human>)`.**

A top-up is not a new operation. It is a transfer whose sender is the treasury
([0007](0007-treasury-backed-funding.md)) — the same `execute_transfer`, the same idempotency,
the same ordered locking, the same atomicity ([0008](0008-atomic-plpgsql-transfer.md)).
**Zero new money-movement code.**

**The endpoint validates three things, server-side, every time:**

1. **The target cat is mine** — `OwnershipGuard` against the JWT human. Topping up a cat you do
   not own is rejected ([0012](0012-rls-ownership-subquery.md)).
2. **The amount is on the preset allowlist** — not a range check, an *allowlist*. The presets are
   the policy, and the server holds it.
3. **The amount is under the server cap** (`TOPUP_MAX`, env-configured) — a second, independent
   bound, so a mistake in the allowlist cannot become an unbounded mint.

**`source='topup'` is server-only provenance.** `/transfers/execute` **rejects** `source` in
`('topup','welcome_grant')` — a client cannot label its own transfer as a top-up. Only the
top-up endpoint writes that value, and only the `create_cat` function writes `welcome_grant`.

## Consequences

- **One money-movement path.** Top-up, welcome grant and cat-to-cat transfer are the same
  function. A fix to locking or idempotency fixes all three. There is no second implementation to
  drift.
- Top-ups are **idempotent for free** — a double-clicked +500 credits 500 once
  ([0009](0009-idempotency-and-status.md)).
- Top-ups **reconcile for free**. Conservation (`SUM(all signed entries) == 0`) holds across
  them, because a top-up has a counterparty. The treasury goes further negative by exactly the
  amount minted — and that is asserted in tests.
- The trail shows top-ups **as transfers**, with the treasury named and *"topped up by you"*
  resolvable from `initiated_by` ([0010](0010-actor-vs-account.md)).
- **The allowlist lives in two places** — the client renders pills, the server enforces. That is
  not duplication to eliminate: one is an affordance, one is a control. They are allowed to
  disagree, and when they do, the server wins.
- **`amount` remains an integer of treats.** No currency, no decimals, no rounding — the whole
  class of float-money bugs is absent by construction.
- **Treats are freely mintable.** Any human can mint 1000 treats by clicking a pill; nothing is
  settled behind it. This is the demo's largest deliberate gap: real MeowPay would authorize a
  payment with a provider and credit **only** on settlement confirmation, making top-up
  asynchronous and introducing the `pending` state that
  [0009](0009-idempotency-and-status.md) deliberately does not have. Called out in the README.

## Alternatives considered

**Single-entry credit — `UPDATE wallets SET balance = balance + amount`.** One statement, no
treasury. Rejected, and [0007](0007-treasury-backed-funding.md) carries the full argument: no
conservation invariant, and a trail that cannot say where treats came from. It also forks money
movement — a second write path needing its own idempotency, locking and tests.

**A dedicated `topup` function** separate from `execute_transfer`. Cleaner-looking signature (no
sender), and no treasury lookup. Rejected: it is the *same* operation with a fixed sender. A
second function means two places to get locking right, two idempotency implementations, and two
things to fix when one is wrong. The treasury lookup is one indexed read.

**Range check instead of an allowlist** (`amount > 0 && amount <= TOPUP_MAX`). More flexible,
and a custom-amount field would need it. Rejected: the product ships **presets**, so the
allowlist is the *precise* statement of the policy, and precision is free here. A range permits
1..999 when the product permits three values, and every permitted-but-unintended value is
surface area. The cap stays as a second bound regardless.

**Trust the client's amount; the presets are the control.** Rejected outright — the pills are
HTML. The endpoint takes JSON from the internet.

**Let the client send `source`.** Simpler endpoint, one less branch. Rejected: `source` labels
provenance, and `topup`/`welcome_grant` are claims about what the *server* did. A client that can
assert `welcome_grant` can forge the appearance of a system-issued grant in the audit trail. (By
contrast `manual` vs `agent` **is** client-asserted — it only labels which UI was used, never
affects balances or authorization. That asymmetry is deliberate and noted in the README.)

**Server-generated idempotency key for top-ups.** Rejected: same reasoning as
[0009](0009-idempotency-and-status.md) — the key must identify the *intent*, and only the client
knows when one submission ends and the next begins.
