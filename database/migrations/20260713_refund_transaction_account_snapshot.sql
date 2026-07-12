-- Applicata sul DB live il 2026-07-13 (migration Supabase:
-- refund_transaction_account_snapshot).
-- T3.2 (parte B2): il trigger di storno del saldo leggeva refunds.account_id,
-- ma quando un rimborso viene cancellato la cascata elimina le allocazioni
-- DOPO la riga padre: la lookup falliva e lo storno del conto non avveniva
-- (bug trovato dal test scenario DEL-REFUND). Si denormalizza il conto
-- accreditato sull'allocazione stessa: il valore resta leggibile anche
-- durante la cascata. La coerenza col padre e' garantita dal trigger di
-- popolamento + dal guard che vieta il cambio conto di un rimborso allocato.

ALTER TABLE public.refund_transaction
    ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

UPDATE public.refund_transaction rt
SET account_id = r.account_id
FROM public.refunds r
WHERE r.id = rt.refund_id AND rt.account_id IS NULL;

CREATE OR REPLACE FUNCTION public.set_refund_transaction_account()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
    SELECT account_id INTO NEW.account_id FROM refunds WHERE id = NEW.refund_id;
    RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.set_refund_transaction_account() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_set_refund_transaction_account ON public.refund_transaction;
CREATE TRIGGER trg_set_refund_transaction_account
    BEFORE INSERT OR UPDATE ON public.refund_transaction
    FOR EACH ROW EXECUTE FUNCTION public.set_refund_transaction_account();

CREATE OR REPLACE FUNCTION public.update_account_balance_on_refund_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
        UPDATE accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
    END IF;
    RETURN NULL;
END;
$function$;
