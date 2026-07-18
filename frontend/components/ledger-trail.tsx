import { Receipt } from "lucide-react";
import { avatarUrl } from "@/components/cat-card";
import { DirectionBadge, formatLedgerDate, LedgerAmount, SourceBadge } from "@/components/ledger-badges";
import { sortLedgerEntries, type DashboardCat, type LedgerEntry } from "@/lib/dashboard-types";

const PREVIEW_COUNT = 5;

type LedgerTrailProps = {
  cats: DashboardCat[];
  wallet: { id: string; name: string };
  entries: LedgerEntry[];
  onViewAll?: () => void;
};

export function LedgerTrail({ cats, wallet, entries, onViewAll }: LedgerTrailProps) {
  const walletsById = new Map<string, { name: string }>([
    [wallet.id, { name: wallet.name }],
    ...cats.map((cat): [string, { name: string }] => [cat.walletId, { name: cat.name }]),
  ]);
  const rows = sortLedgerEntries(entries).slice(0, PREVIEW_COUNT);

  return (
    <section aria-labelledby="ledger-trail-heading" className="product-mockup-card overflow-hidden">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-caption-uppercase uppercase text-muted-foreground">Ledger trail</p>
          <h2 id="ledger-trail-heading" className="mt-1 text-title-lg">Every treat, reconciled</h2>
        </div>
        {onViewAll ? <button className="button-secondary" onClick={onViewAll} type="button">View all activity</button> : null}
      </div>

      {rows.length === 0 ? (
        <div className="grid justify-items-center gap-3 py-10 text-center">
          <Receipt aria-hidden className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
          <p className="max-w-sm text-body-md text-body">Top up your wallet, then fund a cat to begin your trail.</p>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto md:block" data-testid="ledger-trail-table">
            <table className="w-full border-collapse text-left text-body-sm">
              <thead className="border-b border-hairline-soft text-caption-uppercase uppercase text-muted-foreground">
                <tr><th className="py-3 pr-4">When</th><th className="py-3 pr-4">Wallet</th><th className="py-3 pr-4">Counterparty</th><th className="py-3 pr-4">Direction</th><th className="py-3 pr-4">Amount</th><th className="py-3 pr-4">Balance after</th><th className="py-3">Source</th></tr>
              </thead>
              <tbody>
                {rows.map((entry) => {
                  const account = walletsById.get(entry.walletId);
                  return <tr className="border-b border-hairline-soft last:border-0" key={entry.id}>
                    <td className="py-3 pr-4 tabular-nums">{formatLedgerDate(entry.createdAt)}</td>
                    <td className="py-3 pr-4">{account?.name ?? "Your wallet"}</td>
                    <td className="py-3 pr-4"><span className="inline-flex items-center gap-2"><img alt="" className="h-6 w-6 rounded-full bg-surface-card" src={avatarUrl(entry.counterpartyName)} />{entry.counterpartyName}</span></td>
                    <td className="py-3 pr-4"><DirectionBadge direction={entry.direction} /></td>
                    <td className="py-3 pr-4"><LedgerAmount entry={entry} /></td>
                    <td className="py-3 pr-4 tabular-nums">{entry.balanceAfter.toLocaleString()}</td>
                    <td className="py-3"><SourceBadge source={entry.source} /></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden" data-testid="ledger-trail-cards">
            {rows.map((entry) => {
              const account = walletsById.get(entry.walletId);
              return <article className="rounded-md border border-border p-4 text-body-sm" key={entry.id}>
                <div className="flex items-start justify-between gap-3"><p className="tabular-nums text-muted-foreground">{formatLedgerDate(entry.createdAt)}</p><LedgerAmount entry={entry} /></div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2"><dt className="text-muted-foreground">Wallet</dt><dd>{account?.name ?? "Your wallet"}</dd><dt className="text-muted-foreground">Counterparty</dt><dd>{entry.counterpartyName}</dd><dt className="text-muted-foreground">Direction</dt><dd><DirectionBadge direction={entry.direction} /></dd><dt className="text-muted-foreground">Balance after</dt><dd className="tabular-nums">{entry.balanceAfter.toLocaleString()}</dd><dt className="text-muted-foreground">Source</dt><dd><SourceBadge source={entry.source} /></dd></dl>
              </article>;
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
