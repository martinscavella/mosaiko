# Mosaiko — Modello dati finanziario (semantica canonica)

Data: 2026-07-12 — attua la decisione D1 di [PLAN.md](PLAN.md) (task T1.2).
Questo documento è la specifica di riferimento per T3.2 (razionalizzazione
trigger/RPC) e per i test sui flussi che muovono denaro (T3.10).

**Stato: BOZZA — in attesa di approvazione dell'utente.**

---

## 1. Entità e campi

| Campo | Semantica |
| --- | --- |
| `accounts.initial_balance` | Saldo di partenza del conto alla creazione. Immutabile dopo la creazione. |
| `accounts.current_balance` | **Valore derivato** (mai modificato a mano): vedi formula §2. |
| `transactions.initial_amount` | Importo originale del movimento, con segno (negativo = uscita). È il valore che muove il saldo. |
| `transactions.current_amount` | **Campo di visualizzazione**: costo netto del movimento dopo i rimborsi allocati (= `initial_amount` + Σ allocazioni su questa transazione). NON entra nella formula del saldo. |
| `refunds.initial_amount` | Importo totale del rimborso atteso. NON muove nessun saldo alla creazione. |
| `refunds.current_amount` | Residuo ancora da allocare (= `initial_amount` − Σ allocazioni). |
| `refunds.account_id` | **Il conto su cui il rimborso viene accreditato** al momento dell'allocazione. |
| `refund_transaction.amount` | Allocazione: quota del rimborso attribuita a una transazione. È l'unico evento che muove denaro per i rimborsi. |
| `funds_transfer.amount` | Movimento diretto sul conto, con segno. Muove il saldo per intero alla creazione. |

## 2. Formula canonica del saldo

Per ogni conto **A**:

```text
current_balance(A) =
    initial_balance(A)
  + Σ transactions.initial_amount   WHERE account_id = A
  + Σ funds_transfer.amount         WHERE account_id = A
  + Σ refund_transaction.amount     WHERE refund.account_id = A
```

Principi:

1. **Un solo evento muove il denaro una sola volta.** L'allocazione di un
   rimborso accredita **solo** il conto del rimborso (`refunds.account_id`),
   anche quando la transazione rimborsata sta su un altro conto.
2. **`current_amount` non muove saldi.** Il bump di
   `transactions.current_amount` all'allocazione è solo informativo (costo
   netto); il trigger sui saldi NON deve reagirvi. Oggi vi reagisce → double
   count (bug da eliminare in T3.2).
3. **La modifica di una transazione** (importo/conto) muove il saldo per la
   differenza di `initial_amount`, preservando il delta rimborsi su
   `current_amount` (comportamento già presente in NewTransactionModal).
4. **La cancellazione** di una transazione/trasferimento storna
   `initial_amount`/`amount`; la cancellazione di un'allocazione storna
   l'importo dal conto del rimborso e dal `current_amount` della transazione;
   la cancellazione di un rimborso richiede prima lo storno delle sue
   allocazioni (CASCADE su `refund_transaction` + trigger di storno).

## 3. Scenari di verifica (base per i test di T3.2/T3.10)

Setup comune: conto A `initial_balance = 100`, conto B `initial_balance = 50`.

| # | Scenario | Azioni | Atteso |
| --- | --- | --- | --- |
| S1 | Spesa semplice | tx −30 su A | A = 70; `current_amount` = −30 |
| S2 | Rimborso creato, non allocato | S1 + refund 30 su A | A = 70 (invariato); refund.current = 30 |
| S3 | Allocazione piena | S2 + allocazione 30 → tx | A = 100; tx.current = 0; refund.current = 0 |
| S4 | Allocazione parziale | S2 + allocazione 10 → tx | A = 80; tx.current = −20; refund.current = 20 |
| S5 | Rimborso cross-conto | tx −30 su A; refund 30 su **B**; allocazione 30 | A = 70; **B = 80**; tx.current = 0 |
| S6 | Cancellazione allocazione | S3 poi delete allocazione | A = 70; tx.current = −30; refund.current = 30 |
| S7 | Modifica importo tx rimborsata | S4 poi tx.initial −30→−50 | A = 60 (100−50+10); tx.current = −40 |
| S8 | Cambio conto di una tx | S1 poi tx spostata su B | A = 100; B = 20 |
| S9 | Trasferimento | transfer +40 su A | A = 140 |
| S10 | Import batch | N tx importate su A | A = formula §2 senza intervento manuale (T3.4) |
| S11 | Overallocazione | allocazione > refund.current | ERRORE (vincolo esistente `check_refund_transaction_amount`) |

## 4. Stato attuale vs target (cosa cambia con T3.2)

| Componente | Oggi | Target |
| --- | --- | --- |
| RPC `recalculate_current_balance(_by_id)` | Somma `refunds.initial_amount` interi (accredita rimborsi mai allocati) | Formula §2 (somma le allocazioni, non i rimborsi) + filtro esplicito `user_id = auth.uid()` |
| Trigger `update_current_balance` (transactions) | Reagisce a ogni delta di `current_amount` (double count con le allocazioni) | Reagisce solo a `initial_amount` (INSERT/UPDATE/DELETE) |
| Trigger `update_account_balance_on_refund_transaction` | Corretto (accredita il conto del rimborso) | Invariato |
| Trigger `update_transaction_current_amount` | Corretto (bump informativo di `current_amount`) | Invariato, ma senza effetto sui saldi |
| Guard `myapp.trigger_context` / `set_trigger_context()` | Funzione mai agganciata a un trigger | Rimossa (non più necessaria) |
| Trigger doppio `set_account_name` + `transactions_set_account_name` | Due BEFORE trigger scrivono lo stesso campo | Se ne tiene uno |
| Trigger doppio propagazione rename su accounts | `funds_transfer` aggiornata due volte | Si tiene solo `propagate_account_name_change_to_related_tables` |
| Trigger no-op `refunds_category_update` / `funds_transfer_category_update` | Chiamano una funzione che gestisce solo `transactions` | Rimossi |
| Funzioni `monthly_summary` (3) + trigger disabilitato | Puntano a tabella inesistente | Rimossi |
| `update_account_balance_on_transaction_update` | Funzione ridondante col trigger principale | Verificare aggancio e rimuovere |

## 5. Impatto della riconciliazione (T3.3)

I saldi live oggi coincidono con la **vecchia** formula RPC (che accredita
`refunds.initial_amount` alla creazione). Col passaggio alla formula §2 i
saldi caleranno dell'importo dei **rimborsi non ancora allocati**
(`Σ refunds.current_amount` per conto). La riconciliazione produrrà un
report before/after per conto da far approvare all'utente PRIMA di
applicare il ricalcolo definitivo.
