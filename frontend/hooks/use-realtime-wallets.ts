"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WalletRealtimeRow } from "@/lib/dashboard-types";

type WalletPayload = {
  new: WalletRealtimeRow;
};

export function useRealtimeWallets(onWalletChange: (wallet: WalletRealtimeRow) => void) {
  const callbackRef = useRef(onWalletChange);
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout>>();
  callbackRef.current = onWalletChange;

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
        .channel("dashboard-wallets")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "wallets" },
          (payload) => callbackRef.current((payload as unknown as WalletPayload).new),
        )
        .subscribe();
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
