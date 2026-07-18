import { Send } from "lucide-react";
import type { TopRecipient } from "./derive";

type TopRecipientsChartProps = {
  recipients: TopRecipient[];
};

export function TopRecipientsChart({ recipients }: TopRecipientsChartProps) {
  const maximum = Math.max(1, ...recipients.map((recipient) => recipient.amount));

  return (
    <section aria-labelledby="top-recipients-heading" className="product-mockup-card min-w-0">
      <div>
        <p className="text-caption-uppercase uppercase text-muted-foreground">Top recipients</p>
        <h2 className="mt-1 text-title-lg" id="top-recipients-heading">Where treats went</h2>
      </div>

      {recipients.length === 0 ? (
        <div className="mt-8 grid justify-items-center gap-3 py-4 text-center">
          <Send aria-hidden className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
          <p className="max-w-xs text-body-md text-body">Recipients will appear after your first sent treat.</p>
        </div>
      ) : (
        <div aria-label="Treats sent by recipient" className="mt-6 grid gap-3">
          {recipients.map((recipient) => (
            <div className="grid min-h-11 grid-cols-[minmax(5rem,0.45fr)_minmax(0,1fr)_auto] items-center gap-3 text-body-sm" key={recipient.walletId}>
              <span className="truncate font-medium">{recipient.name}</span>
              <span aria-hidden className="h-5 overflow-hidden rounded-sm bg-chart-grid"><span className="block h-full rounded-sm" style={{ backgroundColor: `var(--chart-seq-${recipient.colorStep})`, width: `${(recipient.amount / maximum) * 100}%` }} /></span>
              <span className="tabular-nums text-muted-foreground">{recipient.amount.toLocaleString()} treats</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
