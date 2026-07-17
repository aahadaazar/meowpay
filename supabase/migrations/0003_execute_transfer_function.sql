CREATE OR REPLACE FUNCTION public.execute_transfer(
    p_idempotency_key uuid,
    p_sender_wallet_id uuid,
    p_receiver_wallet_id uuid,
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
    v_sender_kind text;
    v_receiver_kind text;
    v_sender_name text;
    v_receiver_name text;
    v_transfer_id uuid;
    v_sender_after bigint;
    v_receiver_after bigint;
BEGIN
    RETURN QUERY SELECT * FROM public.transfers WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN RETURN; END IF;

    IF p_amount <= 0 THEN
        INSERT INTO public.transfers (idempotency_key, sender_wallet_id, receiver_wallet_id, amount, note, source, initiated_by, status, failure_reason)
        VALUES (p_idempotency_key, p_sender_wallet_id, p_receiver_wallet_id, p_amount, p_note, p_source, p_initiated_by, 'failed', 'invalid_amount')
        ON CONFLICT (idempotency_key) DO NOTHING;
        RETURN QUERY SELECT * FROM public.transfers WHERE idempotency_key = p_idempotency_key;
        RETURN;
    END IF;

    IF p_sender_wallet_id = p_receiver_wallet_id THEN
        INSERT INTO public.transfers (idempotency_key, sender_wallet_id, receiver_wallet_id, amount, note, source, initiated_by, status, failure_reason)
        VALUES (p_idempotency_key, p_sender_wallet_id, p_receiver_wallet_id, p_amount, p_note, p_source, p_initiated_by, 'failed', 'self_transfer')
        ON CONFLICT (idempotency_key) DO NOTHING;
        RETURN QUERY SELECT * FROM public.transfers WHERE idempotency_key = p_idempotency_key;
        RETURN;
    END IF;

    FOR v_wallet IN
        SELECT w.id, w.balance, w.kind,
            CASE w.kind
                WHEN 'cat' THEN c.name
                WHEN 'human' THEN h.display_name
                WHEN 'treasury' THEN 'MeowPay Treasury'
            END AS display_name
        FROM public.wallets w
        LEFT JOIN public.cats c ON c.id = w.cat_id
        LEFT JOIN public.humans h ON h.id = w.human_id
        WHERE w.id IN (p_sender_wallet_id, p_receiver_wallet_id)
        ORDER BY w.id
        FOR UPDATE OF w
    LOOP
        IF v_wallet.id = p_sender_wallet_id THEN
            v_sender_balance := v_wallet.balance;
            v_sender_kind := v_wallet.kind;
            v_sender_name := v_wallet.display_name;
        ELSIF v_wallet.id = p_receiver_wallet_id THEN
            v_receiver_balance := v_wallet.balance;
            v_receiver_kind := v_wallet.kind;
            v_receiver_name := v_wallet.display_name;
        END IF;
    END LOOP;

    IF v_sender_balance IS NULL OR v_receiver_balance IS NULL THEN
        RAISE EXCEPTION 'sender or receiver wallet was not found';
    END IF;

    IF NOT (
        (v_sender_kind = 'treasury' AND v_receiver_kind = 'human' AND p_source = 'topup')
        OR (v_sender_kind = 'human' AND v_receiver_kind = 'cat' AND p_source IN ('manual', 'agent'))
        OR (v_sender_kind = 'cat' AND v_receiver_kind = 'cat' AND p_source IN ('manual', 'agent'))
    ) THEN
        INSERT INTO public.transfers (idempotency_key, sender_wallet_id, receiver_wallet_id, amount, note, source, initiated_by, status, failure_reason)
        VALUES (p_idempotency_key, p_sender_wallet_id, p_receiver_wallet_id, p_amount, p_note, p_source, p_initiated_by, 'failed', 'unsupported_route')
        ON CONFLICT (idempotency_key) DO NOTHING;
        RETURN QUERY SELECT * FROM public.transfers WHERE idempotency_key = p_idempotency_key;
        RETURN;
    END IF;

    IF v_sender_kind <> 'treasury' AND v_sender_balance < p_amount THEN
        INSERT INTO public.transfers (idempotency_key, sender_wallet_id, receiver_wallet_id, amount, note, source, initiated_by, status, failure_reason)
        VALUES (p_idempotency_key, p_sender_wallet_id, p_receiver_wallet_id, p_amount, p_note, p_source, p_initiated_by, 'failed', 'insufficient_funds')
        ON CONFLICT (idempotency_key) DO NOTHING;
        RETURN QUERY SELECT * FROM public.transfers WHERE idempotency_key = p_idempotency_key;
        RETURN;
    END IF;

    INSERT INTO public.transfers (idempotency_key, sender_wallet_id, receiver_wallet_id, amount, note, source, initiated_by, status)
    VALUES (p_idempotency_key, p_sender_wallet_id, p_receiver_wallet_id, p_amount, p_note, p_source, p_initiated_by, 'completed')
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id INTO v_transfer_id;
    IF v_transfer_id IS NULL THEN
        RETURN QUERY SELECT * FROM public.transfers WHERE idempotency_key = p_idempotency_key;
        RETURN;
    END IF;

    v_sender_after := v_sender_balance - p_amount;
    v_receiver_after := v_receiver_balance + p_amount;

    INSERT INTO public.ledger_entries (transfer_id, wallet_id, direction, amount, balance_after, counterparty_wallet_id, counterparty_name, note, source, initiated_by)
    VALUES
        (v_transfer_id, p_sender_wallet_id, 'debit', p_amount, v_sender_after, p_receiver_wallet_id, v_receiver_name, p_note, p_source, p_initiated_by),
        (v_transfer_id, p_receiver_wallet_id, 'credit', p_amount, v_receiver_after, p_sender_wallet_id, v_sender_name, p_note, p_source, p_initiated_by);

    UPDATE public.wallets SET balance = v_sender_after, updated_at = now() WHERE id = p_sender_wallet_id;
    UPDATE public.wallets SET balance = v_receiver_after, updated_at = now() WHERE id = p_receiver_wallet_id;

    RETURN QUERY SELECT * FROM public.transfers WHERE id = v_transfer_id;
END;
$$;
