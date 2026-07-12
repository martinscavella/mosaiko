-- Mosaiko Financial Dashboard — schema di riferimento
--
-- Rigenerato il 2026-07-04 leggendo direttamente il progetto Supabase live
-- (id zrurebzyzrledxwvvpob) via MCP: la versione precedente di questo file
-- era rimasta ferma alla primissima iterazione dello schema e non rifletteva
-- più la realtà (mancavano tutte le funzioni/trigger, le policy RLS erano
-- descritte come "FOR ALL" singole mentre in produzione sono granulari per
-- comando). Non è un dump generato da `supabase db dump`: è stato ricostruito
-- da pg_catalog/information_schema, quindi potrebbero mancare dettagli minori
-- (es. commenti su singole colonne). Da tenere sincronizzato con le migration
-- in futuro invece di editarlo a mano.
--
-- Migration applicate sul progetto live e non presenti come file separati nel
-- repo: add_missing_indexes_on_user_id_and_fks, drop_unused_indexes,
-- fix_rls_auth_uid_performance, neutralize_duplicate_profile_creation_function.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELLE
-- ============================================================

CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    full_name character varying(200) GENERATED ALWAYS AS ((first_name || ' ' || last_name)) STORED,
    avatar_url character varying(255),
    language character varying(20) DEFAULT 'en',
    app_theme character varying(20) DEFAULT 'light',
    notifications_enabled boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    subscription_type text,
    birth_date date,
    phone_number text,
    address text,
    bio text
);

