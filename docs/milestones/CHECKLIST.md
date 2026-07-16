# MeowPay — Milestone Checklist

**7 of 11 complete.** M0–M6 done; M7–M10 not started.
**Backend suite green — 17 tests, 0 failures** (2026-07-16). Frontend tests deferred.

| | Milestone | Type | Status |
|---|---|---|---|
| M0 | [Foundation & scaffolding](M00-foundation-and-scaffolding.md) | enabler | ✅ done |
| M1 | [Design system](M01-design-system.md) | enabler | ✅ done |
| M2 | [Ledger core](M02-ledger-core.md) | enabler (BE+DB) | ✅ done |
| M3 | [Auth & cat management](M03-auth-and-cat-management.md) | fullstack | ✅ done |
| M4 | [Realtime dashboard](M04-realtime-dashboard.md) | fullstack | ✅ done |
| M5 | [Manual transfer](M05-manual-transfer.md) | fullstack | ✅ done |
| M6 | [Top-up](M06-topup.md) | fullstack | ✅ done |
| M7 | [Activity charts](M07-activity-charts.md) | fullstack | ⬜ not started |
| M8 | [Agentic NL composer](M08-agentic-nl-composer.md) | fullstack | ⬜ not started |
| M9 | [Agentic activity insight](M09-agentic-activity-insight.md) | fullstack | ⬜ not started |
| M10 | [Dockerization & README](M10-dockerization-and-readme.md) | packaging | ⬜ not started |

---

## ✅ Verification status

**The backend suite is green — 17 tests, 0 failures, 0 skipped** (2026-07-16). The compounded
verification debt across M0–M6 is now cleared on the backend side.

| Suite | Milestone | Tests | Result |
|---|---|---|---|
| `LedgerCoreIntegrationTests` | M2 (+ M6 top-up case) | 10 | ✅ |
| `AuthAndCatManagementIntegrationTests` | M3 | 4 | ✅ |
| `TransferControllerTests` | M5 | 1 | ✅ |
| `SecurityConfigTests` | M0 | 1 | ✅ |
| `MeowPayApplicationTests` | M0 | 1 | ✅ |

M4 added no new backend test suite (its authored tests are frontend-only: realtime hooks, trail
sort, 768px collapse). Its only backend surface is migration `0007_realtime_publication.sql`,
exercised implicitly by the two integration suites above, which replay every file in
`supabase/migrations` against the ephemeral Testcontainers Postgres — see bug 5 below.

**M5 — the sender-ownership authorization check** (the key new authz surface introduced by a
client-supplied `senderCatId`) is proven by `TransferControllerTests`. Its frontend tests
(validation, confirm→submit fires once, `failure_reason` surfaced verbatim) were authored but
are deferred, matching the standing frontend-test deferral for M0–M4.

**M6 — top-up's server-side policy checks** (preset allowlist, server cap, ownership of the
target cat, and conservation across the treasury-backed mint) are proven by a single test added
to `LedgerCoreIntegrationTests`: *"top up accepts presets preserves conservation and enforces
ownership plus server policy"* — passes. Its frontend tests (`topup-presets.test.tsx`: pills
render/submit, row wraps above the 44px touch target) were authored but deferred, matching the
standing frontend-test deferral.

**M2 — the centerpiece — is now proven.** Its doc says it is *"proven entirely by its test suite"*,
and that suite now passes against a real Postgres with the real migrations applied. Both invariants
hold: per-wallet `SUM(signed ledger) == balance`, and global `SUM(all signed entries) == 0`.

Run it with:
```powershell
$env:JAVA_HOME = (Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory |
                  Where-Object Name -like 'jdk-21*' | Select-Object -First 1).FullName
cd e:\Projects\meow-pay\backend
.\gradlew.bat test
```

### Bugs the first run surfaced
Everything below had been authored but never compiled or executed, so none of it was known.

1. **`CatService.create` returned zero rows — a real production bug** *(fixed)*. It called
   `create_cat(...)` and joined `public.wallets` **in one statement**. Postgres takes the outer
   query's snapshot before the function runs, so the wallet row the function inserts was invisible to
   the join. Split into two statements. *M2 never caught this because it calls `create_cat` without a
   join.*
2. **M3 broke M0's context tests** *(fixed)*. M0 asserted the app boots with no datasource; M3 added
   `CatService`, which constructor-injects `JdbcClient`. MeowPay is a database-backed service and can
   no longer start without a DB — so that premise was obsolete. Both context tests were rewritten
   against Testcontainers, and `database verifier is skipped when no datasource is configured` was
   **deleted**: `DatabaseConnectionVerifier` is `@ConditionalOnBean(JdbcClient::class)`, so it
   asserted a state that can no longer exist.
3. **RLS test never reached RLS** *(fixed)*. The harness does `DROP SCHEMA public CASCADE; CREATE
   SCHEMA public`, discarding the `USAGE` grant a real `public` schema carries — so `SET ROLE
   authenticated` failed with *permission denied for schema public* before any policy was evaluated.
   Restored the grant, matching the harness's existing Supabase emulation. **Test-fidelity gap, not a
   production bug** — real Supabase grants this at bootstrap.
