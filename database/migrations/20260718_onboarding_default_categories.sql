-- T3.11 — Onboarding nuovo utente: categorie di default + slug per categorie di sistema
--
-- 1. categories.slug: identificatore stabile per le categorie "di sistema"
--    (oggi solo 'assets' per ASSET & INVESTIMENTI). Il codice smette di cercare
--    la categoria per nome visualizzato: il nome è modificabile dall'utente,
--    lo slug no. Unico per utente (indice parziale, slug NULL = categoria libera).
-- 2. seed_default_categories(uuid): crea il set di categorie/sottocategorie di
--    default per un utente. Idempotente: non fa nulla se l'utente ha già
--    almeno una categoria.
-- 3. handle_new_user(): dopo il profilo, esegue il seed → un utente appena
--    registrato può usare tutte le pagine senza setup manuale.
--
-- Il set di default replica la tassonomia usata dall'app (stessi nomi categoria
-- attesi dai parser di import), con sottocategorie generiche (senza le voci
-- personali del dominio del primo utente).

-- 1. slug
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS categories_user_slug_key
    ON public.categories (user_id, slug) WHERE slug IS NOT NULL;
UPDATE public.categories SET slug = 'assets'
    WHERE name = 'ASSET & INVESTIMENTI' AND slug IS NULL;

-- 2. seed
CREATE OR REPLACE FUNCTION public.seed_default_categories(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_cat record;
    v_cat_id uuid;
BEGIN
    IF EXISTS (SELECT 1 FROM public.categories WHERE user_id = p_user_id) THEN
        RETURN; -- l'utente ha già categorie: niente seed
    END IF;

    FOR v_cat IN
        SELECT * FROM (VALUES
            ('INCOME & SALARY',            NULL,     ARRAY['Stipendio','Bonus','Entrate Extra','Interessi maturati','Regali']),
            ('GROCERY',                    NULL,     ARRAY['Supermercato','Negozi Online','Alimenti confezionati']),
            ('FOOD & DRINK',               NULL,     ARRAY['Ristoranti','Bar/Caffè','Delivery','Fast Food','Bevande']),
            ('HOUSE EXPENSES',             NULL,     ARRAY['Affitto','Utenze','Spese Condominiali','Manutenzione']),
            ('TRANSPORT',                  NULL,     ARRAY['Carburante','Trasporto Pubblico','Parcheggio','Taxi/Ride-Sharing','Veicoli e Manutenzione']),
            ('TRAVEL',                     NULL,     ARRAY['Voli','Treni','Hotel/BnB','Vacanze','Escursioni']),
            ('SHOPPING & CONSUMER GOODS',  NULL,     ARRAY['Abbigliamento','Accessori','Tecnologia','Casa e Arredamento','Shopping Online']),
            ('PERSONAL EXPENSES',          NULL,     ARRAY['Salute','Cura della Persona','Istruzione','Cultura']),
            ('ENTERTAINMENT',              NULL,     ARRAY['Concerti','Eventi','Giochi','Cinema/Teatro']),
            ('SPORT',                      NULL,     ARRAY['Palestra','Attività Sportive','Attrezzatura']),
            ('SUBSCRIPTION SERVICES',      NULL,     ARRAY['Streaming','Musica','Software','Salute & Fitness']),
            ('TELECOMUNICATIONS & SERVICES', NULL,   ARRAY['Abbonamenti Telefonici','Internet/TV','Ricarica Telefonica']),
            ('FEES & COMMISSIONS',         NULL,     ARRAY['Commissioni Bancarie','Commissioni Transazioni','Spese di Servizio']),
            ('FINANZIAMENTO',              NULL,     ARRAY['Mutuo','Prestiti Personali','Rate e Finanziamenti']),
            ('PRELIEVI',                   NULL,     ARRAY['Prelievo Bancomat','Prelievo Sportello','Prelievo Wallet']),
            ('REGALI',                     NULL,     ARRAY['Regali per Famiglia','Regali per Amici']),
            ('TRANSFER',                   NULL,     ARRAY['Bonifico','Ricariche Wallet']),
            ('ASSET & INVESTIMENTI',       'assets', ARRAY['Investimenti','Immobili'])
        ) AS t(name, slug, subs)
    LOOP
        INSERT INTO public.categories (user_id, name, slug)
        VALUES (p_user_id, v_cat.name, v_cat.slug)
        RETURNING id INTO v_cat_id;

        INSERT INTO public.subcategories (user_id, category_id, name)
        SELECT p_user_id, v_cat_id, unnest(v_cat.subs);
    END LOOP;
END;
$$;

-- Solo il trigger handle_new_user deve poterla eseguire: SECURITY DEFINER con
-- user_id parametrico, un client non deve poter seminare categorie altrui.
REVOKE EXECUTE ON FUNCTION public.seed_default_categories(uuid) FROM PUBLIC, anon, authenticated;

-- 3. handle_new_user: profilo + seed categorie
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

    PERFORM public.seed_default_categories(new.id);

    RETURN new;
END;
$$;
