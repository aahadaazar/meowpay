import { deriveActivityCharts } from "./derive";
import type { LedgerEntry } from "@/lib/dashboard-types";

const now = new Date("2026-07-16T23:59:59.000Z");

function entry(overrides: Partial<LedgerEntry>): LedgerEntry {
  return {
    id: "entry-1", transferId: "transfer-1", walletCatId: "cat-milo", direction: "credit", amount: 10,
    balanceAfter: 10, counterpartyCatId: "treasury", counterpartyName: "MeowPay Treasury", note: null,
    source: "welcome_grant", initiatedBy: null, createdAt: "2026-07-14T10:00:00.000Z", ...overrides,
  };
}

describe("deriveActivityCharts", () => {
  it("builds contiguous daily buckets and puts grants and top-ups in credits", () => {
    const result = deriveActivityCharts([
      entry({ id: "grant", amount: 500, source: "welcome_grant", createdAt: "2026-07-14T10:00:00.000Z" }),
      entry({ id: "topup", transferId: "topup", amount: 100, source: "topup", createdAt: "2026-07-16T10:00:00.000Z" }),
    ], now);

    expect(result.flow).toEqual([
      { date: "2026-07-14", credits: 500, debits: 0, net: 500 },
      { date: "2026-07-15", credits: 0, debits: 0, net: 0 },
      { date: "2026-07-16", credits: 100, debits: 0, net: 100 },
    ]);
  });

  it("groups debit totals by recipient and folds every recipient after seven into Other", () => {
    const entries = Array.from({ length: 9 }, (_, index) => entry({
      id: `debit-${index}`,
      transferId: `transfer-${index}`,
      direction: "debit",
      amount: 90 - index * 10,
      counterpartyCatId: `cat-${index}`,
      counterpartyName: `Cat ${index}`,
      source: "manual",
    }));
    entries.push(entry({ id: "another-to-cat-0", transferId: "another", direction: "debit", amount: 10, counterpartyCatId: "cat-0", counterpartyName: "Cat 0", source: "manual" }));

    const result = deriveActivityCharts(entries, now);

    expect(result.recipients).toHaveLength(8);
    expect(result.recipients[0]).toMatchObject({ catId: "cat-0", amount: 100 });
    expect(result.recipients.at(-1)).toMatchObject({ catId: "other", name: "Other", amount: 30 });
  });

  it("nets ledger pairs for transfers between the human's own cats to zero in aggregate flow", () => {
    const result = deriveActivityCharts([
      entry({ id: "outgoing", transferId: "between-own-cats", direction: "debit", amount: 100, counterpartyCatId: "cat-luna", counterpartyName: "Luna", source: "manual" }),
      entry({ id: "incoming", transferId: "between-own-cats", walletCatId: "cat-luna", direction: "credit", amount: 100, counterpartyCatId: "cat-milo", counterpartyName: "Milo", source: "manual" }),
    ], now);

    expect(result.flow).toEqual([]);
    expect(result.recipients).toMatchObject([{ catId: "cat-luna", amount: 100 }]);
  });

  it("returns sane empty and sparse data without reading a clock or doing I/O", () => {
    expect(deriveActivityCharts([], now)).toEqual({ flow: [], recipients: [] });
    expect(deriveActivityCharts([entry({ createdAt: "2026-07-16T00:00:00.000Z" })], now).flow).toEqual([
      { date: "2026-07-16", credits: 10, debits: 0, net: 10 },
    ]);
  });
});
