"use client";

import { useState } from "react";
import type { TopRecipient } from "./derive";

type TopRecipientsChartProps = {
  recipients: TopRecipient[];
};

export function TopRecipientsChart({ recipients }: TopRecipientsChartProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const maximum = Math.max(1, ...recipients.map((recipient) => recipient.amount));
  const selected = recipients.find((recipient) => recipient.catId === selectedId);

  return (
    <section aria-labelledby="top-recipients-heading" className="product-mockup-card min-w-0">
      <div>
        <p className="text-caption-uppercase uppercase text-muted-foreground">Top recipients</p>
        <h2 className="mt-1 text-title-lg" id="top-recipients-heading">Where treats went</h2>
      </div>

      {recipients.length === 0 ? <p className="mt-8 text-body-md text-body">Recipients will appear after your first sent treat.</p> : (
        <>
          <div aria-label="Treats sent by recipient" className="mt-6 grid gap-3">
            {recipients.map((recipient) => (
              <button aria-describedby="top-recipients-tooltip" aria-label={`${recipient.name}, ${recipient.amount.toLocaleString()} treats sent`} className="group grid min-h-11 grid-cols-[minmax(5rem,0.45fr)_minmax(0,1fr)_auto] items-center gap-3 text-left text-body-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" key={recipient.catId} onBlur={() => setSelectedId(null)} onFocus={() => setSelectedId(recipient.catId)} onMouseEnter={() => setSelectedId(recipient.catId)} onMouseLeave={() => setSelectedId(null)} type="button">
                <span className="truncate font-medium">{recipient.name}</span>
                <span aria-hidden className="h-5 overflow-hidden rounded-sm bg-chart-grid"><span className="block h-full rounded-sm" style={{ backgroundColor: `var(--chart-seq-${recipient.colorStep})`, width: `${(recipient.amount / maximum) * 100}%` }} /></span>
                <span className="tabular-nums text-muted-foreground">{recipient.amount.toLocaleString()}</span>
              </button>
            ))}
          </div>
          <p aria-live="polite" className="mt-4 min-h-6 text-body-sm text-muted-foreground" id="top-recipients-tooltip">{selected ? `${selected.name} received ${selected.amount.toLocaleString()} treats.` : "Focus or hover a recipient for its total."}</p>
        </>
      )}
    </section>
  );
}
