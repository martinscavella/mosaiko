# Mosaiko — Piano Operativo

Data: 2026-07-12 — derivato dall'analisi completa della codebase e del DB Supabase live
(vedi [history/](history/) per gli audit precedenti). Questo è il documento di
riferimento per la delivery: le decisioni prese, i task in ordine di esecuzione,
la roadmap, lo scope dei nuovi moduli (§7) e il backlog (§8).

---

## 0. Decisioni prese (2026-07-12)

| ID | Decisione | Conseguenze |
| --- | --- | --- |
| **D1** | **Semantica rimborsi (completata il 2026-07-12): un refund entra nel conto solo quando viene allocato, e viene accreditato sul conto del rimborso** (`refunds.account_id`), non sul conto della transazione rimborsata. | **Formula canonica del saldo di un conto A**: `initial_balance(A) + Σ transactions.initial_amount (conto A) + Σ funds_transfer.amount (conto A) + Σ refund_transaction.amount (rimborsi il cui account_id = A)`. `transactions.current_amount` resta come campo di *visualizzazione* ("costo netto dopo i rimborsi") ma **non entra nella formula del saldo** — è questo che oggi crea il double count: l'allocazione accredita il conto del rimborso E il bump di `current_amount` ri-accredita il conto della transazione. Da riscrivere: le RPC `recalculate_current_balance*` (oggi sommano `refunds.initial_amount` interi, cioè accreditano il rimborso alla creazione anche se mai allocato) e il trigger `update_current_balance` (il branch UPDATE non deve reagire ai bump di `current_amount` da allocazione, solo alle modifiche di `initial_amount`). ATTENZIONE: i saldi live coincidono con la vecchia formula RPC, quindi la riconciliazione (T3.3) **cambierà i saldi storici** dell'importo dei rimborsi non ancora allocati — serve report before/after approvato dall'utente. |
| **D2** | **Prodotto multi-utente** (da vendere; isolamento dati per utente obbligatorio). | RLS già corrette. Salgono di priorità: fix signup/profilo (T3.7), onboarding nuovo utente con categorie di default (nuovo T3.11), mapping import configurabile (T4.10: da P3 a P2), hardening auth (MFA/HIBP), rimozione di ogni hardcode sul dominio personale (categoria `'ASSET & INVESTIMENTI'` per nome, tipi transazione in italiano cablati, parser banche). Billing/subscription: fuori scope per ora (`profiles.subscription_type` esiste già come predisposizione). |
| **D3** | **Nuovi moduli subito dopo le fix P0/P1, nell'ordine: House + Grocery → Tasks → Health → Learning.** Grocery è un modulo standalone (dispensa + lista spesa, interconnesso con Finance e Health). | Aggiunta FASE 6 al piano (fondazioni cross-modulo + moduli). Scope MVP consolidato in §7 dalle risposte del 2026-07-12. |
| **D4** | **Feature a metà (obiettivi finanziari, budget categorie, export PDF report): da completare, priorità bassa.** | T4.5/T4.6/T4.7 confermati a P2/P3, dopo integrità dati e nuovi moduli MVP. |
| **D5** | **Tipi DB: adottare i tipi generati da Supabase** (`supabase gen types typescript`) e tipizzare il client, invece di rimuovere `database.types.ts`. | È la best practice: elimina i cast manuali (`RawTransactionRow`, `normalizeEmbedded`), tiene i tipi allineati allo schema via CI. Task T2.5 aggiornato. |
| **D6** | **Vercel: fuori scope per ora.** | Nessuna analisi deploy remoto in questa fase. |

---

## 1. FASE 1 — Preparazione

