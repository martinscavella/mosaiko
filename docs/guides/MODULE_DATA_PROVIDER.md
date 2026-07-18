# Provider dati per-modulo (T6.3)

Template per il caricamento dati dei nuovi moduli (House, Grocery, Tasks,
Health, Learning). Implementazione: `src/lib/moduleData.tsx`
(`createModuleDataProvider`).

## Regole (lezioni da FinanceCacheProvider)

1. **Scoped, non globale.** Il Provider del modulo va montato nel layout del
   modulo (`src/app/(modules)/<id>/layout.tsx`), mai nel layout dell'app.
   Così i dati si scaricano solo quando l'utente entra nel modulo.
   *(Errore storico: FinanceCacheProvider wrappa l'intera app e scaricava
   tutto lo storico al login.)*
2. **Una fetch, un tipo.** `fetchData` restituisce un unico oggetto tipizzato
   con tutto ciò che serve al modulo. Niente cache monolitica che mescola
   entità di moduli diversi.
3. **Finestre, non storici interi.** Se il modulo accumula serie storiche
   lunghe (movimenti, misurazioni…), `fetchData` carica una finestra recente
   e il modulo espone un caricamento on-demand del resto (pattern
   `loadFullTransactionHistory` di financeCache, T4.1).
4. **Join per id, mai per nome.** (T3.8)
5. **Context memoizzato + ref per lo stato.** Il factory lo fa già: non
   aggiungere dipendenze di stato alle useCallback di fetch (regressione I4).

## Uso

```tsx
// src/app/(modules)/house/houseData.tsx
import { createModuleDataProvider } from '@/lib/moduleData'

interface HouseData {
  properties: Property[]
  bills: Bill[]
  maintenances: Maintenance[]
}

export const { Provider: HouseDataProvider, useModuleData: useHouseData } =
  createModuleDataProvider<HouseData>({
    moduleId: 'house',
    fetchData: async (supabase, userId) => {
      const [properties, bills, maintenances] = await Promise.all([
        supabase.from('house_properties').select('*').eq('user_id', userId),
        supabase.from('house_bills').select('*').eq('user_id', userId),
        supabase.from('house_maintenances').select('*').eq('user_id', userId),
      ])
      // gestire gli errori, poi:
      return {
        properties: properties.data ?? [],
        bills: bills.data ?? [],
        maintenances: maintenances.data ?? [],
      }
    },
  })
```

```tsx
// src/app/(modules)/house/layout.tsx
export default function HouseLayout({ children }: { children: React.ReactNode }) {
  return <HouseDataProvider>{children}</HouseDataProvider>
}
```

Nelle pagine: `const { data, loading, refetch } = useHouseData()`.

Dopo ogni scrittura (insert/update/delete) chiamare `refetch()`; per dati
incrociati con Finance usare le tabelle di link di T6.0, senza importare la
cache di Finance nel modulo.
