# 0011. Auth boundary — GoTrue owns identity; Kotlin is a JWT-only resource server

**Status:** Accepted · **Date:** 2026-07-15 · **Milestone:** M3

## Context

The app needs authenticated humans. Supabase ships **GoTrue** — magic-link email, session
cookies, token refresh, an `auth.users` table. Spring Security ships everything needed to build
the same thing.

Building both is the default drift: a Spring login endpoint *and* a Supabase project, two user
tables, and a synchronisation problem nobody chose.

## Decision

**Authentication is entirely frontend-side, against GoTrue. The Kotlin backend owns no auth
endpoints.** It is a **JWT-protected resource server** and nothing more.

- **Login:** Supabase magic-link from the Next.js client —
  `signInWithOtp({ options: { data: { display_name } } })`. The human's display name rides the
  signup metadata.
- **Callback:** `auth/callback` exchanges the code for a session (`@supabase/ssr`, cookie-based).
- **Gating:** `middleware.ts` calls **`getUser()`**, not `getSession()`.
- **Backend:** `SecurityConfig` requires a valid JWT on `/api/**`. Every endpoint resolves the
  human from the token. There is no `/login`, no `/register`, no session store.
- **Identity → domain:** a trigger on `auth.users` inserts the matching `humans` row, so the
  domain table cannot drift from the identity table.

**`getUser()` vs `getSession()` is the security-relevant detail.** `getSession()` reads the
cookie and trusts it — it does not verify the JWT against the Auth server, so a forged or stale
cookie satisfies it. `getUser()` revalidates. In middleware, which is the gate, the cheap one is
the wrong one.

**JWT signing mode must be confirmed before wiring `SecurityConfig`.** Supabase's default is
HS256 (`NimbusJwtDecoder.withSecretKey`), but projects can be JWKS/asymmetric. The decoder is
kept env-swappable and the project's actual Auth setting is checked rather than assumed.

## Consequences

- **One identity system.** No password storage, no reset flow, no session table, no token
  refresh logic. None of it written, so none of it wrong.
- **The backend is stateless.** It validates a signature and reads claims — trivially scalable
  and trivially testable (an unauthenticated `/api/**` returns 401 in a one-line test).
- **The hours land on the ledger**, which is what the brief rewards.
- **The frontend holds the session.** Client components attach the bearer token to backend calls
  (`lib/api.ts`), so the token is in browser memory — inherent to a browser-to-API topology and
  the reason the anon key is scoped by RLS ([0012](0012-rls-ownership-subquery.md)).
- **Two consumers of one JWT.** The browser uses it against Supabase directly (PostgREST,
  Realtime) and against Kotlin. Both must validate identically, and RLS is what makes the direct
  path safe.
- **A hard dependency on Supabase Auth.** Swapping providers means changing both the login flow
  and the decoder. Accepted: the boundary is a JWT, which is the portable part.
- Magic-link means **no password to demo with** — checking email is part of the run-from-clean-
  clone path, and the README says so.

## Alternatives considered

**Kotlin owns auth: Spring Security, own user table, own sessions.** Full control, no vendor
dependency, and idiomatic for the team's stack. Rejected: it is a day of work to do *badly* —
password hashing, reset tokens, session invalidation, refresh — for a slice whose interesting
part is money movement. It also creates two identity stores, since Supabase Postgres still has
`auth.users`, and RLS policies key off `auth.uid()`. Either RLS is abandoned (losing the
database-level boundary) or the two systems are synchronised. Neither is worth it.

**Backend proxies auth** — Kotlin calls GoTrue's API, issues its own sessions. Rejected: the
worst of both. GoTrue still owns identity, but now there is a second token format, a second
expiry, and a hop that adds latency to every login without adding a security property. It also
breaks the browser's direct Realtime subscription, which needs a Supabase-issued JWT.

**`getSession()` in middleware.** Faster — no network call per request. Rejected: it trusts the
cookie without verifying it. That is acceptable for a client-side UI hint and unacceptable for
the gate that decides whether a request reaches the app. The extra call is the entire point.

**Backend validates by calling Supabase's `/auth/v1/user`** on each request rather than verifying
the signature locally. Rejected: a network round trip per API call, a hard dependency on Auth
uptime for every request, and no benefit — local signature verification is what JWTs are for.

**Anonymous / no auth**, cats identified by a URL param. Fastest possible demo. Rejected: the
whole authorization model — RLS, ownership checks, the actor/account split
([0010](0010-actor-vs-account.md)) — hangs off an authenticated human. Removing auth removes the
part of the design worth discussing.