| ID | Task | Pri | Dip. | Stima | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| T1.1 | ✅ **FATTO 2026-07-12** — Ripristino ambiente dev: `npm ci`; verificare `npm test`, `npm run type-check`, `npm run build` verdi; annotare versione Node nel README | P0 | — | XS | I 3 comandi passano in locale |
| T1.2 | ✅ **FATTO 2026-07-13** (docs/DATA_MODEL.md, semantica confermata dall'utente e attuata con T3.2/T3.3) → scrivere `docs/DATA_MODEL.md` con la semantica di saldi/rimborsi/current_amount e gli scenari di test (rimborso pieno/parziale/cancellato/cross-conto) | P0 | D1 | S | Documento approvato dall'utente |
| T1.3 | ~~Decisioni prodotto~~ **DECISE (D2/D3/D4)** — ~~questionari moduli~~ **RISPOSTE RICEVUTE il 2026-07-12**, scope consolidato in §7 | P1 | — | ✅ | Fatto |
| T1.4 | Test manuale registrazione reale end-to-end (mai verificato dopo il fix C6) | P1 | — | XS | Esito documentato |
| T1.5 | ✅ **FATTO 2026-07-12** (snapshot totali in tabelle `_backup_20260712_*` con RLS, per T3.1) — Backup/snapshot DB Supabase prima di ogni intervento su trigger/dati | P0 | — | XS | Backup verificato ripristinabile |

## 2. FASE 2 — Fondazioni tecniche

| ID | Task | Pri | Dip. | Stima | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| T2.1 | ✅ **FATTO 2026-07-12** (`.github/workflows/ci.yml`) — CI GitHub Actions: install, lint, `tsc --noEmit`, `vitest run`, `next build` su ogni PR/push | P0 | T1.1 | S | PR bloccate se rosso |
| T2.2 | Migration versionate: init `supabase/` nel repo, baseline dal dump live, regola "mai più DDL manuale"; `database/schema.sql` diventa artefatto derivato | P1 | — | M | `supabase db diff` pulito vs live |
| T2.3 | ✅ **FATTO 2026-07-12** (commit 0d7d664) — Ripristinare memoizzazione `contextValue` (financeCache.tsx:483, fix I4 annullato dalla PR #16) | P0 | T2.1 | XS | `useMemo` presente + nota regressione in history/PROGRESS.md |
| T2.4 | Audit dei merge post-luglio contro tutti i fix dell'audit (spot-check già fatto: import dinamici, batch insert, auth check ok) | P1 | — | S | Checklist fix-per-fix completata |
| T2.5 | Tipi generati Supabase (D5): `supabase gen types typescript` in `src/lib/database.types.ts`, client tipizzato `createClientComponentClient<Database>()`, rigenerazione in CI; rimuovere `lib/utils.ts` e `lib/marketData.ts` (morti); verificare e rimuovere dipendenze inutilizzate (`@supabase/auth-ui-*`, `auth-helpers-react`) | P2 | T2.2 | M | Zero cast manuali sulle righe Supabase; build verde |
| T2.6 | Pulizia branch stantii locali/remoti (~17) previa conferma utente | P3 | conferma | XS | Solo branch attivi |

## 3. FASE 3 — Integrità dati (core readiness)

| ID | Task | Pri | Dip. | Stima | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| T3.1 | ✅ **FATTO 2026-07-12** (migration in database/migrations/, drift verificato = 0) — **Fix trigger duplicato categorie**: DROP di uno dei due trigger gemelli su `transactions` + `recalculate_category_subcategory_totals()` + query di verifica | P0 | T1.5, T2.2 | S | Drift = 0 su tutte le categorie; una scrittura di test muove i totali 1× |
| T3.2 | ✅ **FATTO 2026-07-13** (3 migration in database/migrations/, 13 scenari testati con rollback sul DB live) — **Razionalizzazione trigger saldi secondo D1** (formula in §0): riscrivere le RPC con la formula per-allocazione sul conto del rimborso; il trigger su `transactions` reagisce solo a `initial_amount` (non ai bump di `current_amount` da allocazione — elimina il double count senza bisogno del guard `myapp.trigger_context`, da rimuovere); eliminare trigger ridondanti (doppio set `account_name`, doppia propagazione rename, trigger no-op su refunds/funds_transfer, funzioni `monthly_summary` morte) | P0 | T1.2, T3.1 | L | Per ogni scenario (rimborso pieno/parziale/cancellato/cross-conto): saldo trigger == saldo RPC == valore atteso calcolato a mano |
| T3.3 | ✅ **FATTO 2026-07-13** (unico delta: PAYPAL 167,30→139,30, -28,00 di rimborsi mai allocati; current_amount già coerente su 3.012 tx; backup in _backup_20260713_account_balances) — **Riconciliazione una tantum**: ricalcolo saldi e totali su tutto il DB con la nuova formula; report before/after (i saldi cambieranno, vedi D1) | P0 | T3.2 | S | Numeri approvati dall'utente |
| T3.4 | ✅ **FATTO 2026-07-13** (commit 12d1dd6) — Import: chiamare `recalculate_current_balance_by_id` per ogni conto toccato a fine `processImport` + refetch | P0 | T3.2 | XS | Import di test lascia saldi = formula canonica |
| T3.5 | ✅ **FATTO 2026-07-13** (incluso nella migration T3.2: REVOKE anon + filtro utente) — Hardening RPC: REVOKE EXECUTE da `anon`; filtro esplicito `user_id = auth.uid()` dentro le funzioni | P2 | T3.2 | XS | Advisor puliti, app funzionante |
| T3.6 | Tassonomia `transaction_type` unica: `lib/transactionTypes.ts` (tipi, segno, icone) consumato da modali + parser; CHECK o lookup table in DB | P1 | — | M | Zero liste stringa duplicate; test sul segno |
| T3.7 | Fix signup (critico per D2): rimuovere `createUserProfile` client-side; estendere `handle_new_user()` ai metadata mancanti (birth_date, phone) o UPDATE post-signup; rimuovere log residui | P1 | T1.4 | S | Registrazione reale crea profilo completo senza errori |
| T3.8 | Join per `account_id` invece di `account_name` (cache + accounts page + usage map) | P1 | — | S | Statistiche corrette con due conti omonimi |
| T3.9 | Sistema toast/notifiche unico; sostituire i ~20 `alert()`/`confirm()` | P2 | — | M | Zero `alert()` nel repo |
| T3.10 | Test sui flussi che muovono denaro: create/edit/delete transazione (con cambio conto), allocazione rimborso, import batch — idealmente integration test su Supabase locale (CLI) | P1 | T2.1 | L | Suite copre i 3 flussi critici |
| T3.11 | **(nuovo, da D2) Onboarding nuovo utente**: set di categorie/sottocategorie di default alla registrazione (seed via trigger o primo login); eliminare la dipendenza dalla categoria `'ASSET & INVESTIMENTI'` cercata per nome (usare un flag/slug sulla categoria) | P1 | T3.7 | M | Un utente appena registrato può usare tutte le pagine senza setup manuale |

## 4. FASE 4 — Completamento modulo Finance

| ID | Task | Pri | Dip. | Stima | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| T4.1 | Caricamento incrementale transazioni (ex I2): fetch iniziale 12-24 mesi + `loadMore(range)`; adattare Reports/Transactions/Assets/TotalBalanceChart | P1 | T3.10 | XL | Login scarica una finestra limitata; "tutto lo storico" on-demand |
| T4.2 | Split del useMemo monolitico in Reports + memoizzazione calcoli dashboard | P3 | — | S | TODO a reports/page.tsx:129 chiuso |
| T4.3 | Prezzi: rimuovere `generateMockHistory` e il default `'bitcoin'`; 404 esplicito + UI "storico non disponibile"; `encodeURIComponent` sui parametri | P1 | — | S | Nessun path restituisce dati inventati |
| T4.4 | Rate limiting o auth sugli endpoint prezzi | P2 | — | S | Endpoint non abusabili come proxy |
| T4.5 | Export PDF report reale (jspdf già presente) — oggi è un alert "prossimamente" | P2 (D4) | — | M | Bottone esporta un PDF reale |
| T4.6 | Budget mensile per categoria: riprendere/riscrivere `feat/reports-budget-tracking` sopra i totali corretti (`categories.monthly_budget` già in schema) | P2 (D4) | T3.1 | L | Budget vs speso visibile in Reports |
| T4.7 | Obiettivi finanziari: UI CRUD per `financial_goals` (tabella e hook già esistenti, 0 righe) | P3 (D4) | — | M | KPI "obiettivi" alimentato da dati reali |
| T4.8 | Migrazione auth a `@supabase/ssr` (pacchetto attuale deprecato); valutare middleware di sessione | P1 | T2.1, T3.10 | L | Login/logout/refresh + RLS verificati e2e |
| T4.9 | Sostituire `xlsx` vulnerabile (CVE senza fix su npm) con exceljs o tarball SheetJS | P2 | — | M | `npm audit` senza high sul parser |
| T4.10 | **(priorità alzata da D2)** Mapping import configurabile per utente: parser banche generici + mapping categorie salvato per utente, rimozione hardcode dominio personale | P2 | T3.6, T3.11 | XL | Un nuovo utente importa un estratto conto senza toccare il codice |

## 5. FASE 5 — Hardening

| ID | Task | Pri | Stima | Note |
| --- | --- | --- | --- | --- |
| T5.1 | Abilitare leaked-password protection + MFA da Dashboard Supabase (pendente da luglio; advisor confermano) | P1 | XS | Manuale, 5 minuti |
| T5.2 | Upgrade Postgres (patch sicurezza pendenti) in finestra pianificata | P2 | S | Richiede downtime |
| T5.3 | Error tracking (Sentry o equivalente) su client + API routes | P2 | S | Prerequisito sensato prima di vendere (D2) |
| T5.4 | CSP + HSTS in next.config (verificare inline script del tema) | P2 | S | |
| T5.5 | Pulizia 21 `console.log` residui + logger gated su NODE_ENV | P3 | XS | |
| T5.6 | Accessibilità: rimuovere `userScalable:false`/`maximumScale:1`; audit tastiera/contrasto | P3 | S | |
| T5.7 | `funds_transfer.amount` → `numeric(15,2)` (oggi double precision, epsilon visibili) | P3 | XS | Migration |
| T5.8 | Upgrade dipendenze major (next 16, recharts 3, framer-motion 12, …) | P3 | L | Dopo T4.8 |
| T5.9 | Docs: aggiornare copilot-instructions; scrivere `docs/DATA_MODEL.md` (T1.2); mantenere questo PLAN.md | P2 | S | |

## 6. FASE 6 — Nuovi moduli (dopo P0/P1, per D3)

**Ordine deciso (2026-07-12): House + Grocery → Tasks → Health → Learning.**
Grocery è un **modulo standalone** (non una sezione di House): con dispensa
virtuale, storico prezzi collegato a Finance e piani alimentari collegati a
Health ha un modello dati proprio e interconnessioni verso più moduli.

### Fondazioni cross-modulo (da fare PRIMA di House, una volta sola)

| ID | Task | Pri | Dip. | Stima | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| T6.0 | **Meccanismo di collegamento tra moduli**: le risposte di scoping richiedono link bolletta↔transazione (House↔Finance), scontrino↔righe dispensa (Grocery↔Finance), abbonamento↔transazioni (Tasks↔Finance), corso↔spesa (Learning↔Finance), pasto↔dispensa (Health↔Grocery). Progettare UNA volta il pattern (tabelle di link dedicate per coppia, es. `bill_payments(bill_id, transaction_id)` — preferibile a una tabella polimorfica unica per integrità referenziale e RLS) + componente UI riusabile "collega a…" (il pattern esiste già in refunds/asset-link) | P1 | T3.x completate | M | Doc di design + prima implementazione funzionante (House↔Finance) |
| T6.1 | **Storage allegati** (Supabase Storage): bucket per-utente con policy RLS, upload/preview PDF e immagini, limiti dimensione. Prima necessità: PDF bollette (House); poi scontrini (Grocery), referti (Health) | P1 | — | M | Upload/download/delete di un PDF funzionante con isolamento utente |
| T6.2 | **Estensione design token**: accent color per House e Grocery in designtoken.md + tailwind.config (`--color-module-house`, `--color-module-grocery`), coerenti con la palette esistente (candidati naturali: amber per House, teal per Grocery — primitive già definite) | P2 | — | XS | Card home e ModuleLayout renderizzano i nuovi moduli con accent dedicato |
| T6.3 | **Provider dati per-modulo**: definire il template del provider (fetch scoped, no caricamento globale) imparando dagli errori di FinanceCacheProvider — ogni nuovo modulo carica solo i propri dati, on-demand | P1 | T4.1 | S | Template documentato e usato da House |

### Pattern comune per ogni modulo (rodato da Finance)

1. Schema DB + RLS + migration versionata (prerequisito T2.2)
2. Registry in `modules.ts` → `status: 'active'`, accent da designtoken.md
3. Pagine sotto `(modules)/<id>/`, provider dati dedicato (T6.3)
4. Test sui flussi di scrittura + CI
5. DoD: modulo usabile end-to-end da un utente appena registrato

## 7. Scope moduli — consolidato dalle risposte del 2026-07-12

### 7.1 House (primo, insieme a Grocery)

**Visione**: gestionale completo della casa; un utente può avere **più proprietà**.

MVP (v1):

- **Proprietà**: anagrafica multi-casa (tutte le entità sotto appartengono a una proprietà)
- **Bollette/utenze**: storico con importi, consumi, scadenze, **PDF allegato** (T6.1); stato pagata/da pagare; quando pagata → **link alla transazione Finance** (T6.0)
- **Manutenzioni**: periodiche e straordinarie (caldaia, filtri…), con storico interventi e prossima scadenza
- **Affitto/mutuo**: rate, scadenze, storico pagamenti (link a Finance)
- **Inventario**: oggetti, garanzie, documenti (allegati)
- **Fornitori/contatti**: anagrafica collegabile a bollette/manutenzioni

Fuori MVP (backlog): notifiche push su scadenze (→ Backlog B2), generazione automatica task in Tasks per le scadenze (dipende dal modulo Tasks).

### 7.2 Grocery (standalone, insieme a House)

**Visione**: dispensa virtuale + lista della spesa, hub tra Finance e Health.

MVP (v1):

- **Catalogo articoli** personali (nome, unità di misura: kg/pezzo/litro, categoria)
- **Dispensa virtuale**: quantità correnti per articolo; carico manuale o da scontrino
- **Lista della spesa**: aggiunta rapida, spunta, conversione in carico dispensa a spesa fatta
- **Collegamento a Finance** (T6.0): una transazione GROCERY può essere "esplosa" in righe scontrino (articolo, quantità, prezzo) → carica la dispensa e alimenta lo **storico prezzi €/kg o €/pezzo** per articolo
- **Storico prezzi**: trend per articolo (dove compro, quanto pago)

Fase 2 (backlog B4): **integrazione Health** — piani alimentari/pasti definiti in Health scalano automaticamente le quantità dalla dispensa; suggerimenti lista spesa da soglie minime; automatismi "intelligenti" (previsione consumi, aggiunta automatica in lista quando sotto scorta, confronto prezzi tra negozi, OCR scontrini).

### 7.3 Tasks (secondo)

**Visione**: centro operativo dei promemoria, interconnesso con tutti i moduli. Single-user.

MVP (v1):

- **Progetti → task → sottotask** con priorità, date, stato; un progetto può essere anche una semplice to-do list (tipologia "lista")
- **Ricorrenze** (es. ogni lunedì, ogni primo del mese)
- **Viste**: lista E calendario/agenda
- **Abbonamenti**: gestiti qui come impegni ricorrenti, **collegati a Finance** per il costo (T6.0) — futuro aggancio a House per le bollette ricorrenti

### 7.4 Health (terzo)

**Visione**: tracciamento benessere personale, inserimento manuale. Nessuna funzione medica: farmaci/terapie sono solo promemoria/tracking, niente somministrazione o diagnosi.

MVP (v1):

- **Misure corporee**: peso, misure — con **grafici trend da subito**
- **Attività fisica**: allenamenti (tipo, durata, note), frequenza settimanale
- **Farmaci/terapie**: tracking assunzioni tipo promemoria (senza notifiche in v1)
- **Visite/esami**: storico con referti allegati (T6.1)
- **Sonno/abitudini**: tracking semplice
- **Alimentazione**: piani alimentari/diete e pasti (base per l'integrazione Grocery di fase 2)

Backlog: import da dispositivi (B5), hardening GDPR dati sanitari pre-commercializzazione (B6, priorità bassissima per ora).

### 7.5 Learning (quarto)

**Visione**: piattaforma per costruire percorsi di studio e tracciare l'avanzamento.

MVP (v1):

- **Percorsi di studio**: corsi (piattaforma, costo → link Finance via T6.0, stato), libri (letti/da leggere), certificazioni, obiettivi generici
- **Stato avanzamento**: da iniziare / in corso / completato (solo stato, non tempo)
- **Timer pomodoro**: funzione di focus per le sessioni di studio (senza analytics sul tempo in v1)

Backlog: spaced repetition/note (B7), analytics sul tempo di studio.

## 8. Backlog (deciso il 2026-07-12)

| ID | Item | Priorità | Quando |
| --- | --- | --- | --- |
| B1 | **Home overview aggregata**: la home attuale (griglia moduli) diventa una dashboard con widget riassuntivi per modulo | Alta | **Subito dopo il completamento di tutti i moduli** (richiesta esplicita utente) |
| B2 | **Infrastruttura notifiche push PWA** (scadenze House, promemoria Tasks/Health): service worker già presente, manca subscription/permessi/backend | Media | Dopo i moduli MVP |
| B3 | Automatismi intelligenti Grocery (previsione consumi, sotto-scorta → lista, confronto prezzi, OCR scontrini) | Media | Fase 2 Grocery |
| B4 | Integrazione Health↔Grocery: pasti/diete che scalano la dispensa | Media | Dopo MVP di entrambi |
| B5 | Import dati Health da dispositivi (Apple Health export, ecc.) | Bassa | Se fattibile, post-MVP Health |
| B6 | Hardening GDPR dati sanitari (consenso esplicito, valutare crittografia applicativa) | Bassissima | Prima della commercializzazione |
| B7 | Learning: spaced repetition / sistema note | Bassa | Post-MVP Learning |
| B8 | Billing/subscription multi-utente (`profiles.subscription_type` già predisposto) | Bassa | Prima della vendita |

## 9. Roadmap sintetica

| Ordine | Blocco | Contenuto |
| --- | --- | --- |
| 1 | **P0 — Rete di sicurezza** | T1.1, T2.1, T2.3, T1.5 |
| 2 | **P0 — Integrità dati** | T1.2(doc), T3.1, T3.2, T3.3, T3.4 |
| 3 | **P1 — Multi-utente ready** | T3.7, T3.11, T1.4, T3.6, T3.8, T3.10, T5.1, T2.2, T4.3 |
| 4 | **P1 — Debiti strutturali** | T4.1 (fetch incrementale), T4.8 (@supabase/ssr), T2.4 |
| 5 | **FASE 6 — Fondazioni cross-modulo** | T6.0 (linking), T6.1 (storage allegati), T6.2 (token), T6.3 (provider template) |
| 6 | **FASE 6 — Nuovi moduli** | **House + Grocery → Tasks → Health → Learning** (scope in §7) |
| 7 | **Post-moduli** | B1 home overview aggregata (subito dopo i moduli), poi B2 notifiche |
| 8 | **P2 — Rifiniture e vendibilità** | T3.9, T4.4, T4.5, T4.6, T4.9, T4.10, T5.2, T5.3, T5.4, T5.9, T2.5, T3.5 |
| 9 | **P3 — Ottimizzazioni e backlog** | T4.2, T4.7, T5.5-T5.8, T2.6, B3-B8 |

---

*Analisi di riferimento: sessione del 2026-07-12 (codebase completa + DB live).
Evidenze principali: trigger duplicato categorie con corruzione verificata sui
dati; doppia formula saldi trigger/RPC; regressione I4 da PR #16; assenza CI;
dettagli nei documenti in [history/](history/).*
