CREATE OR REPLACE FUNCTION public.create_cat(
    p_human_id uuid,
    p_name text
)
RETURNS SETOF public.cats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cat_id uuid;
BEGIN
    INSERT INTO public.cats (human_id, name)
    VALUES (p_human_id, btrim(p_name))
    RETURNING id INTO v_cat_id;

    INSERT INTO public.wallets (kind, cat_id, balance)
    VALUES ('cat', v_cat_id, 0);

    RETURN QUERY SELECT * FROM public.cats WHERE id = v_cat_id;
END;
$$;
