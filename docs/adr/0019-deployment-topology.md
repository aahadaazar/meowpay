# 0019. Deployment topology — two containers, hosted database, Compose

**Status:** Accepted · **Date:** 2026-07-15 · **Milestone:** [M10](../milestones/M10-dockerization-and-readme.md)

## Context

The brief's check is explicit:

> *The repo is public and runs from a fresh clone following your README.*

That is a pass/fail gate, and it is assessed on a reviewer's machine, not ours. Whatever the
architecture is, `docker compose up --build` has to produce a working app for someone who has
never seen the repo.

The stack is two runtimes plus a hosted Postgres ([0001](0001-stack-and-topology.md)).

## Decision

**Two containers via Docker Compose, against hosted Supabase. Multi-stage builds for both.**

```yaml
backend:   build ./backend, port 8080
           SUPABASE_DB_URL          # Session Pooler string — IPv4
           SUPABASE_JWT_SECRET
           GROQ_API_KEY
           GROQ_INSIGHT_MODEL=llama-3.3-70b-versatile
           TOPUP_MAX=1000
           CORS_ALLOWED_ORIGIN=http://localhost:3000

frontend:  build ./frontend, port 3000
           NEXT_PUBLIC_SUPABASE_URL
           NEXT_PUBLIC_SUPABASE_ANON_KEY
           NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
```

- **Backend:** `temurin:21-jdk` builds → `temurin:21-jre` runs. The **Gradle wrapper is
  committed**, so the build does not depend on a Gradle on the host.
- **Frontend:** `next build` with **`output: 'standalone'`** — Next traces its actual
  dependencies into a self-contained server, so the runtime image carries neither `node_modules`
  nor the build toolchain.
- **Database:** hosted Supabase. Not containerized.

Three things that look like details and are not:

**`SUPABASE_DB_URL` must be the Session Pooler string.** Supabase's direct `:5432` endpoint is
**IPv6-only on free tiers**, and an IPv4 Docker host fails to reach it — as a *hang*, not an
error. This is the single most likely way a clean clone fails for a reviewer, and it costs an
hour to diagnose from scratch. The Session Pooler is IPv4 and is what `.env.example` shows.

**`NEXT_PUBLIC_BACKEND_URL` is a browser URL, not a Compose service name.** The client components
call Kotlin **from the browser**, so `http://backend:8080` — correct inside the Compose network —
resolves to nothing on the user's machine. It has to be `localhost:8080`. Which is also why
**CORS must allow the frontend origin**: it is a genuine cross-origin request, not an
implementation detail to be waved away.

**`GROQ_API_KEY` exists only in the backend container.** No `NEXT_PUBLIC_` prefix, ever — that
prefix means "inline this into the JavaScript bundle" ([0017](0017-groq-model-split.md)).

## Consequences

- **`docker compose up --build` from a clean clone works**, which is the gate.
- Runtime images carry no build toolchain: a JRE and a traced Node server.
- **Supabase is a prerequisite, not a container.** The README's run-from-clean-clone path is:
  create a Supabase project → apply the migrations → fill `.env` → `docker compose up`. That is
  more setup than a purely local stack, and it is the honest cost of using hosted auth, realtime
  and Postgres ([0001](0001-stack-and-topology.md)).
- **The app is not runnable fully offline.** Auth, realtime, database and Groq are all network
  dependencies. The backend test suite is not: Testcontainers runs a real Postgres with the real
  migrations locally.
- Migrations are applied **by the operator**, not by the app at boot. Deliberate: a service that
  migrates on startup races itself across replicas and makes a rollback a code deploy. The
  trade-off is one more README step.
- `.env.example` documents every variable. Nothing is defaulted to a working value in code —
  a missing variable should fail at startup, not silently pick something.

## Alternatives considered

**Add Postgres to Compose; run Supabase locally.** Fully self-contained, offline, no signup, and
the reviewer's fastest path. The strongest alternative. Rejected: a bare Postgres container is not
Supabase — no GoTrue, no Realtime — so auth ([0011](0011-auth-boundary.md)) and the realtime
subscription ([0013](0013-realtime-scoping-via-rls.md)) would have to be faked, and both are in
scope. The full local Supabase stack is ~8 containers and its own CLI, which is a heavier ask of a
reviewer than a project signup and worse to debug when it breaks.

**Single container running both runtimes** (supervisord, or Next.js proxying to an embedded JVM).
One image, one port, no CORS. Rejected: it merges two independent lifecycles into one restart
unit, doubles the image, and hides the service boundary that the architecture is *about*. CORS is
one config line, not a reason to fuse two services.

**Next.js `rewrites` proxying `/api` to the backend.** Removes CORS entirely and makes
`NEXT_PUBLIC_BACKEND_URL` internal — genuinely tidy. Rejected for this slice: it puts the Next
server on the hot path for every backend call, so a browser request to Kotlin becomes two hops,
and it obscures the fact that Kotlin is a real independent service. It is the right call behind a
single origin in production; here it would hide the topology being demonstrated.

**Deploy to Vercel + Fly/Railway with a live URL.** More impressive than a local run. Rejected:
the brief asks for a repo that runs from a clean clone, not a hosted demo. A live URL is not a
substitute for a working `docker compose up`, and hosting adds a deploy pipeline to a half-day
slice.

**No Docker; README says `./gradlew bootRun` and `npm run dev`.** Less machinery. Rejected: it
pushes a JDK 21 and a Node version onto the reviewer, and "works on my machine" is precisely what
the clean-clone check is testing. Compose makes the runtime a property of the repo.

**Bake env vars into the images.** Rejected: secrets in layers, and the image stops being
portable across environments. `.env` at compose time; nothing secret in a build.
