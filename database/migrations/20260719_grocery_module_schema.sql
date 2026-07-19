-- Modulo Grocery — schema MVP (PLAN §7.2)
--
-- Modulo standalone: catalogo articoli + dispensa virtuale (la quantità
-- corrente di un articolo È la dispensa), lista della spesa, e righe scontrino
-- come esplosione di una transazione GROCERY di Finance (T6.0) — alimentano
-- dispensa e storico prezzi (€/kg, €/pezzo) per articolo.
--
-- RLS: isolamento per user_id su ogni tabella (D2). Riusa il trigger condiviso
-- public.set_updated_at() introdotto dalla migration House.

-- 1. Catalogo articoli + dispensa (current_quantity = giacenza)
create table public.grocery_items (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    unit text not null default 'pezzo'
        check (unit in ('pezzo', 'kg', 'g', 'litro', 'ml', 'confezione')),
    category text,
    current_quantity numeric(12,3) not null default 0,
    min_quantity numeric(12,3),          -- soglia scorta minima (suggerimenti futuri)
    notes text,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

-- 2. Lista della spesa (item_id opzionale: consente aggiunta rapida a testo libero)
create table public.grocery_shopping_list (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    item_id uuid references public.grocery_items(id) on delete set null,
    name text not null,
    quantity numeric(12,3),
    unit text,
    is_checked boolean not null default false,
    notes text,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

-- 3. Righe scontrino: esplosione di una transazione Finance (T6.0)
--    transaction_id cascade: le righe sono metadati della transazione;
--    item_id cascade: eliminare un articolo ne rimuove lo storico prezzi.
create table public.grocery_receipt_lines (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    transaction_id uuid not null references public.transactions(id) on delete cascade,
    item_id uuid not null references public.grocery_items(id) on delete cascade,
    quantity numeric(12,3) not null,
    unit_price numeric(15,4) not null,   -- prezzo per unità (€/kg, €/pezzo)
    created_at timestamp not null default now()
);

-- Indici sulle FK/filtri
create index grocery_items_user_idx on public.grocery_items (user_id);
create index grocery_shopping_list_user_checked_idx on public.grocery_shopping_list (user_id, is_checked);
create index grocery_receipt_lines_item_idx on public.grocery_receipt_lines (item_id);
create index grocery_receipt_lines_transaction_idx on public.grocery_receipt_lines (transaction_id);

-- RLS + trigger updated_at
do $$
declare
    t text;
begin
    foreach t in array array[
        'grocery_items', 'grocery_shopping_list', 'grocery_receipt_lines'
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
        if t <> 'grocery_receipt_lines' then  -- receipt_lines non ha updated_at
            execute format(
                'create trigger %s_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
        end if;
    end loop;
end;
$$;
