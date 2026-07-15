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
    v_transfer public.transfers%ROWTYPE;
BEGIN
    INSERT INTO public.cats (human_id, name)
    VALUES (p_human_id, btrim(p_name))
    RETURNING id INTO v_cat_id;

    INSERT INTO public.wallets (cat_id, balance, is_system)
    VALUES (v_cat_id, 0, false);

    SELECT *
    INTO v_transfer
    FROM public.execute_transfer(
        gen_random_uuid(),
        '00000000-0000-4000-8000-000000000001',
        v_cat_id,
        500,
        'Welcome treats',
        'welcome_grant',
        NULL
    );

    IF v_transfer.status <> 'completed' THEN
        RAISE EXCEPTION 'welcome grant failed for cat %: %', v_cat_id, v_transfer.failure_reason;
    END IF;

    RETURN QUERY SELECT * FROM public.cats WHERE id = v_cat_id;
END;
$$;
