"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { TopupPresets } from "@/components/topup-presets";
import type { TopupInput, TransferResponse } from "@/lib/api";
import type { LedgerEntry } from "@/lib/dashboard-types";

const TOPUP_MAX = 1000;

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
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const parsed = Number(amount);
  const amountIsValid = Number.isInteger(parsed) && parsed > 0 && parsed <= TOPUP_MAX;
  const walletEntries = entries.filter((entry) => entry.walletId === walletId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!amountIsValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await onTopUp({ idempotencyKey: crypto.randomUUID(), amount: parsed });
      if (response.status === "failed") toast.error(response.failureReason ?? "Top-up failed.");
      else { toast.success(`${parsed.toLocaleString()} treats added to your wallet.`); setAmount(""); }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "MeowPay could not top up your wallet.");
    } finally { setIsSubmitting(false); }
  }

  return <section aria-label="Your wallet" className="overflow-hidden rounded-xl bg-brand-peach p-6 text-foreground sm:p-8">
    <div className="grid gap-6 lg:grid-cols-[1fr_260px] lg:items-end">
      <div>
        <p className="text-caption-uppercase uppercase">What you hold</p>
        <p className="mt-2 text-display-lg" data-testid="wallet-balance">{balance.toLocaleString()} treats</p>
        <p className="mt-3 text-body-md">MeowPay Bank · ···· 4242</p>
        <svg aria-label="Your wallet movement sparkline" className="mt-6 h-16 w-full max-w-md" viewBox="0 0 100 32" preserveAspectRatio="none" role="img"><polyline fill="none" points={sparklinePoints(walletEntries)} stroke="currentColor" strokeLinecap="round" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>
      </div>
      <form className="grid gap-3" noValidate onSubmit={(event) => void submit(event)}>
        <label className="text-title-sm font-semibold" htmlFor="topup-amount">Add treats</label>
        <TopupPresets onPick={(preset) => setAmount(String(preset))} />
        <input aria-describedby="topup-amount-help" className="h-11 rounded-md border border-input bg-background px-4 text-body-md outline-none focus:border-foreground" id="topup-amount" inputMode="numeric" max={TOPUP_MAX} min="1" onChange={(event) => setAmount(event.target.value)} placeholder="Enter an amount" type="number" value={amount} />
        <p className="text-body-sm" id="topup-amount-help">Enter 1–{TOPUP_MAX.toLocaleString()} treats.</p>
        <button className="button-primary justify-self-start" disabled={!amountIsValid || isSubmitting} type="submit">{isSubmitting ? "Adding…" : "Add treats"}</button>
      </form>
    </div>
  </section>;
}
