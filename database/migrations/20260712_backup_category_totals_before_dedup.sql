-- Applicata sul DB live il 2026-07-12 (migration Supabase:
-- backup_category_totals_before_dedup).
-- T1.5: snapshot dei totali categorie/sottocategorie prima del fix del
-- trigger duplicato (T3.1). RLS abilitata senza policy: leggibile solo dal
-- service role, invisibile via API pubblica. Da eliminare una volta
-- confermata la correttezza dei nuovi totali.
CREATE TABLE IF NOT EXISTS public._backup_20260712_category_totals AS
  SELECT id, user_id, name, total_amount, transaction_count, now() AS backed_up_at
  FROM public.categories;

CREATE TABLE IF NOT EXISTS public._backup_20260712_subcategory_totals AS
  SELECT id, user_id, category_id, name, total_amount, transaction_count, now() AS backed_up_at
  FROM public.subcategories;

ALTER TABLE public._backup_20260712_category_totals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._backup_20260712_subcategory_totals ENABLE ROW LEVEL SECURITY;
