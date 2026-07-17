"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { CatCard } from "@/components/cat-card";
import { ActivityCharts } from "@/components/charts/activity-charts";
import { LedgerTrail } from "@/components/ledger-trail";
import { NewCatDialog } from "@/components/new-cat-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { TotalHero } from "@/components/total-hero";
import { ManualTransferForm } from "@/components/transfer-composer/manual-transfer-form";
import type { CatOption } from "@/components/transfer-composer/types";
import { useRealtimeLedger } from "@/hooks/use-realtime-ledger";
import { useRealtimeWallets } from "@/hooks/use-realtime-wallets";
import { createCat, executeTransfer, topUp, type CatSummary, type ExecuteTransferInput, type TopupInput } from "@/lib/api";
import { ledgerEntryFromRow, sortLedgerEntries, type DashboardCat, type LedgerEntry, type WalletRealtimeRow } from "@/lib/dashboard-types";
import { createClient } from "@/lib/supabase/client";

type RealtimeDashboardProps = {
  displayName: string;
  initialCats: DashboardCat[];
  initialEntries: LedgerEntry[];
  initialRecipientCats: CatOption[];
};

export function applyWalletChange(cats: DashboardCat[], wallet: WalletRealtimeRow): DashboardCat[] {
  return cats.map((cat) => cat.id === wallet.cat_id ? { ...cat, balance: Number(wallet.balance) } : cat);
}

function isLedgerRealtimeRow(row: unknown): row is Parameters<typeof ledgerEntryFromRow>[0] {
  if (!row || typeof row !== "object") return false;

  const candidate = row as Record<string, unknown>;
  return typeof candidate.id === "string"
    && candidate.id.length > 0
    && typeof candidate.created_at === "string"
    && !Number.isNaN(Date.parse(candidate.created_at));
}

export function applyLedgerChange(entries: LedgerEntry[], payload: { eventType: "INSERT" | "UPDATE" | "DELETE"; new: unknown; old: { id?: unknown } }): LedgerEntry[] {
  if (payload.eventType === "DELETE") {
    return typeof payload.old.id === "string" ? entries.filter((entry) => entry.id !== payload.old.id) : entries;
  }
  if (!isLedgerRealtimeRow(payload.new)) return entries;

  const nextEntry = ledgerEntryFromRow(payload.new);
  return sortLedgerEntries([...entries.filter((entry) => entry.id !== nextEntry.id), nextEntry]);
}

export function RealtimeDashboard({ displayName, initialCats, initialEntries, initialRecipientCats }: RealtimeDashboardProps) {
  const router = useRouter();
  const [cats, setCats] = useState(initialCats);
  const [entries, setEntries] = useState(() => sortLedgerEntries(initialEntries));
  const [recipientCats, setRecipientCats] = useState(initialRecipientCats);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const onWalletChange = useCallback((wallet: WalletRealtimeRow) => setCats((current) => applyWalletChange(current, wallet)), []);
  const onLedgerChange = useCallback((payload: Parameters<typeof applyLedgerChange>[1]) => setEntries((current) => applyLedgerChange(current, payload)), []);
  useRealtimeWallets(onWalletChange);
  useRealtimeLedger(onLedgerChange);

  async function create(name: string) {
    setIsSubmitting(true);
    setError("");
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session) throw new Error("Your session has expired. Please sign in again.");
      const cat: CatSummary = await createCat(session.access_token, name);
      setCats((current) => [...current, cat]);
      setRecipientCats((current) => current.some((candidate) => candidate.id === cat.id) ? current : [...current, { id: cat.id, name: cat.name }]);
      setIsDialogOpen(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "MeowPay could not create that cat.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitTransfer(input: ExecuteTransferInput) {
    const { data: { session } } = await createClient().auth.getSession();
    if (!session) throw new Error("Your session has expired. Please sign in again.");
    return executeTransfer(session.access_token, input);
  }

  async function submitTopUp(input: TopupInput) {
    const { data: { session } } = await createClient().auth.getSession();
    if (!session) throw new Error("Your session has expired. Please sign in again.");
    return topUp(session.access_token, input);
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border"><div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"><a className="text-title-md font-semibold" href="/dashboard">MeowPay</a><div className="flex items-center gap-3"><span className="hidden text-body-sm text-muted-foreground sm:inline">{displayName}</span><ThemeToggle /><button className="h-9 rounded-md border border-input px-3 text-body-sm hover:border-foreground" onClick={signOut} type="button">Sign out</button></div></div></header>
    <div className="mx-auto grid w-full max-w-7xl gap-section px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-caption-uppercase uppercase text-muted-foreground">Your cat wallets</p><h1 className="mt-2 text-display-sm">A treat account for every cat</h1></div><button className="button-primary" onClick={() => setIsDialogOpen(true)} type="button">New cat</button></div>
      {error ? <p className="text-body-sm text-destructive" role="alert">{error}</p> : null}
      <TotalHero cats={cats} entries={entries} />
      {cats.length === 0 ? <section className="product-mockup-card grid justify-items-center gap-4 py-12 text-center"><h2 className="text-display-sm">Create your first cat</h2><p className="max-w-md text-body-md text-body">Each cat gets a wallet and 500 welcome treats to begin with.</p><button className="button-primary" onClick={() => setIsDialogOpen(true)} type="button">Create your first cat</button></section> : <section aria-label="Cat wallets" className="grid gap-4 md:grid-cols-2">{cats.map((cat) => <CatCard cat={cat} key={cat.id} onTopUp={submitTopUp} />)}</section>}
      <ManualTransferForm ownedCats={cats} onSubmitTransfer={submitTransfer} recipientCats={recipientCats} />
      <ActivityCharts entries={entries} />
      <LedgerTrail cats={cats} entries={entries} />
    </div>
    <NewCatDialog isOpen={isDialogOpen} isSubmitting={isSubmitting} onClose={() => setIsDialogOpen(false)} onCreate={create} />
  </main>;
}
