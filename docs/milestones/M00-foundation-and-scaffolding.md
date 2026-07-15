# M0 — Foundation & scaffolding

**Type:** enabler · **Status:** not started · **ADR:** [0001](../adr/0001-stack-and-topology.md)

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

- not started