CREATE TABLE public.accounts (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name character varying(100) NOT NULL,
    type character varying(20) NOT NULL
        CHECK (type IN ('bank_account','debit_card','credit_card','saving_account',
                         'foreign_account','investment_account','cash','voucher','digital_wallet')),
    initial_balance numeric(15,2) NOT NULL DEFAULT 0,
    current_balance numeric(15,2) NOT NULL,
    currency character varying(3) NOT NULL DEFAULT 'EUR',
    color character varying(7) NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    -- Aggiunta via database/add_account_is_active.sql (2026-07-07): account
    -- disattivati restano per storicità ma spariscono dalle picklist di
    -- scelta account in creazione/modifica movimenti.
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.assets (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL,
    quantity double precision NOT NULL,
    value numeric(15,2) NOT NULL,
    currency text NOT NULL DEFAULT 'EUR',
    account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
    symbol text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.categories (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    total_amount numeric(15,2) NOT NULL DEFAULT 0,
    transaction_count integer NOT NULL DEFAULT 0,
    icon text,
    monthly_budget numeric DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- NOTA: annotata nel DB live come "This is a duplicate of categories" da uno
-- sviluppatore precedente — ridondanza di modello nota, non ancora risolta
-- (vedi TRIAGE.md, voce di debito residuo).
CREATE TABLE public.subcategories (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name character varying(100) NOT NULL,
    total_amount numeric(15,2) NOT NULL DEFAULT 0,
    transaction_count integer NOT NULL DEFAULT 0,
    icon text,
    category_id uuid REFERENCES public.categories(id),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.financial_goals (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id),
    name character varying(255) NOT NULL,
    description text,
    current_amount numeric(15,2) NOT NULL DEFAULT 0,
    target_amount numeric(15,2) NOT NULL,
    currency character varying(3) DEFAULT 'EUR',
    target_date date,
    category character varying(50),
    color character varying(20) DEFAULT '#3b82f6',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.funds_transfer (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id),
    account_id uuid REFERENCES public.accounts(id),
    account_name character varying,
    funds_transfer_date date,
    funds_transfer_details text,
    funds_transfer_code text,
    currency character varying,
    amount double precision,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.refunds (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
    account_name character varying,
    refund_date date NOT NULL,
    refund_details text,
    refund_code text,
    currency character varying(3) NOT NULL DEFAULT 'EUR',
    initial_amount numeric(15,2) NOT NULL DEFAULT 0,
    current_amount numeric(15,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.transactions (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
    account_name character varying,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    subcategory_id uuid REFERENCES public.subcategories(id),
    asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
    asset_quantity double precision,
    transaction_date date NOT NULL,
    transaction_type text,
    transaction_details text,
    transaction_code text,
    transaction_note text,
    currency character varying(3) NOT NULL DEFAULT 'EUR',
    initial_amount numeric(15,2) NOT NULL,
    current_amount numeric(15,2) NOT NULL,
    is_refunded boolean NOT NULL DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.refund_transaction (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id),
    refund_id uuid NOT NULL REFERENCES public.refunds(id) ON DELETE CASCADE,
    transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    amount numeric(15,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- ============================================================
-- INDICI (oltre alle primary key)
-- ============================================================

CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX idx_assets_user_id ON public.assets(user_id);
-- Ricreati il 2026-07-04 (migration recreate_missing_fk_indexes, I9): erano
-- presenti nella primissima versione di questo file ma assenti dal DB live,
-- quasi certamente rimossi per errore dalla migration drop_unused_indexes
-- quando le tabelle erano vuote (0 righe) e sembravano "non usati".
CREATE INDEX idx_assets_account_id ON public.assets(account_id);
CREATE INDEX idx_transactions_asset_id ON public.transactions(asset_id);
CREATE INDEX idx_categories_user_id ON public.categories(user_id);
CREATE INDEX idx_subcategories_user_id ON public.subcategories(user_id);
CREATE INDEX idx_subcategories_category_id ON public.subcategories(category_id);
CREATE INDEX idx_financial_goals_user_id ON public.financial_goals(user_id);
CREATE INDEX idx_funds_transfer_user_id ON public.funds_transfer(user_id);
CREATE INDEX idx_funds_transfer_account_id ON public.funds_transfer(account_id);
CREATE INDEX idx_refunds_user_id ON public.refunds(user_id);
CREATE INDEX idx_refunds_account_id ON public.refunds(account_id);
CREATE INDEX idx_refund_transaction_user_id ON public.refund_transaction(user_id);
CREATE INDEX idx_refund_transaction_refund_id ON public.refund_transaction(refund_id);
CREATE INDEX idx_refund_transaction_transaction_id ON public.refund_transaction(transaction_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX idx_transactions_subcategory_id ON public.transactions(subcategory_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date DESC);
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- Tutte le tabelle hanno RLS abilitata. A differenza della prima versione di
-- questo file (una singola policy "FOR ALL USING"), in produzione le policy
-- sono granulari per comando e usano `(select auth.uid())` invece di
-- `auth.uid()` diretto (ottimizzazione pianificatore, migration
-- fix_rls_auth_uid_performance) — per-row auth.uid() viene rivalutato una
-- volta sola per query invece che per ogni riga.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funds_transfer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_transaction ENABLE ROW LEVEL SECURITY;

-- profiles: policy per comando + una policy INSERT ristretta al service_role
-- (bypassa comunque RLS, usata solo da eventuali script server-side)
CREATE POLICY "Enable insert for service role" ON public.profiles FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (id = (select auth.uid()));
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = (select auth.uid()));
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING (id = (select auth.uid()));

CREATE POLICY accounts_select ON public.accounts FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY accounts_insert ON public.accounts FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY accounts_update ON public.accounts FOR UPDATE USING (user_id = (select auth.uid()));
CREATE POLICY accounts_delete ON public.accounts FOR DELETE USING (user_id = (select auth.uid()));

CREATE POLICY "Enable ALL for users based on user_id" ON public.assets FOR ALL
    USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY categories_select ON public.categories FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY categories_insert ON public.categories FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY categories_update ON public.categories FOR UPDATE USING (user_id = (select auth.uid()));
CREATE POLICY categories_delete ON public.categories FOR DELETE USING (user_id = (select auth.uid()));

CREATE POLICY "Policy with security definer functions" ON public.subcategories FOR ALL
    USING ((select auth.uid()) = user_id);

CREATE POLICY financial_goals_select ON public.financial_goals FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY financial_goals_insert ON public.financial_goals FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY financial_goals_update ON public.financial_goals FOR UPDATE USING (user_id = (select auth.uid()));
CREATE POLICY financial_goals_delete ON public.financial_goals FOR DELETE USING (user_id = (select auth.uid()));

CREATE POLICY "Enable ALL for users based on user_id" ON public.funds_transfer FOR ALL
    USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Enable ALL for users based on user_id" ON public.refunds FOR ALL
    USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Policy with security definer functions" ON public.transactions FOR ALL
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Enable ALL for users based on user_id" ON public.refund_transaction FOR ALL
    USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================
-- FUNZIONI TRIGGER
-- ============================================================
-- Irrobustite il 2026-07-04 (migration harden_trigger_functions_search_path_and_execute
-- + revoke_public_execute_on_trigger_functions, I10): tutte le funzioni sotto
-- hanno ora `SET search_path = public` esplicito (risolto il WARN
-- "Function Search Path Mutable" del linter Supabase). Le 10 funzioni
-- SECURITY DEFINER che il linter segnalava come chiamabili via
-- `/rest/v1/rpc/<nome>` da anon/authenticated (check_refund_transaction_amount,
-- handle_new_user, handle_user_update, trigger_calculate_monthly_summary,
-- update_account_balance_on_refund_transaction, update_account_name,
-- update_category_subcategory_totals, update_current_balance,
-- update_refund_current_amount, update_transaction_current_amount) hanno
-- anche EXECUTE revocato da anon/authenticated/PUBLIC (verificato: nessuna
-- di queste è mai chiamata via supabase.rpc() dall'app). I trigger continuano
-- a funzionare normalmente: Postgres non richiede il privilegio EXECUTE per
-- l'invocazione automatica di una funzione trigger, solo per la chiamata
-- diretta via RPC.

-- Crea automaticamente il profilo utente alla registrazione, popolando i
-- campi dai metadata passati a supabase.auth.signUp() (firstName, lastName,
-- language, app_theme, notifications_enabled). Unica funzione che deve
-- effettivamente inserire la riga in profiles per ogni nuovo utente.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
    INSERT INTO public.profiles (
        id, first_name, last_name, language, app_theme, notifications_enabled,
        created_at, updated_at
    )
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'firstName', ''),
        COALESCE(new.raw_user_meta_data->>'lastName', ''),
        COALESCE(new.raw_user_meta_data->>'language', 'it'),
        COALESCE(new.raw_user_meta_data->>'app_theme', 'dark'),
        COALESCE((new.raw_user_meta_data->>'notifications_enabled')::boolean, true),
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
    RETURN new;
END;
$function$;

-- NEUTRALIZZATA il 2026-07-04 (migration neutralize_duplicate_profile_creation_function,
-- Critico C6): duplicava l'INSERT di handle_new_user() sullo stesso id,
-- violando profiles_pkey e facendo fallire ogni registrazione. Il trigger
-- resta agganciato su auth.users (non abbiamo permessi ALTER su quella
-- tabella per rimuoverlo), ma la funzione ora e' un no-op.
CREATE OR REPLACE FUNCTION public.create_profile_on_user_registration()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
    UPDATE public.profiles
    SET first_name = COALESCE(new.raw_user_meta_data->>'firstName', first_name),
        last_name = COALESCE(new.raw_user_meta_data->>'lastName', last_name),
        language = COALESCE(new.raw_user_meta_data->>'language', language),
        app_theme = COALESCE(new.raw_user_meta_data->>'app_theme', app_theme),
        notifications_enabled = COALESCE((new.raw_user_meta_data->>'notifications_enabled')::boolean, notifications_enabled),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = new.id;
    RETURN new;
END;
$function$;

-- Propaga il nome account a tabelle collegate quando accounts.name cambia
CREATE OR REPLACE FUNCTION public.set_account_name_generic()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
    IF NEW.account_id IS NOT NULL THEN
        SELECT name INTO NEW.account_name FROM public.accounts WHERE id = NEW.account_id;
    ELSE
        NEW.account_name := NULL;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_funds_transfer_account_name()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
    IF NEW.account_id IS NOT NULL THEN
        SELECT name INTO NEW.account_name FROM public.accounts WHERE id = NEW.account_id;
    ELSE
        NEW.account_name := NULL;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_account_name()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
    NEW.account_name := (SELECT name FROM public.accounts WHERE id = NEW.account_id);
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.propagate_account_name_change_to_funds_transfer()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
        UPDATE public.funds_transfer SET account_name = NEW.name WHERE account_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.propagate_account_name_change_to_related_tables()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
        UPDATE public.funds_transfer SET account_name = NEW.name WHERE account_id = NEW.id;
        UPDATE public.transactions SET account_name = NEW.name WHERE account_id = NEW.id;
        UPDATE public.refunds SET account_name = NEW.name WHERE account_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$function$;

-- Mantiene accounts.current_balance sincronizzato a ogni scrittura su
-- transactions/funds_transfer. myapp.trigger_context evita un doppio update
-- quando update_account_balance_on_transaction_update ha gia' aggiornato il
-- saldo nello stesso giro.
CREATE OR REPLACE FUNCTION public.set_trigger_context()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
    PERFORM set_config('myapp.trigger_context', 'true', false);
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_current_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
    is_trigger_call boolean;
BEGIN
    is_trigger_call := current_setting('myapp.trigger_context', true) = 'true';

    IF TG_TABLE_NAME = 'transactions' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE accounts SET current_balance = current_balance + NEW.current_amount WHERE id = NEW.account_id;
        ELSIF TG_OP = 'UPDATE' THEN
            IF NOT is_trigger_call THEN
                UPDATE accounts SET current_balance = current_balance - OLD.current_amount + NEW.current_amount WHERE id = NEW.account_id;
            END IF;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE accounts SET current_balance = current_balance - OLD.current_amount WHERE id = OLD.account_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'funds_transfer' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
        ELSIF TG_OP = 'UPDATE' THEN
            UPDATE accounts SET current_balance = current_balance - OLD.amount + NEW.amount WHERE id = NEW.account_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_account_balance_on_transaction_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
    UPDATE accounts SET current_balance = current_balance - OLD.current_amount + NEW.current_amount WHERE id = NEW.account_id;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_current_balance()
RETURNS void LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
    UPDATE accounts SET current_balance = initial_balance
        + (SELECT COALESCE(SUM(initial_amount), 0) FROM transactions WHERE account_id = accounts.id)
        + (SELECT COALESCE(SUM(amount), 0) FROM funds_transfer WHERE account_id = accounts.id)
        + (SELECT COALESCE(SUM(initial_amount), 0) FROM refunds WHERE account_id = accounts.id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_current_balance_by_id(account_id_param uuid)
RETURNS numeric LANGUAGE plpgsql SET search_path = public AS $function$
DECLARE
    new_balance numeric;
BEGIN
    SET search_path = '';
    UPDATE public.accounts
    SET current_balance = initial_balance
        + (SELECT COALESCE(SUM(initial_amount), 0) FROM public.transactions WHERE account_id = account_id_param)
        + (SELECT COALESCE(SUM(amount), 0) FROM public.funds_transfer WHERE account_id = account_id_param)
        + (SELECT COALESCE(SUM(initial_amount), 0) FROM public.refunds WHERE account_id = account_id_param),
        updated_at = now()
    WHERE id = account_id_param
    RETURNING current_balance INTO new_balance;
    RETURN new_balance;
END;
$function$;

-- Mantiene categories/subcategories.total_amount e transaction_count
-- sincronizzati a ogni scrittura su transactions/refunds/funds_transfer.
CREATE OR REPLACE FUNCTION public.update_category_subcategory_totals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
    IF TG_TABLE_NAME = 'transactions' THEN
        IF TG_OP = 'INSERT' THEN
            IF NEW.current_amount <> 0 THEN
                UPDATE categories SET total_amount = total_amount + NEW.current_amount, transaction_count = transaction_count + 1 WHERE id = NEW.category_id;
                UPDATE subcategories SET total_amount = total_amount + NEW.current_amount, transaction_count = transaction_count + 1 WHERE id = NEW.subcategory_id;
            END IF;
        ELSIF TG_OP = 'UPDATE' THEN
            IF NEW.current_amount <> OLD.current_amount THEN
                IF OLD.current_amount <> 0 THEN
                    UPDATE categories SET total_amount = total_amount - OLD.current_amount WHERE id = NEW.category_id;
                END IF;
                IF NEW.current_amount <> 0 THEN
                    UPDATE categories SET total_amount = total_amount + NEW.current_amount WHERE id = NEW.category_id;
                END IF;
                IF OLD.current_amount <> 0 THEN
                    UPDATE subcategories SET total_amount = total_amount - OLD.current_amount WHERE id = NEW.subcategory_id;
                END IF;
                IF NEW.current_amount <> 0 THEN
                    UPDATE subcategories SET total_amount = total_amount + NEW.current_amount WHERE id = NEW.subcategory_id;
                END IF;
            END IF;
        ELSIF TG_OP = 'DELETE' THEN
            IF OLD.current_amount <> 0 THEN
                UPDATE categories SET total_amount = total_amount - OLD.current_amount, transaction_count = transaction_count - 1 WHERE id = OLD.category_id;
                UPDATE subcategories SET total_amount = total_amount - OLD.current_amount, transaction_count = transaction_count - 1 WHERE id = OLD.subcategory_id;
            END IF;
        END IF;
    END IF;
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_category_totals()
RETURNS void LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
    UPDATE public.categories c
    SET total_amount = COALESCE((SELECT SUM(t.current_amount) FROM public.transactions t WHERE t.category_id = c.id), 0),
        transaction_count = COALESCE((SELECT COUNT(*) FROM public.transactions t WHERE t.category_id = c.id), 0)
    WHERE c.id IS NOT NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_category_subcategory_totals()
RETURNS void LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
    UPDATE categories SET
        total_amount = COALESCE((SELECT SUM(current_amount) FROM transactions WHERE category_id = categories.id AND current_amount <> 0), 0),
        transaction_count = COALESCE((SELECT COUNT(*) FROM transactions WHERE category_id = categories.id AND current_amount <> 0), 0);
    UPDATE subcategories SET
        total_amount = COALESCE((SELECT SUM(current_amount) FROM transactions WHERE subcategory_id = subcategories.id AND current_amount <> 0), 0),
        transaction_count = COALESCE((SELECT COUNT(*) FROM transactions WHERE subcategory_id = subcategories.id AND current_amount <> 0), 0);
END;
$function$;

-- Rimborsi: valida che l'importo di un movimento non superi il residuo del
-- rimborso e lo scala di conseguenza; propaga l'importo alla transazione
-- collegata e il saldo dell'account.
CREATE OR REPLACE FUNCTION public.check_refund_transaction_amount()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
    IF NEW.amount > (SELECT current_amount FROM refunds WHERE id = NEW.refund_id) THEN
        RAISE EXCEPTION 'L''importo non può superare l''importo corrente nella tabella refunds.';
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_refund_current_amount()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
    IF NEW.amount > (SELECT current_amount FROM refunds WHERE id = NEW.refund_id) THEN
        RAISE EXCEPTION 'L''importo non può superare l''importo corrente nella tabella refunds.';
    END IF;
    UPDATE refunds SET current_amount = current_amount - NEW.amount WHERE id = NEW.refund_id;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_transaction_current_amount()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
    IF TG_TABLE_NAME = 'refund_transaction' THEN
        UPDATE transactions SET current_amount = current_amount + NEW.amount WHERE id = NEW.transaction_id;
    END IF;
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_account_balance_on_refund_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
    refund_account_id uuid;
BEGIN
    SELECT account_id INTO refund_account_id FROM refunds WHERE id = NEW.refund_id;
    IF TG_OP = 'INSERT' THEN
        UPDATE accounts SET current_balance = current_balance + NEW.amount WHERE id = refund_account_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE accounts SET current_balance = current_balance - OLD.amount + NEW.amount WHERE id = refund_account_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE accounts SET current_balance = current_balance - OLD.amount WHERE id = refund_account_id;
    END IF;
    RETURN NULL;
END;
$function$;

-- Statistiche mensili aggregate verso una tabella `monthly_summary` che NON
-- esiste nel DB live (verificato via information_schema.tables): se invocate,
-- queste funzioni fallirebbero con "relation does not exist". Il trigger
-- collegato (trigger_calculate_monthly_summary su transactions, vedi sotto) è
-- infatti già DISABILITATO sul DB live (tgenabled='D') — qualcuno se n'era
-- accorto in passato ed è per questo che gli insert su transactions non
-- falliscono oggi. Codice morto sicuro finché resta disabilitato; da NON
-- riabilitare senza prima creare la tabella monthly_summary.
CREATE OR REPLACE FUNCTION public.calculate_monthly_summary()
RETURNS void LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
    INSERT INTO public.monthly_summary (month, year, total_income, total_expense, savings_rate, currency, user_id, total_balance, created_at, updated_at)
    SELECT TO_CHAR(transaction_date, 'Month'), EXTRACT(YEAR FROM transaction_date),
        COALESCE(SUM(CASE WHEN current_amount > 0 THEN current_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN current_amount < 0 THEN current_amount ELSE 0 END), 0),
        CASE WHEN COALESCE(SUM(CASE WHEN current_amount > 0 THEN current_amount ELSE 0 END), 0) = 0 THEN 0
             ELSE (COALESCE(SUM(CASE WHEN current_amount > 0 THEN current_amount ELSE 0 END), 0)
                  - COALESCE(SUM(CASE WHEN current_amount < 0 THEN current_amount ELSE 0 END), 0)) * 100.0
                  / COALESCE(SUM(CASE WHEN current_amount > 0 THEN current_amount ELSE 0 END), 0)
        END,
        'EUR', user_id,
        COALESCE(SUM(current_amount), 0) + COALESCE((SELECT SUM(initial_balance) FROM public.accounts WHERE user_id = transactions.user_id), 0),
        NOW(), NOW()
    FROM public.transactions
    GROUP BY month, year, user_id
    ON CONFLICT (month, year, user_id) DO UPDATE SET
        total_income = EXCLUDED.total_income, total_expense = EXCLUDED.total_expense,
        savings_rate = EXCLUDED.savings_rate, total_balance = EXCLUDED.total_balance, updated_at = NOW();
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_calculate_monthly_summary()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
    PERFORM public.calculate_monthly_summary();
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_monthly_summary()
RETURNS void LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
    INSERT INTO public.monthly_summary (month, year, total_income, total_expense, savings_rate, currency, user_id, total_balance, created_at, updated_at)
    SELECT TO_CHAR(transaction_date, 'Month'), EXTRACT(YEAR FROM transaction_date),
        COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN current_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN current_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN current_amount ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN current_amount ELSE 0 END), 0),
        'EUR', user_id, COALESCE(SUM(current_amount), 0), NOW(), NOW()
    FROM public.transactions
    GROUP BY month, year, user_id
    ON CONFLICT (month, year, user_id) DO UPDATE SET
        total_income = EXCLUDED.total_income, total_expense = EXCLUDED.total_expense,
        savings_rate = EXCLUDED.savings_rate, total_balance = EXCLUDED.total_balance, updated_at = NOW();
END;
$function$;

-- ============================================================
-- TRIGGER
-- ============================================================

-- Su auth.users (schema gestito da Supabase — qui solo a scopo documentale,
-- non ri-eseguibile da questo file senza permessi sufficienti)
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();
-- CREATE TRIGGER trigger_create_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_profile_on_user_registration(); -- neutralizzata, vedi sopra

CREATE TRIGGER accounts_propagate_name_to_funds_transfer AFTER UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.propagate_account_name_change_to_funds_transfer();
CREATE TRIGGER accounts_propagate_name_to_related_tables AFTER UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.propagate_account_name_change_to_related_tables();

CREATE TRIGGER funds_transfer_set_account_name BEFORE INSERT OR UPDATE ON public.funds_transfer FOR EACH ROW EXECUTE FUNCTION public.set_funds_transfer_account_name();
CREATE TRIGGER funds_transfer_balance_update AFTER INSERT OR UPDATE OR DELETE ON public.funds_transfer FOR EACH ROW EXECUTE FUNCTION public.update_current_balance();
CREATE TRIGGER funds_transfer_category_update AFTER INSERT OR UPDATE OR DELETE ON public.funds_transfer FOR EACH ROW EXECUTE FUNCTION public.update_category_subcategory_totals();

CREATE TRIGGER refunds_set_account_name BEFORE INSERT OR UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.set_account_name_generic();
CREATE TRIGGER refunds_category_update AFTER INSERT OR UPDATE OR DELETE ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.update_category_subcategory_totals();

CREATE TRIGGER trg_check_refund_transaction_amount BEFORE INSERT OR UPDATE ON public.refund_transaction FOR EACH ROW EXECUTE FUNCTION public.check_refund_transaction_amount();
CREATE TRIGGER trg_update_refund_current_amount BEFORE INSERT OR UPDATE ON public.refund_transaction FOR EACH ROW EXECUTE FUNCTION public.update_refund_current_amount();
CREATE TRIGGER trg_update_transaction_current_amount AFTER INSERT OR UPDATE ON public.refund_transaction FOR EACH ROW EXECUTE FUNCTION public.update_transaction_current_amount();
CREATE TRIGGER trigger_update_account_balance_on_refund_transaction AFTER INSERT OR UPDATE OR DELETE ON public.refund_transaction FOR EACH ROW EXECUTE FUNCTION public.update_account_balance_on_refund_transaction();

CREATE TRIGGER transactions_set_account_name BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_account_name_generic();
CREATE TRIGGER set_account_name BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_account_name();
CREATE TRIGGER transactions_balance_update AFTER INSERT OR UPDATE OR DELETE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_current_balance();
CREATE TRIGGER transactions_category_update AFTER INSERT OR UPDATE OR DELETE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_category_subcategory_totals();
-- RIMOSSO il 2026-07-12 (migration drop_duplicate_category_totals_trigger_and_recalc,
-- vedi database/migrations/): trigger_update_category_subcategory_totals era un
-- DUPLICATO attivo di transactions_category_update (stessa funzione, stessi eventi)
-- e faceva contare due volte ogni movimento nei totali di categorie/sottocategorie.
-- Totali ricalcolati dalla fonte canonica dopo il drop (drift verificato = 0).
-- DISABILITATO sul DB live (tgenabled='D') — vedi nota sopra su monthly_summary
CREATE TRIGGER trigger_calculate_monthly_summary AFTER INSERT OR UPDATE OR DELETE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.trigger_calculate_monthly_summary();
ALTER TABLE public.transactions DISABLE TRIGGER trigger_calculate_monthly_summary;
