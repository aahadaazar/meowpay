# 0016. The agent proposes, a human confirms, the backend executes

**Status:** Accepted · **Date:** 2026-07-15 · **Milestone:** M8

## Context

The NL composer takes *"send Milo 10 treats for the red dot"* and turns it into a transfer.

The obvious build is an agent with a tool that moves money: the model calls
`send_treats(recipient, amount)`, the backend executes it, the model reports back. That is what
"AI agent" usually means, and it is exactly wrong here.

An LLM is a probabilistic parser. It will occasionally resolve the wrong cat from an ambiguous
name, read "ten" as 10 when the user meant 100, or hallucinate a recipient outright. Those are
not bugs to be fixed with a better prompt — they are the failure distribution of the component.
The question is not how to eliminate them. It is **what they are allowed to cost**.

If the model can move money, a parsing error *is* a transfer. In a wallet, that is unrecoverable
by design: the ledger is append-only ([0006](0006-ledger-first-money-movement.md)).

## Decision

**The agent proposes. A human confirms. The backend executes — through the same endpoint as the
manual form.**

```
POST /api/composer/parse { message, senderCatId }
    → ComposerAgent (tool_choice pinned to propose_transfer)
    → a validated PROPOSAL. Never a write.

    → the SAME confirm-transfer-dialog the manual form uses
    → the human reads it and confirms

POST /api/transfers/execute { idempotencyKey, senderCatId, receiverCatId, amount, note,
                              source: 'agent' }
    → the SAME endpoint the manual form calls
```

### The safety property

**There is exactly one code path that moves money, and a human is always on it.**

Three claims, each load-bearing:

1. **`/composer/parse` cannot write.** It has no transfer path — not a guarded one, *none*. Its
   only output is a validated proposal object. This is asserted by a test that **the parse
   endpoint never writes to the database**, because "it doesn't call the write path" is a
   property that quietly stops being true during a refactor.

2. **The confirmation is the *same dialog* as the manual form**, not an agent-specific one. The
   human sees From, To, amount and note laid out identically to a hand-typed transfer, and
   confirms the same way. It is not an "AI says OK?" prompt — it is the transfer, shown. A
   different dialog would train the user to treat agent transfers as a different, lighter kind of
   thing.

3. **Execution is the *same endpoint*** — `/transfers/execute`. So the agent path inherits every
   guarantee the manual path has, with no re-derivation: idempotency
   ([0009](0009-idempotency-and-status.md)), ordered locking and atomicity
   ([0008](0008-atomic-plpgsql-transfer.md)), the cat-ownership check
   ([0012](0012-rls-ownership-subquery.md)), the rejection of server-only `source` values and
   system recipients ([0014](0014-topup-as-treasury-transfer.md)).

The result: **the agent's blast radius is a wrong proposal, and a wrong proposal is a thing a
human declines.** The model's failure mode is downgraded from "moved money incorrectly" to
"suggested something silly", which is a UI annoyance rather than a financial incident.

### Supporting details

**`tool_choice` is pinned to `propose_transfer`.** The model is not asked *whether* to use a
tool. Forced tool-use makes the output shape structural rather than a matter of the model
choosing to comply, which removes prose-parsing and the "sure, I'd be happy to help!" failure.

**The roster is injected into the prompt.** The model resolves names against **real cat ids it
can actually see**, rather than guessing an id. A cat that isn't in the roster cannot be
proposed — the resolution is a lookup in provided context, not recall. Unknown cat or bad amount
→ **422 with a friendly message**, not a hallucinated id.

**`senderCatId` is checked on parse too.** Even though parse writes nothing, it rejects a sender
cat the caller doesn't own — the roster injection would otherwise leak which of *someone else's*
cats exist in a usable form, and the check belongs on every endpoint that takes a cat id
([0010](0010-actor-vs-account.md)).

**`source='agent'`** labels provenance only. It never affects balances or authorization — a
client asserting `manual` for an agent transfer changes a badge, nothing more
([0014](0014-topup-as-treasury-transfer.md)).

## Consequences

- **The model cannot move money. Not "is prevented from" — cannot.** There is no tool that does
  it and no endpoint it can reach.
- Agent and manual transfers are **indistinguishable in the ledger** except by the `source`
  label, and identical in their guarantees. One implementation to test, one to secure.
- **A wrong parse costs a decline.** The user retypes. Nothing is lost.
- **Two steps instead of one.** The NL composer is not faster than the form for a simple send —
  it is a different affordance, not a shortcut, and the confirm step is the price of the safety
  property. That trade is the entire point.
- The agent's usefulness is bounded by what a proposal can express. It cannot batch, schedule, or
  chain. Fine: those are not in the slice, and each would need its own confirmation story.
- **A human confirming every transfer does not scale** to an agent that acts autonomously. That
  is a different product with a different risk model — it would need spending limits, an approval
  policy and a revocation path. This ADR is the version that is defensible in a half-day slice.

## Alternatives considered

**Give the model an `execute_transfer` tool.** The canonical agent design, one step for the user,
genuinely impressive in a demo. Rejected: it makes a probabilistic component the last thing
between a user and an irreversible write. Every mitigation is weaker than not doing it —
a confirmation *inside* the tool call is the same dialog with more machinery; a "small amounts
only" limit means the model can move money, just less of it, and picks the amount. When the
failure mode is unrecoverable, the fix is to remove the capability, not to bound it.

**Agent executes, human can undo.** Reversibility instead of prevention. Rejected: the ledger is
append-only, so "undo" is a compensating transfer — the wrong transfer still happened, the
recipient still received it, and the trail shows both. Undo is not a safety property when the
counterparty can spend.

**A separate agent-specific confirm dialog** ("MeowPay wants to send 10 treats to Milo — allow?").
Rejected: it frames the decision as *permitting the AI* rather than *reviewing a transfer*, which
is the wrong question. Users click through permission prompts; they read transfer details. Same
dialog, same fields, same scrutiny.

**A separate `/api/agent/execute` endpoint.** Cleaner separation of concerns on paper. Rejected:
it is a second money-movement path, needing its own ownership check, idempotency and tests — a
second chance to get the most dangerous code in the app wrong, for a `source` column that already
records the difference.

**Let the model return a cat name; the backend resolves it.** No roster injection, smaller prompt.
Rejected: it moves fuzzy matching into the backend, which then has to decide what "Milo" means
when there are two. Injecting the roster makes the model resolve against reality, and an
unresolvable name fails loudly with a 422 instead of resolving to *a* Milo.

**Skip the agent; ship the form only.** Rejected: an agentic workflow is explicitly in scope, and
this design demonstrates the interesting half — that adding an LLM to a money product need not
widen its attack surface at all.
