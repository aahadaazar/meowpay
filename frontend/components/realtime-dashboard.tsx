"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CatCard } from "@/components/cat-card";
import { ActivityCharts } from "@/components/charts/activity-charts";
import { LedgerDrawer } from "@/components/ledger-drawer";
import { LedgerTrail } from "@/components/ledger-trail";
import { InsightPanel } from "@/components/insight-panel";
import { NewCatDialog } from "@/components/new-cat-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { WalletHero } from "@/components/wallet-hero";
import { FundCatDialog } from "@/components/transfer-composer/fund-cat-dialog";
import { MoveTreatsDialog } from "@/components/transfer-composer/move-treats-dialog";
import type { CatOption } from "@/components/transfer-composer/types";
import { useRealtimeLedger } from "@/hooks/use-realtime-ledger";
import { useRealtimeWallets } from "@/hooks/use-realtime-wallets";
import { createCat, executeTransfer, getCatRoster, getInsightSummary, topUp, type CatSummary, type ExecuteTransferInput, type TopupInput } from "@/lib/api";
import { ledgerEntryFromRow, sortLedgerEntries, type DashboardCat, type LedgerEntry, type WalletRealtimeRow } from "@/lib/dashboard-types";
import { createClient } from "@/lib/supabase/client";

const GLOW_DURATION_MS = 1800;
const RECEIPT_SUPPRESSION_MS = 6000;

type RealtimeDashboardProps = {
  displayName: string;
  initialWallet: { id: string; balance: number };
  initialCats: DashboardCat[];
  initialEntries: LedgerEntry[];
  initialRecipientCats: CatOption[];
};

