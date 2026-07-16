# M5 — Manual transfer

**Type:** fullstack · **Status:** done
**ADRs:** none new — exercises [0008](../adr/0008-atomic-plpgsql-transfer.md),
[0009](../adr/0009-idempotency-and-status.md), [0012](../adr/0012-rls-ownership-subquery.md)

## Scope

The first way to actually move treats: a human-driven form calling `/transfers/execute`
directly (the agentic path in M8 reuses this same endpoint and this same confirm dialog).

- Send form (`react-hook-form` + `zod`): `From [my cat] → To [any other cat]`, amount, note.
- Confirm `Dialog` — the same dialog M8's agent proposal will populate.
- `Sonner` toast on completion.
- **The client generates the idempotency key per submission** — at the point the confirm
  dialog opens, not per HTTP request ([0009](../adr/0009-idempotency-and-status.md)).

## Tests

- **Backend:** rejects a sender cat the caller doesn't own — the key new authorization check
  introduced by a client-supplied `senderCatId` ([0010](../adr/0010-actor-vs-account.md)).
- **Frontend:** form validation; confirm → submit calls the endpoint exactly once (no
  double-fire on a slow click); a failure surfaces the backend's `failure_reason` verbatim.

## Verify

Send treats between your own two cats: the total hero stays constant (own-cat transfers net to
zero — [0015](../adr/0015-client-side-chart-derivation.md)), both cat cards move, and the trail
shows both legs.

## Progress log

- 2026-07-16 — started. Reviewing transfer contracts and the existing realtime dashboard read model.
- 2026-07-16 — done. Commits 2db8990..4b6a999 add the manual composer, reusable confirm dialog,
  idempotent intent key, Sonner outcomes, and backend/frontend coverage. Frontend TypeScript
  validation passed; test suites were authored but not run. Verify step could not run: the live
  environment has the existing Supabase configuration but no Java/JAVA_HOME, so the backend
  cannot start (`./gradlew bootRun` exits before application startup).
- 2026-07-16 — backend tests run. `TransferControllerTests` (the sender-ownership authz check)
  passes alongside the full backend suite — 16 tests, 0 failures. Frontend tests deferred per
  the standing CHECKLIST decision. Verify step (live app walkthrough) still not run.
