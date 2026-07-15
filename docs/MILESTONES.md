# MeowPay — milestone roadmap

**Method:** spec-driven, milestone-based. M0–M2 are enablers (no user-facing feature on their
own); **M3–M9 are fullstack** — one feature end to end, backend and frontend together in the
same milestone; M10 packages the result for a clean-clone run. Every milestone ships **its own
backend and frontend tests, written alongside**, and **one or more ADRs**. Tests are authored
per milestone but **not run unless asked**.

This file is the roadmap; each milestone's detail — scope, tests, verify step, ADR links —
lives in `docs/milestones/`. The reasoning behind each cross-cutting decision lives in
`docs/adr/`; this is the sequencing, not the argument.

| # | Milestone | Type | ADRs |
|---|---|---|---|
| [M0](milestones/M00-foundation-and-scaffolding.md) | Foundation & scaffolding | enabler | [0001](adr/0001-stack-and-topology.md) |
| [M1](milestones/M01-design-system.md) | Design system | enabler | [0002](adr/0002-adopt-clay-design-system-and-extension-strategy.md) · [0003](adr/0003-dark-theme-extension.md) · [0004](adr/0004-chart-palette-derivation.md) · [0005](adr/0005-fluid-responsive-strategy.md) |
| [M2](milestones/M02-ledger-core.md) | Ledger core — the centerpiece | enabler | [0006](adr/0006-ledger-first-money-movement.md) · [0007](adr/0007-treasury-backed-funding.md) · [0008](adr/0008-atomic-plpgsql-transfer.md) · [0009](adr/0009-idempotency-and-status.md) · [0010](adr/0010-actor-vs-account.md) |
| [M3](milestones/M03-auth-and-cat-management.md) | Auth & cat management | fullstack | [0011](adr/0011-auth-boundary.md) · [0012](adr/0012-rls-ownership-subquery.md) |
| [M4](milestones/M04-realtime-dashboard.md) | Realtime dashboard: total, cats, trail | fullstack | [0013](adr/0013-realtime-scoping-via-rls.md) |
| [M5](milestones/M05-manual-transfer.md) | Manual transfer | fullstack | — (exercises 0008/0009/0012) |
| [M6](milestones/M06-topup.md) | Top-up | fullstack | [0014](adr/0014-topup-as-treasury-transfer.md) |
| [M7](milestones/M07-activity-charts.md) | Activity charts | fullstack | [0015](adr/0015-client-side-chart-derivation.md) |
| [M8](milestones/M08-agentic-nl-composer.md) | Agentic NL composer | fullstack | [0016](adr/0016-agent-proposes-human-confirms.md) · [0017](adr/0017-groq-model-split.md) |
| [M9](milestones/M09-agentic-activity-insight.md) | Agentic activity insight | fullstack | [0018](adr/0018-tool-use-data-scoping.md) |
| [M10](milestones/M10-dockerization-and-readme.md) | Dockerization & README | packaging | [0019](adr/0019-deployment-topology.md) |

**Status:** all 11 milestones are documented; none is implemented yet. This file and
`docs/milestones/*.md` are the plan committed to the repo, so the roadmap survives outside the
local Claude Code plan file that produced it.

## Domain, in one paragraph

Two actors: a **human** is the authenticated account and owns 1..N **cats**; each cat has a
wallet. Humans create cats and top them up; cats send treats to cats — including a human's own
cats to each other. Recipients are any non-system cat, not just the sender's own — the composer
carries `From [my cat] → To [any cat]`, never a global "acting as" switcher.

## Backend endpoints (all `/api`, all JWT-protected; no auth endpoints)

`GET /me` · `GET /cats` · `POST /cats` · `POST /transfers/execute` (manual and agent-confirm
both call this one endpoint) · `POST /wallet/topup` · `POST /composer/parse` (proposal only) ·
`GET /insights/summary`.

## Overall verification (once implemented)

- **Backend:** Testcontainers — concurrency, insufficient balance, idempotency replay,
  per-wallet reconciliation, global conservation, cat-ownership authz on every money endpoint.
- **End to end:** one human, two cats; top up an empty wallet; send between your own cats (total
  unchanged) and to another human's cat; via both manual form and NL composer; realtime lands
  without refresh; re-send a used idempotency key → no double-charge; light/dark and
  mobile/desktop all render.
- **Docker:** `docker compose up --build` from a clean clone works end to end.
