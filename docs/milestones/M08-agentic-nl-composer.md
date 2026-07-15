# M8 — Agentic NL composer

**Type:** fullstack · **Status:** not started
**ADRs:** [0016](../adr/0016-agent-proposes-human-confirms.md) ·
[0017](../adr/0017-groq-model-split.md)

## Scope

Natural-language transfer entry — *"send Milo 10 treats for the red dot"* — that proposes, never
executes ([0016](../adr/0016-agent-proposes-human-confirms.md)).

- `GroqClient` — plain OpenAI-compatible HTTP via `RestClient`, no SDK
  ([0017](../adr/0017-groq-model-split.md)).
- `ComposerAgent` — `llama-3.1-8b-instant`, `tool_choice` pinned to `propose_transfer`, the
  caller's roster injected so the model resolves names to real `recipient_cat_id`s it can see
  rather than guessing an id.
- `POST /api/composer/parse { message, senderCatId }` → a validated proposal only — **never
  executes**. Unknown cat or malformed amount → 422 with a friendly message.
- **Frontend:** pills ("Send" / "Ask MeowPay", lavender per
  [`APP-EXTENSIONS.md`](../design/APP-EXTENSIONS.md#semantic-badge-pill-variants)),
  `nl-composer` → proposal → **the same `confirm-transfer-dialog` M5 built** → the same
  `/transfers/execute`, `source='agent'`.

## Tests

- **Backend:** a valid message produces a valid proposal; rejects a nonexistent recipient;
  rejects a `senderCatId` not owned by the caller; **asserts `/composer/parse` never writes to
  the database** — the load-bearing property in
  [0016](../adr/0016-agent-proposes-human-confirms.md).
- **Frontend:** a proposal correctly populates the confirm dialog's fields.

## Verify

"send Milo 10 treats for the red dot" → a proposal appears in the confirm dialog → confirm →
the transfer lands, indistinguishable in the trail from a manual send except for its `source`
badge.

## Progress log

- not started
