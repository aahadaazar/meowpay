CREATE OR REPLACE FUNCTION public.execute_transfer(
    p_idempotency_key uuid,
    p_sender_cat_id uuid,
    p_receiver_cat_id uuid,
    p_amount bigint,
    p_note text,
    p_source text,
    p_initiated_by uuid
)
RETURNS SETOF public.transfers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wallet record;
    v_sender_balance bigint;
    v_receiver_balance bigint;
    v_sender_is_system boolean;
    v_receiver_is_system boolean;
    v_sender_name text;
    v_receiver_name text;
    v_transfer_id uuid;
    v_sender_after bigint;
    v_receiver_after bigint;
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.transfers
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN;
    END IF;

    IF p_amount <= 0 THEN
        INSERT INTO public.transfers (
            idempotency_key,
            sender_cat_id,
            receiver_cat_id,
            amount,
            note,
            source,
            initiated_by,
            status,
            failure_reason
        )
        VALUES (
            p_idempotency_key,
            p_sender_cat_id,
            p_receiver_cat_id,
            p_amount,
            p_note,
            p_source,
            p_initiated_by,
            'failed',
            'invalid_amount'
        )
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id INTO v_transfer_id;

        RETURN QUERY SELECT * FROM public.transfers WHERE idempotency_key = p_idempotency_key;
        RETURN;
    END IF;

    IF p_sender_cat_id = p_receiver_cat_id THEN
        INSERT INTO public.transfers (
            idempotency_key,
            sender_cat_id,
            receiver_cat_id,
            amount,
            note,
            source,
            initiated_by,
            status,
            failure_reason
        )
        VALUES (
            p_idempotency_key,
            p_sender_cat_id,
            p_receiver_cat_id,
            p_amount,
            p_note,
            p_source,
            p_initiated_by,
            'failed',
            'self_transfer'
        )
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id INTO v_transfer_id;

        RETURN QUERY SELECT * FROM public.transfers WHERE idempotency_key = p_idempotency_key;
        RETURN;
    END IF;

    FOR v_wallet IN
        SELECT w.cat_id, w.balance, w.is_system AS wallet_is_system, c.name, c.is_system AS cat_is_system
        FROM public.wallets w
        JOIN public.cats c ON c.id = w.cat_id
        WHERE w.cat_id IN (p_sender_cat_id, p_receiver_cat_id)
        ORDER BY w.cat_id
        FOR UPDATE OF w
    LOOP
        IF v_wallet.cat_id = p_sender_cat_id THEN
            v_sender_balance := v_wallet.balance;
            v_sender_is_system := v_wallet.wallet_is_system OR v_wallet.cat_is_system;
            v_sender_name := v_wallet.name;
        ELSIF v_wallet.cat_id = p_receiver_cat_id THEN
            v_receiver_balance := v_wallet.balance;
            v_receiver_is_system := v_wallet.wallet_is_system OR v_wallet.cat_is_system;
            v_receiver_name := v_wallet.name;
        END IF;
    END LOOP;

    IF v_sender_balance IS NULL OR v_receiver_balance IS NULL THEN
        RAISE EXCEPTION 'sender or receiver wallet was not found';
    END IF;

    IF v_receiver_is_system THEN
        INSERT INTO public.transfers (
            idempotency_key,
            sender_cat_id,
            receiver_cat_id,
            amount,
            note,
            source,
            initiated_by,
            status,
            failure_reason
        )
        VALUES (
            p_idempotency_key,
            p_sender_cat_id,
            p_receiver_cat_id,
            p_amount,
            p_note,
            p_source,
            p_initiated_by,
            'failed',
            'system_recipient'
        )
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id INTO v_transfer_id;

        RETURN QUERY SELECT * FROM public.transfers WHERE idempotency_key = p_idempotency_key;
        RETURN;
    END IF;

    IF NOT v_sender_is_system AND v_sender_balance < p_amount THEN
        INSERT INTO public.transfers (
            idempotency_key,
            sender_cat_id,
            receiver_cat_id,
            amount,
            note,
            source,
            initiated_by,
            status,
            failure_reason
        )
        VALUES (
            p_idempotency_key,
            p_sender_cat_id,
            p_receiver_cat_id,
            p_amount,
            p_note,
            p_source,
            p_initiated_by,
            'failed',
            'insufficient_funds'
        )
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id INTO v_transfer_id;

        RETURN QUERY SELECT * FROM public.transfers WHERE idempotency_key = p_idempotency_key;
        RETURN;
    END IF;

    INSERT INTO public.transfers (
        idempotency_key,
        sender_cat_id,
        receiver_cat_id,
        amount,
        note,
        source,
        initiated_by,
        status
    )
    VALUES (
        p_idempotency_key,
        p_sender_cat_id,
        p_receiver_cat_id,
        p_amount,
        p_note,
        p_source,
        p_initiated_by,
        'completed'
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id INTO v_transfer_id;

    IF v_transfer_id IS NULL THEN
        RETURN QUERY SELECT * FROM public.transfers WHERE idempotency_key = p_idempotency_key;
        RETURN;
    END IF;

    v_sender_after := v_sender_balance - p_amount;
    v_receiver_after := v_receiver_balance + p_amount;

    INSERT INTO public.ledger_entries (
        transfer_id,
        wallet_cat_id,
        direction,
        amount,
        balance_after,
        counterparty_cat_id,
        counterparty_name,
        note,
        source,
        initiated_by
    )
    VALUES
        (
            v_transfer_id,
            p_sender_cat_id,
            'debit',
            p_amount,
            v_sender_after,
            p_receiver_cat_id,
            v_receiver_name,
            p_note,
            p_source,
            p_initiated_by
        ),
        (
            v_transfer_id,
            p_receiver_cat_id,
            'credit',
            p_amount,
            v_receiver_after,
            p_sender_cat_id,
            v_sender_name,
            p_note,
            p_source,
            p_initiated_by
        );

    UPDATE public.wallets
    SET balance = v_sender_after,
        updated_at = now()
    WHERE cat_id = p_sender_cat_id;

    UPDATE public.wallets
    SET balance = v_receiver_after,
        updated_at = now()
    WHERE cat_id = p_receiver_cat_id;

    RETURN QUERY SELECT * FROM public.transfers WHERE id = v_transfer_id;
END;
$$;
