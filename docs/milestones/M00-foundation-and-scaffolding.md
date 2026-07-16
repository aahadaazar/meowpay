# M0 — Foundation & scaffolding

**Type:** enabler · **Status:** done · **ADR:** [0001](../adr/0001-stack-and-topology.md)

## Scope

Repo layout and both runtimes wired to boot, with no feature behind them yet.

- Repo layout: `backend/`, `frontend/`, `supabase/migrations/`, `docs/adr/`, `docs/design/`,
  `docker-compose.yml`, a README stub.
- **Backend:** Spring Boot Kotlin skeleton (Gradle Kotlin DSL) — `starter-web`,
  `oauth2-resource-server`, `starter-jdbc` + `JdbcClient`, `postgresql`,
  `jackson-module-kotlin`, `kotlin-reflect`. `SecurityConfig` gating `/api/**` on a valid JWT,
  plus CORS for the frontend origin.
- **Frontend:** Next.js App Router + TypeScript + Tailwind + shadcn/ui + `@supabase/ssr`.
- `.env.example`, `application.yml`.

## Tests

- **Backend:** Spring context loads; an unauthenticated request to `/api/**` returns 401.
- **Frontend:** the root layout renders.

## Verify

Both apps boot locally; the backend rejects an unauthenticated request; the frontend renders an
empty shell.

## Progress log

- 2026-07-15 — started. M0 selected as first eligible milestone; scaffolding beginning from ADR 0001.
- 2026-07-15 — done. Commits e2253c5..4ed34d4. Tests authored but not run per milestone method. Verify step not runnable in this environment: no Java, no Node/npm, no `.env` credentials, and `docker compose` was not run because it requires user input.
- 2026-07-15 — **backend verified: 2 tests, 0 failures** — the context loads and `/api/**` rejects an
  unauthenticated request. Both tests had to be rewritten first, because **M3 invalidated this
  milestone's central premise**: they excluded `DataSourceAutoConfiguration` to assert the app boots
  with no database, but M3's `CatService` constructor-injects `JdbcClient`, so the context could no
  longer build. MeowPay is a database-backed service and genuinely cannot start without a DB — the
  premise was obsolete, not the code. Both context tests now run against Testcontainers Postgres,
  matching how the app actually runs, and `database verifier is skipped when no datasource is
  configured` was **deleted**: `DatabaseConnectionVerifier` is `@ConditionalOnBean(JdbcClient::class)`,
  so it asserted a state that can no longer occur. (Decision recorded with the user; the rejected
  alternative — making services `@ConditionalOnBean` so the app boots degraded without its ledger —
  would have shaped production wiring around a test premise.) Frontend half of verify (app boots) is
  still outstanding; frontend tests deferred.
- 2026-07-16 — frontend suite run (Node.js became available this session). All 12 vitest files
  pass, 24 tests, 0 failures — see [CHECKLIST.md](CHECKLIST.md) for the five harness bugs fixed
  to get there. The frontend app-boot half of verify still needs a browser, which remains
  unavailable in this environment.
