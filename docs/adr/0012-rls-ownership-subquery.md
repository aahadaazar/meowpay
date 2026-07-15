# 0012. RLS is the authorization boundary; ownership is an EXISTS subquery

**Status:** Accepted · **Date:** 2026-07-15 · **Milestone:** M3

## Context

The browser talks to Supabase **directly** — PostgREST for reads, Realtime for subscriptions
([0013](0013-realtime-scoping-via-rls.md)) — using the anon key. That key is public. It is in
the JavaScript bundle. Anyone can take it and query the database with their own JWT.

So the authorization boundary cannot live in the frontend, and it cannot live only in Kotlin,
because the browser reaches Postgres without passing through Kotlin at all.

The data model complicates the usual answer. A **human owns 1..N cats**; wallets and ledger
entries belong to **cats**, not humans ([0010](0010-actor-vs-account.md)). There is no
`user_id` column on the rows that need protecting — and adding one would be denormalizing
ownership onto every row.

## Decision

**RLS on every table, and ownership is expressed as an `EXISTS` subquery against `cats`.**

```sql
-- wallets / ledger_entries / transfers
USING (
  EXISTS (
    SELECT 1 FROM cats
    WHERE cats.id = <row>.wallet_cat_id
      AND cats.human_id = auth.uid()
  )
)

-- cats: the roster is global, minus the treasury
USING (NOT is_system)
```

**No client-facing INSERT/UPDATE grants exist anywhere.** RLS governs *reads*. Every write goes
through a function via the trusted backend connection — cat creation is `POST /api/cats`, not a
client insert. So RLS is a read boundary by design, and the write boundary is "there is no client
write path".

Kotlin **also** checks ownership (`OwnershipGuard`) on every money endpoint. That is not
redundancy for its own sake: RLS protects the *direct* Postgres path, `OwnershipGuard` protects
the *backend* path — which runs as a trusted connection and therefore bypasses RLS entirely.
Since `sender_cat_id` is client-supplied ([0010](0010-actor-vs-account.md)), that check is the
only thing standing between an attacker and spending someone else's cat's treats. It gets
dedicated tests on `/transfers/execute`, `/wallet/topup` and `/composer/parse`.

### Why an EXISTS subquery and not a direct `user_id` match

The idiomatic RLS policy is `USING (user_id = auth.uid())` — a column comparison, no subquery,
no join. It is what every tutorial shows, and here it is **unwritable**: `wallets` and
`ledger_entries` have no `user_id` column, because **they are not owned by a human. They are
owned by a cat, which is owned by a human.** Ownership is one hop away, and the policy has to
make that hop.

Denormalizing `human_id` onto `wallets` and `ledger_entries` to enable the direct match is the
tempting shortcut, and it is wrong on three counts:

1. **It duplicates a fact that already has a home.** `cats.human_id` is the ownership record. A
   copy on every wallet and every ledger entry is a second source of truth that must be kept in
   sync — and the copy on an append-only table *cannot* be updated, so a cat that changes hands
   leaves every historical row asserting the wrong owner. Not stale: **wrong**, in the security
   predicate.
2. **It makes the security boundary depend on write-path discipline.** The policy would only be
   correct as long as every insert remembers to stamp the right `human_id`. The `EXISTS`
   subquery cannot be forgotten — it derives ownership at read time from the one place it is
   recorded.
3. **It is a genuine denormalization**, not a snapshot. The snapshots on `ledger_entries`
   ([0006](0006-ledger-first-money-movement.md)) are copied *because* history should not follow
   a rename. Ownership is the opposite: it must be current, because it decides who may read the
   row *now*. Copying it freezes an access-control decision at insert time.

The subquery is an indexed lookup on `cats.id` (primary key) filtered by `human_id`. At this
scale the cost is not measurable; at real scale it is one index hit per row batch, and the
correct trade.

**The treasury falls out for free.** `human_id IS NULL` means the subquery matches nothing — the
treasury is unowned, so it is unreadable, with no special case in any policy. And `cats` uses
`USING (NOT is_system)`, so it is absent from the roster too. The trail still names it, from the
`counterparty_name` snapshot.

## Consequences

- **The boundary is in the database.** A bug in a React hook, a forgotten `.eq()` filter, or a
  hand-rolled `curl` with the anon key cannot leak another human's rows. The strongest place to
  put a boundary is the last one before the data.
- Client queries need **no ownership filters** — RLS applies them. A missing filter is a missing
  optimization, not a leak. This is what makes the unfiltered realtime subscription safe
  ([0013](0013-realtime-scoping-via-rls.md)).
- **A global roster is a deliberate trade-off.** `cats USING (NOT is_system)` means every
  authenticated human can enumerate every cat name. That is required — you need to find
  recipients — and it is a demo boundary, not a design: real MeowPay would gate discovery behind
  search, a handle, or a friends list. Called out in the README.
- **The backend bypasses RLS**, by design, since it connects as a trusted role. Every money
  endpoint therefore re-checks ownership in Kotlin. The two mechanisms cover two different paths,
  and both are tested.
- **RLS must be verified by hand with two humans** — reads *and* realtime. A policy that is
  present but wrong looks identical to one that is right until someone checks.
- Policies are invisible from the application code. A developer reading `TransferService` cannot
  see them. Mitigated by testing them: cross-human read attempts are backend tests against real
  migrations.

## Alternatives considered

**Direct `user_id = auth.uid()` with `human_id` denormalized onto every table.** Simpler policy,
no subquery, textbook RLS. Rejected on all three counts above — chiefly that on an append-only
table the copy can never be corrected, so ownership transfer silently breaks the security
predicate.

**Authorize only in Kotlin; no RLS.** One boundary, in one language, visible to a reviewer.
Rejected outright: the browser reaches Postgres directly with a public anon key. Without RLS
every table is world-readable to anyone who opens the bundle. Kotlin is not on that path and
cannot defend it.

**Route all reads through Kotlin; no direct Postgres access.** Restores Kotlin as the only
boundary. Rejected: it gives up Realtime, which is a browser-to-Postgres subscription — and
"realtime by default" is in scope. Proxying WebSocket subscriptions through Spring is a
substantial build for a worse result.

**Security-definer views** exposing pre-filtered rows to clients. Works, and hides the policy.
Rejected: it moves the boundary into view definitions that are easy to forget on a new table, and
every new read shape needs a new view. RLS defaults to deny on the table itself, which is the
failure mode wanted.

**RLS with a helper function** — `is_my_cat(cat_id)` wrapping the subquery. Genuinely
attractive: one place to fix, and the policies read beautifully. Rejected for this slice on
weight rather than principle — it is a `SECURITY DEFINER` function inside the security predicate
of every table, which needs its own pinned `search_path` and its own audit
([0008](0008-atomic-plpgsql-transfer.md)). Three inlined subqueries are more auditable than one
indirection. It is the right refactor at ten tables.
