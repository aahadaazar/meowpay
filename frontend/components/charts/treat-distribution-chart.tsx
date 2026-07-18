import { PiggyBank } from "lucide-react";
import type { DashboardCat } from "@/lib/dashboard-types";

type Slice = { name: string; amount: number; color: number };

export function TreatDistributionChart({ balance, cats }: { balance: number; cats: DashboardCat[] }) {
  const catSlices = cats.slice(0, 4).map((cat, index) => ({ name: cat.name, amount: cat.balance, color: index + 2 }));
  const remaining = cats.slice(4).reduce((sum, cat) => sum + cat.balance, 0);
  const slices: Slice[] = [{ name: "You", amount: balance, color: 1 }, ...catSlices, ...(remaining > 0 ? [{ name: "Other cats", amount: remaining, color: 5 }] : [])];
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
  return <section aria-labelledby="treat-distribution-heading" className="product-mockup-card"><p className="text-caption-uppercase uppercase text-muted-foreground">Distribution</p><h2 className="mt-1 text-title-lg" id="treat-distribution-heading">Where your treats are</h2>{total === 0 ? <div className="mt-8 grid justify-items-center gap-3 py-4 text-center"><PiggyBank aria-hidden className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} /><p className="max-w-xs text-body-md text-body">Top up your wallet, then fund a cat when you are ready.</p></div> : <><div aria-label="Wallet and cat treat distribution" className="mt-6 flex h-8 overflow-hidden rounded-sm bg-chart-grid">{slices.filter((slice) => slice.amount > 0).map((slice) => <span key={slice.name} style={{ backgroundColor: `var(--chart-series-${slice.color})`, width: `${(slice.amount / total) * 100}%` }} />)}</div><ul className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-body-sm">{slices.map((slice) => <li className="flex items-center gap-2" key={slice.name}><span aria-hidden className="h-3 w-3 rounded-full" style={{ backgroundColor: `var(--chart-series-${slice.color})` }} /><span>{slice.name}</span><span className="tabular-nums text-muted-foreground">{slice.amount.toLocaleString()}</span></li>)}</ul></>}</section>;
}
