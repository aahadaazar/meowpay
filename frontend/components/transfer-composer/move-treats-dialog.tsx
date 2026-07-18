"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import type { ExecuteTransferInput, TransferResponse } from "@/lib/api";
import { ConfirmTransferDialog } from "./confirm-transfer-dialog";
import { moveTreatsSchema } from "./schema";
import { catOptionLabel, type CatOption, type TransferDraft } from "./types";

type MoveTreatsFormValues = z.input<typeof moveTreatsSchema>;

type MoveTreatsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  ownedCats: CatOption[];
  recipientCats: CatOption[];
  onSubmitTransfer: (input: ExecuteTransferInput) => Promise<TransferResponse>;
};

export function MoveTreatsDialog({ isOpen, onClose, ownedCats, recipientCats, onSubmitTransfer }: MoveTreatsDialogProps) {
  const ownedWalletIds = new Set(ownedCats.map((cat) => cat.walletId));
  const { clearErrors, formState: { errors }, getValues, handleSubmit, register, reset, setError, setValue, watch } = useForm<MoveTreatsFormValues>({ defaultValues: { senderWalletId: ownedCats[0]?.walletId ?? "", receiverWalletId: "", amount: "", note: "" } });
  const [draft, setDraft] = useState<TransferDraft | null>(null);
  const senderWalletId = watch("senderWalletId");
  const enteredAmount = Number(watch("amount"));
  const sender = ownedCats.find((cat) => cat.walletId === senderWalletId);
  const shortfall = Number.isFinite(enteredAmount) && enteredAmount > (sender?.balance ?? 0) ? enteredAmount - (sender?.balance ?? 0) : 0;
  const recipients = recipientCats.filter((cat) => cat.walletId !== senderWalletId);

  if (!isOpen) return null;

  function closeAndReset() {
    reset({ senderWalletId: ownedCats[0]?.walletId ?? "", receiverWalletId: "", amount: "", note: "" });
    onClose();
  }

  function openConfirmation(values: MoveTreatsFormValues) {
    const parsed = moveTreatsSchema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (field === "senderWalletId" || field === "receiverWalletId" || field === "amount" || field === "note") setError(field, { message: issue.message });
      });
      return;
    }
    const nextSender = ownedCats.find((cat) => cat.walletId === parsed.data.senderWalletId);
    const recipient = recipientCats.find((cat) => cat.walletId === parsed.data.receiverWalletId);
    if (!nextSender || !recipient) { setError("receiverWalletId", { message: "Choose a cat from the available roster." }); return; }
    if (parsed.data.amount > (nextSender.balance ?? 0)) { setError("amount", { message: `You need ${Math.max(0, parsed.data.amount - (nextSender.balance ?? 0)).toLocaleString()} more treats.` }); return; }
    setDraft({ ...parsed.data, idempotencyKey: crypto.randomUUID(), senderName: nextSender.name, receiverName: recipient.name });
  }

  async function submitConfirmedTransfer(transfer: TransferDraft) {
    try {
      const response = await onSubmitTransfer({ idempotencyKey: transfer.idempotencyKey, senderWalletId: transfer.senderWalletId, receiverWalletId: transfer.receiverWalletId, amount: transfer.amount, note: transfer.note, source: "manual" });
      if (response.status === "failed") toast.error(response.failureReason ?? "Transfer failed."); else toast.success("Treats sent.");
      setDraft(null);
      closeAndReset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "MeowPay could not send treats.");
      throw error;
    }
  }

  return (
    <>
      <div aria-labelledby="move-treats-title" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog">
        <section className="w-full max-w-[480px] rounded-lg border border-border bg-surface-card p-6 dark:bg-card">
          <p className="text-caption-uppercase uppercase text-muted-foreground">Move treats</p>
          <h2 className="mt-2 text-title-lg" id="move-treats-title">Send cat to cat</h2>
          <form className="mt-6 grid gap-5" noValidate onSubmit={handleSubmit(openConfirmation)}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-title-sm font-semibold" htmlFor="move-sender">From</label>
                <select className="mt-2 h-11 w-full rounded-md border border-input bg-background px-4 text-body-md outline-none focus:border-foreground" id="move-sender" {...register("senderWalletId", { onChange: (event) => { if (getValues("receiverWalletId") === event.target.value) setValue("receiverWalletId", ""); clearErrors("senderWalletId"); } })}>
                  {ownedCats.map((cat) => <option key={cat.walletId} value={cat.walletId}>{catOptionLabel(cat, true)}</option>)}
                </select>
                {errors.senderWalletId ? <p className="mt-2 text-body-sm text-destructive" role="alert">{errors.senderWalletId.message}</p> : null}
              </div>
              <div>
                <label className="text-title-sm font-semibold" htmlFor="move-receiver">To</label>
                <select className="mt-2 h-11 w-full rounded-md border border-input bg-background px-4 text-body-md outline-none focus:border-foreground" id="move-receiver" {...register("receiverWalletId", { onChange: () => clearErrors("receiverWalletId") })}>
                  <option value="">Choose a cat</option>
                  {recipients.map((cat) => <option key={cat.walletId} value={cat.walletId}>{catOptionLabel(cat, ownedWalletIds.has(cat.walletId))}</option>)}
                </select>
                {errors.receiverWalletId ? <p className="mt-2 text-body-sm text-destructive" role="alert">{errors.receiverWalletId.message}</p> : null}
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-[minmax(0,12rem)_1fr]">
              <div>
                <label className="text-title-sm font-semibold" htmlFor="move-amount">Treats</label>
                <input className="mt-2 h-11 w-full rounded-md border border-input bg-background px-4 text-body-md outline-none focus:border-foreground" id="move-amount" inputMode="numeric" min="1" {...register("amount", { onChange: () => clearErrors("amount") })} type="number" />
                {shortfall > 0 ? <p className="mt-2 text-body-sm text-destructive" role="alert">You need {shortfall.toLocaleString()} more treats.</p> : errors.amount ? <p className="mt-2 text-body-sm text-destructive" role="alert">{errors.amount.message}</p> : null}
              </div>
              <div>
                <label className="text-title-sm font-semibold" htmlFor="move-note">Note <span className="font-normal text-body">(optional)</span></label>
                <input className="mt-2 h-11 w-full rounded-md border border-input bg-background px-4 text-body-md outline-none focus:border-foreground" id="move-note" maxLength={280} {...register("note", { onChange: () => clearErrors("note") })} type="text" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button className="button-secondary" onClick={closeAndReset} type="button">Cancel</button>
              <button className="button-primary" disabled={shortfall > 0 || ownedCats.length === 0} type="submit">Review transfer</button>
            </div>
          </form>
        </section>
      </div>
      <ConfirmTransferDialog onClose={() => setDraft(null)} onConfirm={submitConfirmedTransfer} transfer={draft} />
    </>
  );
}
