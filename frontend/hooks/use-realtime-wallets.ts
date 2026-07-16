"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WalletRealtimeRow } from "@/lib/dashboard-types";

type WalletPayload = {
  new: WalletRealtimeRow;
};

export function useRealtimeWallets(onWalletChange: (wallet: WalletRealtimeRow) => void) {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-wallets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets" },
        (payload) => onWalletChange((payload as WalletPayload).new),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [onWalletChange]);
}
