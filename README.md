# MeowPay

MeowPay is a full-stack project for moving fictional treats between people and their
cats. It is built with Next.js, Kotlin/Spring Boot, and Supabase.

## What we built

- Email/password sign-up and sign-in backed by Supabase Auth.
- A responsive dashboard with a human wallet, cat wallets, balances, and a realtime activity
  trail.
- A transfer flow for funding cats and sending treats between cats, with confirmation and
  idempotency protection.
- Top-ups into the signed-in human's wallet.
- Activity charts and an AI-generated account-activity summary.
- A light/dark theme toggle across the product surface.
- Database migrations, access controls, backend integration tests, frontend tests, Docker images,
  and Docker Compose for the application services.

The project is organised as a frontend, backend, and Supabase migration set:

```text
frontend/              Next.js application
backend/               Kotlin / Spring Boot API
supabase/migrations/   database schema and functions
e2e/                    Playwright end-to-end suite
docs/                   milestones, ADRs, and design docs
scripts/                build and validation scripts (e.g. palette validator)
docker-compose.yml      application runtime
```

## Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, Supabase SSR, React Hook Form,
  Zod, and Lucide icons.
- **Backend:** Kotlin, Spring Boot 3, Spring Security, Spring JDBC, and PostgreSQL.
- **Platform:** Supabase for authentication, database, row-level access control, and realtime;
  Groq for the activity-summary feature.
- **Delivery:** Docker, Docker Compose, Gradle, and npm.

## How we built it

- Started with written specifications: milestones define delivery order and acceptance checks, and
  ADRs capture implementation decisions.
- **Claude Opus** for planning: decomposing the requirements into milestones, requirements, and
  implementation decisions.
- **GPT-5.6 Terra** for execution: implementing the application slice-by-slice from those specs.
- **Claude Sonnet** for end-to-end testing and follow-up fixes.
- Recorded the workflow in [AGENTS.md](AGENTS.md),
  [the milestone roadmap](docs/MILESTONES.md), and [the ADRs](docs/adr/). The AI agents were
  development collaborators, not part of MeowPay's runtime.

## Milestones

Full detail — scope, ADR links, and progress notes — lives in [docs/MILESTONES.md](docs/MILESTONES.md)
and `docs/milestones/`. [docs/milestones/CHECKLIST.md](docs/milestones/CHECKLIST.md) is a separate,
manual testing checklist run by hand against a running application; it is not part of the milestone
tracker.

| Milestone | Description | Date done | Status |
|---|---|---|---|
| M0 | Foundation & scaffolding | 2026-07-15 | done |
| M1 | Design system | 2026-07-15 | done |
| M2 | Ledger core — the centerpiece | 2026-07-15 | done |
| M3 | Auth & cat management | 2026-07-15 | done |
| M4 | Realtime dashboard: total, cats, trail | 2026-07-16 | done |
| M5 | Manual transfer | 2026-07-16 | done |
| M6 | Top-up | 2026-07-16 | done |
| M7 | Activity charts | 2026-07-16 | done |
| M8 | Agentic NL composer | 2026-07-17 | abandoned |
| M9 | Agentic activity insight | 2026-07-17 | done |
| M10 | Dockerization & README | 2026-07-18 | done |
| M11 | e2e suite against local Supabase | 2026-07-17 | abandoned |
| M12 | Treasury as an entity; humans hold wallets | 2026-07-17 | done |

## How the application works

```mermaid
flowchart LR
    U[User in browser]
    F[Next.js frontend]
    A[Supabase Auth]
    R[Supabase reads and Realtime]
    B[Kotlin Spring Boot API]
    D[(Supabase Postgres)]
    G[Groq activity insight]

    U --> F
    F --> A
    F --> R
    R --> D
    F -->|authenticated writes| B
    B --> D
    B --> G
    R -->|live balance and ledger updates| F
```

## Wallet flow

```mermaid
flowchart LR
    T[Treasury wallet]
    H[Human wallet]
    C1[Cat wallet]
    C2[Another cat wallet]

    T -->|top up| H
    H -->|fund cat| C1
    C1 -->|send treats| C2
```

The activity insight is backend-mediated; it summarizes activity but does not move money.

## Testing

- **Backend:** JUnit 5 via `spring-boot-starter-test`, Spring Security Test, and Testcontainers
  PostgreSQL for integration tests against the real migrations.
- **Frontend:** Vitest, React Testing Library, `@testing-library/user-event`,
  `@testing-library/jest-dom`, and jsdom.
- **End to end:** Playwright.

## Run the application

With the required environment values already provided:

1. Place the supplied `.env` file in the repository root. If you need to create one, use
   [.env.example](.env.example) as the variable reference.
2. Ensure the supplied Supabase project has already had the SQL files in
   `supabase/migrations/` applied in filename order. Migrations are **not** run by the production
   Docker containers at startup.
3. Build and start the application:

   ```bash
   docker compose up --build
   ```

4. Open [http://localhost:3000](http://localhost:3000). The backend is exposed on port 8080;
   its health endpoint is [http://localhost:8080/api/health](http://localhost:8080/api/health).

The `.env` file contains the required Supabase, JWT, Groq, and frontend values.

To stop the application:

```bash
docker compose down
```
