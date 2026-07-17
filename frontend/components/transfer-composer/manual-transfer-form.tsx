"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import type { ExecuteTransferInput, TransferResponse } from "@/lib/api";
import { ConfirmTransferDialog } from "./confirm-transfer-dialog";
import type { CatOption, TransferDraft } from "./types";

export const manualTransferSchema = z.object({
  senderWalletId: z.string().uuid("Choose a wallet to send from."),
  receiverWalletId: z.string().uuid("Choose a cat to receive the treats."),
  amount: z.string().trim().regex(/^\d+$/, "Enter a whole number of treats.").transform(Number).pipe(z.number().int().positive("Amount must be at least 1.")),
  note: z.string().trim().max(280, "Keep notes to 280 characters or fewer.").transform((value) => value || null),
}).refine((value) => value.senderWalletId !== value.receiverWalletId, { message: "Choose a different recipient cat.", path: ["receiverWalletId"] });

type ManualTransferFormValues = z.input<typeof manualTransferSchema>;
type Sender = { walletId: string; name: string; balance: number };
type ManualTransferFormProps = { humanWallet: Sender; ownedCats: CatOption[]; recipientCats: CatOption[]; onSubmitTransfer: (input: ExecuteTransferInput) => Promise<TransferResponse>; prefill?: { recipientWalletId: string; version: number } | null };

export function ManualTransferForm({ humanWallet, ownedCats, recipientCats, onSubmitTransfer, prefill }: ManualTransferFormProps) {
  const senders = [humanWallet, ...ownedCats.map((cat) => ({ walletId: cat.walletId, name: cat.name, balance: cat.balance ?? 0 }))];
  const { clearErrors, formState: { errors }, getValues, handleSubmit, register, reset, setError, setValue, watch } = useForm<ManualTransferFormValues>({ defaultValues: { senderWalletId: humanWallet.walletId, receiverWalletId: "", amount: "", note: "" } });
  const [draft, setDraft] = useState<TransferDraft | null>(null);
  const senderWalletId = watch("senderWalletId");
  const enteredAmount = Number(watch("amount"));
  const sender = senders.find((candidate) => candidate.walletId === senderWalletId);
  const shortfall = Number.isFinite(enteredAmount) && enteredAmount > (sender?.balance ?? 0) ? enteredAmount - (sender?.balance ?? 0) : 0;
  const recipients = recipientCats.filter((cat) => cat.walletId !== senderWalletId);

  useEffect(() => {
    if (!prefill) return;
    setValue("senderWalletId", humanWallet.walletId);
    setValue("receiverWalletId", prefill.recipientWalletId);
    document.getElementById("manual-transfer-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [humanWallet.walletId, prefill, setValue]);

  function openConfirmation(values: ManualTransferFormValues) {
    const parsed = manualTransferSchema.safeParse(values);
    if (!parsed.success) { parsed.error.issues.forEach((issue) => { const field = issue.path[0]; if (field === "senderWalletId" || field === "receiverWalletId" || field === "amount" || field === "note") setError(field, { message: issue.message }); }); return; }
    const nextSender = senders.find((candidate) => candidate.walletId === parsed.data.senderWalletId);
    const recipient = recipientCats.find((cat) => cat.walletId === parsed.data.receiverWalletId);
    if (!nextSender || !recipient) { setError("receiverWalletId", { message: "Choose a cat from the available roster." }); return; }
    if (parsed.data.amount > nextSender.balance) { setError("amount", { message: `You need ${Math.max(0, parsed.data.amount - nextSender.balance).toLocaleString()} more treats.` }); return; }
    setDraft({ ...parsed.data, idempotencyKey: crypto.randomUUID(), senderName: nextSender.name, receiverName: recipient.name });
  }

  async function submitConfirmedTransfer(transfer: TransferDraft) {
    try {
      const response = await onSubmitTransfer({ idempotencyKey: transfer.idempotencyKey, senderWalletId: transfer.senderWalletId, receiverWalletId: transfer.receiverWalletId, amount: transfer.amount, note: transfer.note, source: "manual" });
      if (response.status === "failed") toast.error(response.failureReason ?? "Transfer failed."); else toast.success("Treats sent.");
      setDraft(null); reset({ senderWalletId: transfer.senderWalletId, receiverWalletId: "", amount: "", note: "" });
    } catch (error) { toast.error(error instanceof Error ? error.message : "MeowPay could not send treats."); throw error; }
  }

  return <><section aria-labelledby="manual-transfer-title" className="product-mockup-card"><p className="text-caption-uppercase uppercase text-muted-foreground">Move treats</p><h2 className="mt-2 text-title-lg" id="manual-transfer-title">Fund a cat or send cat to cat</h2><form className="mt-6 grid gap-5" noValidate onSubmit={handleSubmit(openConfirmation)}><div className="grid gap-5 sm:grid-cols-2"><div><label className="text-title-sm font-semibold" htmlFor="sender-wallet">From</label><select className="mt-2 h-11 w-full rounded-md border border-input bg-background px-4 text-body-md outline-none focus:border-foreground" id="sender-wallet" {...register("senderWalletId", { onChange: (event) => { if (getValues("receiverWalletId") === event.target.value) setValue("receiverWalletId", ""); clearErrors("senderWalletId"); } })}>{senders.map((candidate) => <option key={candidate.walletId} value={candidate.walletId}>{candidate.name}</option>)}</select>{errors.senderWalletId ? <p className="mt-2 text-body-sm text-destructive" role="alert">{errors.senderWalletId.message}</p> : null}</div><div><label className="text-title-sm font-semibold" htmlFor="receiver-wallet">To</label><select className="mt-2 h-11 w-full rounded-md border border-input bg-background px-4 text-body-md outline-none focus:border-foreground" id="receiver-wallet" {...register("receiverWalletId", { onChange: () => clearErrors("receiverWalletId") })}><option value="">Choose a cat</option>{recipients.map((cat) => <option key={cat.walletId} value={cat.walletId}>{cat.name}</option>)}</select>{errors.receiverWalletId ? <p className="mt-2 text-body-sm text-destructive" role="alert">{errors.receiverWalletId.message}</p> : null}</div></div><div className="grid gap-5 sm:grid-cols-[minmax(0,12rem)_1fr]"><div><label className="text-title-sm font-semibold" htmlFor="transfer-amount">Treats</label><input className="mt-2 h-11 w-full rounded-md border border-input bg-background px-4 text-body-md outline-none focus:border-foreground" id="transfer-amount" inputMode="numeric" min="1" {...register("amount", { onChange: () => clearErrors("amount") })} type="number" />{shortfall > 0 ? <p className="mt-2 text-body-sm text-destructive" role="alert">You need {shortfall.toLocaleString()} more treats.</p> : errors.amount ? <p className="mt-2 text-body-sm text-destructive" role="alert">{errors.amount.message}</p> : null}</div><div><label className="text-title-sm font-semibold" htmlFor="transfer-note">Note <span className="font-normal text-body">(optional)</span></label><input className="mt-2 h-11 w-full rounded-md border border-input bg-background px-4 text-body-md outline-none focus:border-foreground" id="transfer-note" maxLength={280} {...register("note", { onChange: () => clearErrors("note") })} type="text" /></div></div><div className="flex justify-end"><button className="button-primary" disabled={shortfall > 0} type="submit">Review transfer</button></div></form></section><ConfirmTransferDialog onClose={() => setDraft(null)} onConfirm={submitConfirmedTransfer} transfer={draft} /></>;
}
