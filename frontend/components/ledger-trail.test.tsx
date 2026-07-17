import { render, screen } from "@testing-library/react";
import { LedgerTrail } from "./ledger-trail";
import { sortLedgerEntries, type LedgerEntry } from "@/lib/dashboard-types";

const older: LedgerEntry = { id: "entry-older", transferId: "transfer-1", walletId: "human-wallet", direction: "credit", amount: 500, balanceAfter: 500, counterpartyWalletId: "treasury", counterpartyName: "MeowPay Treasury", note: null, source: "topup", initiatedBy: "human-1", createdAt: "2026-07-15T08:00:00Z" };
const newer: LedgerEntry = { ...older, id: "entry-newer", direction: "debit", amount: 30, balanceAfter: 470, counterpartyWalletId: "cat-nori", counterpartyName: "Nori", source: "manual", createdAt: "2026-07-15T10:00:00Z" };

describe("LedgerTrail", () => {
  it("sorts newest entries first and resolves the human wallet as You", () => {
    expect(sortLedgerEntries([older, newer]).map((entry) => entry.id)).toEqual(["entry-newer", "entry-older"]);
    render(<LedgerTrail cats={[]} entries={[older, newer]} wallet={{ id: "human-wallet", name: "You" }} />);
    expect(screen.getAllByText("You").length).toBeGreaterThan(0);
    expect(screen.queryByText("Welcome grant")).not.toBeInTheDocument();
  });
});
