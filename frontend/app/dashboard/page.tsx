import { redirect } from "next/navigation";
import { RealtimeDashboard } from "@/components/realtime-dashboard";
import { ledgerEntryFromRow, type DashboardCat, type LedgerRealtimeRow } from "@/lib/dashboard-types";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: cats }, { data: wallets }, { data: entries }] = await Promise.all([
    supabase.from("cats").select("id, name, created_at").eq("human_id", user.id).order("created_at"),
    supabase.from("wallets").select("id, kind, cat_id, balance").order("created_at"),
    supabase.from("ledger_entries").select("id, transfer_id, wallet_id, direction, amount, balance_after, counterparty_wallet_id, counterparty_name, note, source, initiated_by, created_at").order("created_at", { ascending: false }).limit(100),
  ]);

  const catWallets = new Map((wallets ?? []).filter((wallet) => wallet.kind === "cat" && wallet.cat_id).map((wallet) => [wallet.cat_id as string, { id: wallet.id, balance: Number(wallet.balance) }]));
  const humanWallet = (wallets ?? []).find((wallet) => wallet.kind === "human");
  if (!humanWallet) throw new Error("The authenticated human has no wallet.");
  const initialCats: DashboardCat[] = (cats ?? []).map((cat) => ({ id: cat.id, walletId: catWallets.get(cat.id)?.id ?? "", name: cat.name, balance: catWallets.get(cat.id)?.balance ?? 0, createdAt: cat.created_at }));
  const initialEntries = (entries ?? []).map((entry) => ledgerEntryFromRow(entry as LedgerRealtimeRow));
  const displayName = typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name : user.email ?? "MeowPay human";

  return <RealtimeDashboard displayName={displayName} initialWallet={{ id: humanWallet.id, balance: Number(humanWallet.balance) }} initialCats={initialCats} initialEntries={initialEntries} initialRecipientCats={[]} />;
}
