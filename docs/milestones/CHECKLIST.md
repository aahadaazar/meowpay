# MeowPay — Milestone Checklist

**4 of 11 complete.** M0–M3 done; M4–M10 not started.

| | Milestone | Type | Status |
|---|---|---|---|
| M0 | [Foundation & scaffolding](M00-foundation-and-scaffolding.md) | enabler | ✅ done |
| M1 | [Design system](M01-design-system.md) | enabler | ✅ done |
| M2 | [Ledger core](M02-ledger-core.md) | enabler (BE+DB) | ✅ done |
| M3 | [Auth & cat management](M03-auth-and-cat-management.md) | fullstack | ✅ done |
| M4 | [Realtime dashboard](M04-realtime-dashboard.md) | fullstack | ⬜ not started |
| M5 | [Manual transfer](M05-manual-transfer.md) | fullstack | ⬜ not started |
| M6 | [Top-up](M06-topup.md) | fullstack | ⬜ not started |
| M7 | [Activity charts](M07-activity-charts.md) | fullstack | ⬜ not started |
| M8 | [Agentic NL composer](M08-agentic-nl-composer.md) | fullstack | ⬜ not started |
| M9 | [Agentic activity insight](M09-agentic-activity-insight.md) | fullstack | ⬜ not started |
| M10 | [Dockerization & README](M10-dockerization-and-readme.md) | packaging | ⬜ not started |

---

## ⚠️ Verification debt — read before continuing

Every milestone so far was authored but **not executed**. Tests are written-not-run by design (the
milestone method), but the *verify* steps were also skipped for environmental reasons, and that debt
has compounded across four milestones.

- [ ] **M0 verify** — both apps boot; backend rejects an unauthenticated `/api/**` request.
      *Skipped: no Java, no Node/npm at the time.*
- [x] **M1 verify** — palette validator passed (Node v20.19.3); visual pass at 375/768/1440 in both
      themes. **The only milestone actually verified.**
- [ ] **M2 verify** — none needed *except* its test suite, which is the entire proof. **Never run.**
- [ ] **M3 verify** — one human creates two cats; both show 500 treats.
      *Skipped: no host Java runtime, services not up.*

**The sharpest risk:** M2 is the centerpiece — the ledger, `execute_transfer`, idempotency,
conservation — and its doc says plainly *"proven entirely by its test suite."* That suite has never
executed. Everything M4–M10 builds sits on top of code with zero execution evidence.

### Blocking prerequisites
- [ ] **Java runtime** — `JAVA_HOME` unset, no `java` on `PATH`. Blocks every backend test and boot.
- [ ] **`.env` credentials** — Supabase URL, anon key, `SUPABASE_DB_URL` (Session Pooler, IPv4),
      `SUPABASE_JWT_SECRET`, `GROQ_API_KEY`.
- [ ] **Confirm Supabase JWT signing mode** (HS256 vs JWKS) in project Auth settings — an open item
      carried from M3. The decoder is configurable either way, but the live mode is still unconfirmed
      and blocks any real authenticated request.
- [ ] **Docker Compose** not yet run (requires user input).

> Recommendation: run the M2 suite before starting M4. If the ledger has a defect, every milestone
> after it is built on sand — and M4–M7 all read from it.

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
Critical path: **M4 → M5 → M8 → M10.** M6, M7, M9 can slot in anywhere after M4.

---

### ⬜ M4 — Realtime dashboard `fullstack` · ADR 0013
The read side, live. M3's welcome grants already give it real data to render.
- [ ] Server component for initial fetch → hands off to realtime client components
- [ ] `use-realtime-wallets`, `use-realtime-ledger` — RLS-scoped, **unfiltered** subscriptions
- [ ] Total hero + delta + sparkline
- [ ] Per-cat cards
- [ ] `ledger-trail` — cat column, direction/source badges, DiceBear avatar, `tabular-nums`,
      running `balance_after`, **stacked cards <768px**
- [ ] `Skeleton` loading states
- [ ] Migration `0007_realtime_publication.sql` — publish `wallets`, `ledger_entries` **only**
- [ ] Tests: hooks apply payloads (mocked channel); trail sorts; 768px collapse
- [ ] Verify: create a cat → watch its grant land live *(first real E2E moment)*

### ⬜ M5 — Manual transfer `fullstack` · exercises ADR 0008/0009/0012
- [ ] Send form (`react-hook-form` + `zod`): From [my cat] → To [any other cat], amount, note
- [ ] Confirm `Dialog` — **M8 reuses this exact dialog**
- [ ] `Sonner` toast
- [ ] **Idempotency key generated when the confirm dialog opens** — not per HTTP request
- [ ] Test: **rejects a sender cat the caller doesn't own** ← the key new authz check
- [ ] Tests: validation; confirm→submit fires exactly once; failure surfaces `failure_reason`
- [ ] Verify: send between your own two cats — total hero **stays constant**, both cards move,
      trail shows both legs

### ⬜ M6 — Top-up `fullstack` · ADR 0014
- [ ] `POST /api/wallet/topup { idempotencyKey, catId, amount }` → validates cat ownership +
      preset allowlist + server cap → `execute_transfer(treasury → cat, source='topup')`
- [ ] Preset pills (+100/+500/+1000) on each cat card
- [ ] Tests: presets succeed; off-allowlist/over-cap rejected; **topping up a cat that isn't yours
      rejected**; **conservation preserved**; treasury goes negative by exactly the minted amount
- [ ] Test: pill row **wraps** rather than shrinking below the 44px touch target
- [ ] Verify: top up an empty wallet — balance and total update live

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
