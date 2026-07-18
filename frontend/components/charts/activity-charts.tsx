"use client";

import { useMemo } from "react";
import { deriveActivityCharts } from "./derive";
import { TopRecipientsChart } from "./top-recipients-chart";
import { TreatDistributionChart } from "./treat-distribution-chart";
import { TreatFlowChart } from "./treat-flow-chart";
import type { DashboardCat, LedgerEntry } from "@/lib/dashboard-types";

export function ActivityCharts({ balance, cats, entries }: { balance: number; cats: DashboardCat[]; entries: LedgerEntry[] }) {
  const chartData = useMemo(() => deriveActivityCharts(entries, new Date()), [entries]);

  return <section aria-label="Treat charts" className="grid gap-4">
    <TreatDistributionChart balance={balance} cats={cats} />
    <div className="grid gap-4 md:grid-cols-2">
      <TreatFlowChart flow={chartData.flow} />
      <TopRecipientsChart recipients={chartData.recipients} />
    </div>
  </section>;
}
