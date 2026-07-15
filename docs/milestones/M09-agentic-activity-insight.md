# M9 — Agentic activity insight

**Type:** fullstack · **Status:** not started
**ADR:** [0018](../adr/0018-tool-use-data-scoping.md)

## Scope

A button-triggered LLM summary of recent activity — read-only, and scoped so a model-supplied
identifier can never widen what it reads ([0018](../adr/0018-tool-use-data-scoping.md)).

- `InsightAgent` — `llama-3.3-70b-versatile`; a **forced** `get_recent_transactions` call whose
  backend implementation ignores any model-supplied cat id and scopes the query **always** to
  the JWT-resolved human's own cats, honoring only the optional `days`/`limit` arguments
  (server-clamped); an **unforced** follow-up turns the rows into a prose summary.
- `GET /api/insights/summary`.
- **Frontend:** `insight-panel` — lavender, button-triggered, `Skeleton` while loading.

## Tests

- **Backend:** a model-injected cat id belonging to another human is ignored — the returned
  rows are unchanged; a human with transfer history gets a non-empty summary.
- **Frontend:** loading and rendered states both render correctly.

## Verify

Click the insight button after some activity exists; the summary describes only the caller's
own cats, never another human's, even if prompted to.
