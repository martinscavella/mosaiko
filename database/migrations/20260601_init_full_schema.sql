-- ============================================================
-- Mosaiko – Full Schema Migration
-- Created: 2026-06-01
-- Description: Recreates the entire DB from scratch.
--              Safe to run on a fresh Supabase project.
-- ============================================================

-- ------------------------------------------------------------
-- Extensions
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id                     uuid                     NOT NULL,
    first_name             character varying(100)   NOT NULL,
    last_name              character varying(100)   NOT NULL,
    birth_date             date                     NULL,
    phone_number           text                     NULL,
    address                text                     NULL,
    bio                    text                     NULL,
    full_name              character varying(200)   GENERATED ALWAYS AS (
                               (first_name::text || ' ' || last_name::text)
                           ) STORED,
    avatar_url             character varying(255)   NULL,
    language               character varying(20)    NULL DEFAULT 'en',
    app_theme              character varying(20)    NULL DEFAULT 'light',
    notifications_enabled  boolean                  NULL DEFAULT true,
    subscription_type      text                     NULL,
    created_at             timestamp                NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             timestamp                NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id)
        REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- accounts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounts (
    id              uuid                   NOT NULL DEFAULT extensions.uuid_generate_v4(),
    user_id         uuid                   NULL,
    name            character varying(100) NOT NULL,
    type            character varying(20)  NOT NULL,
    initial_balance numeric(15,2)          NOT NULL DEFAULT 0,
    current_balance numeric(15,2)          NOT NULL,
    currency        character varying(3)   NOT NULL DEFAULT 'EUR',
    color           character varying(7)   NOT NULL,
    created_at      timestamp              NULL DEFAULT now(),
    updated_at      timestamp              NULL DEFAULT now(),

    CONSTRAINT accounts_pkey PRIMARY KEY (id),
    CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT accounts_color_check CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT accounts_type_check CHECK (type = ANY (ARRAY[
        'bank_account', 'debit_card', 'credit_card', 'saving_account',
        'foreign_account', 'investment_account', 'cash', 'voucher', 'digital_wallet'
    ]))
);

