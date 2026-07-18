-- T3.6 — Tassonomia transaction_type unica
--
-- Fonte di verità applicativa: src/lib/transactionTypes.ts (stessi 25 valori).
--
-- 1. Normalizzazione dei valori legacy scritti dai vecchi import
--    ('expense'/'income') e delle varianti di maiuscole ('SPESA',
--    'Eccesso rimborso'); l'unica riga con tipo NULL diventa 'Spesa'.
--    Nessun importo viene toccato: i saldi non cambiano (verificato con
--    hash dei saldi account prima/dopo).
-- 2. CHECK constraint sui 25 valori canonici + NOT NULL con default 'Spesa'.
--
-- Distribuzione pre-migrazione dei valori normalizzati:
--   expense→Spesa (348), income→Entrata (252), SPESA→Spesa (1),
--   'Eccesso rimborso'→'Eccesso Rimborso' (1), NULL→Spesa (1).

-- 1. Normalizzazione dati
UPDATE public.transactions SET transaction_type = 'Spesa'
    WHERE transaction_type IN ('expense', 'SPESA') OR transaction_type IS NULL;
UPDATE public.transactions SET transaction_type = 'Entrata'
    WHERE transaction_type = 'income';
UPDATE public.transactions SET transaction_type = 'Eccesso Rimborso'
    WHERE transaction_type = 'Eccesso rimborso';

-- 2. Vincoli
ALTER TABLE public.transactions
    ALTER COLUMN transaction_type SET DEFAULT 'Spesa',
    ALTER COLUMN transaction_type SET NOT NULL;

ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_transaction_type_check
    CHECK (transaction_type IN (
        'Abbonamento', 'Acquisto', 'AZIONE', 'Bonifico', 'Buono fruttifero',
        'Cancellazione rimborso', 'Commissione', 'Competenze', 'Delivery',
        'Eccesso Rimborso', 'Entrata', 'ETF', 'Imposte', 'Iscrizione',
        'Ordine', 'Ordine cloud', 'Prelievo', 'Quattordicesima', 'Rata',
        'Refund', 'Ricarica', 'Spesa', 'Stipendio', 'TFR', 'Tredicesima'
    ));
