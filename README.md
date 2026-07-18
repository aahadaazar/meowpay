# MeowPay

MeowPay is a full-stack take-home project for moving fictional treats between people and their
cats. It is built with Next.js, Kotlin/Spring Boot, and Supabase.

## What we built

- Email/password sign-up and sign-in backed by Supabase Auth.
- A responsive dashboard with a human wallet, cat wallets, balances, and a realtime activity
  trail.
- A transfer flow for funding cats and sending treats between cats, with confirmation and
  idempotency protection.
- Top-ups into the signed-in human's wallet.
- Activity charts and an AI-generated account-activity summary.
- Database migrations, access controls, backend integration tests, frontend tests, Docker images,
  and Docker Compose for the application services.

The project is organised as a frontend, backend, and Supabase migration set:

```text
frontend/              Next.js application
backend/               Kotlin / Spring Boot API
supabase/migrations/   database schema and functions
docker-compose.yml     application runtime
```

## How we built it

The build was driven by written specifications: milestones define the delivery order and
acceptance checks, and ADRs capture decisions as they were made. That gave the AI agents a clear
contract to implement, test, and document rather than relying on open-ended prompting.

The agent workflow was deliberately split by job:

- **Claude Opus** for planning: decomposing the take-home into milestones, requirements, and
  implementation decisions.
- **GPT-5.6 Terra** for execution: implementing the application slice-by-slice from those specs.
- **Claude Sonnet** for end-to-end testing and follow-up fixes.

The project records that workflow in [AGENTS.md](AGENTS.md),
[the milestone roadmap](docs/MILESTONES.md), and [the ADRs](docs/adr/). The AI agents were
development collaborators; they are not part of MeowPay's runtime. The in-product activity insight
is a separate, backend-mediated Groq feature.

## Run the application

With the required environment values already provided, start the application with Docker:

```bash
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000). The backend is exposed on port 8080;
its health endpoint is [http://localhost:8080/api/health](http://localhost:8080/api/health).

The Compose stack expects a `.env` file at the repository root. Use
[.env.example](.env.example) as the reference for the required Supabase, JWT, Groq, and frontend
variables. The Supabase migrations in `supabase/migrations/` must already be applied to the
provided Supabase project.

To stop the application:

```bash
docker compose down
```
