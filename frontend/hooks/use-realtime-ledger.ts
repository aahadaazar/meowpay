"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LedgerRealtimeRow } from "@/lib/dashboard-types";

type LedgerPayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: LedgerRealtimeRow;
  old: Pick<LedgerRealtimeRow, "id">;
};

export function useRealtimeLedger(onLedgerChange: (payload: LedgerPayload) => void) {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-ledger")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ledger_entries" },
        (payload) => onLedgerChange(payload as LedgerPayload),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [onLedgerChange]);
}
