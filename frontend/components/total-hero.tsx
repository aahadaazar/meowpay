import type { LedgerEntry } from "@/lib/dashboard-types";

type TotalHeroProps = {
  cats: { balance: number }[];
  entries: LedgerEntry[];
};

function sparklinePoints(entries: LedgerEntry[]) {
  const latest = [...entries].slice(0, 12).reverse();
  if (latest.length === 0) return "0,28 100,28";

  let running = 0;
  const values = latest.map((entry) => {
    running += entry.direction === "credit" ? entry.amount : -entry.amount;
    return running;
  });
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(0, ...values);
  const range = maximum - minimum || 1;

  return values
    .map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${28 - ((value - minimum) / range) * 24}`)
    .join(" ");
}

export function TotalHero({ cats, entries }: TotalHeroProps) {
  const total = cats.reduce((sum, cat) => sum + cat.balance, 0);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const delta = entries
    .filter((entry) => new Date(entry.createdAt).getTime() >= weekAgo)
    .reduce((sum, entry) => sum + (entry.direction === "credit" ? entry.amount : -entry.amount), 0);
  const deltaLabel = `${delta >= 0 ? "+" : "−"}${Math.abs(delta).toLocaleString()} treats`;

  return (
    <section aria-label="Total treats" className="overflow-hidden rounded-xl bg-brand-peach p-6 text-foreground sm:p-8">
      <div className="grid gap-6 sm:grid-cols-[1fr_180px] sm:items-end">
        <div>
          <p className="text-caption-uppercase uppercase">Across all cat wallets</p>
          <p className="mt-2 text-display-lg">{total.toLocaleString()} treats</p>
          <p className="mt-3 text-body-md">{deltaLabel} in the last 7 days</p>
        </div>
        <svg aria-label="Treat movement sparkline" className="h-16 w-full" viewBox="0 0 100 32" preserveAspectRatio="none" role="img">
          <polyline fill="none" points={sparklinePoints(entries)} stroke="currentColor" strokeLinecap="round" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </section>
  );
}
