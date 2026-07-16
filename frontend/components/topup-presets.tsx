"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import type { TopupInput, TransferResponse } from "@/lib/api";

const presets = [100, 500, 1000] as const;

type TopupPresetsProps = {
  catId: string;
  catName: string;
  onTopUp: (input: TopupInput) => Promise<TransferResponse>;
};

export function TopupPresets({ catId, catName, onTopUp }: TopupPresetsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);

  async function fund(amount: (typeof presets)[number]) {
    if (submitting.current) return;

    submitting.current = true;
    setIsSubmitting(true);
    try {
      await onTopUp({ idempotencyKey: crypto.randomUUID(), catId, amount });
      toast.success(`${catName} received ${amount.toLocaleString()} treats.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "MeowPay could not top up this wallet.");
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-5" aria-label={`Top up ${catName}`}>
      <p className="text-caption-uppercase uppercase text-muted-foreground">Top up</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {presets.map((amount) => (
          <button
            className="button-secondary shrink-0"
            disabled={isSubmitting}
            key={amount}
            onClick={() => void fund(amount)}
            type="button"
          >
            +{amount.toLocaleString()}
          </button>
        ))}
      </div>
    </div>
  );
}
