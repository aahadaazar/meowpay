import { avatarUrl } from "@/components/cat-card";
import { sortLedgerEntries, type DashboardCat, type LedgerEntry } from "@/lib/dashboard-types";

type LedgerTrailProps = {
  cats: DashboardCat[];
  entries: LedgerEntry[];
};

const sourceLabel = {
  manual: "Manual",
  agent: "Agent",
  topup: "Top up",
  welcome_grant: "Welcome grant",
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function DirectionBadge({ direction }: { direction: LedgerEntry["direction"] }) {
  const received = direction === "credit";
  return <span className={`rounded-pill px-3 py-1 text-caption ${received ? "bg-brand-mint" : "bg-brand-coral"}`}>{received ? "Received" : "Sent"}</span>;
}

function SourceBadge({ source }: { source: LedgerEntry["source"] }) {
  const color = source === "agent" ? "bg-brand-lavender" : source === "manual" ? "bg-surface-card" : "bg-surface-strong";
  return <span className={`rounded-pill px-3 py-1 text-caption ${color}`}>{sourceLabel[source]}</span>;
}

function Amount({ entry }: { entry: LedgerEntry }) {
  return <span className="tabular-nums">{entry.direction === "credit" ? "+" : "−"}{entry.amount.toLocaleString()}</span>;
}

export function LedgerTrail({ cats, entries }: LedgerTrailProps) {
  const catsById = new Map(cats.map((cat) => [cat.id, cat]));
  const rows = sortLedgerEntries(entries);

  return (
    <section aria-labelledby="ledger-trail-heading" className="product-mockup-card overflow-hidden">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-caption-uppercase uppercase text-muted-foreground">Ledger trail</p>
          <h2 id="ledger-trail-heading" className="mt-1 text-title-lg">Every treat, reconciled</h2>
        </div>
        <p className="text-body-sm text-muted-foreground">{rows.length} entries</p>
      </div>

      {rows.length === 0 ? <p className="text-body-md text-body">Your cat wallets will show their first welcome grant here.</p> : null}

      <div className="hidden overflow-x-auto md:block" data-testid="ledger-trail-table">
        <table className="w-full border-collapse text-left text-body-sm">
          <thead className="border-b border-hairline-soft text-caption-uppercase uppercase text-muted-foreground">
            <tr><th className="py-3 pr-4">When</th><th className="py-3 pr-4">Cat</th><th className="py-3 pr-4">Counterparty</th><th className="py-3 pr-4">Direction</th><th className="py-3 pr-4">Amount</th><th className="py-3 pr-4">Balance after</th><th className="py-3">Source</th></tr>
          </thead>
          <tbody>
            {rows.map((entry) => {
              const cat = catsById.get(entry.walletCatId);
              return <tr className="border-b border-hairline-soft last:border-0" key={entry.id}>
                <td className="py-3 pr-4 tabular-nums">{formatDate(entry.createdAt)}</td>
                <td className="py-3 pr-4">{cat?.name ?? "Your cat"}</td>
                <td className="py-3 pr-4"><span className="inline-flex items-center gap-2"><img alt="" className="h-6 w-6 rounded-full bg-surface-card" src={avatarUrl(entry.counterpartyName)} />{entry.counterpartyName}</span></td>
                <td className="py-3 pr-4"><DirectionBadge direction={entry.direction} /></td>
                <td className="py-3 pr-4"><Amount entry={entry} /></td>
                <td className="py-3 pr-4 tabular-nums">{entry.balanceAfter.toLocaleString()}</td>
                <td className="py-3"><SourceBadge source={entry.source} /></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden" data-testid="ledger-trail-cards">
        {rows.map((entry) => {
          const cat = catsById.get(entry.walletCatId);
          return <article className="rounded-md border border-border p-4 text-body-sm" key={entry.id}>
            <div className="flex items-start justify-between gap-3"><p className="tabular-nums text-muted-foreground">{formatDate(entry.createdAt)}</p><Amount entry={entry} /></div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2"><dt className="text-muted-foreground">Cat</dt><dd>{cat?.name ?? "Your cat"}</dd><dt className="text-muted-foreground">Counterparty</dt><dd>{entry.counterpartyName}</dd><dt className="text-muted-foreground">Direction</dt><dd><DirectionBadge direction={entry.direction} /></dd><dt className="text-muted-foreground">Balance after</dt><dd className="tabular-nums">{entry.balanceAfter.toLocaleString()}</dd><dt className="text-muted-foreground">Source</dt><dd><SourceBadge source={entry.source} /></dd></dl>
          </article>;
        })}
      </div>
    </section>
  );
}
