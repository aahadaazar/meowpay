"use client";

import { Loader2, Receipt } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { avatarUrl } from "@/components/cat-card";
import { DirectionBadge, formatLedgerDate, LedgerAmount, SourceBadge } from "@/components/ledger-badges";
import { ledgerEntryFromRow, type DashboardCat, type LedgerEntry, type LedgerRealtimeRow } from "@/lib/dashboard-types";
import { createClient } from "@/lib/supabase/client";

const PAGE_SIZE = 20;

type LedgerDrawerProps = {
  onClose: () => void;
  cats: DashboardCat[];
  wallet: { id: string; name: string };
};

export function LedgerDrawer({ onClose, cats, wallet }: LedgerDrawerProps) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(0);
  const walletsById = new Map<string, { name: string }>([
    [wallet.id, { name: wallet.name }],
    ...cats.map((cat): [string, { name: string }] => [cat.walletId, { name: cat.name }]),
  ]);

  const loadMore = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const from = offsetRef.current;
      const to = from + PAGE_SIZE - 1;
      // Offset pagination, not a keyset cursor: simple and correct for an append-only demo ledger,
      // at the cost that activity arriving mid-scroll can shift later pages by a row or two.
      const { data, error: queryError } = await supabase
        .from("ledger_entries")
        .select("id, transfer_id, wallet_id, direction, amount, balance_after, counterparty_wallet_id, counterparty_name, note, source, initiated_by, created_at")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to);
      if (queryError) throw queryError;
      const rows = (data ?? []) as LedgerRealtimeRow[];
      offsetRef.current = from + rows.length;
      setHasMore(rows.length === PAGE_SIZE);
      setEntries((current) => [...current, ...rows.map(ledgerEntryFromRow)]);
    } catch {
      setError("MeowPay could not load more activity.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // The drawer only ever exists in the tree while open (the parent mounts it on open and
    // unmounts it on close, see realtime-dashboard.tsx) so a fresh mount already starts from the
    // empty initial state above — no reset-then-refetch dance, and no stale-frame flicker on reopen.
    void loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((observerEntries) => {
      if (observerEntries[0]?.isIntersecting && !isLoading) void loadMore();
    }, { rootMargin: "200px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  return (
    <div aria-labelledby="ledger-drawer-title" aria-modal="true" className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog">
      <section className="flex h-full w-full max-w-[520px] flex-col overflow-hidden border-l border-border bg-surface-card p-6 dark:bg-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-caption-uppercase uppercase text-muted-foreground">Ledger</p>
            <h2 className="mt-1 text-title-lg" id="ledger-drawer-title">All activity</h2>
          </div>
          <button aria-label="Close activity drawer" className="button-secondary" onClick={onClose} type="button">Close</button>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto">
          {entries.length === 0 && !isLoading ? (
            <div className="grid justify-items-center gap-3 py-12 text-center">
              <Receipt aria-hidden className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-body-md text-body">No activity yet. It will show up here the moment treats move.</p>
            </div>
          ) : (
            <ul className="grid gap-3">
              {entries.map((entry) => {
                const account = walletsById.get(entry.walletId);
                return (
                  <li className="rounded-md border border-border p-4 text-body-sm" key={entry.id}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="tabular-nums text-muted-foreground">{formatLedgerDate(entry.createdAt)}</p>
                      <LedgerAmount entry={entry} />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2"><img alt="" className="h-6 w-6 rounded-full bg-surface-card" src={avatarUrl(entry.counterpartyName)} />{entry.counterpartyName}</span>
                      <DirectionBadge direction={entry.direction} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                      <dt className="text-muted-foreground">Wallet</dt><dd>{account?.name ?? "Your wallet"}</dd>
                      <dt className="text-muted-foreground">Balance after</dt><dd className="tabular-nums">{entry.balanceAfter.toLocaleString()}</dd>
                      <dt className="text-muted-foreground">Source</dt><dd><SourceBadge source={entry.source} /></dd>
                    </dl>
                    {entry.note ? <p className="mt-3 border-t border-hairline-soft pt-3 text-body">{entry.note}</p> : null}
                  </li>
                );
              })}
            </ul>
          )}
          {error ? <p className="mt-4 text-body-sm text-destructive" role="alert">{error}</p> : null}
          {hasMore ? <div className="grid justify-items-center py-6" ref={sentinelRef}>{isLoading ? <Loader2 aria-label="Loading more activity" className="h-5 w-5 animate-spin text-muted-foreground" /> : null}</div> : null}
        </div>
      </section>
    </div>
  );
}
