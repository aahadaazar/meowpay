import type { DashboardCat } from "@/lib/dashboard-types";
import type { TopupInput, TransferResponse } from "@/lib/api";
import { TopupPresets } from "@/components/topup-presets";

export function avatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(seed)}`;
}

export function CatCard({ cat, onTopUp }: {
  cat: DashboardCat;
  onTopUp?: (input: TopupInput) => Promise<TransferResponse>;
}) {
  return (
    <article className="product-mockup-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <img alt="" className="h-11 w-11 rounded-full bg-surface-card" height={44} src={avatarUrl(cat.name)} width={44} />
          <div className="min-w-0">
            <p className="text-caption-uppercase uppercase text-muted-foreground">Cat wallet</p>
            <h2 className="truncate text-title-lg">{cat.name}</h2>
          </div>
        </div>
        <p className="shrink-0 text-title-md tabular-nums">{cat.balance.toLocaleString()} <span className="text-body-sm text-body">treats</span></p>
      </div>
      {onTopUp ? <TopupPresets catId={cat.id} catName={cat.name} onTopUp={onTopUp} /> : null}
    </article>
  );
}
