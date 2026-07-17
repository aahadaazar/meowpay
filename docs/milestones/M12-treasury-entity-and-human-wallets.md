# M12 — Treasury as an entity; humans hold wallets

**Type:** fullstack · database + backend + frontend · **Status:** done
**ADRs:** [0021](../adr/0021-wallet-is-the-account.md) ·
[0022](../adr/0022-humans-hold-wallets.md) ·
[0023](../adr/0023-funding-path-topup-mints-to-the-human.md)

**Supersedes the money model built by [M2](M02-ledger-core.md) and [M6](M06-topup.md).** Those
milestone docs are the record of what was built then and are **not** retro-edited — read them as
history, and this as what replaces it.

## Why

Today the treasury is a **cat** (`cats.is_system`), `wallets` is keyed by `cat_id`, and a human has
no wallet — treats enter the system already allocated to a cat. The primary key encodes a claim
that only a cat can hold treats, and `is_system` is the flag that admits the claim was already
false.

M12 makes the money graph match the domain:

```
treasury ──topup──▶ human wallet ──send──▶ cat wallet ──send──▶ cat wallet
(negative)          (what you hold)         (per cat)            (per cat)
```

One direction, three legal routes, every hop through the ledger. **Conservation is preserved** —
`SUM(all signed entries) == 0` still holds, and the treasury's negative balance is still exactly the
treats in circulation ([0021](../adr/0021-wallet-is-the-account.md)).

## Scope

### Migrations — rewritten in place, not patched forward

The hosted Supabase project is empty and migrations re-run from scratch, so `0001`–`0007` are
**edited in place**. There is no data to preserve and no reason to ship a column-rename scar
([0021](../adr/0021-wallet-is-the-account.md)).

- **`0001_init_schema.sql`** — `wallets` gets `id uuid PK`, `kind text` (`human`/`cat`/`treasury`),
  nullable `human_id`/`cat_id`, the `wallets_owner_matches_kind` CHECK, three partial unique
  indexes (one wallet per human, one per cat, exactly one treasury), and
  `CHECK (kind = 'treasury' OR balance >= 0)`. **Delete** `cats.is_system`, the
  `cats_exactly_one_system` index, the `cats_system_ownership` CHECK, and the treasury cat seed.
  Seed the treasury as a **wallet** at the existing fixed UUID.
- **`0002_transfers_and_ledger.sql`** — `sender_cat_id`/`receiver_cat_id` →
  `sender_wallet_id`/`receiver_wallet_id`; `wallet_cat_id`/`counterparty_cat_id` →
  `wallet_id`/`counterparty_wallet_id`; all four FK to `wallets(id)`. `initiated_by` becomes
  **`NOT NULL`** ([0022](../adr/0022-humans-hold-wallets.md)). `source` CHECK drops
  `welcome_grant` → `('manual','agent','topup')`, on both tables. Rename the indexes and the
  `wallet_not_counterparty` / `one_side_per_transfer` constraints to match. Append-only `REVOKE`
  stays.
- **`0003_execute_transfer_function.sql`** — params become `p_sender_wallet_id` /
  `p_receiver_wallet_id`. The `wallets JOIN cats` that resolves name + `is_system` becomes a
  `LEFT JOIN` over both owner kinds, resolving `counterparty_name` per kind (cat name / human
  `display_name` / `'MeowPay Treasury'`). **Replace the `system_recipient` branch with the route
  table** — permit `treasury→human`, `human→cat`, `cat→cat`; everything else is a `failed` row with
  `failure_reason = 'unsupported_route'`. Sufficient-funds is skipped for the treasury sender only
  (`kind = 'treasury'`, not an `is_system` boolean). Ordered `FOR UPDATE` locking, the idempotency
  fast path, and **failures-are-INSERTed-never-RAISEd** are all unchanged
  ([0008](../adr/0008-atomic-plpgsql-transfer.md)).
- **`0004_create_cat_function.sql`** — insert the cat + its wallet at **0**, and stop. No
  `execute_transfer` call, no welcome grant ([0023](../adr/0023-funding-path-topup-mints-to-the-human.md)).
  Stays `SECURITY DEFINER`; still no client-facing INSERT grants.
- **`0005_rls_policies.sql`** — the ownership predicate moves from cats to wallets. `wallets`,
  `ledger_entries` and `transfers` each get the two-arm `USING`: `human_id = auth.uid()` **OR** the
  wallet's cat belongs to `auth.uid()`. The cats roster policy loses `NOT is_system` and becomes an
  unqualified read. Treasury stays invisible because it matches neither arm — no special case
  ([0012](../adr/0012-rls-ownership-subquery.md)).
