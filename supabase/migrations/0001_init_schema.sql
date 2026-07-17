CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.humans (
    id uuid PRIMARY KEY,
    email text,
    display_name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT humans_display_name_not_blank CHECK (length(btrim(display_name)) > 0)
);

CREATE TABLE public.cats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    human_id uuid NOT NULL REFERENCES public.humans(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT cats_name_not_blank CHECK (length(btrim(name)) > 0)
);

CREATE INDEX cats_human_id_idx ON public.cats (human_id);

CREATE TABLE public.wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind text NOT NULL,
    human_id uuid REFERENCES public.humans(id) ON DELETE CASCADE,
    cat_id uuid REFERENCES public.cats(id) ON DELETE CASCADE,
    balance bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT wallets_kind_check CHECK (kind IN ('human', 'cat', 'treasury')),
    CONSTRAINT wallets_owner_matches_kind CHECK (
        (kind = 'human' AND human_id IS NOT NULL AND cat_id IS NULL)
        OR (kind = 'cat' AND cat_id IS NOT NULL AND human_id IS NULL)
        OR (kind = 'treasury' AND human_id IS NULL AND cat_id IS NULL)
    ),
    CONSTRAINT wallets_non_treasury_non_negative CHECK (kind = 'treasury' OR balance >= 0)
);

CREATE UNIQUE INDEX wallets_one_per_human
    ON public.wallets (human_id)
    WHERE kind = 'human';
CREATE UNIQUE INDEX wallets_one_per_cat
    ON public.wallets (cat_id)
    WHERE kind = 'cat';
CREATE UNIQUE INDEX wallets_exactly_one_treasury
    ON public.wallets ((true))
    WHERE kind = 'treasury';

INSERT INTO public.wallets (id, kind, balance)
VALUES ('00000000-0000-4000-8000-000000000001', 'treasury', 0);
