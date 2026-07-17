import { applyLedgerChange, applyWalletChange } from "./realtime-dashboard";
import type { DashboardCat, LedgerEntry, LedgerRealtimeRow } from "@/lib/dashboard-types";

const cats: DashboardCat[] = [{ id: "cat-1", walletId: "wallet-1", name: "Milo", balance: 500, createdAt: "2026-07-15T08:00:00Z" }];
const entry: LedgerEntry = { id: "entry-1", transferId: "transfer-1", walletId: "wallet-1", direction: "credit", amount: 500, balanceAfter: 500, counterpartyWalletId: "treasury", counterpartyName: "MeowPay Treasury", note: null, source: "topup", initiatedBy: "human-1", createdAt: "2026-07-15T08:00:00Z" };
const incoming: LedgerRealtimeRow = { id: "entry-2", transfer_id: "transfer-2", wallet_id: "wallet-1", direction: "debit", amount: 50, balance_after: 450, counterparty_wallet_id: "wallet-2", counterparty_name: "Nori", note: "Snacks", source: "manual", initiated_by: "human-1", created_at: "2026-07-15T10:00:00Z" };

describe("realtime dashboard state", () => {
  it("keys wallet updates by wallet id", () => expect(applyWalletChange(cats, { id: "wallet-1", balance: 450 })).toEqual([{ ...cats[0], balance: 450 }]));
  it("inserts valid wallet-keyed ledger rows in timestamp order", () => expect(applyLedgerChange([entry], { eventType: "INSERT", new: incoming, old: { id: incoming.id } }).map((item) => item.id)).toEqual(["entry-2", "entry-1"]));
});