- **`0006_new_user_trigger.sql`** — `handle_new_user` now also inserts the human's wallet
  (`kind='human'`, balance 0). **This is where a human's wallet is born**; a human without one is
  unrepresentable from signup onward.
- **`0007_realtime_publication.sql`** — unchanged. `wallets` and `ledger_entries` stay published;
  RLS scopes the rows, and a human's own wallet now arrives on the same channel as their cats'
  ([0013](../adr/0013-realtime-scoping-via-rls.md)).

### Backend

- **`OwnershipGuard`** — `requireOwnedSender(humanId, walletId)` replaces the cat-keyed checks with
  the wallet predicate ([0022](../adr/0022-humans-hold-wallets.md)). `requireNonSystemRecipient` is
  **deleted** — route legality is the function's job now, decided by kind, not the guard's by flag.
  A `requireCatRecipient` check stays at the DTO/route level only insofar as the route table needs a
  resolvable receiver.
- **`TransferService`** — the `treasuryCatId` constant becomes a treasury **wallet** id;
  `topUp(humanId, amount)` resolves the caller's own wallet server-side and calls
  `execute_transfer(treasury → my wallet)`. Drop `welcome_grant` from `serverOnlySources`
  (it no longer exists); `topup` stays server-only. **Replace `topupAmounts` allowlist with
  `0 < amount <= TOPUP_MAX`** ([0023](../adr/0023-funding-path-topup-mints-to-the-human.md)).
- **Endpoints** — `POST /api/wallet/topup { idempotencyKey, amount }` (no `catId`);
  `POST /api/transfers/execute { idempotencyKey, senderWalletId, receiverWalletId, amount, note,
  source }` serves both `human → cat` and `cat → cat`. `GET /me` returns `walletId` + `balance`;
  `GET /cats` returns each cat's `walletId`.
- **DTOs** — `TopupRequest` (drop `catId`), `ExecuteTransferRequest` (`senderCatId` →
  `senderWalletId`, `receiverCatId` → `receiverWalletId`), `TransferResponse`, `CatResponses`.

### Frontend

Two surfaces, **separated by meaning** — money *enters* at the wallet, money *moves* in the
composer. Each amount field has exactly one bound and one meaning; this is the resolution of "pills
with the wallet, plus an open field, restricted by the wallet amount", which describes two different
controls.

- **`wallet-hero.tsx` (new)** — replaces `total-hero.tsx` as the hero. Shows **what you actually
  hold** (your wallet balance, *not* the sum of cat balances), the fictional bank line
  (`···· 4242`, no ledger entity behind it), and the **top-up control**: preset pills that
  *fill* a free number field, submit bounded by `TOPUP_MAX`. Keeps the sparkline.
- **`topup-presets.tsx`** — pills become field shortcuts, not submits. No `catId`.
- **`manual-transfer-form.tsx`** — the **only** send control. The From picker gains **"Your
  wallet"** alongside your cats; To stays any cat. Amount is validated against the *selected
  sender's* balance, showing the shortfall — an affordance; the server still returns
  `insufficient_funds` ([0023](../adr/0023-funding-path-topup-mints-to-the-human.md)).
- **`cat-card.tsx`** — the top-up pills are **removed**. It gains a **"Send treats"** action that
  scrolls to and prefills the composer (To = this cat, From = your wallet) — a shortcut *into* the
  one control, not a second one.
- **`charts/treat-distribution-chart.tsx` (new)** — the wallet-vs-cats breakdown, derived
  client-side from balances rather than the ledger window
  ([0015](../adr/0015-client-side-chart-derivation.md)). Colors from the validated palette slots
  only ([0004](../adr/0004-chart-palette-derivation.md)) — run `scripts/validate_palette.js` in
  both modes before shipping.
- **`charts/derive.ts`** — `internalTransferIds` needs **no logic change** and this is worth
  stating: a `human → cat` transfer shows you both sides, so it is internal and correctly excluded
  from the flow chart; a top-up shows you only the credit side (the treasury is invisible), so it
  is correctly external. Wallet→cat debits now appear in **Top recipients**, which is the intended
  reading of "where did my treats go". Cover the new routes with tests; do not touch the logic.
- **`ledger-trail.tsx`** — the wallet-name lookup keys on `walletId`, resolving your wallet to
  "You" and your cats by name. `sourceLabel` drops `welcome_grant`. Empty-state copy changes
  (below).
