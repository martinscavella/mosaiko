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
    -- Snapshot del conto accreditato (= refunds.account_id al momento
    -- dell'allocazione), popolato da trigger. Serve allo storno del saldo
    -- anche quando l'allocazione viene eliminata in cascata dal rimborso
    -- (migration 20260713_refund_transaction_account_snapshot).
    account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
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

