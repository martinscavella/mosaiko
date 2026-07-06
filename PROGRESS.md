# Mosaiko — Stato avanzamento audit/mosaiko-full-review

## Fase 1 — Audit ✅ completata (2026-07-04)
- Ricognizione stack reale: Next.js 15 + React 19 + Supabase (non React Native,
  chiarito con l'utente all'inizio).
- Prodotto [AUDIT.md](AUDIT.md) con: tour architetturale, dipendenze
  obsolete/vulnerabili, TODO/dead code/console.log, sicurezza (RLS, auth boundary,
  config critiche), test coverage (0%), performance (query N+1, re-render, bundle).
- Estesa con analisi infrastruttura live: Supabase (progetto `mosaiko`,
  zrurebzyzrledxwvvpob) via MCP — schema.sql disallineato dal DB reale, advisor
  di sicurezza/performance live, drift indici. GitHub: repo privata, no `gh`/token,
  solo git locale. Vercel: connettore non autorizzato, richiede azione utente.

## Fase 2 — Triage ✅ completata (2026-07-04)
- Prodotto [TRIAGE.md](TRIAGE.md): 3 Critici, 13 Importanti, 11 Minori, con
  proposta di ordine di lavoro per la Fase 3.

## Fase 3 — in corso (2026-07-04)
Modalità concordata con l'utente: batch veloce su Importanti/Minori, stop e
conferma esplicita solo su Critici e modifiche al DB Supabase live.

Fatto finora:
- **C1 risolto**: setup `vitest` + `@testing-library/react` + smoke test
  (commit `2eec71b`).
- **C4 (nuovo, scoperto e risolto)**: bug reale Rules-of-Hooks in
  `finance/assets/page.tsx` che causava crash React a ogni login — fix + test
  di regressione (commit `38784ad`).
- Rimosso codice morto (`RawAssetData`, `datetimeISO`) segnalato dal linter
  (commit `6d53625`).
- **C3 risolto**: rimossi `eslint.ignoreDuringBuilds`/`typescript.ignoreBuildErrors`
  da `next.config.ts` dopo aver verificato 0 errori TS e 0 errori lint; build di
  produzione verificata (commit `7c1e7e9`).
- **npm audit corretto**: la lettura troncata di Fase 1 nascondeva CVE alte/critiche
  reali (`jspdf` critica, `next` alta — quest'ultima già risolta con bump patch
  a 15.5.20, in-range, build verificata). `xlsx` alta senza fix disponibile su npm.
- **C2 risolto**: rimossi i console.log con token/PII/importi in auth.tsx,
  profiles.ts, financeCache.tsx, api/transactions/route.ts (commit `d5e432b`).