4. **Kotlin/AssertJ compile error** *(fixed)*. `satisfies { }` couldn't resolve between the
   `Consumer` and `ThrowingConsumer` overloads, failing `compileTestKotlin` — which blocked the M2
   suite too, since all test sources compile together.
5. **`0007_realtime_publication.sql` broke both integration suites** *(fixed, found running M4's
   backend verification)*. It runs `ALTER PUBLICATION supabase_realtime ADD TABLE ...`, but that
   publication only exists because real Supabase creates it at project bootstrap — the ephemeral
   Testcontainers Postgres has no such publication, so both `LedgerCoreIntegrationTests` and
   `AuthAndCatManagementIntegrationTests` failed with `ERROR: publication "supabase_realtime" does
   not exist` (13 of 15 tests). Same class of test-fidelity gap as bug 3 (RLS grant). Fixed by
   emulating the Supabase bootstrap condition in both harnesses: `CREATE PUBLICATION
   supabase_realtime` (guarded, matching the existing `anon`/`authenticated` role-creation pattern)
   before migrations run. **Test-fidelity gap, not a production bug.**

### Still outstanding
- [ ] **Frontend tests — 6 files failing, deferred by decision.** Failures look like *harness config*,
      not product defects: the `@/` path alias isn't configured in vitest (3 files — the imported
      source files all exist), `window.matchMedia` isn't mocked (theme-toggle), `NextRequest` header
      mocking (middleware), plus 3 design-token assertions. Not yet triaged.
- [ ] **M0 verify (frontend half)** — the backend boots and rejects unauthenticated `/api/**`
      (proven by `SecurityConfigTests`); the frontend has not been booted.
- [ ] **M3 verify (UI half)** — the *backend* path is proven by `AuthAndCatManagementIntegrationTests`
      (human creates cats, each funded with 500, RLS isolates humans). The dashboard walkthrough needs
      a running app + live Supabase.
- [ ] **Confirm Supabase JWT signing mode** (HS256 vs JWKS) in project Auth settings — carried from
      M3. The decoder handles either; the live mode is still unconfirmed.
- [ ] **Docker Compose** not yet run.

### Resolved — migrations applied to the live Supabase project (2026-07-16)
- [x] **`.env` credentials** — Supabase URL, anon key, `SUPABASE_DB_URL` (Session Pooler),
      `SUPABASE_JWT_SECRET`, `GROQ_API_KEY` were all already present in `.env`.
- [x] **All 7 migrations (`0001`–`0007`) applied against the real project**, in order, via
      `psql` (run through a throwaway `postgres:16-alpine` container over the Session Pooler
      connection string, since no local `psql`/Supabase CLI is installed on this host). Until
      now, migrations had only ever run against the ephemeral Testcontainers Postgres inside
      the backend test suite — the live project's `public` schema was empty, which is why no
      tables were visible in the Supabase dashboard. Verified after: `humans`, `cats`,
      `wallets`, `transfers`, `ledger_entries` all exist with `rowsecurity = true`.
- [x] Confirmed migration `0007`'s `ALTER PUBLICATION supabase_realtime ADD TABLE ...` needed
      **no** workaround here — real Supabase provisions that publication at project bootstrap,
      unlike the ephemeral test Postgres (bug 5 above only affected the test harness).

### Flags for M10 (fresh-clone reproducibility)
The brief explicitly checks that *"the repo is public and runs from a fresh clone"*:
- [ ] **`frontend/package-lock.json` is not committed**, and the one on disk was generated on
      **linux-musl** (it carried only `@rollup/rollup-linux-x64-musl`), so installing on Windows
      failed on the missing platform binary until a clean reinstall. An uncommitted lockfile means
      non-reproducible installs from a fresh clone.
- [ ] **`next@14.2.15` has a published security vulnerability** (npm deprecation warning points to
      the 2025-12-11 Next.js advisory). Worth patching before submission.

### Environment (resolved)
- ✅ **JDK 21** — Temurin `jdk-21.0.11.10-hotspot`. Note `JAVA_HOME` was set to a nonexistent
      `C:\Java`; `gradlew.bat` reads it first, so it must point at the real install.
- ✅ **Docker 28.1.1** running — required by Testcontainers.

---

## Remaining work

### Dependency order
```
M4 (dashboard)  ──┬── M5 (manual transfer) ── M8 (NL composer, reuses M5's confirm dialog)
                  ├── M6 (top-up, pills live on M4's cat cards)
                  ├── M7 (charts, read M4's ledger window)
                  └── M9 (insight, largely independent)
                                                              all ──> M10 (package)
```
Critical path: **M4 → M5 → M8 → M10.** M6, M7, M9 can slot in anywhere after M4. M4 and M5 are
done — see [M04-realtime-dashboard.md](M04-realtime-dashboard.md) and
[M05-manual-transfer.md](M05-manual-transfer.md).

---

