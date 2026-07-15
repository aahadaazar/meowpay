# M0 Handoff - Foundation and scaffolding

**Status:** complete on 2026-07-15  
**Milestone record:** [M00](../milestones/M00-foundation-and-scaffolding.md)  
**Decision record:** [ADR 0001](../adr/0001-stack-and-topology.md)

## Delivered

- Spring Boot 3 / Kotlin backend scaffold in `backend/`, using Gradle Kotlin DSL and Java 21.
- Stateless JWT protection for `/api/**`, CORS for the frontend origin, and a protected
  `GET /api/health` endpoint for the security smoke test.
- JWT decoder configuration that accepts either `SUPABASE_JWT_SECRET` (HS256) or
  `SUPABASE_JWT_JWK_SET_URI` (JWKS). M3 must confirm the actual Supabase signing mode before
  relying on either path.
- Next.js App Router / TypeScript / Tailwind scaffold in `frontend/`, including Supabase browser
  and server clients, shadcn configuration, and Vitest/React Testing Library wiring.
- Root runtime files: `.env.example`, `docker-compose.yml`, `README.md`, and the
  `supabase/migrations/` placeholder directory.

## Tests authored, not run

- `backend/src/test/kotlin/com/meowpay/MeowPayApplicationTests.kt` checks that the Spring
  context loads.
- `backend/src/test/kotlin/com/meowpay/config/SecurityConfigTests.kt` checks that an
  unauthenticated `/api/health` request returns `401`.
- `frontend/app/root-layout.test.tsx` checks that the root layout renders.

Tests were intentionally not executed, following the milestone method.

## Verification status

The M0 verify step has not run. This workspace has no local Java, Node, or npm installation; no
real `.env` exists; and Docker Compose has not been run. Docker will provide Java and Node inside
the configured containers, but it still requires Docker/Compose plus real Supabase configuration
in `.env`.

Before starting Docker Compose, obtain the Supabase project values and place them in an untracked
`.env` copied from `.env.example`. This requires user approval because it involves real
credentials. Do not expose `GROQ_API_KEY` to the frontend; it must never use a `NEXT_PUBLIC_`
prefix.

## Commit trail

- `e2253c5 docs(m0): mark foundation in progress`
- `8c04741 feat(m0): scaffold spring boot backend`
- `08da0f2 feat(m0): scaffold next app`
- `a116323 fix(m0): make jwt decoder env swappable`
- `7183671 chore(m0): add repo runtime scaffolding`
- `4ed34d4 test(m0): wire frontend react test transform`
- `73531af docs(m0): mark foundation done`

## Next milestone

M1, [Design system](../milestones/M01-design-system.md), is the next eligible milestone. Before
implementation, mark its roadmap and milestone-file statuses `in progress`, then read its four
linked ADRs plus `DESIGN.md` and `docs/design/APP-EXTENSIONS.md` in full. M1 owns the real
Clay-token implementation, dark mode, theme toggle, fluid typography, and chart-palette
validator; M0's CSS is deliberately only a minimal shell.

## Worktree note

At handoff, unrelated pre-existing edits remain in the ADR files and M01-M10 milestone files.
They were not altered by M0 and should be preserved while continuing the work.
