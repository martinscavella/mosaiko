# Mosaiko - AI Coding Instructions

## Project Overview
Mosaiko è una PWA italiana per la gestione personale (finanze, salute, task, apprendimento). Stack: **Next.js 15 (App Router)**, **React 19**, **Supabase** (auth + PostgreSQL), **Tailwind CSS**, **TypeScript**.

## Architecture & Data Flow

### Module Structure
- I moduli risiedono in `src/app/(modules)/{finance,health,learning,tasks}/` usando Route Groups
- Il modulo **Finance** è l'unico attivo; gli altri sono `coming_soon` (vedi [modules.ts](src/app/modules.ts))
- Ogni modulo ha sottopagine: `dashboard/`, `transactions/`, `accounts/`, `assets/`, ecc.

### State Management
- **`AuthProvider`** ([lib/auth.tsx](src/lib/auth.tsx)): gestisce autenticazione Supabase con `createClientComponentClient`
- **`FinanceCacheProvider`** ([lib/financeCache.tsx](src/lib/financeCache.tsx)): cache centralizzata per dati finanziari (~1300 righe)
  - Usa hooks: `useFinanceData()`, `useFinanceCache()`, `useAllTransactions()`
  - Cache con TTL 1 ora, stale time 30 min
  - Invalida cache con `refetch()` dopo mutazioni

### Database Schema
- Schema Supabase in [database/schema.sql](database/schema.sql)
- Tabelle principali: `profiles`, `accounts`, `transactions`, `refunds`, `funds_transfer`, `categories`, `subcategories`, `financial_goals`, `assets`
- Tutti i dati sono isolati per `user_id` con RLS

### API Routes
- `src/app/api/transactions/route.ts`: recupera transazioni asset
- `src/app/api/market-price/route.ts`: prezzi di mercato
- `src/app/api/price-history/route.ts`: storico prezzi

## Key Patterns & Conventions

### Component Patterns
```tsx
// Client components: sempre in cima
'use client'

// Layout pages usano ModuleLayout + ModuleHeader
<ModuleLayout moduleId="finance">
  <ModuleHeader title="Dashboard" />
  {/* content */}
</ModuleLayout>

// Protezione auth: verifica user prima del render
if (!user) return <AuthRequiredMessage />
```

### Supabase Client Usage
```tsx
// Client components
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
const supabase = createClientComponentClient()

// API routes
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
```

### Formatting Utilities
- Usa `formatCurrency()` e `formatPercentage()` da [lib/helpers/format.ts](src/lib/helpers/format.ts)
- Locale italiano: `it-IT`, currency `EUR`

### Transaction Types
I tipi transazione sono stringhe italiane: `'Spesa'`, `'Entrata'`, `'Rimborso'`, `'Bonifico'`, `'Stipendio'`, `'Acquisto'`, ecc. Vedi `TRANSACTION_TYPE_MAP` in [financeImportParsers.ts](src/app/(modules)/finance/import/financeImportParsers.ts).

### UI Components
- Icons: `lucide-react` (primario), `@heroicons/react`
- Animazioni: `framer-motion` + custom Tailwind keyframes
- Charts: `recharts`
- Modals: pattern `isOpen/onClose` (es. `NewTransactionModal`)

### Mobile-First Design
- `BottomMenu` visibile solo mobile (`md:hidden`)
- `Sidebar` visibile solo desktop
- PWA completa con Service Worker in [public/sw.js](public/sw.js)

## Development Workflow

### Commands
```bash
npm run dev          # Dev server con Turbopack
npm run build        # Build produzione
npm run lint:fix     # Fix ESLint issues
npm run type-check   # TypeScript check (noEmit)
```

### Environment
Richiede variabili Supabase:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Code Style
- Commenti e UI in **italiano**
- TypeScript strict (ma `ignoreBuildErrors: true` in next.config)
- Interfacce definite inline o in `types.ts` locali

## Import Bank Data
Il modulo import ([finance/import/](src/app/(modules)/finance/import/)) supporta parser per diverse banche italiane. Logica in `financeImportParsers.ts` con detection automatica del formato CSV/Excel.

## Do NOT
- Non usare `ProtectedRoute` wrapper; verifica `user` direttamente nel componente
- Non creare nuovi context provider senza motivo; estendi `FinanceCacheProvider` se serve
- Non usare `date-fns` per formattazione semplice; usa `Intl.DateTimeFormat` o helpers esistenti
