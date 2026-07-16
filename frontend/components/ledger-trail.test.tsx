import { render, screen } from "@testing-library/react";
import { LedgerTrail } from "./ledger-trail";
import { sortLedgerEntries, type LedgerEntry } from "@/lib/dashboard-types";

const older: LedgerEntry = {
  id: "entry-older", transferId: "transfer-1", walletCatId: "cat-1", direction: "credit", amount: 500,
  balanceAfter: 500, counterpartyCatId: "treasury", counterpartyName: "MeowPay Treasury", note: null,
  source: "welcome_grant", initiatedBy: null, createdAt: "2026-07-15T08:00:00Z",
};

const newer: LedgerEntry = { ...older, id: "entry-newer", direction: "debit", amount: 30, balanceAfter: 470, counterpartyName: "Nori", source: "manual", createdAt: "2026-07-15T10:00:00Z" };

describe("LedgerTrail", () => {
  it("sorts newest ledger entries first", () => {
    expect(sortLedgerEntries([older, newer]).map((entry) => entry.id)).toEqual(["entry-newer", "entry-older"]);
  });

  it("provides a table at 768px and stacked cards below it", () => {
    render(<LedgerTrail cats={[{ id: "cat-1", name: "Milo", balance: 470, createdAt: "2026-07-15T08:00:00Z" }]} entries={[older, newer]} />);

    expect(screen.getByTestId("ledger-trail-table").className).toContain("md:block");
    expect(screen.getByTestId("ledger-trail-cards").className).toContain("md:hidden");
    expect(screen.getAllByText("Nori").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sent").length).toBeGreaterThan(0);
  });
});
