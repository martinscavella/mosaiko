-- Applicata sul DB live il 2026-07-13 (migration Supabase:
-- cleanup_redundant_and_dead_triggers).
-- T3.2 (parte A): rimozione oggetti ridondanti/morti. Nessun cambio di
-- comportamento sui percorsi che muovono denaro.

-- 1) Doppio setter di account_name su transactions: set_account_name
--    (update_account_name) e transactions_set_account_name
--    (set_account_name_generic) scrivevano lo stesso campo in BEFORE.
--    Si tiene set_account_name_generic (gestisce esplicitamente il NULL).
DROP TRIGGER IF EXISTS set_account_name ON public.transactions;
DROP FUNCTION IF EXISTS public.update_account_name();

-- 2) Doppia propagazione del rename account: accounts_propagate_name_to_funds_transfer
--    era un sottoinsieme di accounts_propagate_name_to_related_tables
--    (funds_transfer veniva aggiornata due volte).
DROP TRIGGER IF EXISTS accounts_propagate_name_to_funds_transfer ON public.accounts;
DROP FUNCTION IF EXISTS public.propagate_account_name_change_to_funds_transfer();

-- 3) Trigger no-op: update_category_subcategory_totals() gestisce solo
--    TG_TABLE_NAME = 'transactions', su refunds/funds_transfer non faceva nulla.
DROP TRIGGER IF EXISTS refunds_category_update ON public.refunds;
DROP TRIGGER IF EXISTS funds_transfer_category_update ON public.funds_transfer;

-- 4) Feature monthly_summary abbandonata: le funzioni puntano a una tabella
--    inesistente e il trigger era gia' disabilitato (tgenabled='D').
DROP TRIGGER IF EXISTS trigger_calculate_monthly_summary ON public.transactions;
DROP FUNCTION IF EXISTS public.trigger_calculate_monthly_summary();
DROP FUNCTION IF EXISTS public.calculate_monthly_summary();
DROP FUNCTION IF EXISTS public.refresh_monthly_summary();

-- 5) Funzioni mai agganciate a nessun trigger e mai chiamate dall'app:
--    - set_trigger_context: il guard myapp.trigger_context non e' mai stato
--      attivato (nessun trigger la invoca)
--    - update_account_balance_on_transaction_update: duplicava il branch
--      UPDATE di update_current_balance
--    - update_category_totals: sostituita da recalculate_category_subcategory_totals
DROP FUNCTION IF EXISTS public.set_trigger_context();
DROP FUNCTION IF EXISTS public.update_account_balance_on_transaction_update();
DROP FUNCTION IF EXISTS public.update_category_totals();
