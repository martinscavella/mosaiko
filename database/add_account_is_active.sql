-- Aggiunge il flag is_active agli account.
--
-- Serve per "disattivare" un account senza cancellarlo: mantiene lo storico
-- (transazioni, rimborsi, trasferimenti, asset collegati restano intatti e
-- referenziabili) ma esclude l'account dalle picklist di scelta account in
-- creazione/modifica di nuovi movimenti nell'app.
--
-- Da eseguire una tantum sul progetto Supabase di Mosaiko (SQL Editor).
-- Non è nel progetto MCP collegato a questa sessione (quello è "diez-db",
-- un altro progetto), quindi va applicato manualmente.

ALTER TABLE public.accounts
    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Nessuna nuova funzione richiesta: il ricalcolo saldo usa le funzioni RPC
-- già esistenti (recalculate_current_balance_by_id, recalculate_current_balance),
-- ora esposte come azioni anche lato app.
