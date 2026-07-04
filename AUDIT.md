# Mosaiko — Audit Fase 1

Data: 2026-07-04
Branch: `audit/mosaiko-full-review`

## Nota preliminare sullo stack

Il prompt di partenza descriveva il progetto come React Native. **Il repo è in realtà
un'app web Next.js 15 (App Router) + React 19 + TypeScript + Supabase**, con service
worker e manifest per funzionare come PWA installabile (iOS/Android). Non esiste
codice React Native (nessun `App.tsx`, nessuna dipendenza Expo/RN). Questo audit è
stato adattato di conseguenza (es. niente FlatList, criteri di performance web).

---

## 1. Tour del repository

**Entry point**: [src/app/layout.tsx](src/app/layout.tsx) — root layout che innesta
`AuthProvider` → `FinanceCacheProvider` → shell con `Sidebar` (desktop) / `BottomMenu`
(mobile) → `{children}`. Qui vengono montati anche `PWAManager` e `IOSPWASetup`.

**Routing**: App Router con route group `src/app/(modules)/` per i moduli
(`finance`, `health`, `tasks`, `learning` — vedi [src/app/modules.ts](src/app/modules.ts)).
Solo `finance` è implementato; gli altri tre sono placeholder "in sviluppo" senza
alcun auth gate (non critico oggi, ma nessuna barriera esiste se in futuro ci
si dimentica di aggiungerla — vedi §4.1).

**Auth**: [src/lib/auth.tsx](src/lib/auth.tsx) — `AuthProvider` basato su
`@supabase/auth-helpers-nextjs` (`createClientComponentClient`), espone `useAuth()`
con `user/loading/signIn/signUp/signOut/updateProfile`. La protezione delle pagine
è fatta **manualmente per pagina** (`if (!user) ...` dentro ogni `page.tsx`), non
tramite middleware né tramite `ProtectedRoute` (componente esistente ma **mai
importato/usato** — vedi §3.4).

**Flusso dati frontend → Supabase**: i componenti client chiamano direttamente
`supabase-js` (via `createClientComponentClient()`, istanziato in ~24 punti diversi
senza un singleton condiviso) e si affidano interamente alle **Row Level Security
policy** di Postgres (`auth.uid() = user_id`, vedi [database/schema.sql](database/schema.sql))
per l'isolamento dei dati tra utenti. Non c'è un layer di API interno per le
operazioni CRUD di dominio (accounts/transactions/assets/ecc.) — solo 3 route
handler Next.js in `src/app/api/` fanno da proxy per dati di mercato esterni
(Yahoo Finance, CoinGecko) e uno interroga Supabase direttamente lato server.

**Stato applicativo/cache**: [src/lib/financeCache.tsx](src/lib/financeCache.tsx)
(1273 righe) è un context provider che carica **tutte** le transazioni/account/asset
dell'utente in memoria all'avvio e li tiene in cache con invalidazione a tempo
(fresh 1h / stale 30min, vedi [docs/CACHE_OPTIMIZATION.md](docs/CACHE_OPTIMIZATION.md)).
Wrappa l'intera app, quindi il suo comportamento di re-render impatta tutte le pagine
finance (vedi §7.2).

**Database**: schema Postgres/Supabase in [database/schema.sql](database/schema.sql):
10 tabelle (`profiles, accounts, assets, categories, financial_goals, funds_transfer,
refunds, refund_transaction, subcategories, transactions`), tutte con RLS abilitata
e policy `FOR ALL USING (auth.uid() = user_id)`. Solo 2 indici espliciti oltre alle
PK/FK (`idx_assets_account_id`, `idx_transactions_asset_id`).

---

## 2. Dipendenze

### Vulnerabilità note (`npm audit`)
Vulnerabilità moderate in dipendenze transitive: `ajv` (ReDoS, <6.14.0), `brace-expansion`
(hang/memory exhaustion), `dompurify` (XSS, via dipendenza indiretta — verificare quale
package la richiede, probabilmente jspdf). Tutte hanno fix disponibile via `npm audit fix`
o bump della dipendenza diretta che le include.

