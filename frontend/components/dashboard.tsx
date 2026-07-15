"use client";

import { useEffect, useState } from "react";
import { createCat, getMe, type Me } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { CatManagementDashboard } from "@/components/cat-management-dashboard";

export function Dashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await createClient().auth.getSession();
      if (!session) {
        setError("Your session has expired. Please sign in again.");
        return;
      }

      setAccessToken(session.access_token);
      try {
        setMe(await getMe(session.access_token));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "MeowPay could not load your cats.");
      }
    }
    void load();
  }, []);

  if (error) {
    return <main className="min-h-screen p-6 text-body-md text-destructive" role="alert">{error}</main>;
  }

  if (!me || !accessToken) {
    return <main className="min-h-screen p-6 text-body-md">Loading your cats…</main>;
  }

  return <CatManagementDashboard me={me} onCreateCat={(name) => createCat(accessToken, name)} />;
}