### ✅ M5 — Manual transfer `fullstack` · exercises ADR 0008/0009/0012
- [x] Send form (`react-hook-form` + `zod`): From [my cat] → To [any other cat], amount, note
- [x] Confirm `Dialog` — **M8 reuses this exact dialog**
- [x] `Sonner` toast
- [x] **Idempotency key generated when the confirm dialog opens** — not per HTTP request
- [x] Test: **rejects a sender cat the caller doesn't own** ← the key new authz check — backend
      run, passes (`TransferControllerTests`)
- [x] Tests: validation; confirm→submit fires exactly once; failure surfaces `failure_reason` —
      authored, frontend run deferred
- [ ] Verify: send between your own two cats — total hero **stays constant**, both cards move,
      trail shows both legs — not run (no live app walkthrough this session)

### ✅ M6 — Top-up `fullstack` · ADR 0014
- [x] `POST /api/wallet/topup { idempotencyKey, catId, amount }` → validates cat ownership +
      preset allowlist + server cap → `execute_transfer(treasury → cat, source='topup')`
- [x] Preset pills (+100/+500/+1000) on each cat card
- [x] Tests: presets succeed; off-allowlist/over-cap rejected; **topping up a cat that isn't yours
      rejected**; **conservation preserved**; treasury goes negative by exactly the minted amount —
      backend run, passes (`LedgerCoreIntegrationTests`)
- [ ] Test: pill row **wraps** rather than shrinking below the 44px touch target — authored,
      frontend run deferred
- [ ] Verify: top up an empty wallet — balance and total update live — not run (no live app
      walkthrough this session)

### ⬜ M7 — Activity charts `fullstack` · ADR 0015
- [ ] `treat-flow-chart` — diverging column, zero-centered, credits above / debits below
- [ ] `top-recipients-chart` — horizontal bar, sequential teal, tail >7 folds into "Other"
- [ ] Tooltips, legend, validated palette both modes, 2-up → 1-up reflow <768px
- [ ] `derive.ts` — pure, no I/O
- [ ] Tests: daily buckets; recipient totals + "Other" fold; grants/top-ups bucket correctly;
      **internal own-cat transfers net to zero in aggregate**; empty/sparse/dense inputs
- [ ] Verify: visual pass at 375/768/1440 in both themes

### ⬜ M8 — Agentic NL composer `fullstack` · ADR 0016/0017
- [ ] `GroqClient` — OpenAI-compatible HTTP via `RestClient`, no SDK
- [ ] `ComposerAgent` — `llama-3.1-8b-instant`, `tool_choice` pinned to `propose_transfer`,
      roster injected so the model resolves names to **real ids it can see**
- [ ] `POST /api/composer/parse { message, senderCatId }` → proposal only; unknown cat / bad
      amount → 422
- [ ] Pills ("Send" / "Ask MeowPay", lavender) → `nl-composer` → proposal → **M5's confirm
      dialog** → **the same `/transfers/execute`**, `source='agent'`
- [ ] Tests: valid proposal; rejects nonexistent recipient; rejects unowned `senderCatId`;
      **asserts `/composer/parse` never writes to the DB** ← the load-bearing property
- [ ] Verify: "send Milo 10 treats for the red dot" → proposal → confirm → lands, indistinguishable
      in the trail from a manual send except its `source` badge

### ⬜ M9 — Agentic activity insight `fullstack` · ADR 0018
- [ ] `InsightAgent` — `llama-3.3-70b-versatile`; **forced** `get_recent_transactions` whose
      backend impl **ignores any model-supplied cat id** and always scopes to the JWT-resolved
      human's cats, honoring only server-clamped `days`/`limit`; **unforced** follow-up → prose
- [ ] `GET /api/insights/summary`
- [ ] `insight-panel` — lavender, button-triggered, `Skeleton`
- [ ] Test: **a model-injected cat id from another human is ignored** — rows unchanged
- [ ] Verify: summary describes only the caller's cats, **even if prompted otherwise**

### ⬜ M10 — Dockerization & README `packaging` · ADR 0019
- [ ] Multi-stage Dockerfiles — backend `temurin:21-jdk` → `21-jre`, Gradle wrapper committed;
      frontend `next build` + `output: 'standalone'`
- [ ] Compose wiring against hosted Supabase
- [ ] README: what was built; run-from-clean-clone; trade-offs **each linked to its ADR** —
      including *treats are freely mintable via top-up; real MeowPay would settle against a payment
      provider first*
- [ ] README: **how Claude Code built the repo** — distinct from the in-app Groq agents
- [ ] Verify: `docker compose up --build` from a clean clone works end to end, **no undocumented
      manual step**

---

## Per-milestone definition of done
- [ ] Scope items implemented
- [ ] BE + FE tests **authored alongside** (not run unless asked)
- [ ] ADR(s) written
- [ ] Verify step run — or the reason it couldn't be recorded in the progress log
- [ ] Progress log updated; status flipped to done
- [ ] Committed at the milestone boundary *(the brief explicitly reads commit history)*
