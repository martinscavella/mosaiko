-- Create tables for Mosaiko Financial Dashboard

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create uuid extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE public.profiles (
    id uuid NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    birth_date date NULL,
    phone_number text NULL,
    address text NULL,
    bio text NULL,
    full_name character varying(200) GENERATED ALWAYS AS ((((first_name)::text || ' '::text) || (last_name)::text)) STORED,
    avatar_url character varying(255) NULL,
    language character varying(20) NULL DEFAULT 'en'::character varying,
    app_theme character varying(20) NULL DEFAULT 'light'::character varying,
    notifications_enabled boolean NULL DEFAULT true,
    created_at timestamp without time zone NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone NULL DEFAULT CURRENT_TIMESTAMP,
    subscription_type text NULL,
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.accounts (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NULL,
  name character varying(100) NOT NULL,
  type character varying(20) NOT NULL,
  initial_balance numeric(15,2) NOT NULL DEFAULT 0,
  current_balance numeric(15,2) NOT NULL,
  currency character varying(3) NOT NULL DEFAULT 'EUR'::character varying,
  color character varying(7) NOT NULL,
  created_at timestamp without time zone NULL DEFAULT now(),
  updated_at timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT accounts_color_check CHECK (((color)::text ~ '^#[0-9A-Fa-f]{6}$'::text)),
  CONSTRAINT accounts_type_check CHECK (((type)::text = ANY (ARRAY[('bank_account'::character varying)::text, ('debit_card'::character varying)::text, ('credit_card'::character varying)::text, ('saving_account'::character varying)::text, ('foreign_account'::character varying)::text, ('investment_account'::character varying)::text, ('cash'::character varying)::text, ('voucher'::character varying)::text, ('digital_wallet'::character varying)::text])))
);

CREATE TABLE public.assets (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NULL,
  name text NOT NULL,
  type text NOT NULL,
  amount double precision NOT NULL,
  value numeric(15,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT assets_pkey PRIMARY KEY (id),
  CONSTRAINT assets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NULL,
  name text NOT NULL,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  transaction_count integer NOT NULL DEFAULT 0,
  icon text NULL,
  created_at timestamp without time zone NULL DEFAULT now(),
  updated_at timestamp without time zone NULL DEFAULT now(),
  monthly_budget numeric NULL DEFAULT '0'::numeric,
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.financial_goals (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  name character varying(255) NOT NULL,
  description text NULL,
  current_amount numeric(15,2) NOT NULL DEFAULT 0,
  target_amount numeric(15,2) NOT NULL,
  currency character varying(3) NULL DEFAULT 'EUR'::character varying,
  target_date date NULL,
  category character varying(50) NULL,
  color character varying(20) NULL DEFAULT '#3b82f6'::character varying,
  user_id uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT financial_goals_pkey PRIMARY KEY (id),
  CONSTRAINT financial_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.funds_transfer (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  funds_transfer_date date NULL,
  funds_transfer_details text NULL,
  funds_transfer_code text NULL,
  account_id uuid NULL,
  currency character varying NULL,
  amount double precision NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NULL DEFAULT now(),
  user_id uuid NULL,
  CONSTRAINT funds_transfer_pkey PRIMARY KEY (id),
  CONSTRAINT funds_transfer_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id),
  CONSTRAINT funds_transfer_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.refunds (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NULL,
  refund_date date NOT NULL,
  refund_details text NULL,
  account_id uuid NULL,
  currency character varying(3) NOT NULL DEFAULT 'EUR'::character varying,
  current_amount numeric(15,2) NOT NULL,
  created_at timestamp without time zone NULL DEFAULT now(),
  updated_at timestamp without time zone NULL DEFAULT now(),
  refund_code text NULL,
  initial_amount numeric(15,2) NOT NULL DEFAULT 0,
  CONSTRAINT refunds_pkey PRIMARY KEY (id),
  CONSTRAINT refunds_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT refunds_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.refund_transaction (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  refund_id uuid NOT NULL,
  transaction_id uuid NOT NULL,
  amount numeric(15,2) NOT NULL,
  created_at timestamp without time zone NULL DEFAULT now(),
  updated_at timestamp without time zone NULL DEFAULT now(),
  user_id uuid NULL,
  CONSTRAINT refund_transaction_pkey PRIMARY KEY (id),
  CONSTRAINT refund_transaction_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.subcategories (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NULL,
  name character varying(100) NOT NULL,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  transaction_count integer NOT NULL DEFAULT 0,
  icon text NULL,
  created_at timestamp without time zone NULL DEFAULT now(),
  updated_at timestamp without time zone NULL DEFAULT now(),
  category_id uuid NULL,
  CONSTRAINT subcategories_pkey PRIMARY KEY (id),
  CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT subcategories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NULL,
  transaction_date date NOT NULL,
  transaction_type text NULL,
  transaction_details text NULL,
  transaction_code text NULL,
  account_id uuid NULL,
  category_id uuid NULL,
  currency character varying(3) NOT NULL DEFAULT 'EUR'::character varying,
  initial_amount numeric(15,2) NOT NULL,
  is_refunded boolean NOT NULL DEFAULT false,
  transaction_note text NULL,
  created_at timestamp without time zone NULL DEFAULT now(),
  updated_at timestamp without time zone NULL DEFAULT now(),
  current_amount numeric(15,2) NOT NULL,
  subcategory_id uuid NULL,
  account_name character varying NULL,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT transactions_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES subcategories(id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security (RLS)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE funds_transfer ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can only access their own records" ON accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own records" ON assets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own records" ON categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own records" ON financial_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own records" ON funds_transfer FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own records" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can only access their own records" ON refunds FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own records" ON refund_transaction FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own records" ON subcategories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own records" ON transactions FOR ALL USING (auth.uid() = user_id);

-- Add foreign key constraints after all tables are created
ALTER TABLE refund_transaction ADD CONSTRAINT refund_transaction_refund_id_fkey 
  FOREIGN KEY (refund_id) REFERENCES refunds(id) ON DELETE CASCADE;
  
ALTER TABLE refund_transaction ADD CONSTRAINT refund_transaction_transaction_id_fkey 
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;
