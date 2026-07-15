# 0017. Two Groq models, split by job — 8b to parse, 70b to summarize

**Status:** Accepted · **Date:** 2026-07-15 · **Milestone:** [M8](../milestones/M08-agentic-nl-composer.md)

## Context

Two agentic features, and they look similar enough to share a model:

- **The NL composer** — *"send Milo 10 treats for the red dot"* → a structured proposal
  ([0016](0016-agent-proposes-human-confirms.md)).
- **The activity insight** — a button that summarizes recent activity in prose
  ([0018](0018-tool-use-data-scoping.md)).

They are not similar. They have opposite requirements on every axis that matters.

## Decision

**Split the models by job.**

| Feature | Model | Why |
|---|---|---|
| Composer parse | **`llama-3.1-8b-instant`** | latency-critical, structurally constrained |
| Activity insight | **`llama-3.3-70b-versatile`** | quality-critical, latency-tolerant |

Both env-configured (`GROQ_COMPOSER_MODEL`, `GROQ_INSIGHT_MODEL`) so the split is a deployment
choice, not a recompile.

**The composer is not a reasoning task.** `tool_choice` is pinned to `propose_transfer`, and the
roster is injected — so the model's entire job is to fill three slots (recipient, amount, note)
from a sentence, choosing the recipient from a list it was handed. That is extraction, not
inference. The constraint does the hard part; the model does the easy part. An 8b model is
sufficient **because the design made the task small**, and it sits in the user's typing loop
where latency is the whole experience.

**The insight is the opposite.** It runs a two-step tool loop — a forced
`get_recent_transactions`, then an unforced follow-up that writes the summary — and its output is
prose a human reads and judges. There is no structural constraint to lean on: the difference
between a 8b and a 70b summary is the difference between "you sent treats" and something worth
the button press. It is button-triggered, expected to take a moment, and shows a skeleton.

**Groq is called as plain OpenAI-compatible HTTP via Spring's `RestClient`. No SDK.** The surface
used is `messages`, `tools`, `tool_choice` — three fields. An SDK would add a dependency, a
version to track and an abstraction over a base URL swap, for no capability that isn't already
one `POST` away.

`GROQ_API_KEY` lives **only in the backend container**. The browser never holds it and never
calls Groq directly.

## Consequences

- **Each feature gets the model its job needs**, and neither pays for the other's requirements.
- The composer stays fast enough to feel like part of the form rather than a request.
- The insight is worth reading, which is the only reason the button exists.
- **Two model names to keep track of**, and two failure profiles. Mitigated: both are env vars,
  and both agents share one `GroqClient`.
- **Model availability is a real dependency.** Groq deprecates and renames models; a name that
  works today can 404 later. Env-configured means the fix is a compose variable, not a build.
- **The key never reaches the browser.** All LLM traffic is backend-mediated, which is also what
  makes the tool-scoping guarantee in [0018](0018-tool-use-data-scoping.md) enforceable at all.
- Non-determinism is bounded by design, not by the model choice: the composer's output is a
  proposal a human confirms, so an 8b misparse costs a decline
  ([0016](0016-agent-proposes-human-confirms.md)).

## Alternatives considered

**One model for both — 70b everywhere.** Simpler: one name, one config, best quality throughout.
Rejected: it puts a large model in the typing loop for a task that is filling three slots from a
provided roster. The composer's latency is felt on every keystroke-to-proposal; paying 70b
inference for extraction is spending the user's time on capability the task cannot use.

**One model for both — 8b everywhere.** Fastest, cheapest, one name. Rejected on the insight: it
is an unconstrained prose task judged by a human. An 8b summary of a ledger window reads as
filler, and a filler summary is worse than no summary — it makes the feature look like an LLM was
added for the sake of it.

**A single model with different temperatures.** Rejected: temperature tunes sampling, not
capability. It does not make an 8b model reason better, nor a 70b model faster.

**Use the Groq SDK.** Idiomatic, typed, less hand-rolled JSON. Rejected: the API used here is
OpenAI-compatible and three fields wide. `RestClient` + `jackson-module-kotlin` covers it in one
class, and a base-URL swap doesn't justify a dependency — which would also have to be kept
current against a fast-moving provider.

**OpenAI or Anthropic instead of Groq.** Better models. Rejected for this slice: Groq's inference
speed is the reason the composer can sit inline in a form at all, and the OpenAI-compatible
surface means the provider is a base URL. The composer's task is constrained enough that frontier
capability buys nothing.

**Call Groq from the frontend** — one less hop, no backend agent code. Rejected: the API key
would ship to the browser, and the tool-scoping guarantee ([0018](0018-tool-use-data-scoping.md))
depends on the backend — not the model — deciding which rows a tool can read. A client-side agent
has no trusted party to enforce that.
