"use client";

import { useState } from "react";
import type { TransferDraft } from "./types";

type ConfirmTransferDialogProps = {
  transfer: TransferDraft | null;
  onClose: () => void;
  onConfirm: (transfer: TransferDraft) => Promise<void>;
};

export function ConfirmTransferDialog({ transfer, onClose, onConfirm }: ConfirmTransferDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!transfer) return null;

  async function confirm() {
    if (isConfirming) return;

    setIsConfirming(true);
    try {
      await onConfirm(transfer);
    } catch {
      // The caller owns the user-facing error. Keep this dialog open so the same intent can retry.
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-labelledby="confirm-transfer-title">
      <section className="w-full max-w-[420px] rounded-lg border border-border bg-surface-card p-6 dark:bg-card">
        <p className="text-caption-uppercase uppercase text-muted-foreground">Confirm transfer</p>
        <h2 className="mt-2 text-title-lg" id="confirm-transfer-title">Send {transfer.amount.toLocaleString()} treats?</h2>
        <dl className="mt-6 grid gap-3 text-body-md">
          <div className="flex items-center justify-between gap-4"><dt className="text-body">From</dt><dd className="font-semibold">{transfer.senderName}</dd></div>
          <div className="flex items-center justify-between gap-4"><dt className="text-body">To</dt><dd className="font-semibold">{transfer.receiverName}</dd></div>
          {transfer.note ? <div className="border-t border-border pt-3"><dt className="text-body">Note</dt><dd className="mt-1">{transfer.note}</dd></div> : null}
        </dl>
        <div className="mt-6 flex justify-end gap-3">
          <button className="button-secondary" disabled={isConfirming} onClick={onClose} type="button">Cancel</button>
          <button className="button-primary" disabled={isConfirming} onClick={() => void confirm()} type="button">
            {isConfirming ? "Sending…" : "Confirm send"}
          </button>
        </div>
      </section>
    </div>
  );
}