-- ------------------------------------------------------------
-- assets
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assets (
    id          uuid                    NOT NULL DEFAULT extensions.uuid_generate_v4(),
    user_id     uuid                    NULL,
    name        text                    NOT NULL,
    type        text                    NOT NULL,
    quantity    double precision        NOT NULL,
    value       numeric(15,2)           NOT NULL,
    currency    text                    NOT NULL DEFAULT 'EUR',
    account_id  uuid                    NULL,
    symbol      text                    NULL,
    created_at  timestamp with time zone NOT NULL DEFAULT now(),
    updated_at  timestamp with time zone NOT NULL DEFAULT now(),

    CONSTRAINT assets_pkey PRIMARY KEY (id),
    CONSTRAINT assets_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT assets_account_id_fkey FOREIGN KEY (account_id)
        REFERENCES public.accounts(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- categories
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id                uuid           NOT NULL DEFAULT extensions.uuid_generate_v4(),
    user_id           uuid           NULL,
    name              text           NOT NULL,
    total_amount      numeric(15,2)  NOT NULL DEFAULT 0,
    transaction_count integer        NOT NULL DEFAULT 0,
    icon              text           NULL,
    monthly_budget    numeric        NULL DEFAULT 0,
    created_at        timestamp      NULL DEFAULT now(),
    updated_at        timestamp      NULL DEFAULT now(),

    CONSTRAINT categories_pkey PRIMARY KEY (id),
    CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- subcategories
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subcategories (
    id                uuid                   NOT NULL DEFAULT extensions.uuid_generate_v4(),
    user_id           uuid                   NULL,
    name              character varying(100) NOT NULL,
    total_amount      numeric(15,2)          NOT NULL DEFAULT 0,
    transaction_count integer                NOT NULL DEFAULT 0,
    icon              text                   NULL,
    category_id       uuid                   NULL,
    created_at        timestamp              NULL DEFAULT now(),
    updated_at        timestamp              NULL DEFAULT now(),

    CONSTRAINT subcategories_pkey PRIMARY KEY (id),
    CONSTRAINT subcategories_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id)
        REFERENCES public.categories(id)
);

-- ------------------------------------------------------------
-- financial_goals
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_goals (
    id             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
    user_id        uuid                     NULL,
    name           character varying(255)   NOT NULL,
    description    text                     NULL,
    current_amount numeric(15,2)            NOT NULL DEFAULT 0,
    target_amount  numeric(15,2)            NOT NULL,
    currency       character varying(3)     NULL DEFAULT 'EUR',
    target_date    date                     NULL,
    category       character varying(50)    NULL,
    color          character varying(20)    NULL DEFAULT '#3b82f6',
    created_at     timestamp with time zone NULL DEFAULT now(),
    updated_at     timestamp with time zone NULL DEFAULT now(),

    CONSTRAINT financial_goals_pkey PRIMARY KEY (id),
    CONSTRAINT financial_goals_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
);

-- ------------------------------------------------------------
-- refunds
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.refunds (
    id             uuid                  NOT NULL DEFAULT extensions.uuid_generate_v4(),
    user_id        uuid                  NULL,
    account_id     uuid                  NULL,
    refund_date    date                  NOT NULL,
    refund_details text                  NULL,
    refund_code    text                  NULL,
    currency       character varying(3)  NOT NULL DEFAULT 'EUR',
    initial_amount numeric(15,2)         NOT NULL DEFAULT 0,
    current_amount numeric(15,2)         NOT NULL,
    created_at     timestamp             NULL DEFAULT now(),
    updated_at     timestamp             NULL DEFAULT now(),

    CONSTRAINT refunds_pkey PRIMARY KEY (id),
    CONSTRAINT refunds_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT refunds_account_id_fkey FOREIGN KEY (account_id)
        REFERENCES public.accounts(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- transactions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id                   uuid                  NOT NULL DEFAULT extensions.uuid_generate_v4(),
    user_id              uuid                  NULL,
    account_id           uuid                  NULL,
    category_id          uuid                  NULL,
    subcategory_id       uuid                  NULL,
    asset_id             uuid                  NULL,
    transaction_date     date                  NOT NULL,
    transaction_type     text                  NULL,
    transaction_details  text                  NULL,
    transaction_code     text                  NULL,
    transaction_note     text                  NULL,
    account_name         character varying     NULL,
    currency             character varying(3)  NOT NULL DEFAULT 'EUR',
    initial_amount       numeric(15,2)         NOT NULL,
    current_amount       numeric(15,2)         NOT NULL,
    tax                  numeric(15,2)         NULL DEFAULT 0,
    asset_quantity       double precision      NULL,
    is_refunded          boolean               NOT NULL DEFAULT false,
    created_at           timestamp             NULL DEFAULT now(),
    updated_at           timestamp             NULL DEFAULT now(),

    CONSTRAINT transactions_pkey PRIMARY KEY (id),
    CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id)
        REFERENCES public.accounts(id) ON DELETE CASCADE,
    CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id)
        REFERENCES public.categories(id) ON DELETE SET NULL,
    CONSTRAINT transactions_subcategory_id_fkey FOREIGN KEY (subcategory_id)
        REFERENCES public.subcategories(id),
    CONSTRAINT transactions_asset_id_fkey FOREIGN KEY (asset_id)
        REFERENCES public.assets(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- funds_transfer
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.funds_transfer (
    id                      uuid                NOT NULL DEFAULT extensions.uuid_generate_v4(),
    user_id                 uuid                NULL,
    account_id              uuid                NULL,
    funds_transfer_date     date                NULL,
    funds_transfer_details  text                NULL,
    funds_transfer_code     text                NULL,
    currency                character varying   NULL,
    amount                  double precision    NULL,
    created_at              timestamp with time zone NOT NULL DEFAULT now(),
    updated_at              timestamp           NULL DEFAULT now(),

    CONSTRAINT funds_transfer_pkey PRIMARY KEY (id),
    CONSTRAINT funds_transfer_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth.users(id),
    CONSTRAINT funds_transfer_account_id_fkey FOREIGN KEY (account_id)
        REFERENCES public.accounts(id)
);

-- ------------------------------------------------------------
-- refund_transaction  (join table)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.refund_transaction (
    id             uuid          NOT NULL DEFAULT extensions.uuid_generate_v4(),
    user_id        uuid          NULL,
    refund_id      uuid          NOT NULL,
    transaction_id uuid          NOT NULL,
    amount         numeric(15,2) NOT NULL,
    created_at     timestamp     NULL DEFAULT now(),
    updated_at     timestamp     NULL DEFAULT now(),

    CONSTRAINT refund_transaction_pkey PRIMARY KEY (id),
    CONSTRAINT refund_transaction_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth.users(id),
    CONSTRAINT refund_transaction_refund_id_fkey FOREIGN KEY (refund_id)
        REFERENCES public.refunds(id) ON DELETE CASCADE,
    CONSTRAINT refund_transaction_transaction_id_fkey FOREIGN KEY (transaction_id)
        REFERENCES public.transactions(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_assets_account_id        ON public.assets(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_asset_id    ON public.transactions(asset_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id     ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id  ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date        ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id         ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id       ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_category   ON public.subcategories(category_id);

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
ALTER TABLE public.accounts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funds_transfer    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions      ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- RLS Policies
-- ------------------------------------------------------------
CREATE POLICY "Users can only access their own records" ON public.accounts          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own records" ON public.assets            FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own records" ON public.categories        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own records" ON public.financial_goals   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own records" ON public.funds_transfer    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own records" ON public.profiles          FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can only access their own records" ON public.refunds           FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own records" ON public.refund_transaction FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own records" ON public.subcategories     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own records" ON public.transactions      FOR ALL USING (auth.uid() = user_id);
