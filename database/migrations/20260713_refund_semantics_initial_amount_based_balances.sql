-- Applicata sul DB live il 2026-07-13 (migration Supabase:
-- backup_account_balances_before_refund_semantics +
-- refund_semantics_initial_amount_based_balances).
-- T3.2 (parte B): semantica canonica di saldi e rimborsi (docs/DATA_MODEL.md).
--
-- Principi:
--  * transactions.initial_amount: immutabile, muove il saldo del conto della transazione
--  * transactions.current_amount: solo visualizzazione (netto dopo rimborsi), NON muove saldi
--  * l'allocazione (refund_transaction) accredita SOLO il conto del rimborso (refunds.account_id)
--  * ogni evento muove il denaro una sola volta; tutte le operazioni supportano il rollback (DELETE)
--
-- Snapshot preventivo dei saldi in _backup_20260713_account_balances (RLS, solo service role).

CREATE TABLE IF NOT EXISTS public._backup_20260713_account_balances AS
  SELECT id, user_id, name, current_balance, initial_balance, now() AS backed_up_at
  FROM public.accounts;
ALTER TABLE public._backup_20260713_account_balances ENABLE ROW LEVEL SECURITY;

-- 1) Saldi conti: reagisce a initial_amount (transactions) e amount (funds_transfer),
--    gestendo anche il cambio conto in UPDATE (prima non gestito: l'app lo
--    aggirava con una RPC di ricalcolo). I bump di current_amount da
--    allocazione non toccano piu' il saldo (era il double count).
CREATE OR REPLACE FUNCTION public.update_current_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
    IF TG_TABLE_NAME = 'transactions' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE accounts SET current_balance = current_balance + NEW.initial_amount WHERE id = NEW.account_id;
        ELSIF TG_OP = 'UPDATE' THEN
            IF NEW.account_id IS DISTINCT FROM OLD.account_id THEN
                UPDATE accounts SET current_balance = current_balance - OLD.initial_amount WHERE id = OLD.account_id;
                UPDATE accounts SET current_balance = current_balance + NEW.initial_amount WHERE id = NEW.account_id;
            ELSIF NEW.initial_amount <> OLD.initial_amount THEN
                UPDATE accounts SET current_balance = current_balance - OLD.initial_amount + NEW.initial_amount WHERE id = NEW.account_id;
            END IF;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE accounts SET current_balance = current_balance - OLD.initial_amount WHERE id = OLD.account_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'funds_transfer' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
        ELSIF TG_OP = 'UPDATE' THEN
            IF NEW.account_id IS DISTINCT FROM OLD.account_id THEN
                UPDATE accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
                UPDATE accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
            ELSIF NEW.amount <> OLD.amount THEN
                UPDATE accounts SET current_balance = current_balance - OLD.amount + NEW.amount WHERE id = NEW.account_id;
            END IF;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$function$;

-- 2) Residuo rimborso: validazione + aggiornamento consolidati, con supporto
--    completo INSERT/UPDATE/DELETE (prima il DELETE non ripristinava il
--    residuo e l'UPDATE lo scalava due volte).
CREATE OR REPLACE FUNCTION public.update_refund_current_amount()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
    residuo numeric;
BEGIN
    IF TG_OP IN ('INSERT','UPDATE') AND NEW.amount <= 0 THEN
        RAISE EXCEPTION 'L''importo di un''allocazione rimborso deve essere positivo.';
    END IF;

    IF TG_OP = 'INSERT' THEN
        SELECT current_amount INTO residuo FROM refunds WHERE id = NEW.refund_id FOR UPDATE;
        IF NEW.amount > residuo THEN
            RAISE EXCEPTION 'L''importo non può superare il residuo del rimborso (%.2f).', residuo;
        END IF;
        UPDATE refunds SET current_amount = current_amount - NEW.amount, updated_at = now() WHERE id = NEW.refund_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.refund_id IS DISTINCT FROM OLD.refund_id THEN
            UPDATE refunds SET current_amount = current_amount + OLD.amount, updated_at = now() WHERE id = OLD.refund_id;
            SELECT current_amount INTO residuo FROM refunds WHERE id = NEW.refund_id FOR UPDATE;
            IF NEW.amount > residuo THEN
                RAISE EXCEPTION 'L''importo non può superare il residuo del rimborso (%.2f).', residuo;
            END IF;
            UPDATE refunds SET current_amount = current_amount - NEW.amount, updated_at = now() WHERE id = NEW.refund_id;
        ELSE
            SELECT current_amount INTO residuo FROM refunds WHERE id = NEW.refund_id FOR UPDATE;
            IF NEW.amount - OLD.amount > residuo THEN
                RAISE EXCEPTION 'L''importo non può superare il residuo del rimborso (%.2f).', residuo + OLD.amount;
            END IF;
            UPDATE refunds SET current_amount = current_amount + OLD.amount - NEW.amount, updated_at = now() WHERE id = NEW.refund_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE refunds SET current_amount = current_amount + OLD.amount, updated_at = now() WHERE id = OLD.refund_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_update_refund_current_amount ON public.refund_transaction;
CREATE TRIGGER trg_update_refund_current_amount
    BEFORE INSERT OR UPDATE OR DELETE ON public.refund_transaction
    FOR EACH ROW EXECUTE FUNCTION public.update_refund_current_amount();

-- La validazione e' ora dentro update_refund_current_amount.
DROP TRIGGER IF EXISTS trg_check_refund_transaction_amount ON public.refund_transaction;
DROP FUNCTION IF EXISTS public.check_refund_transaction_amount();

-- 3) current_amount della transazione (campo di visualizzazione): supporto
--    completo INSERT/UPDATE/DELETE con delta corretti.
CREATE OR REPLACE FUNCTION public.update_transaction_current_amount()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE transactions SET current_amount = current_amount + NEW.amount, updated_at = now() WHERE id = NEW.transaction_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.transaction_id IS DISTINCT FROM OLD.transaction_id THEN
            UPDATE transactions SET current_amount = current_amount - OLD.amount, updated_at = now() WHERE id = OLD.transaction_id;
            UPDATE transactions SET current_amount = current_amount + NEW.amount, updated_at = now() WHERE id = NEW.transaction_id;
        ELSIF NEW.amount <> OLD.amount THEN
            UPDATE transactions SET current_amount = current_amount - OLD.amount + NEW.amount, updated_at = now() WHERE id = NEW.transaction_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE transactions SET current_amount = current_amount - OLD.amount, updated_at = now() WHERE id = OLD.transaction_id;
    END IF;
    RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_update_transaction_current_amount ON public.refund_transaction;
