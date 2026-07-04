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

## Fase 4 — Verifica finale ✅ (2026-07-04, per il lavoro di questa sessione)
- Rivisto l'intero diff del branch (`git diff master..HEAD --stat`, 26 file,
  nessuna modifica business-logic non intenzionale trovata).
- Build di produzione, `tsc --noEmit`, `next lint` e `vitest run` tutti verdi
  (2 soli warning non bloccanti residui in `financeCache.tsx`, vedi sotto).
- Changelog riassuntivo: vedi elenco commit sopra (14 commit atomici, ognuno
  con messaggio descrittivo del cosa e del perché).

## Voci NON affrontate in questa sessione (debito residuo)
Rimaste in TRIAGE.md per una sessione futura, con relative note:
- **I2** — fetch illimitato di tutte le transazioni in `financeCache.tsx`:
  richiederebbe introdurre paginazione/limite, cambio di comportamento
  visibile → serve conferma esplicita e test più ampi.
- **I3** — import bancario con insert riga-per-riga invece di batch: stesso
  discorso, tocca un flusso critico (import dati finanziari) da testare con
  attenzione.
- **I7 (parziale)** — rimossa la falsa sicurezza di `ProtectedRoute` morto, ma
  il pattern "protezione per pagina copiata a mano" resta; introdurre un
  middleware o un layout condiviso è un refactor più ampio.
- **I8** — `api/transactions` continua a fidarsi solo delle RLS senza un
  controllo esplicito `auth.getUser()`.
- **I9** — indici FK mancanti su DB live (`assets.account_id`,
  `transactions.asset_id`): modifica al DB live, da confermare a parte.
- **I10** — hardening `search_path`/RPC sulle ~21 funzioni trigger rimanenti
  (oltre a quella già sistemata per C6): modifica al DB live, da confermare.
- **I12** — leaked password protection e MFA disabilitati lato Supabase Auth:
  toggle da dashboard, non SQL; da confermare.
- **I13** — migrazione da `@supabase/auth-helpers-nextjs` (deprecato) a
  `@supabase/ssr`: refactor non banale del pattern di sessione/cookie.
- **Minori residui**: duplicazione formattazione data/valuta (~8 componenti),
  `select('*')` senza colonne esplicite, placeholder `your-jwt-secret` in
  `schema.sql` originale (ora sostituito dalla rigenerazione), dipendenze major
  indietro (`next` 15→16, `recharts` 2→3, ecc.), ridondanza modello
  categories/subcategories, upgrade versione Postgres (richiede downtime).

## Prossime priorità consigliate per rilanciare il progetto
1. **Verificare C6 con una registrazione reale** appena possibile — è il fix
   più importante di questa sessione ma non è stato testato end-to-end.
2. Decidere su I2/I3 (paginazione transazioni, import batch) con una sessione
   dedicata a misurare i dati reali dell'utente (quante transazioni/righe di
   import tipiche) prima di scegliere la soglia/strategia.
3. Confermare le modifiche al DB live rimanenti (I9 indici, I10 hardening
   funzioni, I12 auth) — sono a basso rischio e alto valore.
4. Pianificare la migrazione da `@supabase/auth-helpers-nextjs` a
   `@supabase/ssr` (I13) prima che il pacchetto deprecato smetta di ricevere
   patch di sicurezza.
5. Alzare la coverage di test oltre agli smoke test introdotti qui (C1): i
   flussi di scrittura finanziaria (transazioni, asset, rimborsi) sono i più
   critici da coprire.
6. Autorizzare il connettore Vercel se si vuole che l'analisi includa anche
   deploy/build remoti in una prossima sessione.
