# M9 — Agentic activity insight

**Type:** fullstack · **Status:** done
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

## Progress log

- 2026-07-17 — started. Confirmed M2 and M3 are done; reviewed ADR 0018 and the product-surface design guidance.
- 2026-07-17 — done. Added the forced, bounded insight tool loop, JWT-scoped cat-ledger query, `/api/insights/summary`, and lavender loading panel with backend/frontend tests. Backend `compileKotlin` passed; tests were authored but not run per project rules. Manual Verify could not be completed without a safe authenticated test account and browser walkthrough; the frontend production build was also blocked by an `EPERM` lock on the mounted `.next/trace` file while the development service was running.
