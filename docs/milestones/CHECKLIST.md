# MeowPay — Milestone Checklist

**8 of 12 complete.** M0–M7 done; M8 abandoned (2026-07-17); M9 deliberately deferred to clear
testing debt; M10 not started; M11 (added 2026-07-16) implemented then abandoned as out of scope,
see below.
**Backend suite green — 17 tests, 0 failures. Frontend suite green — 40 tests, 0 failures**
(2026-07-17, up from 24 on 2026-07-16 — auth swapped from magic-link to email + password, see M3's
progress log and [0011](../adr/0011-auth-boundary.md)). A live-browser Playwright e2e suite (`e2e/`)
was run against the full
docker-compose stack — see "e2e suite run against the live stack" below. It surfaced and fixed a
real, production-breaking backend auth bug (wrong JWT verification mode) plus two harness bugs. The
Realtime dashboard crash found in that run is now fixed; the suite still has unrelated failures.

| | Milestone | Type | Status |
|---|---|---|---|
| M0 | [Foundation & scaffolding](M00-foundation-and-scaffolding.md) | enabler | ✅ done |
| M1 | [Design system](M01-design-system.md) | enabler | ✅ done |
| M2 | [Ledger core](M02-ledger-core.md) | enabler (BE+DB) | ✅ done |
| M3 | [Auth & cat management](M03-auth-and-cat-management.md) | fullstack | ✅ done |
| M4 | [Realtime dashboard](M04-realtime-dashboard.md) | fullstack | ✅ done |
| M5 | [Manual transfer](M05-manual-transfer.md) | fullstack | ✅ done |
| M6 | [Top-up](M06-topup.md) | fullstack | ✅ done |
| M7 | [Activity charts](M07-activity-charts.md) | fullstack | ✅ done |
| M8 | [Agentic NL composer](M08-agentic-nl-composer.md) | fullstack | 🚫 abandoned |
| M9 | [Agentic activity insight](M09-agentic-activity-insight.md) | fullstack | ⬜ not started |
| M10 | [Dockerization & README](M10-dockerization-and-readme.md) | packaging | ⬜ not started |
| M11 | [e2e suite against local Supabase](M11-e2e-local-supabase.md) | tooling | 🚫 abandoned |

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

**The frontend suite is now also green — 12 files, 24 tests, 0 failures, 0 skipped** (2026-07-16),
once Node.js became available in the environment (it wasn't during M0–M7 authoring). All 12
`vitest` files run and pass — nothing was deleted or skipped to get there. See "Resolved —
frontend test suite fixed" below for the five root causes and their fixes. The **palette
validator** (`npm run validate:palette`, ADR 0004) also now runs and passes every check (light
+ dark, categorical/ordinal/diverging) — it could not run earlier for the same reason.

M4 added no new backend test suite. Its authored tests are frontend-only — realtime hooks, trail
sort, 768px collapse (`use-realtime.test.tsx`, `ledger-trail.test.tsx`, `realtime-dashboard.test.tsx`)
— and now run and pass. Its only backend surface is migration `0007_realtime_publication.sql`,
exercised implicitly by the two integration suites above, which replay every file in
`supabase/migrations` against the ephemeral Testcontainers Postgres — see bug 5 below.

**M7 likewise added no backend test suite and no backend endpoint** — by design (ADR 0015: charts
derive client-side from the same realtime ledger window M4 already holds, no aggregate endpoint).
Its tests (`derive.test.ts`: daily buckets, recipient totals + "Other" fold, grants/top-ups
bucketing, internal own-cat transfers netting to zero, empty/sparse/dense inputs) are frontend-only
and now run and pass. The full backend suite was re-run as a regression check and is unchanged at
17 tests, 0 failures.

**M5 — the sender-ownership authorization check** (the key new authz surface introduced by a
client-supplied `senderCatId`) is proven by `TransferControllerTests`. Its frontend tests
(`manual-transfer-form.test.tsx`: validation, confirm→submit fires once, `failure_reason` surfaced
verbatim) now run and pass.

**M6 — top-up's server-side policy checks** (preset allowlist, server cap, ownership of the
target cat, and conservation across the treasury-backed mint) are proven by a single test added
to `LedgerCoreIntegrationTests`: *"top up accepts presets preserves conservation and enforces
ownership plus server policy"* — passes. Its frontend tests (`topup-presets.test.tsx`: pills
render/submit, row wraps above the 44px touch target) now run and pass.

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
- [x] **M0 verify (frontend half)** — now covered by `e2e/tests/m00-foundation.spec.ts` (passes):
      unauthenticated `/api/**` → 401, unauthenticated visit → redirect to `/login`.
