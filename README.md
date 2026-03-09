# Mosaiko - Personal Management PWA

Mosaiko è una Progressive Web App (PWA) italiana per la gestione personale integrata: finanze, salute, task e apprendimento.

**Stack**: Next.js 15 (App Router) | React 19 | Supabase | Tailwind CSS | TypeScript

---

## 📚 Documentazione

Tutta la documentazione è organizzata nella cartella [`docs/`](docs/):

- **[ANALYSIS_REPORT.md](docs/ANALYSIS_REPORT.md)** - Rapporto completo di analisi (38 issues identificati)
- **[README.md](docs/README.md)** - Documentazione del progetto
- **[CACHE_OPTIMIZATION.md](docs/CACHE_OPTIMIZATION.md)** - Strategie di cache e ottimizzazione
- **[FONT_SETUP.md](docs/FONT_SETUP.md)** - Setup e gestione font
- **[IMPORT_MAPPINGS.md](docs/IMPORT_MAPPINGS.md)** - Path mappings e import structure
- **[IOS_PWA_GUIDE.md](docs/IOS_PWA_GUIDE.md)** - Guida PWA per iOS

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

```
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
├── docs/                # 📚 Documentazione
└── ...
```

---

## 🔧 Moduli Attivi

Attualmente il modulo **Finance** è il solo attivo. Gli altri moduli (Health, Learning, Tasks) sono in stato `coming_soon`.

Vedi [copilot-instructions.md](.github/copilot-instructions.md) per le convenzioni di progetto.

---

## 📞 Contatti / Info

- Repository: [github.com/martinscavella/mosaiko](https://github.com/martinscavella/mosaiko)
- Branch attuale: `feature/general_optimization` → `fix/code-cleanup-analysis`
