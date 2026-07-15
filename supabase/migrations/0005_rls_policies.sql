ALTER TABLE public.humans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.humans, public.cats, public.wallets, public.ledger_entries, public.transfers
    FROM anon, authenticated;

GRANT SELECT ON public.humans, public.cats, public.wallets, public.ledger_entries, public.transfers
    TO authenticated;

REVOKE EXECUTE ON FUNCTION public.execute_transfer(uuid, uuid, uuid, bigint, text, text, uuid)
    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_cat(uuid, text)
    FROM PUBLIC, anon, authenticated;

CREATE POLICY "humans_read_own_profile"
    ON public.humans
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "cats_read_global_non_system_roster"
    ON public.cats
    FOR SELECT
    TO authenticated
    USING (NOT is_system);

CREATE POLICY "wallets_read_owned_cats"
    ON public.wallets
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.cats
            WHERE cats.id = wallets.cat_id
              AND cats.human_id = auth.uid()
        )
    );

CREATE POLICY "ledger_entries_read_owned_wallets"
    ON public.ledger_entries
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.cats
            WHERE cats.id = ledger_entries.wallet_cat_id
              AND cats.human_id = auth.uid()
        )
    );

CREATE POLICY "transfers_read_owned_parties"
    ON public.transfers
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.cats
            WHERE cats.id IN (transfers.sender_cat_id, transfers.receiver_cat_id)
              AND cats.human_id = auth.uid()
        )
    );
