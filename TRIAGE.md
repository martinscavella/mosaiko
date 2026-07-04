# Mosaiko — Triage Fase 2

Data: 2026-07-04 — basato su [AUDIT.md](AUDIT.md) (codebase + infrastruttura live
Supabase). Vercel non analizzato (connettore non autorizzato). GitHub non
analizzato oltre al git locale (repo privata, nessun token/`gh` disponibile).

Legenda impatto: stima qualitativa basata su lettura del codice, non ancora
misurata con profiling reale (verrà misurata in Fase 3bis dove possibile).

---

## CRITICI

### ✅ Tutti e 5 i Critici risolti (2026-07-04)
C1, C2, C3 (previsti in Fase 2) e due scoperti durante il lavoro di Fase 3 —
**C4** (crash React reale da Rules-of-Hooks in `finance/assets/page.tsx`, trovato
rimuovendo `ignoreDuringBuilds`) e **C5** (CVE critica in `jspdf`, emersa da una
lettura completa di `npm audit` dopo che quella di Fase 1 era stata troncata) —
sono stati tutti risolti, testati e committati. Dettagli e commit in ciascuna
sezione sotto.

### C1 — Zero test automatici, nessuna rete di sicurezza per i fix ✅ RISOLTO
- **File**: intero repo (nessun `jest`/`vitest`, nessuno script `test`)
- **Sintomo**: nessuna verifica automatica di regressione esiste.
- **Ipotesi causa**: progetto partito senza infrastruttura di test, mai aggiunta.
- **Impatto**: blocca il protocollo stesso di Fase 3 (che richiede "scrivi un test
  che riproduce il bug e fallisce" prima di ogni fix). Senza harness minimo, ogni
  fix successivo è verificato solo manualmente/a occhio.
- **Azione applicata**: `vitest` + `@testing-library/react` + `jsdom` installati
  (confermato da te), config in `vitest.config.mts`, smoke test su
  `lib/helpers/format.ts` e `dateRange.ts`. `npm test` verde.

### C2 — Dati sensibili (token di sessione, PII, importi) in `console.log` di produzione ✅ RISOLTO
- **File**: [src/lib/auth.tsx:29-30,40-41,53,60,75,85](src/lib/auth.tsx#L29),
  [src/lib/profiles.ts:20-21,40,53](src/lib/profiles.ts#L20),
  [src/app/api/transactions/route.ts:39,42-47,63](src/app/api/transactions/route.ts#L39),
  [src/lib/financeCache.tsx:826,854,1005,1043](src/lib/financeCache.tsx#L1043)
- **Sintomo**: 118 chiamate console.log attive anche in produzione, incluse
  risposte complete di `signIn`/`signUp` (contengono access/refresh token) ed
  email in chiaro.
- **Ipotesi causa**: log di debug lasciati durante lo sviluppo, mai rimossi né
  condizionati a `NODE_ENV`.
- **Impatto**: esposizione reale di token di sessione e dati finanziari/PII nella
  console del browser e nei log server — rilevante per un'app che gestisce dati
  finanziari personali.
- **Azione applicata**: rimossi tutti i log che esponevano token/PII/importi in
  `auth.tsx`, `profiles.ts`, `financeCache.tsx` e `api/transactions/route.ts`;
  mantenuti i `console.error` con solo codice/messaggio d'errore per il debug.

### C3 — Build di produzione ignora errori TypeScript e lint ✅ RISOLTO
- **File**: [next.config.ts:6-11](next.config.ts#L6)
  (`eslint.ignoreDuringBuilds: true`, `typescript.ignoreBuildErrors: true`)
- **Sintomo**: `tsconfig.json` ha `strict: true`, ma la build Next.js non fallisce
  mai per errori di tipo o lint.
- **Ipotesi causa**: probabilmente aggiunto in passato per sbloccare una build
  rotta, mai rimosso.
- **Impatto**: qualunque regressione di tipo può arrivare in produzione senza
  che nessuno se ne accorga; vanifica il valore di `strict: true`. È la causa
  radice sistemica che permette a molti degli altri bug di non essere mai stati
  intercettati.
- **Azione applicata**: `tsc --noEmit` → 0 errori. `next lint` → 2 errori reali
  (uno era il bug Rules-of-Hooks C4, l'altro codice morto, entrambi corretti) +
  2 warning non bloccanti residui in `financeCache.tsx` (un `any` a riga 211,
  un `useCallback` con dipendenze incomplete a riga 368 — quest'ultimo è lo
  stesso sospetto "infinite loop dependency" già annotato in
  `docs/ANALYSIS_REPORT.md`, lasciato come warning per ora, da approfondire in
  Fase 3bis). Flag rimossi da `next.config.ts`, build di produzione verificata
  con successo.

### C5 — CVE critica in `jspdf` (dipendenza diretta) ✅ RISOLTO
- **File**: [package.json](package.json) (`jspdf: ^3.0.1`), uso in
  [src/components/ui/TransactionDetailsModal.tsx:1](<src/components/ui/TransactionDetailsModal.tsx#L1>)
- **Sintomo**: `npm audit` (letto per intero questa volta) segnala **CVE critica
  CVSS 9.6** ("HTML Injection in New Window paths") e diverse CVE alte (PDF/AcroForm
  injection → esecuzione JS arbitraria) su tutte le versioni `<=4.2.0`.
- **Ipotesi causa**: dipendenza mai aggiornata da quando introdotta.
- **Impatto**: i campi liberi `transaction_details`/`transaction_note` finiscono
  nel PDF esportato — un contenuto malevolo in una nota potrebbe teoricamente
  sfruttare l'injection all'apertura del PDF. Rischio pratico limitato (RLS isola
  gli account, un utente può danneggiare solo se stesso), ma è una CVE reale con
  fix disponibile.
- **Azione applicata**: bump a `jspdf@4.2.1` (confermato da te). L'API usata da
  `TransactionDetailsModal.tsx` (`new jsPDF()`, `setFontSize`, `text`, `save`) è
  invariata tra le major; aggiunto test che esercita la stessa sequenza e
  verifica la generazione di un PDF valido (`doc.output('datauristring')`).
  Build di produzione verificata.

---

## IMPORTANTI

### I1 — Aggiornamento asset: refetch completo dell'intero storico per ogni asset
- **File**: [src/lib/financeCache.tsx:1002-1075](src/lib/financeCache.tsx#L1063) +
  [src/app/(modules)/finance/assets/page.tsx:297-320](<src/app/(modules)/finance/assets/page.tsx#L314>)
- **Sintomo**: `handleUpdateAllAssetsValues` aggiorna gli asset uno alla volta in
  sequenza; ognuno chiama `refetch()` che ricarica **tutto** lo storico
  transazioni.
- **Ipotesi causa**: `refetch()` riusato per comodità senza notare che innesca il
  fetch paginato completo di `fetchFinanceData`.
- **Impatto stimato**: con N asset, il lavoro di rete passa da O(1 refetch) a
  O(N × storico completo) + N chiamate API esterne in serie — riduzione attesa
  del tempo totale proporzionale a N (es. 10 asset ≈ 10x più lento del
  necessario).

### I2 — Fetch illimitato di tutte le transazioni ad ogni mount/invalidazione cache
- **File**: [src/lib/financeCache.tsx:181-229](src/lib/financeCache.tsx#L181)
- **Sintomo**: nessun filtro data/limite superiore, loop `while(hasMore)` a batch
  di 1000.
- **Impatto stimato**: cresce linearmente con lo storico dell'utente; per utenti
  pluriennali, migliaia di righe scaricate a ogni login.

### I3 — Import bancario: insert riga-per-riga invece di batch
- **File**: [src/app/(modules)/finance/import/page.tsx:556-668](<src/app/(modules)/finance/import/page.tsx#L656>)
- **Impatto stimato**: 500 righe = 500 round-trip di rete sequenziali + 500
  re-render invece di 1 `insert([...])` batch — riduzione attesa del tempo di
  import di uno o due ordini di grandezza.

### I4 — `contextValue` di `FinanceCacheProvider` non memoizzato
- **File**: [src/lib/financeCache.tsx:399-406](src/lib/financeCache.tsx#L399)
- **Impatto stimato**: ogni cambio di stato interno ri-renderizza tutti i
  consumer in tutta l'app (il provider wrappa l'intero layout) — fix a basso
  rischio (`useMemo` già importato, non usato).

### I5 — Bundle: `xlsx` e `jspdf` caricati staticamente
- **File**: [src/app/(modules)/finance/import/page.tsx:8](<src/app/(modules)/finance/import/page.tsx#L8>),
  [src/components/ui/TransactionDetailsModal.tsx:1](<src/components/ui/TransactionDetailsModal.tsx#L1>)
- **Impatto stimato**: due librerie pesanti nel bundle iniziale per funzionalità
  usate raramente (import file, export PDF); misurabile con `next build` prima/dopo
  conversione a `next/dynamic`.

### I6 — Nessun security header / CSP
- **File**: [next.config.ts](next.config.ts)
- **Impatto**: nessuna difesa in profondità contro injection/clickjacking anche
  se oggi non risultano sink XSS noti.

### I7 — Protezione route inconsistente: `ProtectedRoute` morto, nessun middleware
- **File**: [src/components/ProtectedRoute.tsx](src/components/ProtectedRoute.tsx),
  pagine `finance/*`
- **Impatto**: la protezione dipende dalla disciplina di copiare l'if manuale in
  ogni nuova pagina; le pagine placeholder `health/tasks/learning` già non ce
  l'hanno.

### I8 — `api/transactions` senza verifica esplicita di auth
- **File**: [src/app/api/transactions/route.ts](src/app/api/transactions/route.ts)
- **Impatto**: nessuna difesa in profondità oltre le RLS; se le RLS venissero
  disabilitate per errore, diventerebbe un IDOR.

### I9 — Indici FK mancanti nel DB Supabase live (drift da `schema.sql`)
- **File**: DB live (`assets.account_id`, `transactions.asset_id`) — non un file
  del repo
- **Ipotesi causa**: rimossi per errore dalla migrazione `drop_unused_indexes`
  quando le tabelle erano vuote.
- **Impatto**: sequential scan sui join man mano che i dati crescono.

### I10 — 22 funzioni trigger Postgres con `search_path` mutabile, 9 esposte come RPC pubbliche
- **File**: DB live, schema `public` (funzioni trigger, vedi AUDIT.md §4bis)
- **Impatto**: hardening richiesto dal linter Supabase stesso (WARN); rischio
  reale basso (Postgres blocca la chiamata diretta di funzioni `RETURNS trigger`)
  ma superficie d'attacco/rumore da ridurre.

### I11 — `database/schema.sql` disallineato dal DB live
- **File**: [database/schema.sql](database/schema.sql)
- **Impatto**: chi legge lo schema committato si fa un'idea sbagliata di come
  funzionano saldi/totali (gestiti da trigger DB non documentati nel repo).

### I12 — Auth hardening disabilitato lato Supabase
- **File**: configurazione progetto Supabase (Dashboard, non file repo)
- **Dettaglio**: controllo password compromesse (HaveIBeenPwned) disabilitato,
  poche opzioni MFA abilitate.
- **Impatto**: basso sforzo di attivazione, alzerebbe la sicurezza degli account.

### I13 — Dipendenza Supabase deprecata
- **File**: [package.json](package.json) (`@supabase/auth-helpers-nextjs`), uso in
  [src/lib/auth.tsx](src/lib/auth.tsx)
- **Impatto**: pacchetto non più raccomandato da Supabase (sostituito da
  `@supabase/ssr`, già presente come dipendenza ma inutilizzato); migrazione non
  banale, da pianificare separatamente.

---

## MINORI

- TODO in [finance/reports/page.tsx:133](<src/app/(modules)/finance/reports/page.tsx#L133>)
  (split `useMemo`).
- Codice morto: [financeCache.tsx:238](src/lib/financeCache.tsx#L238),
  [526-529](src/lib/financeCache.tsx#L526) (stub `useAutoValuationAssets`
  abbandonato).
- [useAnimation.ts](src/hooks/useAnimation.ts) esportato ma mai importato.
- Script orfani: `public/generate-icons.sh`, `public/generate-png-icons.js`,
  `test-pwa.sh`.
- Duplicazione formattazione data/valuta in ~8 componenti (candidato per helper
  condiviso).
- `select('*')` senza colonne esplicite in vari punti (over-fetch minore, non
  urgente).
- [database/schema.sql:4](database/schema.sql#L4) — placeholder
  `your-jwt-secret` da rimuovere (nessun effetto su Supabase gestito, ma cattiva
  igiene).
- `npm audit`: vulnerabilità moderate transitive (`ajv`, `brace-expansion`,
  `dompurify`) — fix disponibile via bump dipendenze dirette.
- Dipendenze major indietro (`next`, `recharts`, `framer-motion`, `jspdf`,
  `lucide-react`, `tailwind-merge`) — da aggiornare con test di regressione,
  fuori da questa sessione salvo tua richiesta.
- Ridondanza di modello `categories`/`subcategories` (commento live nel DB:
  "This is a duplicate of categories") — richiede decisione di design, non un
  fix meccanico.
- Upgrade versione Postgres (patch di sicurezza disponibili) — richiede
  pianificazione di un downtime, da programmare con te separatamente.

---

## Proposta di ordine di lavoro per la Fase 3

1. **C1** — Setup `vitest` (previa tua conferma per la nuova dipendenza), così
   ogni fix successivo può avere un test di regressione reale.
2. **C2** — Rimozione/gating dei console.log sensibili.
3. **C3** — Misurare quanti errori TS/lint emergerebbero rimuovendo gli
   `ignoreBuildErrors`/`ignoreDuringBuilds`, poi decidere insieme.
4. A seguire gli **Importanti**, iniziando da I1/I2 (i due con impatto
   performance più alto e più facilmente misurabile) e I4 (fix a rischio più
   basso, un solo `useMemo`).
5. Le modifiche al **DB Supabase live** (I9, I10, I12) le applico solo dopo tua
   conferma esplicita separata, trattandosi di infrastruttura condivisa/di
   produzione — non le includo nel flusso automatico dei fix locali.

Fammi sapere se l'ordine ti va bene o se vuoi ripartire le priorità diversamente,
poi comincio dal primo Critico.
