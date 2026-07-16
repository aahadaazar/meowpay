"use client";

import { useMemo } from "react";
import { deriveActivityCharts } from "./derive";
import { TopRecipientsChart } from "./top-recipients-chart";
import { TreatFlowChart } from "./treat-flow-chart";
import type { LedgerEntry } from "@/lib/dashboard-types";

export function ActivityCharts({ entries }: { entries: LedgerEntry[] }) {
  const chartData = useMemo(() => deriveActivityCharts(entries, new Date()), [entries]);

  return <section aria-label="Activity charts" className="grid gap-4 md:grid-cols-2"><TreatFlowChart flow={chartData.flow} /><TopRecipientsChart recipients={chartData.recipients} /></section>;
}
