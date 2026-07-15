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
    human_id uuid REFERENCES public.humans(id) ON DELETE CASCADE,
    name text NOT NULL,
    is_system boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT cats_name_not_blank CHECK (length(btrim(name)) > 0),
    CONSTRAINT cats_system_ownership CHECK (
        (is_system AND human_id IS NULL)
        OR (NOT is_system AND human_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX cats_exactly_one_system
    ON public.cats (is_system)
    WHERE is_system;

CREATE INDEX cats_human_id_idx ON public.cats (human_id);

CREATE TABLE public.wallets (
    cat_id uuid PRIMARY KEY REFERENCES public.cats(id) ON DELETE CASCADE,
    balance bigint NOT NULL DEFAULT 0,
    is_system boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT wallets_non_system_non_negative CHECK (is_system OR balance >= 0)
);

INSERT INTO public.cats (id, human_id, name, is_system)
VALUES ('00000000-0000-4000-8000-000000000001', NULL, 'MeowPay Treasury', true);

INSERT INTO public.wallets (cat_id, balance, is_system)
VALUES ('00000000-0000-4000-8000-000000000001', 0, true);