- [~] **M3 verify (UI half)** — `e2e/tests/m03-auth-and-cat-management.spec.ts` covers this
      (signup/login validation, a fresh signup landing on the dashboard with no email step,
      sign-out/log-back-in, a repeat signup with the same email rejected, empty state, welcome
      grants, cross-human isolation) but has not been run since the 2026-07-17 magic-link →
      password swap (see M03's progress log and [0011](../adr/0011-auth-boundary.md)) — no
      running stack this session. The flaky "shows the check-your-email notice" case (below) no
      longer exists; it was retired along with magic-link, not root-caused.
- [~] **M1/M7 visual pass at 375/768/1440px in both themes** — `e2e/tests/m01-m07-visual.spec.ts`
      covers this. The login-page pass (6 shots, both themes) was green under magic-link, but the
      login page's markup changed (password field replaces display name) and a new `/signup` pass
      was added (6 more shots) — **baselines need regenerating**
      (`npx playwright test m01-m07-visual --update-snapshots`), not yet done. The dashboard pass is
      currently blocked by open e2e bug 4 below (its `beforeAll` populates a human with cats/a
      transfer, which hits the realtime crash).
- [x] **Confirm Supabase JWT signing mode** (HS256 vs JWKS) in project Auth settings — **resolved:
      it's ES256/JWKS.** See e2e finding 1 below — this was a real, previously-unknown production bug,
      not just an unconfirmed setting.
- [x] **Docker Compose** — now the standard way this project is run; used throughout the e2e work
      below.

### e2e suite run against the live stack (2026-07-16)
The Playwright suite in [`e2e/`](../../e2e/README.md) was run for the first time, against the full
`docker-compose` stack (`development` targets) and the live Supabase project. It found and fixed
three bugs blocking the suite entirely, and found one further bug still open.

**Fixed:**
1. **Wrong JWT verification mode — a real production bug, not just a test blocker.** The live
   Supabase project signs with **ES256/JWKS**; `.env` only had the legacy `SUPABASE_JWT_SECRET`
   (HS256) set, so the backend rejected **every** real JWT with `Signed JWT rejected: Another
   algorithm expected, or no matching key(s) found`. This broke all authenticated backend calls, not
   e2e alone. Two changes were needed: `SUPABASE_JWT_JWK_SET_URI` added to `.env`, and
   `SecurityConfig.kt`'s `NimbusJwtDecoder.withJwkSetUri(...)` explicitly allowed `RS256`/`ES256` —
   Spring Security's JWKS decoder otherwise trusts RS256 only, and silently rejects a token signed
   with any other algorithm even when the right key is present in the JWKS document.
2. **`lib/supabase/middleware.ts` blocked its own test-login route.** `publicPaths` allowlisted
   `/login` and `/auth/callback` but not `/api/test/login`
   (`frontend/app/api/test/login/route.ts`), so every e2e login attempt was redirected to the login
   page (HTML) before reaching the handler, instead of getting a session back. Added the path.
3. **e2e locator bug**, not a product bug: `m03-auth-and-cat-management.spec.ts` used
   `getByRole("alert", { name: ... })`. `role="alert"`'s accessible name is not computed from its
   text content per the ARIA spec (unlike `button`/`link`), so this never matched even though the
   element was genuinely visible. Switched to `.filter({ hasText })`.

**Resolved (2026-07-16):**
4. **Realtime channel double-subscribe race crashed the entire dashboard.** `useRealtimeWallets` and
   `useRealtimeLedger` (`frontend/hooks/use-realtime-*.ts`) each create their own Supabase client and
   subscribe inside a plain `useEffect`. Under React 18 Strict Mode's dev-only double-invoke (`next
   dev`, which is what `docker-compose.yml`'s `development` target runs), the effect fires, cleans
   up, and fires again in quick succession; on the second `.subscribe()` the Realtime socket has
   occasionally not yet re-established auth. Rather than rejecting the event, Supabase Realtime's RLS
   enforcement sends a **redacted** `postgres_changes` payload — `record: {}` with
   `errors: ["Error 401: Unauthorized"]`:
   ```
   {"event":"postgres_changes","payload":{"data":{"table":"ledger_entries","type":"INSERT",
   "record":{},"columns":[],"errors":["Error 401: Unauthorized"],...}}}
   ```
   `applyLedgerChange` (`components/realtime-dashboard.tsx`) maps that empty row through
   `ledgerEntryFromRow` with no validation, and `formatDate(entry.createdAt)`
   (`components/ledger-trail.tsx:17`) calls `new Date(undefined)` →
   `Intl.DateTimeFormat.format()` throws `RangeError: Invalid time value`, taking down the whole
   `RealtimeDashboard` tree. Confirmed intermittent by running the same single test 3x in isolation:
   pass / fail / fail. This is the root cause of nearly every remaining e2e failure (M4–M7, the
   dashboard visual pass) — once the crash fires, the whole page is gone, so unrelated assertions on
   the same page fail too.
   - Not confirmed whether this also reproduces in a **production** build — `next build && next
     start` does not double-invoke effects the way `next dev`'s Strict Mode does — but the e2e suite
     runs against the `development` compose target, so it hits this regardless.
   Fixed in `use-realtime-wallets` and `use-realtime-ledger`: each hook now waits for the browser
   session, installs its JWT on Realtime, and retains its channel through Strict Mode's simulated
   effect cleanup/re-setup instead of double-subscribing. `use-realtime-ledger` reconciles the last
   100 RLS-scoped rows after its channel joins, closing the initial-fetch-to-subscription gap.
   `applyLedgerChange` also rejects redacted or timestamp-invalid rows, so an unexpected malformed
   payload cannot take down the dashboard. The hook tests now cover the Strict Mode replay and the
   dashboard-state test covers the redacted payload.

**Resolved by removal, not diagnosis (2026-07-17):** `m03-auth-and-cat-management.spec.ts`'s
"shows the check-your-email notice" test used to time out waiting for the notice after a real
`auth.signInWithOtp` call — plausibly Supabase's magic-link rate limit after several
back-to-back suite runs against the same project, but never confirmed. Magic-link itself was
replaced with email + password login ([0011](../adr/0011-auth-boundary.md)), which has no send
step to time out or rate-limit, so the test (and the code path it covered) no longer exists.
Honest framing: this is the flow being removed, not the bug being found.

**Latest run (2026-07-16):** all 4 M4 Realtime tests pass in the normal 10-worker Playwright run,
including live grant delivery, responsive trail rendering, and two-human socket isolation. The full
suite is not yet green: 30 of 41 pass. The remaining failures are six visual-baseline diffs, the
separate magic-link notice timeout, and four M5/M7 transfer/recipient-update cases; none is the
dashboard crash above.

**Then the hosted project's admin-API rate limit was hit.** A subsequent full run returned
`Test login failed (500): {"message":"Request rate limit reached"}` on 16 of 41 tests — the
cumulative cost of the many runs above (each test mints a fresh human via the admin API, nothing is
torn down). At that point the suite stops giving a trustworthy signal: failures become
indistinguishable between "real bug" and "exhausted the hosted project's quota." **See
[M11](M11-e2e-local-supabase.md) / [ADR 0020](../adr/0020-e2e-against-local-supabase.md)** —
retargets local e2e iteration at a local Supabase instance so this stops recurring.

### Resolved — frontend test suite fixed, all 24 tests now run and pass (2026-07-16)
Node.js became available in the environment this session (it wasn't during M0–M7 authoring), which
unblocked actually running `vitest` for the first time. All 6 previously-failing files turned out
to be harness bugs, not product defects — fixed rather than skipped:
1. **`@/` path alias unresolved in vitest** (6 files: `root-layout`, `use-realtime`,
   `cat-management-dashboard`, `ledger-trail`, `login-form`, `realtime-dashboard`) — `vitest.config.ts`
   had no `resolve.alias` even though `tsconfig.json` declares `@/* -> ./*`. Added the matching alias.
2. **Design-token assertions read empty strings** (`design-tokens.test.ts`, 3 assertions) — vitest's
   default `test.css: false` stubs CSS imports instead of injecting them into jsdom, so
   `getComputedStyle` had nothing to read. Set `css: true`.
3. **`window.matchMedia is not a function`** (`theme-toggle.test.tsx`) — jsdom doesn't implement it
   and `next-themes` calls it on mount. Added a mock in `test/setup.ts`.
4. **`Cannot access 'toast' before initialization`** (`topup-presets.test.tsx`,
   `manual-transfer-form.test.tsx`) — both did `const toast = {...}; vi.mock("sonner", () => ({ toast
   }))`, but `vi.mock` factories are hoisted above local `const`s, creating a temporal-dead-zone
   reference. Switched to `vi.hoisted()`, the pattern `middleware.test.ts` already used correctly.
5. **`request.headers must be an instance of Headers`** (`middleware.test.ts`) — `next/server`'s
   `NextRequest`/`NextResponse` expect Node's real `Headers`/`Request`, not jsdom's polyfilled globals.
   Added a `// @vitest-environment node` override for this one file.
   Fixing 3 broke `matchMedia`'s `window` reference for this now-node-environment file — guarded the
   `test/setup.ts` mock with `typeof window !== "undefined"`.

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
- [ ] **Supabase project setting: "Confirm email" must be OFF** (Dashboard → Authentication →
      Sign In / Providers → Email), added 2026-07-17 with the switch to email + password auth
      ([0011](../adr/0011-auth-boundary.md)). Without it, signup returns no session (an email
      round-trip reappears) and a duplicate-email signup is silently obfuscated instead of
      rejected. Not something a fresh clone can set for itself — needs documenting in the README
      as a required one-time project setting, not a `.env` value.
- [x] **`npm run build` failed `next build`'s type-check on three pre-existing errors** — found
      2026-07-17 while verifying the auth swap compiles clean, all unrelated to auth (confirmed by
      reproducing on unmodified `main`) and none touched by this session's auth edits. **Fixed the
      same day:** `confirm-transfer-dialog.tsx`'s null-narrowing was fixed by an editor
      auto-format; `hooks/use-realtime-ledger.ts:39` and `hooks/use-realtime-wallets.ts:37` each
      cast a Supabase Realtime payload straight to a narrower row type (`as LedgerPayload` /
      `as WalletPayload`), which `tsc` rejected because a DELETE payload's `new` is `{}`, not the
      full row shape — fixed by routing the cast through `unknown` first (`as unknown as
      LedgerPayload` / `WalletPayload`), matching the pattern TypeScript itself suggested. `next
      dev` never ran this type-check, so none of these were caught until now — the frontend suite
      has only ever been `vitest`, never a production build (see "Resolved — frontend test suite
      fixed" below). `npm run build` now succeeds cleanly, unblocking M10's Dockerfile plan
      (multi-stage `next build`).

### Environment (resolved)
- ✅ **JDK 21** — Temurin `jdk-21.0.11.10-hotspot`. Note `JAVA_HOME` was set to a nonexistent
      `C:\Java`; `gradlew.bat` reads it first, so it must point at the real install.
- ✅ **Docker 28.1.1** running — required by Testcontainers.

---

## Remaining work

### Dependency order
```
M4 (dashboard)  ──┬── M5 (manual transfer)
                  ├── M6 (top-up, pills live on M4's cat cards)
                  ├── M7 (charts, read M4's ledger window)
                  └── M9 (insight, largely independent)
                                                   all ──> M10 (package)
```
Critical path: **M4 → M5 → M10.** M6, M7, M9 can slot in anywhere after M4. M4 and M5 are done —
see [M04-realtime-dashboard.md](M04-realtime-dashboard.md) and
[M05-manual-transfer.md](M05-manual-transfer.md).

**M9 is deliberately deferred (decided 2026-07-16)** to clear the accumulated testing
debt first: the deferred frontend suite (M0–M7), the palette validator, and the outstanding
verify walkthroughs below. M9 is largely independent, so the deferral is schedule, not
dependency, driven. Resume with M9 once the testing backlog is cleared.

---

### ✅ M5 — Manual transfer `fullstack` · exercises ADR 0008/0009/0012
- [x] Send form (`react-hook-form` + `zod`): From [my cat] → To [any other cat], amount, note
- [x] Confirm `Dialog` — **M8 reuses this exact dialog**
- [x] `Sonner` toast
- [x] **Idempotency key generated when the confirm dialog opens** — not per HTTP request
- [x] Test: **rejects a sender cat the caller doesn't own** ← the key new authz check — backend
      run, passes (`TransferControllerTests`)
- [x] Tests: validation; confirm→submit fires exactly once; failure surfaces `failure_reason` —
      frontend run, passes
- [ ] Verify: send between your own two cats — total hero **stays constant**, both cards move,
      trail shows both legs — not run (no live app walkthrough this session)

### ✅ M6 — Top-up `fullstack` · ADR 0014
- [x] `POST /api/wallet/topup { idempotencyKey, catId, amount }` → validates cat ownership +
      preset allowlist + server cap → `execute_transfer(treasury → cat, source='topup')`
- [x] Preset pills (+100/+500/+1000) on each cat card
- [x] Tests: presets succeed; off-allowlist/over-cap rejected; **topping up a cat that isn't yours
      rejected**; **conservation preserved**; treasury goes negative by exactly the minted amount —
      backend run, passes (`LedgerCoreIntegrationTests`)
- [x] Test: pill row **wraps** rather than shrinking below the 44px touch target — frontend run,
      passes
- [ ] Verify: top up an empty wallet — balance and total update live — not run (no live app
      walkthrough this session)

### ✅ M7 — Activity charts `fullstack` · ADR 0015
- [x] `treat-flow-chart` — diverging column, zero-centered, credits above / debits below
- [x] `top-recipients-chart` — horizontal bar, sequential teal, tail >7 folds into "Other"
- [x] Tooltips, legend, validated palette both modes, 2-up → 1-up reflow <768px
- [x] `derive.ts` — pure, no I/O
- [x] Tests: daily buckets; recipient totals + "Other" fold; grants/top-ups bucket correctly;
      **internal own-cat transfers net to zero in aggregate**; empty/sparse/dense inputs —
      frontend run, passes. No backend test surface (ADR 0015: client-side only, no aggregate
      endpoint) — full backend suite re-run as a regression check, unchanged at 17 tests, 0
      failures.
- [ ] Verify: visual pass at 375/768/1440 in both themes — not run (no frontend runtime /
      live app walkthrough this session)

### 🚫 M8 — Agentic NL composer `fullstack` · ADR 0016/0017 (Abandoned)
Abandoned 2026-07-17 as out of scope and non-critical after M4–M7 verification work. The feature
would have added a natural-language composer for transfers — *"send Milo 10 treats"* — but it is
purely additive and doesn't block M10 packaging or any other core functionality. The confirm
dialog and `/transfers/execute` endpoint from M5 handle all transfer paths; M8 would only have
added an alternative input surface. M9 (insight, also agentic) is independent and can proceed
separately if prioritized later.

No code was committed for M8; the scope was defined but implementation never started.

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

### 🚫 M11 — e2e suite against local Supabase `tooling` · ADR 0020 (Rejected)
Added 2026-07-16, after the hosted-project e2e run above hit Supabase's admin-API rate limit
mid-session. Implemented the same day, then **abandoned as out of scope on 2026-07-17** — the
implementation commit was reverted. Full detail:
[M11-e2e-local-supabase.md](M11-e2e-local-supabase.md).
- [x] ~~`supabase start` (Supabase CLI) stood up for local e2e use, migrations applied~~ — done,
      then reverted
- [x] ~~`e2e/.env.e2e` carrying local Supabase's URL/anon/service-role keys~~ — done, then reverted
- [x] ~~Compose `MEOWPAY_ENV_FILE` switch so backend+frontend point at local Supabase only during
      an e2e run~~ — done, then reverted
- [x] ~~`e2e/README.md` updated with the local-first workflow~~ — done, then reverted
- [ ] Verify step — never run: the environment implementing this had Docker but no Supabase CLI
      (or host Node runtime), so local Supabase couldn't actually be started or reset. Moot now
      that the milestone is abandoned.

---

## Per-milestone definition of done
- [ ] Scope items implemented
- [ ] BE + FE tests **authored alongside** (not run unless asked)
- [ ] ADR(s) written
- [ ] Verify step run — or the reason it couldn't be recorded in the progress log
- [ ] Progress log updated; status flipped to done
- [ ] Committed at the milestone boundary *(the brief explicitly reads commit history)*
