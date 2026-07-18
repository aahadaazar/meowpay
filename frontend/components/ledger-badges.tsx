import type { LedgerEntry } from "@/lib/dashboard-types";

const sourceLabel = {
  manual: "Manual",
  agent: "Agent",
  topup: "Top up",
} as const;

export function formatLedgerDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function DirectionBadge({ direction }: { direction: LedgerEntry["direction"] }) {
  const received = direction === "credit";
  return <span className={`rounded-pill px-3 py-1 text-caption ${received ? "bg-brand-mint" : "bg-brand-coral"}`}>{received ? "Received" : "Sent"}</span>;
}

export function SourceBadge({ source }: { source: LedgerEntry["source"] }) {
  const color = source === "agent" ? "bg-brand-lavender" : source === "manual" ? "bg-surface-card" : "bg-surface-strong";
  return <span className={`rounded-pill px-3 py-1 text-caption ${color}`}>{sourceLabel[source]}</span>;
}

export function LedgerAmount({ entry }: { entry: LedgerEntry }) {
  return <span className="tabular-nums">{entry.direction === "credit" ? "+" : "−"}{entry.amount.toLocaleString()}</span>;
}