export function applyWalletChange(cats: DashboardCat[], wallet: WalletRealtimeRow): DashboardCat[] {
  return cats.map((cat) => cat.walletId === wallet.id ? { ...cat, balance: Number(wallet.balance) } : cat);
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

export function RealtimeDashboard({ displayName, initialWallet, initialCats, initialEntries, initialRecipientCats }: RealtimeDashboardProps) {
  const router = useRouter();
  const [cats, setCats] = useState(initialCats);
  const [wallet, setWallet] = useState(initialWallet);
  const [entries, setEntries] = useState(() => sortLedgerEntries(initialEntries));
  const [recipientCats, setRecipientCats] = useState(initialRecipientCats);
  const [isNewCatDialogOpen, setIsNewCatDialogOpen] = useState(false);
  const [isMoveTreatsOpen, setIsMoveTreatsOpen] = useState(false);
  const [isLedgerDrawerOpen, setIsLedgerDrawerOpen] = useState(false);
  const [fundCatTarget, setFundCatTarget] = useState<DashboardCat | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [glowingWalletIds, setGlowingWalletIds] = useState<Set<string>>(new Set());

  const catsRef = useRef(cats);
  useEffect(() => { catsRef.current = cats; }, [cats]);
  const glowTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const suppressedWalletIdsRef = useRef(new Set<string>());
  const suppressionTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => () => {
    glowTimersRef.current.forEach((timer) => clearTimeout(timer));
    suppressionTimersRef.current.forEach((timer) => clearTimeout(timer));
  }, []);

  function triggerReceiptGlow(walletId: string) {
    setGlowingWalletIds((current) => new Set(current).add(walletId));
    const existingTimer = glowTimersRef.current.get(walletId);
    if (existingTimer) clearTimeout(existingTimer);
    glowTimersRef.current.set(walletId, setTimeout(() => {
      setGlowingWalletIds((current) => {
        const next = new Set(current);
        next.delete(walletId);
        return next;
      });
      glowTimersRef.current.delete(walletId);
    }, GLOW_DURATION_MS));
  }

  function suppressNextReceipt(walletId: string) {
    suppressedWalletIdsRef.current.add(walletId);
    const existingTimer = suppressionTimersRef.current.get(walletId);
    if (existingTimer) clearTimeout(existingTimer);
    suppressionTimersRef.current.set(walletId, setTimeout(() => {
      suppressedWalletIdsRef.current.delete(walletId);
      suppressionTimersRef.current.delete(walletId);
    }, RECEIPT_SUPPRESSION_MS));
  }

  const onWalletChange = useCallback((changedWallet: WalletRealtimeRow) => {
    if (changedWallet.id === wallet.id) {
      setWallet((current) => ({ ...current, balance: Number(changedWallet.balance) }));
      return;
    }

    const previous = catsRef.current.find((cat) => cat.walletId === changedWallet.id);
    const nextBalance = Number(changedWallet.balance);
    if (previous && nextBalance > previous.balance) {
      if (suppressedWalletIdsRef.current.has(changedWallet.id)) {
        suppressedWalletIdsRef.current.delete(changedWallet.id);
        const timer = suppressionTimersRef.current.get(changedWallet.id);
        if (timer) clearTimeout(timer);
        suppressionTimersRef.current.delete(changedWallet.id);
      } else {
        const delta = nextBalance - previous.balance;
        triggerReceiptGlow(changedWallet.id);
        toast.success(`${previous.name} received ${delta.toLocaleString()} treats.`);
      }
    }

    setCats((current) => applyWalletChange(current, changedWallet));
  }, [wallet.id]);
  const onLedgerChange = useCallback((payload: Parameters<typeof applyLedgerChange>[1]) => setEntries((current) => applyLedgerChange(current, payload)), []);
  useRealtimeWallets(onWalletChange);
  useRealtimeLedger(onLedgerChange);

  useEffect(() => { void (async () => { const { data: { session } } = await createClient().auth.getSession(); if (!session) return; const roster = await getCatRoster(session.access_token); setRecipientCats(roster); })().catch(() => setError("MeowPay could not load the cat roster.")); }, []);

  async function create(name: string) {
    setIsSubmitting(true);
    setError("");
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session) throw new Error("Your session has expired. Please sign in again.");
      const cat: CatSummary = await createCat(session.access_token, name);
      setCats((current) => [...current, cat]);
      setRecipientCats((current) => current.some((candidate) => candidate.walletId === cat.walletId) ? current : [...current, { walletId: cat.walletId, name: cat.name, ownerName: displayName }]);
      setIsNewCatDialogOpen(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "MeowPay could not create that cat.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitTransfer(input: ExecuteTransferInput) {
    const { data: { session } } = await createClient().auth.getSession();
    if (!session) throw new Error("Your session has expired. Please sign in again.");
    suppressNextReceipt(input.receiverWalletId);
    return executeTransfer(session.access_token, input);
  }

  async function submitTopUp(input: TopupInput) {
    const { data: { session } } = await createClient().auth.getSession();
    if (!session) throw new Error("Your session has expired. Please sign in again.");
    return topUp(session.access_token, input);
  }

  async function requestInsight() {
    const { data: { session } } = await createClient().auth.getSession();
    if (!session) throw new Error("Your session has expired. Please sign in again.");
    return (await getInsightSummary(session.access_token)).summary;
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const ownedCats: CatOption[] = cats.map((cat) => ({ walletId: cat.walletId, name: cat.name, balance: cat.balance }));

  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border"><div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"><a className="text-title-md font-semibold" href="/dashboard">MeowPay</a><div className="flex items-center gap-3"><span className="hidden text-body-sm text-muted-foreground sm:inline">{displayName}</span><ThemeToggle /><button className="h-9 rounded-md border border-input px-3 text-body-sm hover:border-foreground" onClick={signOut} type="button">Sign out</button></div></div></header>
    <div className="mx-auto grid w-full max-w-7xl gap-section px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-caption-uppercase uppercase text-muted-foreground">Your cat wallets</p><h1 className="mt-2 text-display-sm">A treat account for every cat</h1></div>
        <div className="flex flex-wrap gap-3">
          {cats.length > 0 ? <button className="button-secondary" onClick={() => setIsMoveTreatsOpen(true)} type="button">Move treats</button> : null}
          <button className="button-primary" onClick={() => setIsNewCatDialogOpen(true)} type="button">New cat</button>
        </div>
      </div>
      {error ? <p className="text-body-sm text-destructive" role="alert">{error}</p> : null}
      <WalletHero balance={wallet.balance} entries={entries} onTopUp={submitTopUp} walletId={wallet.id} />
      {cats.length === 0 ? <section className="product-mockup-card grid justify-items-center gap-4 py-12 text-center"><h2 className="text-display-sm">Create your first cat</h2><p className="max-w-md text-body-md text-body">Sign up, top up your wallet, then create and fund a cat.</p><button className="button-primary" onClick={() => setIsNewCatDialogOpen(true)} type="button">Create your first cat</button></section> : <section aria-label="Cat wallets" className="grid gap-4 md:grid-cols-2">{cats.map((cat) => <CatCard cat={cat} isGlowing={glowingWalletIds.has(cat.walletId)} key={cat.id} onFund={setFundCatTarget} />)}</section>}
      <InsightPanel onRequest={requestInsight} />
      <ActivityCharts balance={wallet.balance} cats={cats} entries={entries} />
      <LedgerTrail cats={cats} entries={entries} onViewAll={() => setIsLedgerDrawerOpen(true)} wallet={{ id: wallet.id, name: "You" }} />
    </div>
    <NewCatDialog isOpen={isNewCatDialogOpen} isSubmitting={isSubmitting} onClose={() => setIsNewCatDialogOpen(false)} onCreate={create} />
    <MoveTreatsDialog isOpen={isMoveTreatsOpen} onClose={() => setIsMoveTreatsOpen(false)} onSubmitTransfer={submitTransfer} ownedCats={ownedCats} recipientCats={recipientCats} />
    <FundCatDialog cat={fundCatTarget} humanWallet={{ walletId: wallet.id, balance: wallet.balance }} onClose={() => setFundCatTarget(null)} onSubmitTransfer={submitTransfer} />
    {isLedgerDrawerOpen ? <LedgerDrawer cats={cats} onClose={() => setIsLedgerDrawerOpen(false)} wallet={{ id: wallet.id, name: "You" }} /> : null}
  </main>;
}
