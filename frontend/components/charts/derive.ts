import type { LedgerEntry } from "@/lib/dashboard-types";

const MAX_RECIPIENTS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export type FlowBucket = {
  date: string;
  credits: number;
  debits: number;
  net: number;
};

export type TopRecipient = {
  walletId: string;
  name: string;
  amount: number;
  colorStep: 1 | 2 | 3 | 4;
};

export type ActivityChartData = {
  flow: FlowBucket[];
  recipients: TopRecipient[];
};

function dayKey(value: string) {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function dayTimestamp(key: string) {
  return Date.parse(`${key}T00:00:00.000Z`);
}

function internalTransferIds(entries: LedgerEntry[]) {
  const directionsByTransfer = new Map<string, Set<LedgerEntry["direction"]>>();
  for (const entry of entries) {
    const directions = directionsByTransfer.get(entry.transferId) ?? new Set<LedgerEntry["direction"]>();
    directions.add(entry.direction);
    directionsByTransfer.set(entry.transferId, directions);
  }

  return new Set([...directionsByTransfer].filter(([, directions]) => directions.has("credit") && directions.has("debit")).map(([transferId]) => transferId));
}

function colorStep(amount: number, smallest: number, largest: number): TopRecipient["colorStep"] {
  if (smallest === largest) return 2;
  return (1 + Math.round(((amount - smallest) / (largest - smallest)) * 3)) as TopRecipient["colorStep"];
}

/**
 * Produces chart data from the same visible ledger window as the trail.
 * `now` makes future-dated rows deterministic in tests without reading the clock here.
 */
export function deriveActivityCharts(entries: LedgerEntry[], now: Date): ActivityChartData {
  const nowTime = now.getTime();
  const visibleEntries = entries.filter((entry) => {
    const timestamp = new Date(entry.createdAt).getTime();
    return Number.isFinite(timestamp) && timestamp <= nowTime;
  });
  const internalTransfers = internalTransferIds(visibleEntries);
  const flowByDay = new Map<string, Omit<FlowBucket, "date">>();

  for (const entry of visibleEntries) {
    if (internalTransfers.has(entry.transferId)) continue;
    const key = dayKey(entry.createdAt);
    const bucket = flowByDay.get(key) ?? { credits: 0, debits: 0, net: 0 };
    if (entry.direction === "credit") {
      bucket.credits += entry.amount;
      bucket.net += entry.amount;
    } else {
      bucket.debits += entry.amount;
      bucket.net -= entry.amount;
    }
    flowByDay.set(key, bucket);
  }

  const populatedDays = [...flowByDay.keys()].sort();
  const flow: FlowBucket[] = [];
  if (populatedDays.length > 0) {
    for (let timestamp = dayTimestamp(populatedDays[0]); timestamp <= dayTimestamp(populatedDays[populatedDays.length - 1]); timestamp += DAY_MS) {
      const date = new Date(timestamp).toISOString().slice(0, 10);
      flow.push({ date, ...(flowByDay.get(date) ?? { credits: 0, debits: 0, net: 0 }) });
    }
  }

  const recipientsByCat = new Map<string, { name: string; amount: number }>();
  for (const entry of visibleEntries) {
    if (entry.direction !== "debit") continue;
    const current = recipientsByCat.get(entry.counterpartyWalletId) ?? { name: entry.counterpartyName, amount: 0 };
    current.amount += entry.amount;
    recipientsByCat.set(entry.counterpartyWalletId, current);
  }

  const rankedRecipients = [...recipientsByCat.entries()]
    .map(([walletId, recipient]) => ({ walletId, ...recipient }))
    .sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name) || left.walletId.localeCompare(right.walletId));
  const head = rankedRecipients.slice(0, MAX_RECIPIENTS);
  const tail = rankedRecipients.slice(MAX_RECIPIENTS);
  if (tail.length > 0) head.push({ walletId: "other", name: "Other", amount: tail.reduce((total, recipient) => total + recipient.amount, 0) });

  const amounts = head.map((recipient) => recipient.amount);
  const smallest = Math.min(...amounts);
  const largest = Math.max(...amounts);
  const recipients = head.map((recipient) => ({ ...recipient, colorStep: colorStep(recipient.amount, smallest, largest) }));

  return { flow, recipients };
}
