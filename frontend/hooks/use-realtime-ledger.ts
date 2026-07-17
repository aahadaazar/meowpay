"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LedgerRealtimeRow } from "@/lib/dashboard-types";

type LedgerPayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: LedgerRealtimeRow;
  old: Pick<LedgerRealtimeRow, "id">;
};

export function useRealtimeLedger(onLedgerChange: (payload: LedgerPayload) => void) {
  const callbackRef = useRef(onLedgerChange);
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout>>();
  callbackRef.current = onLedgerChange;

  useEffect(() => {
    let disposed = false;
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = undefined;
    }

    void (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (disposed || channelRef.current || !session) return;

      supabase.realtime.setAuth(session.access_token);
      clientRef.current = supabase;
      channelRef.current = supabase
        .channel("dashboard-ledger")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "ledger_entries" },
          (payload) => callbackRef.current(payload as unknown as LedgerPayload),
        )
        .subscribe((status) => {
          if (status !== "SUBSCRIBED") return;

          // A write can land between the server-rendered initial fetch and this channel joining.
          // Reconcile once joined so that gap cannot leave the trail permanently behind.
          void supabase
            .from("ledger_entries")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100)
            .then(({ data }) => {
              if (disposed) return;
              for (const row of (data ?? []) as LedgerRealtimeRow[]) {
                callbackRef.current({ eventType: "INSERT", new: row, old: { id: row.id } });
              }
            });
        });
    })();

    return () => {
      disposed = true;
      const channel = channelRef.current;
      const supabase = clientRef.current;
      if (!channel || !supabase) return;

      cleanupTimerRef.current = setTimeout(() => {
        if (channelRef.current !== channel) return;
        void supabase.removeChannel(channel);
        channelRef.current = null;
        clientRef.current = null;
        cleanupTimerRef.current = undefined;
      }, 0);
    };
  }, []);
}
