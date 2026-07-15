# M10 — Dockerization & README

**Type:** packaging · **Status:** not started
**ADR:** [0019](../adr/0019-deployment-topology.md)

## Scope

Package the finished slice so it runs from a clean clone — the brief's explicit check
([0019](../adr/0019-deployment-topology.md)).

- Multi-stage Dockerfiles: backend `temurin:21-jdk` → `temurin:21-jre`, with the Gradle wrapper
  committed; frontend `next build` with `output: 'standalone'`.
- Compose wiring for both services against hosted Supabase.
- **README:**
  - What was built.
  - Run-from-clean-clone: create a Supabase project, apply the migrations, fill `.env`,
    `docker compose up --build`.
  - Trade-offs — each one linked to the ADR that argues it, including: **treats are freely
    mintable via top-up; real MeowPay would settle against a payment provider before crediting**
    ([0007](../adr/0007-treasury-backed-funding.md), [0014](../adr/0014-topup-as-treasury-transfer.md)).
  - **How Claude Code built the repo** — distinct from the in-app Groq agent features
    ([0016](../adr/0016-agent-proposes-human-confirms.md)–[0018](../adr/0018-tool-use-data-scoping.md)
    are the product's agents; this section is about the AI workflow used to build the product,
    which the brief separately asks to see and defend.

## Verify

`docker compose up --build` from a clean clone works end to end, with no undocumented manual
step.

## Progress log

- not started
