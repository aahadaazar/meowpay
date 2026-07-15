# 0001. Stack and topology

**Status:** Accepted · **Date:** 2026-07-15 · **Milestone:** [M0](../milestones/M00-foundation-and-scaffolding.md)

## Context

The brief asks for one thin vertical slice of a money-movement product with a **real
backend** — "a running service with real persistence and logic, not a UI over mocked data" —
in roughly half a day. It names the team's own stack (Kotlin/Spring, Next.js/React) as "a
plus" but not a requirement, and says to ship in whatever is fastest.

MeowPay needs, at minimum: an authenticated human, persistent wallets, an atomic transfer,
and a UI that can drive it. It also wants realtime and an agentic composer, which pull toward
a managed platform rather than hand-rolled infrastructure.

## Decision

**Next.js (App Router, TypeScript) + Kotlin/Spring Boot + Supabase (hosted) Postgres**, wired
with Docker Compose.

- **Backend:** Spring Boot / Kotlin — `starter-web`, `oauth2-resource-server`,
  `starter-jdbc` with `JdbcClient`, `postgresql`, `jackson-module-kotlin`. A JWT-protected
  resource server over `/api/**`. **It owns no auth endpoints** (see
  [0011](0011-auth-boundary.md)).
- **Frontend:** Next.js App Router + Tailwind + shadcn/ui + `@supabase/ssr`.
- **Database:** Supabase hosted Postgres, reached over JDBC via the **Session Pooler**
  connection string.
- **Persistence access:** `JdbcClient` against SQL and plpgsql functions — no JPA/Hibernate.

The centre of gravity is deliberately **in the database**: the transfer is a plpgsql function
([0008](0008-atomic-plpgsql-transfer.md)), the authorization boundary is RLS
([0012](0012-rls-ownership-subquery.md)), and realtime is `postgres_changes`
([0013](0013-realtime-scoping-via-rls.md)). Kotlin is a thin, trusted, JWT-validating caller.

## Consequences

- Both of the team's named stacks are exercised, which shortens the walkthrough.
- Supabase supplies auth, realtime and Postgres as one unit — three things not hand-built
  inside the time budget, and each real rather than mocked.
- **Two runtimes to run and package.** Compose is mandatory rather than a nicety, and there
  are two Dockerfiles ([0019](0019-deployment-topology.md)).
- **The Session Pooler string is not optional.** Supabase's direct `:5432` endpoint is
  IPv6-only on free tiers and fails silently from an IPv4 Docker host — a failure that looks
  like a hang, not an error. Recorded because it costs an hour to rediscover.
- `JdbcClient` means SQL is written by hand and result mapping is explicit. For this schema
  that is a feature; for a large domain model it would be a cost.
- The browser talks to Kotlin directly at `localhost:8080`, so **CORS must allow the frontend
  origin**. There is no BFF proxy.

## Alternatives considered

**Next.js API routes only — drop Kotlin.** One runtime, one Dockerfile, faster. Rejected:
the brief names Kotlin/Spring as the team's backend and says using their stack is a plus, and
a walkthrough of a fullstack take-home is better served by a real service boundary than by a
monolith. The cost is honest — a second runtime — and it buys the thing being assessed.

**Kotlin owns auth too (Spring Security with its own user table).** Rejected: it duplicates
identity in two places, and every hour spent on password reset and session handling is an hour
not spent on the ledger, which is what the brief actually rewards. See
[0011](0011-auth-boundary.md).

**JPA / Hibernate.** Rejected: the money-movement core is a single plpgsql function called
once per transfer, and the read model is a handful of flat queries. An ORM adds a mapping
layer, a session/flush lifecycle and lazy-loading semantics over a schema that never needs
them — and it actively obscures the one thing that must stay explicit: exactly which statement
runs, in what order, holding which locks.

**Local Postgres in Compose instead of hosted Supabase.** Simpler to run offline and no
signup. Rejected: it discards GoTrue and Realtime, which would then have to be hand-built or
faked — and "realtime by default" and magic-link auth are both in scope. Testcontainers gives
the backend tests a real local Postgres anyway, so the local-database benefit is retained
where it matters.

**Ktor instead of Spring Boot.** Lighter and Kotlin-native. Rejected: the team works in
Spring, `oauth2-resource-server` gives JWT validation in configuration rather than code, and
the ramp for a reviewer is shorter.
