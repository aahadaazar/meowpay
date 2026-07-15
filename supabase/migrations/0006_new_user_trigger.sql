CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.humans (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NULLIF(btrim(NEW.raw_user_meta_data ->> 'display_name'), ''),
            NULLIF(split_part(NEW.email, '@', 1), ''),
            'Human'
        )
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
