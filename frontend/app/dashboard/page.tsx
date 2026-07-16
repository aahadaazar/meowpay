import { redirect } from "next/navigation";
import { RealtimeDashboard } from "@/components/realtime-dashboard";
import type { CatOption } from "@/components/transfer-composer/types";
import { ledgerEntryFromRow, type DashboardCat, type LedgerRealtimeRow } from "@/lib/dashboard-types";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: cats }, { data: wallets }, { data: entries }, { data: roster }] = await Promise.all([
    supabase.from("cats").select("id, name, created_at").eq("human_id", user.id).eq("is_system", false).order("created_at"),
    supabase.from("wallets").select("cat_id, balance").order("created_at"),
    supabase.from("ledger_entries").select("id, transfer_id, wallet_cat_id, direction, amount, balance_after, counterparty_cat_id, counterparty_name, note, source, initiated_by, created_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("cats").select("id, name").eq("is_system", false).order("name").order("id"),
  ]);

  const balances = new Map((wallets ?? []).map((wallet) => [wallet.cat_id, Number(wallet.balance)]));
  const initialCats: DashboardCat[] = (cats ?? []).map((cat) => ({ id: cat.id, name: cat.name, balance: balances.get(cat.id) ?? 0, createdAt: cat.created_at }));
  const initialEntries = (entries ?? []).map((entry) => ledgerEntryFromRow(entry as LedgerRealtimeRow));
  const displayName = typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name : user.email ?? "MeowPay human";

  const initialRecipientCats: CatOption[] = (roster ?? []).map((cat) => ({ id: cat.id, name: cat.name }));

  return <RealtimeDashboard displayName={displayName} initialCats={initialCats} initialEntries={initialEntries} initialRecipientCats={initialRecipientCats} />;
}
