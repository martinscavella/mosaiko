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

**Tutti e 5 i Critici (C1-C5) sono risolti.** Passo ora al batch veloce su
Importanti/Minori come concordato.

## Prossimi passi
- Batch veloce sugli Importanti (I1-I13) e Minori, un commit atomico per
  gruppo omogeneo di fix.
- Fase 3bis: ottimizzazioni performance sui file segnalati, con misurazione
  prima/dopo dove possibile.
- Modifiche al DB Supabase live (I9 indici, I10 search_path/RPC, I12 auth
  hardening): da confermare separatamente, infrastruttura di produzione
  condivisa.
- Fase 4: verifica finale, changelog, prossime priorità.
