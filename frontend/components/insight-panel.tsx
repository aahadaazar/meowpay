"use client";

import { useState } from "react";

type InsightPanelProps = {
  onRequest: () => Promise<string>;
};

export function InsightPanel({ onRequest }: InsightPanelProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function requestInsight() {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      setSummary(await onRequest());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "MeowPay could not generate an insight.");
    } finally {
      setIsLoading(false);
    }
  }

  return <section aria-labelledby="insight-title" className="rounded-xl bg-brand-lavender p-6 text-foreground sm:p-8">
    <p className="text-caption-uppercase uppercase">Activity insight</p>
    <h2 className="mt-2 text-title-lg" id="insight-title">A quick read on recent treats</h2>
    <p className="mt-2 max-w-2xl text-body-md">Generate a concise summary of activity across your cats.</p>
    <button className="button-primary mt-5" disabled={isLoading} onClick={() => void requestInsight()} type="button">{isLoading ? "Generating…" : "Generate insight"}</button>
    {isLoading ? <div aria-label="Loading insight" className="mt-5 grid gap-2" role="status"><div className="h-4 w-full animate-pulse rounded bg-background/60" /><div className="h-4 w-4/5 animate-pulse rounded bg-background/60" /></div> : null}
    {error ? <p className="mt-4 text-body-sm text-destructive" role="alert">{error}</p> : null}
    {summary ? <p className="mt-5 max-w-3xl text-body-md" role="status">{summary}</p> : null}
  </section>;
}
