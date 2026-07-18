"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { TopupInput, TransferResponse } from "@/lib/api";
import type { LedgerEntry } from "@/lib/dashboard-types";

const TOPUP_AMOUNT = 1000;

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
  return values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${28 - ((value - minimum) / (maximum - minimum || 1)) * 24}`).join(" ");
}

export function WalletHero({ balance, entries, walletId, onTopUp }: { balance: number; entries: LedgerEntry[]; walletId: string; onTopUp: (input: TopupInput) => Promise<TransferResponse> }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const walletEntries = entries.filter((entry) => entry.walletId === walletId);

  async function addTreats() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await onTopUp({ idempotencyKey: crypto.randomUUID(), amount: TOPUP_AMOUNT });
      if (response.status === "failed") toast.error(response.failureReason ?? "Top-up failed.");
      else toast.success(`${TOPUP_AMOUNT.toLocaleString()} treats added to your wallet.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "MeowPay could not top up your wallet.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return <section aria-label="Your wallet" className="overflow-hidden rounded-xl bg-brand-peach p-6 text-foreground sm:p-8">
    <div className="grid gap-6 lg:grid-cols-[1fr_260px] lg:items-end">
      <div>
        <p className="text-caption-uppercase uppercase">What you hold</p>
        <p className="mt-2 text-display-lg" data-testid="wallet-balance">{balance.toLocaleString()} treats</p>
        <p className="mt-3 text-body-md">MeowPay Bank · ···· 4242</p>
        <svg aria-label="Your wallet movement sparkline" className="mt-6 h-16 w-full max-w-md" viewBox="0 0 100 32" preserveAspectRatio="none" role="img"><polyline fill="none" points={sparklinePoints(walletEntries)} stroke="currentColor" strokeLinecap="round" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>
      </div>
      <div className="grid gap-3">
        <p className="text-title-sm font-semibold">Add treats</p>
        <button className="button-primary justify-self-start" disabled={isSubmitting} onClick={() => void addTreats()} type="button">
          {isSubmitting ? "Adding…" : `Add ${TOPUP_AMOUNT.toLocaleString()} treats`}
        </button>
      </div>
    </div>
  </section>;
}
