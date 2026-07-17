# MeowPay — milestone roadmap

**Method:** spec-driven, milestone-based. M0–M2 are enablers (no user-facing feature on their
own); **M3–M9 are fullstack** — one feature end to end, backend and frontend together in the
same milestone; M10 packages the result for a clean-clone run. Every milestone ships **its own
backend and frontend tests, written alongside**, and **one or more ADRs**. Tests are authored
per milestone but **not run unless asked**.

This file is the roadmap; each milestone's detail — scope, tests, verify step, ADR links —
lives in `docs/milestones/`. The reasoning behind each cross-cutting decision lives in
`docs/adr/`; this is the sequencing, not the argument. **[`AGENTS.md`](../AGENTS.md)** is the
execution loop: how a milestone gets picked up, implemented, verified, tracked and committed —
read it before starting any milestone below.

The **Status** column is the tracker — kept in sync with each milestone file's own header, per
`AGENTS.md`'s [Tracking](../AGENTS.md#tracking) convention. No separate state file: this table
plus git history is the source of truth for progress.

| # | Milestone | Type | Status | ADRs |
|---|---|---|---|---|
| [M0](milestones/M00-foundation-and-scaffolding.md) | Foundation & scaffolding | enabler | done | [0001](adr/0001-stack-and-topology.md) |
| [M1](milestones/M01-design-system.md) | Design system | enabler | done | [0002](adr/0002-adopt-clay-design-system-and-extension-strategy.md) · [0003](adr/0003-dark-theme-extension.md) · [0004](adr/0004-chart-palette-derivation.md) · [0005](adr/0005-fluid-responsive-strategy.md) |
| [M2](milestones/M02-ledger-core.md) | Ledger core — the centerpiece | enabler | done | [0006](adr/0006-ledger-first-money-movement.md) · [0007](adr/0007-treasury-backed-funding.md) · [0008](adr/0008-atomic-plpgsql-transfer.md) · [0009](adr/0009-idempotency-and-status.md) · [0010](adr/0010-actor-vs-account.md) |
| [M3](milestones/M03-auth-and-cat-management.md) | Auth & cat management | fullstack | done | [0011](adr/0011-auth-boundary.md) · [0012](adr/0012-rls-ownership-subquery.md) |
| [M4](milestones/M04-realtime-dashboard.md) | Realtime dashboard: total, cats, trail | fullstack | done | [0013](adr/0013-realtime-scoping-via-rls.md) |
| [M5](milestones/M05-manual-transfer.md) | Manual transfer | fullstack | done | — (exercises 0008/0009/0012) |
| [M6](milestones/M06-topup.md) | Top-up | fullstack | done | [0014](adr/0014-topup-as-treasury-transfer.md) |
| [M7](milestones/M07-activity-charts.md) | Activity charts | fullstack | done | [0015](adr/0015-client-side-chart-derivation.md) |
| [M8](milestones/M08-agentic-nl-composer.md) | Agentic NL composer | fullstack | not started | [0016](adr/0016-agent-proposes-human-confirms.md) · [0017](adr/0017-groq-model-split.md) |
| [M9](milestones/M09-agentic-activity-insight.md) | Agentic activity insight | fullstack | not started | [0018](adr/0018-tool-use-data-scoping.md) |
| [M10](milestones/M10-dockerization-and-readme.md) | Dockerization & README | packaging | not started | [0019](adr/0019-deployment-topology.md) |
| [M11](milestones/M11-e2e-local-supabase.md) | e2e suite against local Supabase | tooling | abandoned | [0020](adr/0020-e2e-against-local-supabase.md) (Rejected) |
| [M12](milestones/M12-treasury-entity-and-human-wallets.md) | Treasury as an entity; humans hold wallets | fullstack | not started | [0021](adr/0021-wallet-is-the-account.md) · [0022](adr/0022-humans-hold-wallets.md) · [0023](adr/0023-funding-path-topup-mints-to-the-human.md) |

M0–M10 were the original 11-milestone plan and are all documented (M8–M10 not yet implemented).
**M11 was added later** (2026-07-16), after a Playwright e2e suite (`e2e/`) was built and run
against the live hosted Supabase project — repeated local iteration against that project's admin
API hit Supabase's rate limits. M11 addressed this by retargeting local e2e runs at a local
Supabase instance; it was implemented, then **abandoned as out of scope** the next day and its
implementation reverted. See [ADR 0020](adr/0020-e2e-against-local-supabase.md) and
[CHECKLIST.md](milestones/CHECKLIST.md) for the incident and the decision record.

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
