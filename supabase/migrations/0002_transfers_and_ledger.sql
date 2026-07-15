CREATE TABLE public.transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key uuid NOT NULL UNIQUE,
    sender_cat_id uuid NOT NULL REFERENCES public.cats(id),
    receiver_cat_id uuid NOT NULL REFERENCES public.cats(id),
    amount bigint NOT NULL,
    note text,
    source text NOT NULL,
    initiated_by uuid REFERENCES public.humans(id),
    status text NOT NULL,
    failure_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT transfers_status_check CHECK (status IN ('completed', 'failed')),
    CONSTRAINT transfers_source_check CHECK (source IN ('manual', 'agent', 'topup', 'welcome_grant')),
    CONSTRAINT transfers_failure_reason_check CHECK (
        (status = 'completed' AND failure_reason IS NULL)
        OR (status = 'failed' AND failure_reason IS NOT NULL)
    )
);

CREATE INDEX transfers_sender_cat_id_idx ON public.transfers (sender_cat_id);
CREATE INDEX transfers_receiver_cat_id_idx ON public.transfers (receiver_cat_id);
CREATE INDEX transfers_initiated_by_idx ON public.transfers (initiated_by);

CREATE TABLE public.ledger_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id uuid NOT NULL REFERENCES public.transfers(id) ON DELETE RESTRICT,
    wallet_cat_id uuid NOT NULL REFERENCES public.cats(id),
    direction text NOT NULL,
    amount bigint NOT NULL,
    balance_after bigint NOT NULL,
    counterparty_cat_id uuid NOT NULL REFERENCES public.cats(id),
    counterparty_name text NOT NULL,
    note text,
    source text NOT NULL,
    initiated_by uuid REFERENCES public.humans(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ledger_entries_direction_check CHECK (direction IN ('debit', 'credit')),
    CONSTRAINT ledger_entries_amount_positive CHECK (amount > 0),
    CONSTRAINT ledger_entries_source_check CHECK (source IN ('manual', 'agent', 'topup', 'welcome_grant')),
    CONSTRAINT ledger_entries_wallet_not_counterparty CHECK (wallet_cat_id <> counterparty_cat_id),
    CONSTRAINT ledger_entries_one_side_per_transfer UNIQUE (transfer_id, wallet_cat_id, direction)
);

CREATE INDEX ledger_entries_wallet_cat_id_created_at_idx
    ON public.ledger_entries (wallet_cat_id, created_at DESC);
CREATE INDEX ledger_entries_transfer_id_idx ON public.ledger_entries (transfer_id);
CREATE INDEX ledger_entries_initiated_by_idx ON public.ledger_entries (initiated_by);

REVOKE UPDATE, DELETE ON public.ledger_entries FROM PUBLIC;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE UPDATE, DELETE ON public.ledger_entries FROM anon;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE UPDATE, DELETE ON public.ledger_entries FROM authenticated;
    END IF;
END;
$$;
