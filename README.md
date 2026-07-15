# MeowPay

MeowPay is a full-stack treat-money movement slice built with Next.js, Kotlin/Spring Boot,
and Supabase.

This repository is milestone-driven. The execution loop lives in [AGENTS.md](AGENTS.md), the
roadmap lives in [docs/MILESTONES.md](docs/MILESTONES.md), and architectural decisions live in
[docs/adr](docs/adr).

## Current State

M0 provides the foundation:

- `backend/` contains a Spring Boot Kotlin resource-server skeleton.
- `frontend/` contains a Next.js App Router shell with Tailwind and shadcn/ui configuration.
- `supabase/migrations/` is present for the ledger migrations that begin in M2.
- `.env.example` documents the environment variables expected by the two runtimes.

## Local Setup Stub

Copy `.env.example` to `.env` and fill it with project-specific values before running either
runtime. Do not commit `.env`.

The full clean-clone runbook is completed in M10. Until then, local commands are:

```bash
cd backend
./gradlew bootRun
```

```bash
cd frontend
npm install
npm run dev
```
