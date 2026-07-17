# 0020. e2e suite targets a local Supabase instance, not the hosted project

**Status:** Rejected (2026-07-17) · **Date:** 2026-07-16 · **Milestone:** [M11](../milestones/M11-e2e-local-supabase.md)

**Rejected, recorded 2026-07-17:** implemented, then reverted. Decided out of scope for the
current work — not worth the added local-Supabase-CLI dependency right now. The reasoning below
(the rate-limit incident, the decision, the rejected alternatives) is left intact as the record;
it simply wasn't acted on further. See [M11](../milestones/M11-e2e-local-supabase.md)'s progress
log.

## Context

The Playwright suite in `e2e/` (see [`e2e/README.md`](../../e2e/README.md)) drives the real
frontend + backend against **the live hosted Supabase project** in `.env`. Every test mints a
brand-new human via the Supabase **admin API** (`auth.admin.createUser` + `generateLink`, through
`frontend/app/api/test/login/route.ts`), and most tests also create one or more cats. Nothing is
ever deleted — this deliberately matches the product's own append-only ledger model (ADR
[0009](0009-idempotency-and-status.md)), not an oversight.

That's fine for a single run. It broke down under real local iteration: this session ran the suite
(fully or nearly-fully) seven-plus times while diagnosing and fixing bugs the suite itself
surfaced, plus dozens of isolated single-test reruns — several hundred admin-API calls against one
project in a few hours. Supabase's admin API has its own rate limit, separate from normal traffic,
and it started rejecting logins mid-session:
`Test login failed (500): {"message":"Request rate limit reached"}`. At that point the suite stops
producing a trustworthy signal — failures become indistinguishable between "real bug" and
"exhausted the hosted project's quota for the next while."

Two compounding properties made this worse than it looks:
- **No teardown.** Every run's humans/cats/wallets/ledger rows persist in the hosted project
  forever, so the project accumulates test junk indefinitely regardless of the rate limit.
- **Full parallelism.** `playwright.config.ts` sets `fullyParallel: true`; by default that's up to
  one worker per CPU core, all hitting the admin API at once.

## Decision

**Point the e2e suite at a local Supabase instance (`supabase start`, the Supabase CLI) for local
development iteration, scoped to `e2e/` only.** Day-to-day development — `docker compose up`,
`npm run dev`, manual QA — keeps using the hosted project in `.env`, unchanged. This is additive: a
separate env file (`e2e/.env.e2e` or equivalent) and a separate compose invocation point the
backend + frontend at local Supabase *only while e2e is running*; nothing about the normal dev
loop changes.

This does not contradict ADR [0019](0019-deployment-topology.md)'s rejection of a local Supabase
stack — that ADR is about the **product's shipped runtime topology**, what a reviewer's
`docker compose up --build` boots from a clean clone. This decision is about the **maintainer's
local test-iteration loop**, a different concern with a different audience. 0019's reasoning (a
local Supabase stack is a heavier ask of a reviewer than a project signup) doesn't apply to a
developer who's already running Docker for everything else in this repo.

## Consequences

- **No more hosted rate-limit exposure from local iteration.** Local Supabase's GoTrue has no such
  admin-API throttle — the suite can be run as many times as needed while debugging.
- **Free, instant teardown.** `supabase db reset` drops and replays every migration in seconds,
  replacing "delete N test humans through a rate-limited admin API" with one command. Because it's
  free, teardown becomes practical to run between iterations even though the hosted-project append-
  only philosophy never required it there.
- **New setup dependency:** the Supabase CLI, on top of the Docker Compose stack already required.
- **A new env file is needed** (`e2e/.env.e2e` or equivalent) carrying local Supabase's URL and
  keys — the Supabase CLI prints fixed, well-known local development keys; these are not secrets
  and are safe to commit to `.env.example`-style documentation.
- **Migrations must be applied locally too**, via the same `supabase/migrations/*.sql` files —
  either through the Supabase CLI's migration runner or the existing `psql`-over-container approach
  already used for the hosted project (see [CHECKLIST.md](../milestones/CHECKLIST.md)).
- **Local GoTrue defaults to HS256-signed JWTs**, not the ES256/JWKS mode the hosted project
  actually uses (see the e2e finding recorded in
  [CHECKLIST.md](../milestones/CHECKLIST.md#e2e-suite-run-against-the-live-stack-2026-07-16)).
  `SecurityConfig.kt` already handles either mode (fixed this session), so this doesn't block
  anything — but it does mean local e2e runs alone won't exercise that specific signing-mode code
  path. Worth knowing, not a reason to avoid this decision.
- **Out of scope here:** what a CI pipeline or a reviewer should target. This milestone only
  changes the maintainer's local loop; a follow-on decision can address CI once one exists.

## Alternatives considered

**Add teardown + throttling, keep targeting the hosted project.** Delete each run's test humans
afterward via the admin API, and rate-limit `loginAsNewHuman` calls so parallel workers don't burst
the admin API at once. Genuinely helps the data-accumulation problem, but doesn't remove the
underlying constraint: teardown happens *after* a run, so it can't prevent hitting the rate limit
*during* a heavy iteration session — exactly what happened here. Worth doing eventually as defense
in depth, but doesn't solve the actual problem on its own.

**Switch the whole dev stack to local Supabase (not just `e2e/`).** One environment everywhere, no
context-switching between "which Supabase am I pointed at." Rejected for now: bigger blast radius —
it removes the easy "check this against real hosted data" sanity check during normal manual
development, and would require re-verifying the *entire* app (not just the e2e-covered paths)
behaves identically against local Supabase's defaults. Revisit if local-vs-hosted drift ever
becomes a recurring problem.

**Do nothing; just run the suite less often / wait out rate limits.** Costs real iteration speed
during exactly the moments (chasing a flaky bug) where fast re-runs matter most — this session's
own realtime-crash investigation needed several back-to-back reruns to catch an intermittent
failure. Rejected.
