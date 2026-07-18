-- Modulo House — schema MVP (PLAN §7.1) + primo link cross-modulo (T6.0)
--
-- Tabelle: proprietà (multi-casa: tutto appartiene a una proprietà),
-- bollette (con allegato PDF via bucket attachments, T6.1), manutenzioni,
-- affitto/mutuo (contratto), inventario, fornitori/contatti.
-- bill_payments è la prima tabella di link del pattern T6.0
-- (docs/guides/CROSS_MODULE_LINKS.md): bolletta ↔ transazione Finance.
--
-- RLS: isolamento per user_id su ogni tabella (D2, prodotto multi-utente).

-- Trigger condiviso per updated_at (prima funzione di questo tipo nel DB)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- 1. Proprietà
create table public.house_properties (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    address text,
    type text not null default 'casa'
        check (type in ('casa', 'appartamento', 'box', 'terreno', 'altro')),
    is_primary boolean not null default false,
    notes text,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

-- 2. Bollette/utenze
create table public.house_bills (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    property_id uuid not null references public.house_properties(id) on delete cascade,
    utility_type text not null
        check (utility_type in ('luce', 'gas', 'acqua', 'internet', 'telefono', 'rifiuti', 'condominio', 'altro')),
    provider_name text,
    amount numeric(15,2) not null,
    consumption numeric(12,3),           -- kWh, Smc, m³… secondo l'utenza
    consumption_unit text,
    period_start date,
    period_end date,
    due_date date,
    status text not null default 'da_pagare'
        check (status in ('da_pagare', 'pagata')),
    attachment_path text,                -- path nel bucket attachments (T6.1)
    notes text,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

-- 3. Link bolletta ↔ transazione Finance (T6.0, prima implementazione)
create table public.bill_payments (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    bill_id uuid not null references public.house_bills(id) on delete cascade,
    -- restrict: eliminare una transazione collegata richiede prima lo scollegamento
    transaction_id uuid not null references public.transactions(id) on delete restrict,
    amount numeric(15,2),                -- quota, se la bolletta è pagata in più volte
    created_at timestamp not null default now(),
    unique (bill_id, transaction_id)
);

-- 4. Fornitori/contatti (prima delle manutenzioni che li referenziano)
create table public.house_contacts (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    role text,                           -- idraulico, elettricista, amministratore…
    phone text,
    email text,
    notes text,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

-- 5. Manutenzioni (periodiche e straordinarie)
create table public.house_maintenances (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    property_id uuid not null references public.house_properties(id) on delete cascade,
    title text not null,
    kind text not null default 'straordinaria'
        check (kind in ('periodica', 'straordinaria')),
    interval_months integer check (interval_months is null or interval_months > 0),
    last_done_date date,
    next_due_date date,
    cost numeric(15,2),
    contact_id uuid references public.house_contacts(id) on delete set null,
    attachment_path text,
    notes text,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

-- 6. Affitto/mutuo (contratto per proprietà; i pagamenti si collegano a
--    Finance con una tabella di link dedicata nel prossimo incremento)
create table public.house_housing (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    property_id uuid not null references public.house_properties(id) on delete cascade,
    kind text not null check (kind in ('affitto', 'mutuo')),
    monthly_amount numeric(15,2) not null,
    due_day integer check (due_day between 1 and 31),
    start_date date,
    end_date date,
    notes text,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

-- 7. Inventario (oggetti, garanzie, documenti)
create table public.house_inventory_items (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    property_id uuid not null references public.house_properties(id) on delete cascade,
    name text not null,
    category text,
    purchase_date date,
    warranty_until date,
    value numeric(15,2),
    attachment_path text,
    notes text,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

-- Indici sulle FK usate nei filtri
create index house_bills_property_idx on public.house_bills (property_id);
create index house_bills_user_status_idx on public.house_bills (user_id, status);
create index bill_payments_bill_idx on public.bill_payments (bill_id);
create index bill_payments_transaction_idx on public.bill_payments (transaction_id);
create index house_maintenances_property_idx on public.house_maintenances (property_id);
create index house_housing_property_idx on public.house_housing (property_id);
create index house_inventory_property_idx on public.house_inventory_items (property_id);

-- RLS + trigger updated_at per tutte le tabelle del modulo
do $$
declare
    t text;
begin
    foreach t in array array[
        'house_properties', 'house_bills', 'bill_payments', 'house_contacts',
        'house_maintenances', 'house_housing', 'house_inventory_items'
    ] loop
        execute format('alter table public.%I enable row level security', t);
        execute format(
            'create policy "%s_select_own" on public.%I for select to authenticated using (user_id = auth.uid())', t, t);
        execute format(
            'create policy "%s_insert_own" on public.%I for insert to authenticated with check (user_id = auth.uid())', t, t);
        execute format(
            'create policy "%s_update_own" on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t, t);
        execute format(
            'create policy "%s_delete_own" on public.%I for delete to authenticated using (user_id = auth.uid())', t, t);
        if t <> 'bill_payments' then  -- bill_payments non ha updated_at
            execute format(
                'create trigger %s_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
        end if;
    end loop;
end;
$$;