CREATE TRIGGER trg_update_transaction_current_amount
    AFTER INSERT OR UPDATE OR DELETE ON public.refund_transaction
    FOR EACH ROW EXECUTE FUNCTION public.update_transaction_current_amount();

-- 4) Guard di integrita': il conto di un rimborso non si cambia finche'
--    esistono allocazioni.
CREATE OR REPLACE FUNCTION public.refunds_guard_account_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
    IF NEW.account_id IS DISTINCT FROM OLD.account_id
       AND EXISTS (SELECT 1 FROM refund_transaction WHERE refund_id = NEW.id) THEN
        RAISE EXCEPTION 'Impossibile cambiare il conto di un rimborso con allocazioni: rimuovere prima le allocazioni.';
    END IF;
    RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.refunds_guard_account_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS refunds_guard_account_change ON public.refunds;
CREATE TRIGGER refunds_guard_account_change
    BEFORE UPDATE ON public.refunds
    FOR EACH ROW EXECUTE FUNCTION public.refunds_guard_account_change();

-- 5) RPC di ricalcolo: formula canonica (DATA_MODEL.md §2) + filtro utente
--    esplicito (COALESCE mantiene l'usabilita' dal service role).
CREATE OR REPLACE FUNCTION public.recalculate_current_balance_by_id(account_id_param uuid)
RETURNS numeric LANGUAGE plpgsql SET search_path = public AS $function$
DECLARE
    new_balance numeric;
BEGIN
    UPDATE public.accounts a
    SET current_balance = a.initial_balance
        + COALESCE((SELECT SUM(t.initial_amount) FROM public.transactions t WHERE t.account_id = a.id), 0)
        + COALESCE((SELECT SUM(f.amount) FROM public.funds_transfer f WHERE f.account_id = a.id), 0)::numeric
        + COALESCE((SELECT SUM(rt.amount) FROM public.refund_transaction rt
                    JOIN public.refunds r ON r.id = rt.refund_id
                    WHERE r.account_id = a.id), 0),
        updated_at = now()
    WHERE a.id = account_id_param
      AND a.user_id = COALESCE(auth.uid(), a.user_id)
    RETURNING a.current_balance INTO new_balance;
    RETURN new_balance;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_current_balance()
RETURNS void LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
    UPDATE public.accounts a
    SET current_balance = a.initial_balance
        + COALESCE((SELECT SUM(t.initial_amount) FROM public.transactions t WHERE t.account_id = a.id), 0)
        + COALESCE((SELECT SUM(f.amount) FROM public.funds_transfer f WHERE f.account_id = a.id), 0)::numeric
        + COALESCE((SELECT SUM(rt.amount) FROM public.refund_transaction rt
                    JOIN public.refunds r ON r.id = rt.refund_id
                    WHERE r.account_id = a.id), 0),
        updated_at = now()
    WHERE a.user_id = COALESCE(auth.uid(), a.user_id);
END;
$function$;

-- 6) T3.5: le RPC di ricalcolo hanno senso solo autenticati (o service role).
REVOKE EXECUTE ON FUNCTION public.recalculate_current_balance_by_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_current_balance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalculate_current_balance_by_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recalculate_current_balance() TO authenticated, service_role;
