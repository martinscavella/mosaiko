# Mosaiko - Personal Management PWA

Mosaiko è una Progressive Web App (PWA) italiana per la gestione personale integrata: finanze, salute, task e apprendimento.

**Stack**: Next.js 15 (App Router) | React 19 | Supabase | Tailwind CSS | TypeScript

---

## 📚 Documentazione

Tutta la documentazione è organizzata nella cartella [`docs/`](docs/):

- **[PLAN.md](docs/PLAN.md)** - 📌 Piano operativo corrente: decisioni, task, roadmap, scoping nuovi moduli (aggiornato 2026-07-12)
- **[guides/](docs/guides/)** - Guide tecniche vive:
  - [CACHE_OPTIMIZATION.md](docs/guides/CACHE_OPTIMIZATION.md) - Strategie di cache e ottimizzazione
  - [IMPORT_MAPPINGS.md](docs/guides/IMPORT_MAPPINGS.md) - Mappature import estratti conto per banca
  - [IOS_PWA_GUIDE.md](docs/guides/IOS_PWA_GUIDE.md) - Guida PWA per iOS
- **[history/](docs/history/)** - Documenti storici (fotografie datate, non aggiornate):
  - [AUDIT.md](docs/history/AUDIT.md), [TRIAGE.md](docs/history/TRIAGE.md), [PROGRESS.md](docs/history/PROGRESS.md) - Audit completo luglio 2026
  - [ANALYSIS_REPORT.md](docs/history/ANALYSIS_REPORT.md) - Analisi marzo 2026

In root: **[designtoken.md](designtoken.md)** (design system, referenziato da [claude.md](claude.md)).

---

## 🚀 Quick Start

```bash
# Installare dipendenze
npm install

# Avviare dev server
npm run dev

# Build produzione
npm run build

# Lint + TypeScript check
npm run lint:fix && npm run type-check
```

---

## 📁 Struttura Progetto

```text
mosaiko/
├── src/
│   ├── app/              # Next.js app router
│   │   ├── (modules)/   # Route groups per moduli (finance, health, tasks, learning)
│   │   └── api/         # API routes
│   ├── components/       # React components
│   ├── lib/             # Utilities, hooks, cache, auth
│   └── hooks/           # Custom React hooks
├── database/            # Schema Supabase (PostgreSQL)
├── public/              # Static assets, PWA manifest, Service Worker
├── docs/                # 📚 PLAN.md + guides/ + history/
└── ...
```

---

## 🔧 Moduli Attivi

Attualmente il modulo **Finance** è il solo attivo. Gli altri moduli (Health, Learning, Tasks) sono in stato `coming_soon`.

Vedi [copilot-instructions.md](.github/copilot-instructions.md) per le convenzioni di progetto.

---

## 📞 Contatti / Info

- Repository: [github.com/martinscavella/mosaiko](https://github.com/martinscavella/mosaiko)
- Branch di sviluppo: `master`
