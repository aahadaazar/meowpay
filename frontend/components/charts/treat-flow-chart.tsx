"use client";

import { Activity } from "lucide-react";
import { useState } from "react";
import type { FlowBucket } from "./derive";

type TreatFlowChartProps = {
  flow: FlowBucket[];
};

function formatDay(date: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00.000Z`));
}

const BASELINE_Y = 170;
const MAX_BAR_HEIGHT = 130;

export function TreatFlowChart({ flow }: TreatFlowChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selected = selectedIndex === null ? null : flow[selectedIndex];
  const magnitude = Math.max(1, ...flow.flatMap((bucket) => [bucket.credits, bucket.debits]));
  const columnWidth = 520 / Math.max(flow.length, 1);

  return (
    <section aria-labelledby="treat-flow-heading" className="product-mockup-card min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-caption-uppercase uppercase text-muted-foreground">Treat flow</p>
          <h2 className="mt-1 text-title-lg" id="treat-flow-heading">What entered and left</h2>
        </div>
        <div aria-label="Treat flow legend" className="flex gap-3 text-caption text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><i aria-hidden className="h-2.5 w-2.5 rounded-full bg-chart-credit" />Credits</span>
          <span className="inline-flex items-center gap-1.5"><i aria-hidden className="h-2.5 w-2.5 rounded-full bg-chart-debit" />Debits</span>
        </div>
      </div>

      {flow.length === 0 ? <div className="mt-8 grid justify-items-center gap-3 py-4 text-center"><Activity aria-hidden className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} /><p className="max-w-xs text-body-md text-body">Activity from your ledger window will appear here.</p></div> : (
        <>
          <svg aria-describedby="treat-flow-tooltip" aria-label="Daily credits and debits, both measured from a shared baseline." className="mt-6 h-auto w-full text-muted-foreground" role="img" viewBox="0 0 600 244">
            <line stroke="var(--chart-axis)" strokeWidth="1" x1="40" x2="580" y1={BASELINE_Y} y2={BASELINE_Y} />
            {flow.map((bucket, index) => {
              const center = 40 + columnWidth * index + columnWidth / 2;
              const markWidth = Math.max(3, Math.min(16, columnWidth / 3));
              const creditHeight = (bucket.credits / magnitude) * MAX_BAR_HEIGHT;
              const debitHeight = (bucket.debits / magnitude) * MAX_BAR_HEIGHT;
              const isSelected = index === selectedIndex;
              return <g key={bucket.date}>
                <rect fill="var(--chart-credit)" height={creditHeight} rx="2" width={markWidth} x={center - markWidth - 1} y={BASELINE_Y - creditHeight} />
                <rect fill="var(--chart-debit)" height={debitHeight} rx="2" width={markWidth} x={center + 1} y={BASELINE_Y - debitHeight} />
                <rect aria-label={`${formatDay(bucket.date)}: ${bucket.credits} credits and ${bucket.debits} debits`} fill="transparent" height={MAX_BAR_HEIGHT + 20} onBlur={() => setSelectedIndex(null)} onFocus={() => setSelectedIndex(index)} onMouseEnter={() => setSelectedIndex(index)} onMouseLeave={() => setSelectedIndex(null)} role="button" tabIndex={0} width={Math.max(columnWidth, 24)} x={center - Math.max(columnWidth, 24) / 2} y={BASELINE_Y - MAX_BAR_HEIGHT - 20} />
                {isSelected ? <rect fill="none" height={MAX_BAR_HEIGHT + 20} stroke="var(--chart-axis)" strokeWidth="1" width={Math.max(columnWidth - 2, 2)} x={center - Math.max(columnWidth - 2, 2) / 2} y={BASELINE_Y - MAX_BAR_HEIGHT - 20} /> : null}
                {(index === 0 || index === flow.length - 1 || index === Math.floor((flow.length - 1) / 2)) ? <text fill="currentColor" fontSize="11" textAnchor="middle" x={center} y={BASELINE_Y + 20}>{formatDay(bucket.date)}</text> : null}
              </g>;
            })}
          </svg>
          <p aria-live="polite" className="mt-2 min-h-6 text-body-sm text-muted-foreground" id="treat-flow-tooltip">
            {selected ? `${formatDay(selected.date)} · ${selected.credits.toLocaleString()} credits · ${selected.debits.toLocaleString()} debits · net ${selected.net >= 0 ? "+" : "−"}${Math.abs(selected.net).toLocaleString()}` : "Focus or hover a day for its totals."}
          </p>
        </>
      )}
    </section>
  );
}
