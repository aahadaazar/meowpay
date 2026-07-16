export type DashboardCat = {
  id: string;
  name: string;
  balance: number;
  createdAt: string;
};

export type WalletRealtimeRow = {
  cat_id: string;
  balance: number;
  updated_at?: string;
};

export type LedgerEntry = {
  id: string;
  transferId: string;
  walletCatId: string;
  direction: "credit" | "debit";
  amount: number;
  balanceAfter: number;
  counterpartyCatId: string;
  counterpartyName: string;
  note: string | null;
  source: "manual" | "agent" | "topup" | "welcome_grant";
  initiatedBy: string | null;
  createdAt: string;
};

export type LedgerRealtimeRow = {
  id: string;
  transfer_id: string;
  wallet_cat_id: string;
  direction: LedgerEntry["direction"];
  amount: number;
  balance_after: number;
  counterparty_cat_id: string;
  counterparty_name: string;
  note: string | null;
  source: LedgerEntry["source"];
  initiated_by: string | null;
  created_at: string;
};

export function ledgerEntryFromRow(row: LedgerRealtimeRow): LedgerEntry {
  return {
    id: row.id,
    transferId: row.transfer_id,
    walletCatId: row.wallet_cat_id,
    direction: row.direction,
    amount: Number(row.amount),
    balanceAfter: Number(row.balance_after),
    counterpartyCatId: row.counterparty_cat_id,
    counterpartyName: row.counterparty_name,
    note: row.note,
    source: row.source,
    initiatedBy: row.initiated_by,
    createdAt: row.created_at,
  };
}

export function sortLedgerEntries(entries: LedgerEntry[]): LedgerEntry[] {
  return [...entries].sort((left, right) => {
    const createdAt = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    return createdAt || right.id.localeCompare(left.id);
  });
}