- **C5 risolto**: bump `jspdf` 3.0.1 → 4.2.1 (confermato dall'utente), API di
  export PDF invariata, test di regressione aggiunto, build verificata
  (commit `44d8a55`).

**Tutti e 6 i Critici (C1-C6) sono risolti**, incluso un sesto scoperto durante
il lavoro: **C6 — la registrazione utenti era rotta a livello di database
Supabase live** (due trigger su `auth.users` inserivano entrambi una riga in
`profiles` con lo stesso id, violando la chiave primaria e facendo fallire
l'intera transazione di signup). Coerente con l'osservazione indipendente che
`profiles` ha 0 righe dopo 19 mesi di vita del progetto. Fix applicato sul DB
live previa tua conferma (commit `0220be9`) neutralizzando la funzione
duplicata; non testato con una registrazione reale end-to-end (nessun
browser/credenziali in questa sessione) — **consiglio di provare una
registrazione reale il prima possibile per confermare definitivamente**.

Batch veloce su Importanti/Minori completato per questa sessione:
- **I4**: `contextValue` di `FinanceCacheProvider` memoizzato (commit `2768961`).
- **I1**: `handleUpdateAllAssetsValues` non fa più un refetch completo per
  ogni asset, uno solo alla fine (commit `2768961`).
- **I6**: header di sicurezza base (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`) aggiunti e verificati con curl
  (commit `511477c`).
- Dead code: `ProtectedRoute.tsx`, `useAnimation.ts`, stub abbandonato in
  `financeCache.tsx`, 3 script orfani rimossi (commit `20b96fa`).
- **I5**: `xlsx`/`jspdf` caricati dinamicamente invece che staticamente —
  misurato `/finance/dashboard` 417→289 kB, `/finance/import` 330→220 kB First
  Load JS (commit `f78f41b`).
- **I11**: `database/schema.sql` rigenerato dallo stato reale del DB live
  (tabelle, indici, RLS granulari, ~22 funzioni trigger) — durante questo
  lavoro scoperto e risolto C6, e trovato un trigger di riepilogo mensile
  già disabilitato perché punta a una tabella (`monthly_summary`) inesistente
  (innocuo così com'è, commit `0220be9`).

## Fase 3 (continuazione, 2026-07-04) — altri fix su richiesta esplicita dell'utente
Dopo il primo giro, l'utente ha chiesto di proseguire con le voci rimaste.
Deciso insieme: I2 rimandato (serve un redesign, non un fix), I3 con batch
insert (trade-off tutto-o-niente per batch accettato), DB live batch I9+I10+I12
tutti e tre.

- **I8 risolto**: `/api/transactions` ora verifica esplicitamente
  `auth.getUser()` prima di interrogare il DB invece di affidarsi solo alle
  RLS, con test che copre sia il rifiuto (401) sia il funzionamento normale
  (commit `b7baf54`).
- **Bug reale scoperto e risolto**: `fetchFinanceData` non selezionava
  `asset_quantity` pur mappandola subito dopo — la sezione costo/performance
  della pagina Assets mostrava sempre "—" invece dei valori reali. Fix
  additivo di una colonna (commit `6c83439`).
- **I3 risolto**: import bancario ora inserisce in batch da 500 righe per
  tabella invece che riga per riga (commit `dd8d40e`).
- **I2 rimandato** (decisione utente): richiede un redesign del caricamento
  dati (da "tutto in cache al mount" a "on-demand per intervallo"), non un fix
  a riga singola — servirebbe rompere il comportamento di Report/Transazioni
  con filtro "tutto lo storico". Proposta di design documentata in TRIAGE.md.
- **I9 risolto (DB live)**: ricreati i 2 indici FK mancanti
  (`idx_assets_account_id`, `idx_transactions_asset_id`), confermato che gli
  advisor di performance non li segnalano più come mancanti.
- **I10 risolto (DB live)**: `SET search_path = public` su tutte le 23
  funzioni trigger; `EXECUTE` revocato da `anon`/`authenticated`/`PUBLIC` sulle
  10 funzioni `SECURITY DEFINER` esposte come RPC pubbliche (verificato che
  l'app non usa mai `supabase.rpc()`). Ci sono volute due migrazioni: la prima
  revoca da `anon`/`authenticated` non bastava per via del grant implicito a
  `PUBLIC` che Postgres crea di default — scoperto rilanciando l'advisor dopo
  il primo giro. Advisor di sicurezza ora senza warning sulle funzioni.
- **I12 non applicabile dagli strumenti disponibili**: leaked password
  protection e MFA sono impostazioni Auth configurabili solo da Dashboard
  Supabase o Management API, nessun tool MCP disponibile le espone. Azione
  richiesta all'utente: Dashboard → Authentication → Providers/Policies.
- `database/schema.sql` riaggiornato per riflettere I9/I10 (indici ricreati,
  `search_path` su tutte le funzioni).

## Fase 4 — Verifica finale ✅ (2026-07-04)
- Rivisto l'intero diff del branch a ogni giro (`git diff master..HEAD --stat`),
  nessuna modifica business-logic non intenzionale trovata.
- Build di produzione, `tsc --noEmit`, `next lint` e `vitest run` tutti verdi
  dopo ogni fix (2 soli warning non bloccanti residui in `financeCache.tsx`).
- Advisor di sicurezza/performance Supabase rilanciati dopo ogni migrazione
  per verificare l'effetto reale, non solo il "success" della query.

## Voci NON affrontate (debito residuo)
- **I2** — fetch illimitato di tutte le transazioni: rimandato per decisione
  esplicita dell'utente, serve un redesign (proposta in TRIAGE.md).
- **I7 (parziale)** — rimossa la falsa sicurezza di `ProtectedRoute` morto, ma
  il pattern "protezione per pagina copiata a mano" resta; introdurre un
  middleware o un layout condiviso è un refactor più ampio, non tentato per
  rischio di rompere l'auth senza possibilità di test end-to-end in sessione.
- **I12** — leaked password protection/MFA: da abilitare manualmente da
  Dashboard Supabase, nessuno strumento disponibile per farlo da qui.
- **I13** — migrazione da `@supabase/auth-helpers-nextjs` (deprecato) a
  `@supabase/ssr`: refactor non banale del pattern di sessione/cookie, stesso
  motivo di rischio di I7.
- **Minori residui**: duplicazione formattazione data/valuta (~8 componenti,
  valutato e scartato per rischio/beneficio sfavorevole), `select('*')` senza
  colonne esplicite (idem), dipendenze major indietro (`next` 15→16,
  `recharts` 2→3, ecc.), ridondanza modello categories/subcategories, upgrade
  versione Postgres (richiede downtime pianificato).

## Prossime priorità consigliate per rilanciare il progetto
1. **Verificare C6 con una registrazione reale** appena possibile — è il fix
   più importante di questa sessione ma non è stato testato end-to-end.
2. Abilitare manualmente leaked password protection e MFA da Dashboard
   Supabase (I12) — 5 minuti, alto valore.
3. Decidere il design di I2 (paginazione/caricamento incrementale
   transazioni) con una sessione dedicata a misurare i volumi reali.
4. Pianificare la migrazione da `@supabase/auth-helpers-nextjs` a
   `@supabase/ssr` (I13) e/o un middleware di autenticazione (I7) — entrambi
   toccano l'intero flusso di auth, da fare con possibilità di test reale.
5. Alzare la coverage di test oltre agli smoke test introdotti qui (C1): i
   flussi di scrittura finanziaria (transazioni, asset, rimborsi) sono i più
   critici da coprire.
6. Autorizzare il connettore Vercel se si vuole che l'analisi includa anche
   deploy/build remoti in una prossima sessione.
7. Pianificare l'upgrade della versione Postgres (patch di sicurezza
   disponibili) in una finestra di manutenzione dedicata.
