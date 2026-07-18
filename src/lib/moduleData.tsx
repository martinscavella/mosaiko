'use client'

/**
 * Template provider dati per-modulo (T6.3).
 *
 * Factory che genera Provider + hook per i dati di UN modulo, imparando dagli
 * errori di FinanceCacheProvider:
 *
 * - SCOPED, NON GLOBALE: il Provider va montato nel layout del modulo
 *   (`(modules)/<id>/layout.tsx`), non nel layout dell'app. I dati si
 *   scaricano solo quando l'utente entra nel modulo, mai al login.
 * - UNA FETCH, UN TIPO: `fetchData` restituisce un unico oggetto tipizzato con
 *   ciò che serve al modulo; niente cache monolitica multi-entità.
 * - FINESTRE, NON STORICI INTERI: se il modulo ha serie storiche lunghe,
 *   `fetchData` deve limitarsi a una finestra e il modulo espone un load
 *   on-demand (vedi loadFullTransactionHistory in financeCache, T4.1).
 * - Context memoizzato e ref per lo stato corrente (evita i loop di refetch
 *   da dipendenze di useCallback — regressione I4 di financeCache).
 *
 * Uso:
 *   const { Provider: HouseDataProvider, useModuleData: useHouseData } =
 *     createModuleDataProvider<HouseData>({
 *       moduleId: 'house',
 *       fetchData: async (supabase, userId) => ({ ... }),
 *     })
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo, ReactNode } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth'

type SupabaseClient = ReturnType<typeof createSupabaseBrowserClient>

export interface ModuleDataContextValue<TData> {
  data: TData | null
  loading: boolean
  error: string | null
  /** Riscarica i dati del modulo (forza, ignora la cache) */
  refetch: () => Promise<void>
  /** Svuota i dati (es. dopo logout) */
  invalidate: () => void
  /** true se i dati hanno superato staleTime e andrebbero rinfrescati */
  isStale: boolean
}

export interface CreateModuleDataProviderOptions<TData> {
  /** id del modulo (per messaggi di errore) */
  moduleId: string
  /** Scarica TUTTI e SOLI i dati del modulo per l'utente */
  fetchData: (supabase: SupabaseClient, userId: string) => Promise<TData>
  /** Dopo quanto i dati sono considerati vecchi (default 30 min) */
  staleTime?: number
}

export function createModuleDataProvider<TData>({
  moduleId,
  fetchData,
  staleTime = 30 * 60 * 1000,
}: CreateModuleDataProviderOptions<TData>) {
  const Context = createContext<ModuleDataContextValue<TData> | undefined>(undefined)

  function Provider({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    const supabase = createSupabaseBrowserClient()

    const [data, setData] = useState<TData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastFetch, setLastFetch] = useState(0)

    // Ref sincronizzati: fetch legge lo stato corrente senza entrare nelle
    // dipendenze di useCallback (stessa lezione del fix I4 in financeCache)
    const loadingRef = useRef(false)
    const hasDataRef = useRef(false)
    useEffect(() => { hasDataRef.current = data !== null }, [data])

    const load = useCallback(async (force = false) => {
      if (!user) return
      if (loadingRef.current) return
      if (hasDataRef.current && !force) return

      try {
        loadingRef.current = true
        setLoading(true)
        setError(null)
        const fresh = await fetchData(supabase, user.id)
        setData(fresh)
        setLastFetch(Date.now())
      } catch (err) {
        setError(err instanceof Error ? err.message : `Errore nel caricamento dei dati del modulo ${moduleId}`)
      } finally {
        loadingRef.current = false
        setLoading(false)
      }
    }, [user, supabase])

    // Primo caricamento: quando l'utente entra nel modulo (mount del layout)
    useEffect(() => {
      if (user && !hasDataRef.current) {
        load()
      }
    }, [user, load])

    const refetch = useCallback(() => load(true), [load])

    const invalidate = useCallback(() => {
      hasDataRef.current = false
      setData(null)
      setError(null)
      setLastFetch(0)
    }, [])

    const value = useMemo<ModuleDataContextValue<TData>>(() => ({
      data,
      loading,
      error,
      refetch,
      invalidate,
      isStale: lastFetch > 0 && Date.now() - lastFetch > staleTime,
    }), [data, loading, error, refetch, invalidate, lastFetch])

    return <Context.Provider value={value}>{children}</Context.Provider>
  }

  function useModuleData() {
    const context = useContext(Context)
    if (context === undefined) {
      throw new Error(`useModuleData(${moduleId}) va usato dentro il Provider del modulo ${moduleId}`)
    }
    return context
  }

  return { Provider, useModuleData }
}
