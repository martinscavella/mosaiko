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
- **C5 (nuovo)**: CVE critica in `jspdf`, fix richiede major bump — **in attesa
  di conferma utente** prima di applicarlo (vedi TRIAGE.md).
- **C2 (console.log sensibili)**: non ancora affrontato — prossimo step,
  richiede conferma prima di applicare.

## Prossimi passi
- Confermare con l'utente: bump `jspdf` a 4.2.1 (C5) e procedere con C2.
- Poi batch veloce sugli Importanti (I1-I13) e Minori, un commit atomico per
  gruppo omogeneo di fix.
- Fase 3bis: ottimizzazioni performance sui file segnalati, con misurazione
  prima/dopo dove possibile.
- Modifiche al DB Supabase live (I9 indici, I10 search_path/RPC, I12 auth
  hardening): da confermare separatamente, infrastruttura di produzione
  condivisa.
- Fase 4: verifica finale, changelog, prossime priorità.
