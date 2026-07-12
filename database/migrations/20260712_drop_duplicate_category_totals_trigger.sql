-- Applicata sul DB live il 2026-07-12 (migration Supabase:
-- drop_duplicate_category_totals_trigger_and_recalc).
-- T3.1: su transactions erano attivi DUE trigger identici che eseguivano
-- entrambi update_category_subcategory_totals() (transactions_category_update
-- e trigger_update_category_subcategory_totals), quindi ogni INSERT/UPDATE/
-- DELETE aggiornava i totali di categorie/sottocategorie due volte.
-- Corruzione verificata sui dati (es. INCOME & SALARY: 122.888 registrato
-- vs 92.263 reale; 1.007 conteggi vs 575 reali). Si tiene
-- transactions_category_update (naming coerente con
-- funds_transfer_category_update/refunds_category_update) e si droppa il
-- gemello, poi si ricalcolano tutti i totali dalla fonte canonica.
--
-- Verifica post-fix: drift = 0 su tutte le 18 categorie e 82 sottocategorie;
-- un solo trigger update_category_subcategory_totals residuo su transactions.
DROP TRIGGER IF EXISTS trigger_update_category_subcategory_totals ON public.transactions;

SELECT public.recalculate_category_subcategory_totals();
