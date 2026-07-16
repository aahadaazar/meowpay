import { applyLedgerChange, applyWalletChange } from "./realtime-dashboard";
import type { DashboardCat, LedgerEntry, LedgerRealtimeRow } from "@/lib/dashboard-types";

const cats: DashboardCat[] = [{ id: "cat-1", name: "Milo", balance: 500, createdAt: "2026-07-15T08:00:00Z" }];
const entry: LedgerEntry = {
  id: "entry-1", transferId: "transfer-1", walletCatId: "cat-1", direction: "credit", amount: 500,
  balanceAfter: 500, counterpartyCatId: "treasury", counterpartyName: "MeowPay Treasury", note: null,
  source: "welcome_grant", initiatedBy: null, createdAt: "2026-07-15T08:00:00Z",
};
const incoming: LedgerRealtimeRow = {
  id: "entry-2", transfer_id: "transfer-2", wallet_cat_id: "cat-1", direction: "debit", amount: 50,
  balance_after: 450, counterparty_cat_id: "cat-2", counterparty_name: "Nori", note: "Snacks",
  source: "manual", initiated_by: "human-1", created_at: "2026-07-15T10:00:00Z",
};

describe("realtime dashboard state", () => {
  it("applies wallet balances without changing the cat roster", () => {
    expect(applyWalletChange(cats, { cat_id: "cat-1", balance: 450 })).toEqual([{ ...cats[0], balance: 450 }]);
  });

  it("inserts realtime ledger rows in timestamp order", () => {
    const result = applyLedgerChange([entry], { eventType: "INSERT", new: incoming, old: { id: incoming.id } });
    expect(result.map((item) => item.id)).toEqual(["entry-2", "entry-1"]);
  });

  it("ignores a redacted realtime payload instead of adding an invalid ledger row", () => {
    const entries = [entry];
    const result = applyLedgerChange(entries, { eventType: "INSERT", new: {}, old: {} });

    expect(result).toBe(entries);
  });
});
