"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import type { ExecuteTransferInput, TransferResponse } from "@/lib/api";
import { ConfirmTransferDialog } from "./confirm-transfer-dialog";
import type { CatOption, TransferDraft } from "./types";

export const manualTransferSchema = z.object({
  senderCatId: z.string().uuid("Choose one of your cats."),
  receiverCatId: z.string().uuid("Choose a cat to receive the treats."),
  amount: z.string().trim().regex(/^\d+$/, "Enter a whole number of treats.").transform(Number).pipe(z.number().int().positive("Amount must be at least 1.")),
  note: z.string().trim().max(280, "Keep notes to 280 characters or fewer.").transform((value) => value || null),
}).refine((value) => value.senderCatId !== value.receiverCatId, {
  message: "Choose a different recipient cat.",
  path: ["receiverCatId"],
});

type ManualTransferFormValues = z.input<typeof manualTransferSchema>;

type ManualTransferFormProps = {
  ownedCats: CatOption[];
  recipientCats: CatOption[];
  onSubmitTransfer: (input: ExecuteTransferInput) => Promise<TransferResponse>;
};

export function ManualTransferForm({ ownedCats, recipientCats, onSubmitTransfer }: ManualTransferFormProps) {
  const { clearErrors, formState: { errors }, getValues, handleSubmit, register, reset, setError, setValue, watch } = useForm<ManualTransferFormValues>({
    defaultValues: { senderCatId: ownedCats[0]?.id ?? "", receiverCatId: "", amount: "", note: "" },
  });
  const [draft, setDraft] = useState<TransferDraft | null>(null);
  const senderCatId = watch("senderCatId");
  const recipients = recipientCats.filter((cat) => cat.id !== senderCatId);

  function openConfirmation(values: ManualTransferFormValues) {
    const parsed = manualTransferSchema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (field === "senderCatId" || field === "receiverCatId" || field === "amount" || field === "note") {
          setError(field, { message: issue.message });
        }
      });
      return;
    }

    const sender = ownedCats.find((cat) => cat.id === parsed.data.senderCatId);
    const recipient = recipientCats.find((cat) => cat.id === parsed.data.receiverCatId);
    if (!sender || !recipient) {
      setError("receiverCatId", { message: "Choose cats from the available roster." });
      return;
    }

    // This UUID is created at intent time, as the confirm dialog opens. Retries use this draft's
    // exact key; it is never regenerated in the network submit handler.
    setDraft({ ...parsed.data, idempotencyKey: crypto.randomUUID(), senderName: sender.name, receiverName: recipient.name });
  }

  async function submitConfirmedTransfer(transfer: TransferDraft) {
    try {
      const response = await onSubmitTransfer({
        idempotencyKey: transfer.idempotencyKey,
        senderCatId: transfer.senderCatId,
        receiverCatId: transfer.receiverCatId,
        amount: transfer.amount,
        note: transfer.note,
        source: "manual",
      });
      if (response.status === "failed") {
        toast.error(response.failureReason ?? "Transfer failed.");
      } else {
        toast.success("Treats sent.");
      }
      setDraft(null);
      reset({ senderCatId: transfer.senderCatId, receiverCatId: "", amount: "", note: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "MeowPay could not send treats.");
      throw error;
    }
  }

  if (ownedCats.length === 0) return null;

  return (
    <>
      <section aria-labelledby="manual-transfer-title" className="product-mockup-card">
        <p className="text-caption-uppercase uppercase text-muted-foreground">Manual transfer</p>
        <h2 className="mt-2 text-title-lg" id="manual-transfer-title">Send treats cat to cat</h2>
        <form className="mt-6 grid gap-5" noValidate onSubmit={handleSubmit(openConfirmation)}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="text-title-sm font-semibold" htmlFor="sender-cat">From</label>
              <select className="mt-2 h-11 w-full rounded-md border border-input bg-background px-4 text-body-md outline-none focus:border-foreground" id="sender-cat" {...register("senderCatId", { onChange: (event) => {
                if (getValues("receiverCatId") === event.target.value) setValue("receiverCatId", "");
                clearErrors("senderCatId");
              } })}>
                {ownedCats.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              {errors.senderCatId ? <p className="mt-2 text-body-sm text-destructive" role="alert">{errors.senderCatId.message}</p> : null}
            </div>
            <div>
              <label className="text-title-sm font-semibold" htmlFor="receiver-cat">To</label>
              <select className="mt-2 h-11 w-full rounded-md border border-input bg-background px-4 text-body-md outline-none focus:border-foreground" id="receiver-cat" {...register("receiverCatId", { onChange: () => clearErrors("receiverCatId") })}>
                <option value="">Choose a cat</option>
                {recipients.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              {errors.receiverCatId ? <p className="mt-2 text-body-sm text-destructive" role="alert">{errors.receiverCatId.message}</p> : null}
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-[minmax(0,12rem)_1fr]">
            <div>
              <label className="text-title-sm font-semibold" htmlFor="transfer-amount">Treats</label>
              <input className="mt-2 h-11 w-full rounded-md border border-input bg-background px-4 text-body-md outline-none focus:border-foreground" id="transfer-amount" inputMode="numeric" min="1" {...register("amount", { onChange: () => clearErrors("amount") })} type="number" />
              {errors.amount ? <p className="mt-2 text-body-sm text-destructive" role="alert">{errors.amount.message}</p> : null}
            </div>
            <div>
              <label className="text-title-sm font-semibold" htmlFor="transfer-note">Note <span className="font-normal text-body">(optional)</span></label>
              <input className="mt-2 h-11 w-full rounded-md border border-input bg-background px-4 text-body-md outline-none focus:border-foreground" id="transfer-note" maxLength={280} {...register("note", { onChange: () => clearErrors("note") })} type="text" />
              {errors.note ? <p className="mt-2 text-body-sm text-destructive" role="alert">{errors.note.message}</p> : null}
            </div>
          </div>
          <div className="flex justify-end"><button className="button-primary" type="submit">Review transfer</button></div>
        </form>
      </section>
      <ConfirmTransferDialog onClose={() => setDraft(null)} onConfirm={submitConfirmedTransfer} transfer={draft} />
    </>
  );
}