- **`dashboard/page.tsx`**, **`realtime-dashboard.tsx`** (`applyWalletChange` keys on `wallet.id`,
  not `wallet.cat_id`), **`dashboard-types.ts`**, **`hooks/use-realtime-wallets.ts`**,
  **`lib/api.ts`** — mechanical rename plus the human wallet in state.
- **Empty-state copy** — the welcome grant is gone, so both current promises are false. *"Each cat
  gets a wallet and 500 welcome treats to begin with"* and *"Your cat wallets will show their first
  welcome grant here"* must narrate the real path: **sign up → top up → create a cat → fund it.**

### Docs

- `docs/MILESTONES.md` — the domain paragraph ("each cat has a wallet. Humans create cats and top
  them up") and the endpoint list.
- `AGENTS.md` — the endpoint quick reference, the repo layout, and the Non-negotiables entry naming
  `welcome_grant` as a server-only source.
- `README.md` — the demo-boundary trade-off note ([0023](../adr/0023-funding-path-topup-mints-to-the-human.md)).

## Tests

**Backend (Testcontainers, real migrations)**
- **Global conservation survives the new hop:** `SUM(all signed entries) == 0` across
  `treasury → human → cat → cat`.
- **Per-wallet reconciliation:** `SUM(signed ledger) == balance`, for a **human** wallet as well as
  cats'.
- Top-up mints to the caller's own wallet; the treasury goes further negative by exactly that
  amount; a human wallet may not go negative and the treasury may.
- **Route table, exhaustively** — `treasury→human`, `human→cat`, `cat→cat` succeed; `cat→human`,
  `cat→treasury`, `human→human`, `treasury→cat` are `failed` / `unsupported_route`. One-directional
  flow is the property; test it as one.
- **Authorization from a client-supplied `senderWalletId`** — the highest-risk surface
  ([0022](../adr/0022-humans-hold-wallets.md)): another human's wallet, another human's cat's
  wallet, and **the treasury wallet** are all rejected as senders on `/transfers/execute`.
- `/wallet/topup` accepts no sender and cannot be made to mint into another human's wallet;
  `amount <= 0` and `amount > TOPUP_MAX` rejected; `source='topup'` still rejected from
  `/transfers/execute`.
- Idempotency replay, concurrency, and insufficient-funds still hold — unchanged behaviour, new
  column names.
- `create_cat` creates the cat and its wallet at 0, atomically, writing **no** ledger rows.

**Frontend**
- Top-up: pills fill the field rather than submitting; the field submits; over-cap is refused.
- Composer: "Your wallet" appears in From; amount over the selected sender's balance disables
  submit and shows the shortfall; the cat card's "Send treats" prefills To.
- Distribution chart: renders the wallet/cats split; palette slots validate in both modes.
- `derive.ts`: `human → cat` is treated as internal; a top-up credit is external.
- Trail: your wallet renders as "You"; no `welcome_grant` label survives.

**e2e** — `m04-realtime-dashboard`, `m05-manual-transfer` and `m06-topup` all assert the old model
(cat-targeted top-up, welcome grants, treasury-as-cat). Update all three; the M12 walkthrough below
is the new spec.

## Verify

One human, from a clean signup: **wallet is 0 and the dashboard is genuinely empty** → top up 700
(a value no preset offers) → wallet shows 700, treasury is −700, trail shows one credit from
*MeowPay Treasury* → create a cat, which starts at **0** with no ledger rows → fund it 300 from the
wallet → wallet 400, cat 300, both sides in the trail → create a second cat, fund it, send cat→cat
→ both cats' balances and trail rows move, **the household total is unchanged** → the distribution
chart shows the wallet/cats split → try to send more than the wallet holds and get stopped client-
side; re-send a used idempotency key and get no double-charge. All live, no refresh. Re-run the
**two-human RLS check** (`AGENTS.md` → Implementation-time checks): no cross-human wallet leakage,
treasury invisible to both.

## Progress log

- 2026-07-17 — started. Reworking the wallet model from the empty baseline migrations.
- 2026-07-17 — done. Commits 71c81de..72b687f; migrations, wallet APIs, dashboard surfaces and
  M4–M6 e2e specs now follow treasury → human → cat → cat. Tests were authored but not run per
  AGENTS.md. `tsc --noEmit` passed and palette validation passed in both modes. The live Verify
  walkthrough was not run: the available Supabase-backed environment contains prior e2e activity,
  not a freshly re-initialized database for the rewritten-in-place M12 migrations.