### Obsolescenza
Diverse dipendenze dirette sono indietro di una o più major:
- `next` 15.3.8 → 16.2.10 disponibile (major)
- `recharts` 2.15.4 → 3.9.2 (major, breaking API changes probabili)
- `lucide-react` 0.515.0 → 1.23.0 (major)
- `framer-motion` 11.18.2 → 12.42.2 (major)
- `jspdf` 3.0.4 → 4.2.1 (major)
- `tailwind-merge` 2.6.1 → 3.6.0 (major)
- `@supabase/ssr` 0.6.1 → 0.12.0, `@supabase/auth-helpers-nextjs` 0.10.0 → 0.15.0

**Nota architetturale**: il progetto usa ancora `@supabase/auth-helpers-nextjs`
(pacchetto deprecato da Supabase in favore di `@supabase/ssr`, che è già presente
come dipendenza ma non risulta usato in `auth.tsx`). Migrazione consigliata ma non
banale (cambia il pattern di gestione cookie/sessione).

- `xlsx` 0.18.5 (usato in `financeImportParsers.ts:1179` per il parsing import) ha
  vulnerabilità di prototype-pollution/ReDoS mai backportate su npm (SheetJS ha
  spostato i fix sul proprio CDN). Impatto limitato (gira lato client sul file
  caricato dall'utente stesso), ma va segnalato per remediation.

---

## 3. Bug, codice morto, sicurezza

### 3.1 Test automatici
**Nessun framework di test presente** — non c'è `jest`/`vitest`/`@testing-library`
in `package.json`, nessuno script `test`, nessuna cartella `__tests__`. Copertura
reale: 0%. Qualsiasi fix in Fase 3 dovrà introdurre da zero l'infrastruttura di test
minima (raccomando `vitest` per la velocità di setup con Next.js).

### 3.2 Logging eccessivo / esposizione dati sensibili
118 chiamate `console.log/debug/warn` (esclusi `console.error` legittimi), tutte
attive anche in produzione (nessun gating su `NODE_ENV`). Le più gravi:

- [src/lib/auth.tsx:29-30,40-41](src/lib/auth.tsx#L29-L41) — logga l'intero oggetto
  `session.user` e `user_metadata` a ogni login/refresh.
- [src/lib/auth.tsx:53,60,75,85](src/lib/auth.tsx#L53) — logga email in chiaro e
  l'intera risposta `{ data, error }` di `signInWithPassword`/`signUp` (contiene
  access/refresh token).
- [src/lib/profiles.ts:20-21,40,53](src/lib/profiles.ts#L20) — logga `userId` e
  intero `profileData` (PII: nome, data di nascita, ecc.) prima/dopo insert.
- [src/app/api/transactions/route.ts:39,42-47,63](src/app/api/transactions/route.ts#L39) —
  logga lato server array di transazioni con importi finanziari reali a ogni GET.
- [src/lib/financeCache.tsx:826,854,1005,1043](src/lib/financeCache.tsx#L1043) —
  logga valori di portafoglio/asset reali in EUR.
- [src/app/(modules)/finance/assets/page.tsx:99-110](<src/app/(modules)/finance/assets/page.tsx#L99>) —
  logga payload finanziari e ID/nomi asset.

Altri file con volumi minori: `financeImportParsers.ts` (13), `market-price/route.ts` (7),
`import/page.tsx` (7), `PWAManager.tsx` (4), `refunds/page.tsx` (4).

**Impatto**: dati finanziari e token di sessione finiscono nella console del
browser (visibile a chiunque abbia devtools aperte, o a estensioni malevole) e nei
log server di Vercel/hosting. Fix a basso rischio: rimuovere o wrappare dietro un
logger che rispetta `NODE_ENV !== 'production'`.

### 3.3 TODO / codice morto
- [src/app/(modules)/finance/reports/page.tsx:133](<src/app/(modules)/finance/reports/page.tsx#L133>) —
  unico TODO nel repo: "Spezzare questo useMemo in 5-6 useMemo più piccoli e focalizzati".
- [src/lib/financeCache.tsx:238](src/lib/financeCache.tsx#L238) — riga di codice
  commentata (filtro transazioni asset).
- [src/lib/financeCache.tsx:526-529](src/lib/financeCache.tsx#L526) — stub
  `useAutoValuationAssets()` commentato con nota "RIMOSSO: campo non presente nel
  database" — funzionalità abbandonata a metà, da rimuovere o completare.
- [src/components/ProtectedRoute.tsx](src/components/ProtectedRoute.tsx) — componente
  completo ma **mai importato da nessuna parte** in `src/app`. La protezione reale
  delle pagine è fatta ad-hoc in ogni `page.tsx` (`finance/dashboard`, `transactions`,
  `accounts`, `assets`, `reports`, `refunds`), il che rende la protezione
  "per convenzione" e facile da dimenticare su pagine nuove.
- [src/hooks/useAnimation.ts](src/hooks/useAnimation.ts) — hook esportato, nessun
  import in tutto `src/`.
- `public/generate-icons.sh`, `public/generate-png-icons.js`, `test-pwa.sh` (root) —
  script orfani, non referenziati da `package.json` né da README.

### 3.4 Autenticazione / autorizzazione
- **Nessun `middleware.ts`**: la protezione delle route è interamente client-side.
  Le pagine placeholder di `health`, `tasks`, `learning` (route group `(modules)`)
  non hanno alcun gate — oggi non espongono dati sensibili (sono stub statici), ma
  il pattern "gate manuale per pagina" si è già dimostrato inconsistente (vedi
  `ProtectedRoute` inutilizzato sopra).
- [src/app/api/transactions/route.ts](src/app/api/transactions/route.ts) — il GET
  handler non verifica esplicitamente `auth.getUser()`/`getSession()` prima di
  interrogare Supabase: si affida **interamente** alle RLS policy passate via cookie
  di sessione. Funziona finché le RLS restano corrette, ma non c'è difesa in
  profondità: se una policy viene disabilitata o modificata per errore in futuro,
  questo endpoint diventa un IDOR (chiunque può enumerare `asset_id`).
- [src/app/api/market-price/route.ts:35](src/app/api/market-price/route.ts#L35) e
  [src/app/api/price-history/route.ts:63,108](src/app/api/price-history/route.ts#L63) —
  i parametri `symbol`/`type` da query string vengono interpolati senza validazione
  in URL verso Yahoo Finance/CoinGecko (niente allowlist, niente `encodeURIComponent`).
  Endpoint non autenticati e senza rate limiting: rischio di abuso come proxy
  gratuito verso terze parti / DoS leggero, non SSRF verso host interni (dominio
  hardcoded).
- Verificato: **nessun uso di `SUPABASE_SERVICE_ROLE_KEY`** in tutto il repo (non
  solo `src/`) — corretto, nessun bypass RLS lato client o server.
- Verificato: nessun `dangerouslySetInnerHTML`, `eval(`, `new Function(` in `src/`.
- Scritture (`.insert`/`.update`) verificate a campione: `user_id` è sempre preso
  da `useAuth()`/sessione server, mai da input client arbitrario — nessun IDOR
  trovato sui path di scrittura controllati, ma la protezione dipende comunque al
  100% dalle RLS restando intatte.
- Nessuna configurazione CORS esplicita da nessuna parte: i due endpoint pubblici
  di prezzo sono chiamabili cross-origin da qualunque sito (impatto basso, sono
  dati di mercato pubblici, ma vanno comunque rate-limitati).

### 3.5 Configurazione critica
- [next.config.ts](next.config.ts) — **nessun header di sicurezza** (no CSP, no
  `X-Frame-Options`, no `Referrer-Policy`, no HSTS).
- [next.config.ts:6-11](next.config.ts#L6) — `eslint: { ignoreDuringBuilds: true }`
  e `typescript: { ignoreBuildErrors: true }`: **la build in produzione ignora sia
  gli errori di lint che quelli di tipo**. Nonostante `tsconfig.json` abbia
  `"strict": true`, questo è vanificato in CI/build — errori di tipo possono
  arrivare in produzione silenziosamente. Va rimosso appena il codebase è pulito
  a sufficienza da non rompere la build.
- Nessun file `.env*` committato, correttamente ignorato da `.gitignore`.
- [database/schema.sql:4](database/schema.sql#L4) —
  `ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';` — placeholder
  letterale lasciato nello schema versionato. Su Supabase gestito questa riga non ha
  effetto reale (il JWT secret è gestito dalla piattaforma), ma è comunque un residuo
  di boilerplate rischioso da tenere in un file eseguibile: se qualcuno lo rilancia
  contro un'istanza self-hosted imposterebbe un secret pubblico noto. Da rimuovere.

---

## 4. Performance

### 4.1 Query Supabase inefficienti
- [src/lib/financeCache.tsx:181-229](src/lib/financeCache.tsx#L181) —
  `fetchFinanceData` carica **tutte** le transazioni dell'utente, a vita, in batch
  da 1000 via loop `while(hasMore)`, senza filtro data né limite superiore. Rieseguito
  a ogni mount del provider e a ogni invalidazione cache. Per un utente con anni di
  storico questo significa migliaia di righe scaricate e tenute in memoria a ogni
  login.
- [src/lib/financeCache.tsx:1002-1075](src/lib/financeCache.tsx#L1063) +
  [src/app/(modules)/finance/assets/page.tsx:297-320](<src/app/(modules)/finance/assets/page.tsx#L314>) —
  **il problema più impattante trovato**: `handleUpdateAllAssetsValues` chiama
  `updateAssetMarketValue()` in sequenza per ogni asset (`await` dentro un loop); ogni
  chiamata fa select→fetch esterno→update→**`await refetch()`** (financeCache.tsx:1063),
  e `refetch()` rilancia l'intero fetch illimitato di cui sopra. Con N asset:
  N ricariche complete dell'intero storico transazioni + N chiamate a API esterne,
  eseguite in serie. Andrebbe: aggiornare tutti gli asset in batch, poi un solo
  `refetch()` finale — riduzione stimata del lavoro di rete da O(N × storico
  completo) a O(N + 1 refetch).
- [src/lib/financeCache.tsx:881-941](src/lib/financeCache.tsx#L881) —
  `updateAllAssetsFromTransactions` itera gli asset chiamando
  `updateAssetFromTransactions(asset.id)` (2 select + 1 update ciascuno) invece di
  un'unica query con `in('asset_id', ids)` raggruppata poi in JS — N+1 classico.
- [src/app/(modules)/finance/accounts/page.tsx:73-94](<src/app/(modules)/finance/accounts/page.tsx#L73>) —
  dentro `Promise.all(cacheAccounts.map(...))`, 2 query `select('*')` separate
  (`funds_transfer`, `refunds`) per ogni account invece di un'unica `in('account_id', ids)`
  per tabella — N+1 che scala con il numero di conti, rieseguito a ogni cambio di
  `financeData`.
- [src/app/(modules)/finance/import/page.tsx:556-668](<src/app/(modules)/finance/import/page.tsx#L656>) —
  il salvataggio dell'import fa un `insert()` **per riga**, in sequenza, con
  `findIndex` O(n²) e `setImportData([...])` (copia completa array + re-render) dopo
  **ogni singola riga**. Per un estratto conto di 500 righe: 500 round-trip di rete
  sequenziali + 500 re-render invece di un singolo `insert([...])` batch.
- `select('*')` senza colonne esplicite in diversi punti (non urgente, ma over-fetch
  evitabile): `financeCache.tsx:174,176,177,178,296,751,972`, `accounts/page.tsx:83,91`,
  `refunds/page.tsx:206,216`, `profiles.ts:45,69,79`.
- Solo 2 indici oltre a PK/FK in tutto lo schema — da rivedere una volta note le
  query più frequenti (es. indice su `transactions(user_id, transaction_date)` per
  velocizzare il fetch principale sopra).

### 4.2 Re-render evitabili
- [src/lib/financeCache.tsx:399-406](src/lib/financeCache.tsx#L399) — `contextValue`
  passato al Provider è un oggetto letterale **non wrappato in `useMemo`**
  (nonostante `useMemo` sia già importato nel file), quindi ogni cambio di stato
  interno (incluso il polling di staleness ogni 5 minuti, linee 378-388) ricrea
  l'oggetto e **ri-renderizza ogni consumer** di `useFinanceCache`/derivati in tutta
  l'app, dato che il provider wrappa l'intero layout.
- [src/app/(modules)/finance/transactions/page.tsx:132-136](<src/app/(modules)/finance/transactions/page.tsx#L132>) —
  `filteredStats` (entrate/uscite) calcolato con due passate `.filter().reduce()`
  direttamente nel corpo del render (nessun `useMemo`), ripetuto a ogni render anche
  per cambi di stato non correlati, potenzialmente sull'intero storico transazioni.
- [src/components/ui/AssetPerformanceChart.tsx:456-463](<src/components/ui/AssetPerformanceChart.tsx#L456>) —
  array ricostruito inline come prop `data` per Recharts a ogni render.
- [src/components/ui/AssetPerformanceChart.tsx:636-660](<src/components/ui/AssetPerformanceChart.tsx#L636>) —
  volatilità e max-drawdown calcolati con IIFE dentro il JSX (non `useMemo`),
  ricalcolati a ogni re-render incluso il polling prezzi.
- [src/components/ui/TransactionsTable.tsx:193-283](<src/components/ui/TransactionsTable.tsx#L193>) —
  qui il filtro/sort **è** correttamente in `useMemo` e la tabella pagina
  client-side (10-100 righe/pagina), quindi non serve virtualizzazione per il DOM;
  resta però il costo di ricalcolo su ogni keystroke di ricerca sull'intero array
  non limitato di transazioni (collegato al problema §4.1 della fetch illimitata).

### 4.3 Bundle / codice non ottimizzato
- Nessun uso di `next/dynamic` in tutto il repo.
- [src/app/(modules)/finance/import/page.tsx:8](<src/app/(modules)/finance/import/page.tsx#L8>) —
  `import * as XLSX from "xlsx"` a livello di modulo in una pagina client; xlsx è
  pesante e andrebbe caricato dinamicamente solo quando l'utente seleziona un file.
- `jspdf`, importato staticamente in
  [src/components/ui/TransactionDetailsModal.tsx:1](<src/components/ui/TransactionDetailsModal.tsx#L1>),
  finisce nel bundle iniziale della dashboard finance (il modale è importato
  staticamente da `finance/dashboard/page.tsx` e `RecentTransactions.tsx`) pur
  essendo usato solo per l'export PDF, azione rara — candidato ideale per
  `next/dynamic`.
- [financeImportParsers.ts:1179](<src/app/(modules)/finance/import/financeImportParsers.ts#L1179>)
  e i loop di elaborazione righe (1072, 1090, 1190, 1217, 1309, 1319) girano
  sincroni sul thread principale — file di import grandi bloccano la UI durante
  il parsing, aggravato dal salvataggio riga-per-riga di §4.1.
- Nessun `<img>` grezzo trovato: l'unico componente immagine (`MosaikoLogo.tsx`)
  usa correttamente `next/image`. Nessun problema qui.

---

## 5. Riepilogo per la Fase 2

I punti sopra sono pronti per essere prioritizzati in FASE 2 (Critici / Importanti /
Minori). In sintesi, i cluster di problemi più rilevanti sono:
1. Difesa in profondità assente (RLS come unico livello, `ProtectedRoute` morto, zero
   security headers, build che ignora errori di tipo/lint).
2. Logging di dati sensibili (PII, importi, token) sempre attivo in produzione.
3. Pattern N+1 e fetch illimitati su `financeCache.tsx`, in particolare
   l'aggiornamento sequenziale degli asset con refetch completo ripetuto.
4. Bundle non ottimizzato (xlsx/jspdf statici) e re-render non memoizzati sul
   context principale dell'app.
5. Zero test automatici — qualsiasi fix di Fase 3 partirà da coverage 0%.

Attendo la tua revisione prima di passare alla FASE 2 (triage e prioritizzazione).
