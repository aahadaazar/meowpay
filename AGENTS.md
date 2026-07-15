# AGENTS.md — how to execute MeowPay from its docs

This file is the operating manual for turning `docs/milestones/` into working code. It answers
"what do I do next and how do I know it's done" — not "why is it built this way," which is what
the ADRs are for.

**Three documents, three jobs. Don't blur them.**

| Document | Answers | Edit when |
|---|---|---|
| `docs/adr/000N-*.md` | *Why* — the decision and its rejected alternatives | a decision changes (see [Updating an ADR](#updating-an-adr-mid-implementation)) |
| `docs/milestones/M0N-*.md` | *What, and in what order* — scope, tests, verify step | status changes; scope is discovered to be wrong |
| `AGENTS.md` (this file) | *How* — the execution loop, tracking, guardrails | the process itself changes |

**Nothing has been implemented yet.** `backend/`, `frontend/`, `supabase/migrations/` do not
exist. M0 creates them. Everything below assumes you're picking this up cold.

---

## Before you write any code

1. Open [`docs/MILESTONES.md`](docs/MILESTONES.md). Confirm the milestone you're about to work
   on has all its dependencies (below) marked `done`.
2. Read that milestone's file in `docs/milestones/` in full.
3. Read **every ADR it links, in full** — not skimmed. Milestone docs summarize; ADRs carry the
   actual schema, function signature, endpoint contract, and the reasoning that stops you from
   re-deciding something already argued through. If a milestone doc and an ADR appear to
   disagree, the ADR wins — the milestone doc is a summary of it.
4. If the milestone touches UI: read `DESIGN.md` for tokens/components and
   [`docs/design/APP-EXTENSIONS.md`](docs/design/APP-EXTENSIONS.md) for anything product-surface
   (dark mode, charts, tables, dialogs, badges, fluid type). shadcn's raw defaults are cool-gray
   and violate the system on sight — re-tokenize before building the first component, not after.
5. Only then write code.

## Milestone dependency order

The milestone numbers are already a valid execution order — work M0 → M10 in sequence. The table
is the *why*, for when you need to know if something can start early or what breaks if skipped:

| Milestone | Depends on | Because |
|---|---|---|
| M0 | — | first |
| M1 | M0 | tokenizes the Next.js app M0 scaffolds |
| M2 | M0 | runs migrations against the Supabase project M0 wires up |
| M3 | M0, M2 | auth needs the schema + RLS policies M2 creates |
| M4 | M3 | subscribes to a logged-in human's cats |
| M5 | M2, M4 | needs `execute_transfer` (M2) and a dashboard to watch it land on (M4) |
| M6 | M4 | preset pills live on the cat card M4 built |
| M7 | M4 | derives from the same ledger window the trail (M4) holds |
| M8 | M3, M5 | reuses the `confirm-transfer-dialog` M5 built |
| M9 | M2, M3 | summarizes the ledger (M2) for an authenticated human (M3) |
| M10 | all of the above | packages the finished slice |

M1 and M2 are mutually independent (both only need M0) — if working with parallel agents, they
can run concurrently. A single agent should still do them in numeric order: it's simpler, and it
makes the commit history read as one throughline, which is what the brief's "the history is part
of what we read" rewards.

## The per-milestone execution loop

For milestone `MN`:

1. **Mark it `in progress`** — in `docs/MILESTONES.md`'s Status column and in `MN`'s own file
   header. Do this before writing code, not after, so a session that gets interrupted leaves an
   honest trail.
2. **Read** — per [Before you write any code](#before-you-write-any-code) above.
3. Break the milestone's scope into a short task list with `TodoWrite` for this session. That
   list is session-local scaffolding; it doesn't need to survive across sessions — the milestone
   doc and the commits are the durable record (see [Tracking](#tracking)).
4. **Implement.** Write backend and frontend tests *alongside* the code, per the milestone
   doc's Tests section. Write them; **do not run them unless asked** — this is the method the
   plan was built on, not a one-off preference.
5. **Attempt the Verify step.** If the environment can actually run it (a live Supabase project,
   filled `.env`, both services up), run it and record the result. If it can't be run in this
   environment (no Supabase project configured, no Groq key), **say so explicitly** rather than
   marking it passed — the same rule the harness already applies to UI changes applies here.
6. **Commit as you go** — see [Commit discipline](#commit-discipline). A milestone is several
   commits, not one.
7. **Mark it `done`** in both places, and append one line to the milestone file's Progress log
   (see [Tracking](#tracking)).
8. Move to the next milestone whose dependencies are now satisfied.

Stay inside the milestone's stated boundary. If implementing M5 surfaces something M8 will need,
note it in M8's file — don't build it early. A milestone that quietly grows scope is exactly what
"a few things done with care... than ten things half-wired" argues against.

## Tracking

No separate tracker, state file, or database — **the milestone docs plus git history are the
tracker**, kept in two places that must agree:

1. **`docs/MILESTONES.md`**'s Status column — `not started` / `in progress` / `done`.
2. **Each milestone file's own header** — same three values, same field.

Once work starts on a milestone, add a `## Progress log` section (append-only, most recent last):

```markdown
## Progress log
- 2026-07-16 — started. Migrations 0001–0004 drafted; TransferService stubbed.
- 2026-07-17 — done. Commits 3f9a2c1..8b7e4d0. Verify step run manually against a
  scratch Supabase project: happy path, insufficient-funds, and idempotency replay
  all behaved as specced.
```

`done` means: implementation complete, tests written (not necessarily run), and the Verify step
either passed or explicitly recorded as unrunnable in this environment and why.

## Commit discipline

The brief: *"Commit as you go — don't squash into one commit. The history is part of what we
read."* This applies harder to code than to docs, since it's the part being reviewed most
closely.

- **One commit per coherent unit of work**, not one per milestone: a migration, a service class
  with its tests, a component, a wiring change. A milestone should read as a short series of
  commits that build on each other, the way M0001–0005, M0006–0010, etc. did for the ADRs.
- **Conventional commits, scoped to the milestone:** `feat(m2): add execute_transfer function`,
  `test(m2): reconciliation and conservation invariants`, `fix(m3): getUser() not getSession()
  in middleware`.
- Never bundle two milestones into one commit.
- A passing Verify step is not itself a commit — it's a line in the Progress log.

## Non-negotiables — check before marking a milestone `done`

Pulled forward from the ADRs because they're the properties most likely to *look* fine while
being broken. This list is not a substitute for reading the ADRs — it's what to double-check
once the happy path already works.

- **No client-facing INSERT/UPDATE grants** on any table. Every write goes through a `SECURITY
  DEFINER` function or the trusted backend connection.
  ([0006](docs/adr/0006-ledger-first-money-movement.md),
  [0012](docs/adr/0012-rls-ownership-subquery.md))
- **Ownership is checked server-side on every money endpoint**, from a client-supplied
  `senderCatId` — the single most likely place to introduce a hole.
  ([0010](docs/adr/0010-actor-vs-account.md), [0012](docs/adr/0012-rls-ownership-subquery.md))
- **`execute_transfer` failures are INSERTed, never RAISEd** — a raised exception rolls back the
  audit row it was supposed to keep. ([0008](docs/adr/0008-atomic-plpgsql-transfer.md))
- **The idempotency key is generated when the confirm dialog opens**, not per HTTP request — a
  key minted per-request makes the whole guarantee a no-op.
  ([0009](docs/adr/0009-idempotency-and-status.md))
- **`/composer/parse` never writes to the database.** Test this directly; don't infer it from
  "the code doesn't call the write path." ([0016](docs/adr/0016-agent-proposes-human-confirms.md))
- **Model-supplied cat identifiers are discarded, not validated**, in the insight tool call —
  the query is always scoped from the JWT, never from a tool argument.
  ([0018](docs/adr/0018-tool-use-data-scoping.md))
- **`GROQ_API_KEY` never carries a `NEXT_PUBLIC_` prefix.** That prefix inlines it into the
  browser bundle. ([0017](docs/adr/0017-groq-model-split.md))
- **Middleware uses `getUser()`, never `getSession()`** — the latter trusts the cookie without
  revalidating it. ([0011](docs/adr/0011-auth-boundary.md))
- **Chart series colors come only from the validated palette** in `APP-EXTENSIONS.md` — never a
  new hex typed in because it "looks close enough."
  ([0004](docs/adr/0004-chart-palette-derivation.md))
- **`transfers.source` values `topup` and `welcome_grant` are server-only** — `/transfers/execute`
  must reject them from a client. ([0014](docs/adr/0014-topup-as-treasury-transfer.md))

## Implementation-time checks

Things no document can settle in advance — they need the actual running system, and each is
tied to the milestone that first makes it checkable:

- **M3:** confirm Supabase's actual JWT signing mode (HS256 vs JWKS) in the project's Auth
  settings before writing `SecurityConfig` — don't assume HS256.
- **M3/M4:** verify RLS by hand with **two humans** — reads and realtime both. No cross-human
  leakage; the treasury invisible to both.
- **M4:** confirm the deployed Realtime version's filter support for the multi-cat subscription
  (`in.(…)` availability has moved between versions).
- **M1 and again at M7:** run `scripts/validate_palette.js` in both modes before shipping any
  chart that uses a new slot — the palette in `APP-EXTENSIONS.md` covers what was derived, not
  every possible future addition.
- **M1 onward, whenever a layout changes:** render the dashboard at 375 / 768 / 1440px, both
  themes, and actually look at it. The validator checks color, not layout.
- **M10:** run `docker compose up --build` from an actually-clean clone (a fresh checkout in a
  scratch directory), not just a rebuild of the working tree.

## Updating an ADR mid-implementation

An ADR marked "Accepted" is not immutable — it's the record of a decision made with the
information available at the time. If implementation reveals the premise was wrong (e.g.,
[0011](docs/adr/0011-auth-boundary.md) assumed a signing mode that turns out not to match the
project), that's new information, not a violation:

- **Minor correction** (a fact was wrong, the decision stands) — edit the ADR in place, and say
  so plainly: *"Correction, recorded during M3 implementation: ..."* Don't silently rewrite
  history as if the ADR always said this.
- **The decision itself reverses** — leave the old ADR as `Status: Superseded by 00NN`, and write
  a new ADR with the same rigor (Context / Decision / Consequences / Alternatives) explaining
  what changed and why. Never delete a decision record; supersede it.

What you must never do is quietly diverge from a written decision while leaving the ADR reading
as if it's still followed. The whole point of the ADR set is that a reviewer can trust it against
the code.

## Quick reference

**Backend endpoints** (all `/api`, all JWT-protected, no auth endpoints) — full list in
[`docs/MILESTONES.md`](docs/MILESTONES.md#backend-endpoints-all-api-all-jwt-protected-no-auth-endpoints).

**Repo layout** (from [0001](docs/adr/0001-stack-and-topology.md) /
[0019](docs/adr/0019-deployment-topology.md)):

```
DESIGN.md · AGENTS.md · docs/{design,adr,milestones}/ ; docker-compose.yml

backend/src/main/kotlin/com/meowpay/
  MeowPayApplication.kt
  config/{SecurityConfig.kt, GroqConfig.kt}
  web/{MeController.kt, CatController.kt, TransferController.kt, WalletController.kt,
       ComposerController.kt, InsightController.kt}
  service/{TransferService.kt, CatService.kt, OwnershipGuard.kt}
  agent/{GroqClient.kt, ComposerAgent.kt, InsightAgent.kt}
  dto/ ; exception/GlobalExceptionHandler.kt
backend/src/test/kotlin/...              # Testcontainers Postgres, real migrations

frontend/
  middleware.ts
  app/{layout.tsx, globals.css, (auth)/login/page.tsx, auth/callback/route.ts, dashboard/page.tsx}
  components/
    theme-provider.tsx, theme-toggle.tsx
    total-hero.tsx, cat-card.tsx, new-cat-dialog.tsx, topup-presets.tsx, ledger-trail.tsx
    charts/{treat-flow-chart.tsx, top-recipients-chart.tsx, derive.ts}
    transfer-composer/{manual-transfer-form.tsx, nl-composer.tsx, confirm-transfer-dialog.tsx}
    insight-panel.tsx
  lib/supabase/{client.ts, server.ts, middleware.ts}, lib/api.ts, lib/types.ts
  hooks/{use-realtime-wallets.ts, use-realtime-ledger.ts, use-cats.ts}

supabase/migrations/
  0001_init_schema.sql · 0002_transfers_and_ledger.sql · 0003_execute_transfer_function.sql
  0004_create_cat_function.sql · 0005_rls_policies.sql · 0006_new_user_trigger.sql
  0007_realtime_publication.sql
```

**Env vars** (full argument for each in the linked ADR):

```
backend:   SUPABASE_DB_URL          # Session Pooler string — IPv4 (0001, 0019)
           SUPABASE_JWT_SECRET      # (0011)
           GROQ_API_KEY             # backend only, never NEXT_PUBLIC_ (0017)
           GROQ_COMPOSER_MODEL=llama-3.1-8b-instant     (0017)
           GROQ_INSIGHT_MODEL=llama-3.3-70b-versatile   (0017)
           TOPUP_MAX=1000           # (0014)
           CORS_ALLOWED_ORIGIN=http://localhost:3000

frontend:  NEXT_PUBLIC_SUPABASE_URL
           NEXT_PUBLIC_SUPABASE_ANON_KEY
           NEXT_PUBLIC_BACKEND_URL=http://localhost:8080   # a browser URL, not a
                                                            # Compose service name (0019)
```

## What not to do

- Don't edit `DESIGN.md`. Extensions go in `docs/design/APP-EXTENSIONS.md`, with an ADR.
- Don't build UI before reading `APP-EXTENSIONS.md` — the shadcn defaults are wrong on arrival.
- Don't skip an authorization test because the happy path "obviously" works — every money
  endpoint's ownership check exists because it's a new, client-supplied trust boundary
  ([0010](docs/adr/0010-actor-vs-account.md)), and it's the thing most likely to be quietly
  broken by a later refactor.
- Don't run the test suites unless asked — write them, leave them, per the stated method.
- Don't invent scope beyond a milestone's stated boundary, even when the extra piece looks small.
- Don't silently diverge from an ADR's decision — see
  [Updating an ADR mid-implementation](#updating-an-adr-mid-implementation).
- Don't mark a milestone `done` with an unrun Verify step and no note explaining why.

---

M10's README should link this file as the answer to "how did Claude Code build the repo" — this
is the actual loop that was followed, not a reconstruction after the fact.
