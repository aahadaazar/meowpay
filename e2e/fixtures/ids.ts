// Fresh throwaway data per run: MeowPay's ledger is append-only and audit-forever by design
// (ADR 0009), and this suite runs against the real hosted Supabase project, not an ephemeral
// Testcontainers DB. Nothing is reset between runs, so every run mints new, uniquely-named
// humans and cats instead of reusing fixed accounts.
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

let counter = 0;
function next() {
  counter += 1;
  return counter;
}

export function uniqueEmail(label: string): string {
  return `e2e-${label}-${runId}-${next()}@meowpay.test`;
}

export function uniqueCatName(label: string): string {
  return `${label}-${runId}-${next()}`;
}
