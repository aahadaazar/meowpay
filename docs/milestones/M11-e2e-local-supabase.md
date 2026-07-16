# M11 — e2e suite against local Supabase

**Type:** tooling · **Status:** done
**ADR:** [0020](../adr/0020-e2e-against-local-supabase.md)

## Why this milestone exists

The Playwright e2e suite (`e2e/`, built and run for the first time during this milestone's
predecessor work) drives the real app against the **live hosted** Supabase project. Every test
mints a fresh human via the Supabase admin API and nothing is ever torn down. Repeated local runs
while diagnosing and fixing bugs the suite itself surfaced — several hundred admin-API calls in one
session — hit Supabase's admin-API rate limit mid-session (`Request rate limit reached`), at which
point the suite stops giving a trustworthy pass/fail signal. Full findings and the incident that
prompted this are recorded in
[CHECKLIST.md](CHECKLIST.md#e2e-suite-run-against-the-live-stack-2026-07-16). See
[ADR 0020](../adr/0020-e2e-against-local-supabase.md) for the decision and rejected alternatives
(teardown+throttle against hosted; switching the *whole* dev stack to local).

## Scope

**e2e-only.** Normal day-to-day development (`docker compose up`, `npm run dev`, manual QA against
real-ish data) keeps using the hosted project in `.env`, completely unchanged.

- Stand up a local Supabase instance via the Supabase CLI (`supabase start`) for e2e use.
- Apply `supabase/migrations/0001`–`0007` against the local instance (same files used against
  hosted; either the Supabase CLI's own migration runner or the existing `psql`-over-container
  approach already used for the hosted project).
- A new env file (`e2e/.env.e2e` or equivalent) carrying local Supabase's URL, anon key, and
  service-role key — the Supabase CLI prints fixed, well-known local development keys; document
  them the way `.env.example` documents the hosted ones.
- A way to bring the backend + frontend up pointed at local Supabase **only for an e2e run** —
  a compose override or a separate `--env-file` invocation — without touching the default
  `docker-compose.yml` / `.env` path used for everyday dev.
- Update `e2e/README.md`'s Setup section to document the local-first workflow as the default for
  local iteration, while leaving the hosted-project path documented as still valid (e.g. for a
  one-off check against real project config).
- Document `supabase db reset` as the standard way to clear local state between iterations — free
  and instant, unlike the hosted project where teardown was rejected as not worth building
  (ADR 0020).
- No product code changes. This milestone touches test tooling and docs only.

## Tests

Not applicable in the usual "backend/frontend unit tests, authored alongside" sense — this
milestone is test infrastructure, not a product feature. The e2e suite itself is what's being
retargeted; there's nothing further to write tests for.

## Verify

- Run the full e2e suite twice back-to-back against local Supabase with **zero** rate-limit
  errors on either run.
- Confirm `supabase db reset` between the two runs actually clears local state (fresh humans/cats
  again on the second run, not accumulated from the first).
- Confirm the hosted project's data is untouched by an e2e run once this milestone is done (no new
  test humans land there).
- Confirm `docker compose up` / `npm run dev` (no e2e env override) still targets the hosted
  project exactly as before — this milestone must not change the default dev path.

## Progress log

- 2026-07-16 — started. Retargeting e2e infrastructure to an isolated local Supabase instance.
- 2026-07-16 — done. Added the local Supabase CLI configuration, committed local e2e env,
  compose env-file switch, and local-first runbook. Compose resolution was verified for the local
  and default paths. The live verify step was not runnable: this environment has Docker but no
  Supabase CLI (or host Node runtime), so it cannot start or reset local Supabase or run Playwright.
