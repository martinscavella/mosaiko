# Collegamenti tra moduli (T6.0)

Pattern unico per collegare entità di moduli diversi (bolletta↔transazione,
scontrino↔righe dispensa, abbonamento↔transazioni, corso↔spesa,
pasto↔dispensa). Deciso il 2026-07-18 in attuazione di D3/PLAN §6.

## Decisione: tabelle di link dedicate per coppia

Una tabella di link per ogni coppia di entità, **mai** una tabella polimorfica
unica (`links(source_type, source_id, target_type, target_id)`).

Motivi:

- **Integrità referenziale**: FK reali su entrambi i lati, con `ON DELETE`
  esplicito per relazione. Una tabella polimorfica non può avere FK.
- **RLS semplici**: `user_id = auth.uid()` + le FK garantiscono che si
  colleghino solo entità proprie; il caso polimorfico richiederebbe policy
  dinamiche per tipo.
- **Metadati specifici per relazione**: ogni link porta campi propri (es.
  quota pagata, quantità caricata) senza colonne jolly.
- Il pattern esiste già nel dominio: `refund_transaction` (rimborso↔transazione)
  e `transactions.asset_id` (transazione↔asset).

## Schema tipo

```sql
create table public.bill_payments (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    bill_id uuid not null references public.house_bills(id) on delete cascade,
    transaction_id uuid not null references public.transactions(id) on delete restrict,
    created_at timestamp default now(),
    unique (bill_id, transaction_id)
);
-- RLS: select/insert/delete con user_id = auth.uid()
```

Regole:

- `user_id` sempre presente e obbligatorio (RLS diretta, niente join nelle policy).
- `on delete` scelto per relazione: il lato "documento" (bolletta) può
  cascadare, il lato "movimento contabile" (transazione) va protetto con
  `restrict` — eliminare una transazione collegata deve chiedere prima di
  scollegare.
- `unique` sulla coppia per evitare doppi link.
- Cardinalità oltre l'1:1 si esprime con più righe (es. bolletta pagata in
  due rate = due link con metadato importo).

## Tabelle di link previste (una per collegamento del §7)

| Link | Tabella | Metadati previsti |
| --- | --- | --- |
| House↔Finance: bolletta→transazione | `bill_payments` | importo quota (se pagamento parziale) |
| House↔Finance: rata affitto/mutuo→transazione | `housing_installment_payments` | — |
| Grocery↔Finance: transazione→righe scontrino | `receipt_lines` (fk a transactions + grocery_items) | quantità, prezzo unitario |
| Tasks↔Finance: abbonamento→transazioni | `subscription_payments` | periodo coperto |
| Learning↔Finance: corso→transazione | `course_purchases` | — |
| Health↔Grocery: pasto→articoli dispensa | `meal_ingredients` | quantità scalata |

Le tabelle nascono con la migration del modulo che le usa (prima:
`bill_payments` con House).

## UI riusabile "Collega a…"

Componente unico `LinkEntityPicker` (da estrarre generalizzando il pattern già
rodato in refunds/asset-link):

- ricerca/selezione dell'entità target (es. transazioni filtrate per periodo
  e importo simile) con lista scrollabile e stato vuoto;
- mostra i link esistenti con azione di scollegamento;
- a link avvenuto invalida/refetch i provider di entrambi i moduli coinvolti
  (il provider del modulo corrente + `refetch` di Finance quando serve).

Nota T4.1: la ricerca di transazioni da collegare legge la cache Finance che
parte con una finestra di 24 mesi — il picker deve offrire "carica tutto lo
storico" (`loadFullTransactionHistory`) quando la ricerca non trova risultati.

## Definition of Done (per T6.0 completo)

- [x] Questo documento
- [ ] `bill_payments` + RLS con la migration del modulo House
- [ ] `LinkEntityPicker` usato dal flusso "segna bolletta come pagata"
