> **Documento storico** — spostato da root a `docs/history/` il 2026-07-12. Fotografa lo stato del progetto alla data indicata nel documento; per lo stato corrente e il piano operativo vedi [docs/PLAN.md](../PLAN.md).

# 📋 Analisi Completa Mosaiko - Rapporto di Optimizzazione

**Data**: 9 Marzo 2026  
**Branch**: `fix/code-cleanup-analysis`  
**Totale Issues**: 38 (10 Critiche/Alta, 10 Medie, 18 Basse)

---

## 🔴 PROBLEMI CRITICI E ALTA SEVERITÀ (13 Issues)

### 1. **Cache Infinite Loop Risk** - Criticalità: 🔴 CRITICA
- **File**: [src/lib/financeCache.tsx](../../src/lib/financeCache.tsx#L338)
- **Problema**: `fetchFinanceData` ha in dependencies `[user, supabase, data, loading, isDataExpired]` - includere `data` e `loading` nel dependency array crea un loop infinito
- **Impatto**: Refetch continuo, batterie, CPU al 100%, data usage
- **Fix**: Separare in 2 `useCallback`/`useEffect` - uno per le dipendenze esterne (user, supabase), uno per l'invalidazione manuale
- **Priorità**: FASE 1 - Fix immediatamente

### 2. **Data Consistency - Monthly Filter Computation** - Criticalità: 🔴 ALTA
- **File**: [src/lib/financeCache.tsx](../../src/lib/financeCache.tsx#L250-L275)
- **Problema**: `monthlyFilteredTransactions` calcolato solo se `monthYear` è set, ma `currentMonth` può essere 'Nessun dato' mentre `monthYear = ''` crea inconsistenza
- **Impatto**: Statistiche mensili sbagliate quando nessun mese è selezionato
- **Fix**: Aggiungere early return e validation - se `monthYear = ''`, impostare stats a zero/default
- **Priorità**: FASE 1

### 3. **Type Safety - Double Cast Pattern** - Criticalità: 🔴 ALTA
- **File**: [src/lib/financeCache.tsx](../../src/lib/financeCache.tsx#L215)
- **Problema**: `(transactionsBatch.data as unknown as Transaction[])` - pattern double cast pericoloso (unknown pattern)
- **Impatto**: Zero type checking, possibili runtime errors con dati malformati
- **Fix**: Creare type guard function e validare invece di castare
- **Priorità**: FASE 1

### 4. **Type Safety - Unnecessary Map with Cast** - Criticalità: 🔴 ALTA
- **File**: [src/lib/financeCache.tsx](../../src/lib/financeCache.tsx#L226)
- **Problema**: `const assets = rawAssets.map((asset: RawAssetData) => return asset as Asset)` - map inutile che casta al tipo stesso
- **Impatto**: Performance: loop su ogni asset senza trasformazione reale
- **Fix**: Verificare se `RawAssetData === Asset`, se sì rimuovere map; altrimenti definire vera trasformazione
- **Priorità**: FASE 1

### 5. **Error Handling Missing - Modal Refetch** - Criticalità: 🔴 ALTA
- **File**: [src/components/ui/NewTransactionModal.tsx](../../src/components/ui/NewTransactionModal.tsx#L95-L125)
- **Problema**: 
  ```tsx
  await Promise.all([refetch(), refetchFinanceCache()])
  onClose() // Senza error handling!
  ```
  Se refetch fallisce, modal chiude lo stesso - utente non sa se transazione è stata salvata
- **Impatto**: Data loss perception, UX confusa quando API fallisce
- **Fix**: Aggiungere try-catch con error toast, non chiudere modal se refetch fallisce
- **Priorità**: FASE 1

### 6. **Duplicated Function - isInDateRange** - Criticalità: 🔴 ALTA
- **File**: [src/app/(modules)/finance/transactions/page.tsx](../../src/app/(modules)/finance/transactions/page.tsx#L45-L68) E [src/components/ui/TransactionsTable.tsx](../../src/components/ui/TransactionsTable.tsx#L197-L218)
- **Problema**: Funzione `isInDateRange()` identica in 2 posti (linee ~20-30 copiate)
- **Impatto**: Maintenance nightmare, bug fix duplicato, logica diverge col tempo
- **Fix**: Estrarre in `src/lib/helpers/dateRange.ts` e importare ovunque
- **Priorità**: FASE 1 (short win)

### 7. **Duplicated Filtering Logic** - Criticalità: 🔴 ALTA
- **File**: [src/app/(modules)/finance/transactions/page.tsx](../../src/app/(modules)/finance/transactions/page.tsx#L45-L150)
- **Problema**: Logica di filtro (filter by type, category, subcategory, date range) duplicata da [TransactionsTable.tsx](../../src/components/ui/TransactionsTable.tsx#L240-L310)
- **Impatto**: 100+ righe di codice duplicato, discrepanze nei filtri tra pagina e tabella
- **Fix**: Creare hook `useTransactionFilters()` che racchiude tutta la logica, usare sia in page che in table
- **Priorità**: FASE 2

### 8. **Performance - Unmemoized Loop Computation** - Criticalità: 🔴 ALTA
- **File**: [src/app/(modules)/finance/assets/page.tsx](../../src/app/(modules)/finance/assets/page.tsx#L189-L222)
- **Problema**: `getAssetPurchaseData()` chiamata per OGNI asset in render loop senza memoization
- **Impatto**: Se 10 asset → 10 calcoli identici ad ogni render (no caching)
- **Fix**: Wrappare con `useCallback` + memoizzare con `useMemo`
- **Priorità**: FASE 3

### 9. **React Hook Rules - useMemo in Conditional** - Criticalità: 🔴 ALTA
- **File**: [src/lib/financeCache.tsx](../../src/lib/financeCache.tsx#L475-L498) - `useAssetStats()`
- **Problema**: `useMemo` condizionato (used dopo calcoli condizionali), viola Hook Rules
- **Impatto**: Hook order inconsistente, possibile "Rules of Hooks" warning in development
- **Fix**: Eseguire tutti gli hook al top dell'hook, move useMemo/useCallback/useState all'inizio
- **Priorità**: FASE 2

### 10. **Performance - Incomplete Dependency Array** - Criticalità: 🔴 ALTA
- **File**: [src/components/ui/TransactionsTable.tsx](../../src/components/ui/TransactionsTable.tsx#L240-L310)
- **Problema**: `useMemo` per filtering ha dipendenze incomplete - mancano alcuni filtri nella array
- **Impatto**: Stale data in table, filtri non si updatano quando dovrebbero
- **Fix**: Aggiungere TUTTI i filtri e dati alle dipendenze (internalSearchTerm, internalCategory, internalSubcategory, internalTransactionType, dateRange)
- **Priorità**: FASE 2

### 11. **Import Duplication - formatCurrency/Percentage** - Criticalità: 🔴 MEDIA-ALTA
- **File**: [src/app/(modules)/finance/reports/page.tsx](../../src/app/(modules)/finance/reports/page.tsx#L245) + [src/components/ui/AssetPerformanceChart.tsx](../../src/components/ui/AssetPerformanceChart.tsx#L386)
- **Problema**: `formatCurrency()` e `formatPercentage()` ridefinite localmente invece di importare da `@/lib/helpers/format`
- **Impatto**: Code duplication, format changes richiedono fix in 2+ posti
- **Fix**: Cercare tutti i redefinition e rimpiazzare con import da `src/lib/helpers/format.ts`
- **Priorità**: FASE 2

### 12. **Data Consistency - Missing Account Validation** - Criticalità: 🔴 MEDIA-ALTA
- **File**: [src/app/(modules)/finance/import/page.tsx](../../src/app/(modules)/finance/import/page.tsx#L55+)
- **Problema**: `userAccounts` caricato ma usato in `detectAccountFromFilename()` senza validazione di existence
- **Impatto**: Runtime error se userAccounts è vuoto
- **Fix**: Aggiungere guard `if (!userAccounts?.length) return null` all'inizio della funzione
- **Priorità**: FASE 2

### 13. **Cache Invalidation - Missing Cleanup** - Criticalità: 🔴 MEDIA-ALTA
- **File**: [src/lib/financeCache.tsx](../../src/lib/financeCache.tsx#L350-L360)
- **Problema**: Stale time interval (5 min) non cancellato se `data` diventa null durante interval
- **Impatto**: Memory leak, interval continua a girare senza dati
- **Fix**: Aggiungere condition: `if (!data) clearInterval(staleInterval)` cleanup function
- **Priorità**: FASE 2

---

## 🟡 PROBLEMI MEDIA SEVERITÀ (10 Issues)

### Console/Debug Logging (7 locations)
- **Files**: auth.tsx, transactions/route.ts, market-price/route.ts, assets/page.tsx, import/page.tsx, reports/page.tsx, PWAManager.tsx
- **Fix**: Rimuovere console.log in prod (o wrappare con `if (process.env.NODE_ENV === 'development')`)
- **Priorità**: FASE 2

### Unused Imports / Dead Code (3 issues)
- **useAnimation.ts**: Hook file esiste ma mai importato
- **useAssetPurchaseTransactions()**: Hook definito in financeCache ma mai usato
- **Fix**: Delete o deprecare opportunamente
- **Priorità**: FASE 3

### Pattern Violations
- **ProtectedRoute.tsx**: Componente wrapper deprecated, usato solo in profile/page.tsx
- **Fix**: Inline `if (!user) return <AuthRequiredMessage />` in profile page, delete wrapper
- **Priorità**: FASE 3

---

## 🟢 PROBLEMI BASSA SEVERITÀ (15 Issues)

- Console.log in PWA Manager (ok, aggiungere NODE_ENV guard)
- Type placement issues (interfacce al fine file)
- Missing comments su TODO code
- formatCurrency ridefinito localmente

---

## 📊 RIEPILOGO STATISTICO

| Categoria | Count | Avg Severity |
|-----------|-------|-------------|
| Cache/State | 4 | 🔴 Critica/Alta |
| Type Safety | 5 | 🔴 Alta |
| Duplicated Code | 4 | 🔴 Alta |
| Performance | 4 | 🔴 Alta |
| Error Handling | 1 | 🔴 Alta |
| Console/Debug | 7 | 🟡 Bassa |
| Pattern Violations | 2 | 🟡 Medio |
| API Validation | 2 | 🟡 Medio |
| Incomplete Code | 2 | 🟡 Medio |
| Unused Code | 3 | 🟢 Bassa |
| **TOTALE** | **38** | **Average: 🟡 Media** |

---

## 🎯 PIANO DI FIX

### **FASE 1** (BLOCANTE - Fix immediatamente)
1. ✅ Infinite loop in `fetchFinanceData` - rimuovere `data, loading` da dependencies
2. ✅ Type guard function per validation (invece di `as unknown as`)
3. ✅ Remove unnecessary `.map()` cast in assets
4. ✅ Add error handling in NewTransactionModal refetch
5. ✅ Extract `isInDateRange()` to shared utility
6. ✅ Fix monthly stats computation logic

**Tempo stimato**: 2-3 ore

### **FASE 2** (URGENTE - Prossimo batch)
7. Remove all console.log (wrap with NODE_ENV check)
8. Extract filtering logic in `useTransactionFilters()` hook
9. Consolidate `formatCurrency/Percentage` imports
10. Fix TransactionsTable dependency array
11. Fix useAssetStats hook ordering
12. Add validation to import page account detection

**Tempo stimato**: 4-5 ore

### **FASE 3** (IMPORTANTE - Non-blocker)
13. Memoize `getAssetPurchaseData()` in assets page loop
14. Optimize `advancedStats` useMemo in reports
15. Delete ProtectedRoute wrapper, inline auth check in profile
16. Delete unused hooks and components

**Tempo stimato**: 2-3 ore

### **FASE 4** (NICE-TO-HAVE - Technical debt)
17. Setup centralized logging middleware
18. Add treeshake detection to build
19. Type safety audit (fix remaining `as any`)

**Tempo totale stimato**: 10-14 ore

---

## 📝 NOTES

- Questo rapporto è stato generato da analisi automatica + manual review
- Priorità basate su impact × likelihood × effort
- Branch `fix/code-cleanup-analysis` pronto per le correzioni
- Si consiglia di fare i fix per FASE in ordine (non out-of-order) per evitare conflitti di logica