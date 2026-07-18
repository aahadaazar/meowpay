"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ExecuteTransferInput, TransferResponse } from "@/lib/api";
import type { DashboardCat } from "@/lib/dashboard-types";

type FundCatDialogProps = {
  cat: DashboardCat | null;
  humanWallet: { walletId: string; balance: number };
  onClose: () => void;
  onSubmitTransfer: (input: ExecuteTransferInput) => Promise<TransferResponse>;
};

export function FundCatDialog({ cat, humanWallet, onClose, onSubmitTransfer }: FundCatDialogProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  useEffect(() => {
    if (!cat) return;
    setAmount("");
    setNote("");
    setIdempotencyKey(crypto.randomUUID());
  }, [cat]);

  if (!cat) return null;

  const parsed = Number(amount);
  const amountIsValid = Number.isInteger(parsed) && parsed > 0;
  const shortfall = amountIsValid && parsed > humanWallet.balance ? parsed - humanWallet.balance : 0;

  async function submit() {
    if (!cat || !amountIsValid || shortfall > 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await onSubmitTransfer({ idempotencyKey, senderWalletId: humanWallet.walletId, receiverWalletId: cat.walletId, amount: parsed, note: note.trim() || null, source: "manual" });
      if (response.status === "failed") { toast.error(response.failureReason ?? "Funding failed."); return; }
      toast.success(`${parsed.toLocaleString()} treats sent to ${cat.name}.`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "MeowPay could not fund that cat.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div aria-labelledby="fund-cat-title" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog">
      <section className="w-full max-w-[420px] rounded-lg border border-border bg-surface-card p-6 dark:bg-card">
        <p className="text-caption-uppercase uppercase text-muted-foreground">Fund a cat</p>
        <h2 className="mt-2 text-title-lg" id="fund-cat-title">Send treats to {cat.name}</h2>
        <p className="mt-2 text-body-sm text-body">From your wallet · {humanWallet.balance.toLocaleString()} treats available</p>
        <div className="mt-6 grid gap-5">
          <div>
            <label className="text-title-sm font-semibold" htmlFor="fund-amount">Treats</label>
            <input autoFocus className="mt-2 h-11 w-full rounded-md border border-input bg-background px-4 text-body-md outline-none focus:border-foreground" id="fund-amount" inputMode="numeric" min="1" onChange={(event) => setAmount(event.target.value)} type="number" value={amount} />
            {shortfall > 0 ? <p className="mt-2 text-body-sm text-destructive" role="alert">You need {shortfall.toLocaleString()} more treats.</p> : null}
          </div>
          <div>
            <label className="text-title-sm font-semibold" htmlFor="fund-note">Note <span className="font-normal text-body">(optional)</span></label>
            <input className="mt-2 h-11 w-full rounded-md border border-input bg-background px-4 text-body-md outline-none focus:border-foreground" id="fund-note" maxLength={280} onChange={(event) => setNote(event.target.value)} type="text" value={note} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button className="button-secondary" disabled={isSubmitting} onClick={onClose} type="button">Cancel</button>
          <button className="button-primary" disabled={!amountIsValid || shortfall > 0 || isSubmitting} onClick={() => void submit()} type="button">
            {isSubmitting ? "Sending…" : "Send treats"}
          </button>
        </div>
      </section>
    </div>
  );
}
