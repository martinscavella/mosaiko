-- T3.7 — Fix signup: profilo completo creato dal solo trigger DB
--
-- Problemi risolti:
-- 1. handle_new_user() leggeva i metadata con chiavi camelCase
--    ('firstName'/'lastName') mentre il form di registrazione invia snake_case
--    ('first_name'/'last_name'): ogni profilo nasceva con nome e cognome vuoti.
--    Inoltre ignorava birth_date e phone_number.
-- 2. handle_user_update() aveva lo stesso problema di chiavi.
-- 3. Il trigger trigger_create_profile → create_profile_on_user_registration()
--    era già neutralizzato (fix C6, vedi history/) ma trigger e funzione morti
--    erano rimasti sul DB: rimossi.
--
-- Lato client (stesso commit): rimosso l'INSERT ridondante createUserProfile()
-- in src/lib/auth.tsx — la riga in profiles la crea solo questo trigger.
--
-- Rollback: le definizioni precedenti differivano solo per le chiavi lette
-- (solo 'firstName'/'lastName'/'language'/'app_theme'/'notifications_enabled',
-- senza birth_date/phone_number e senza ON CONFLICT).

-- 1. handle_new_user: accetta entrambe le convenzioni di chiave (snake_case
--    del form attuale, camelCase legacy) e popola anche birth_date/phone_number.
--    ON CONFLICT DO NOTHING per idempotenza.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        first_name,
        last_name,
        birth_date,
        phone_number,
        language,
        app_theme,
        notifications_enabled,
        created_at,
        updated_at
    )
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName', ''),
        COALESCE(new.raw_user_meta_data->>'last_name',  new.raw_user_meta_data->>'lastName',  ''),
        NULLIF(COALESCE(new.raw_user_meta_data->>'birth_date', new.raw_user_meta_data->>'birthDate'), '')::date,
        NULLIF(COALESCE(new.raw_user_meta_data->>'phone_number', new.raw_user_meta_data->>'phoneNumber'), ''),
        COALESCE(new.raw_user_meta_data->>'language', 'it'),
        COALESCE(new.raw_user_meta_data->>'app_theme', 'dark'),
        COALESCE((new.raw_user_meta_data->>'notifications_enabled')::boolean, true),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$;

-- 2. handle_user_update: stesse chiavi di handle_new_user.
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    UPDATE public.profiles
    SET
        first_name = COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName', first_name),
        last_name  = COALESCE(new.raw_user_meta_data->>'last_name',  new.raw_user_meta_data->>'lastName',  last_name),
        birth_date = COALESCE(NULLIF(COALESCE(new.raw_user_meta_data->>'birth_date', new.raw_user_meta_data->>'birthDate'), '')::date, birth_date),
        phone_number = COALESCE(NULLIF(COALESCE(new.raw_user_meta_data->>'phone_number', new.raw_user_meta_data->>'phoneNumber'), ''), phone_number),
        language = COALESCE(new.raw_user_meta_data->>'language', language),
        app_theme = COALESCE(new.raw_user_meta_data->>'app_theme', app_theme),
        notifications_enabled = COALESCE((new.raw_user_meta_data->>'notifications_enabled')::boolean, notifications_enabled),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = new.id;
    RETURN new;
END;
$$;

-- 3. Trigger e funzione morti (già neutralizzati dal fix C6).
DROP TRIGGER IF EXISTS trigger_create_profile ON auth.users;
DROP FUNCTION IF EXISTS public.create_profile_on_user_registration();
