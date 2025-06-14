'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/lib/auth'

export interface FinanceStats {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  savingsRate: number
  accountsCount: number
  transactionsCount: number
  topCategory: string | null
  goalProgress: number
  currentMonth: string // Nome del mese corrente (es. "Giugno 2025")
  monthYear: string // Anno-mese per riferimento (es. "2025-06")
}

export interface Transaction {
  id: string
  transaction_date: string
  transaction_details: string
  current_amount: number
  transaction_type: string
  account_name?: string
  categories?: {
    name: string
  } | null
}

export interface FinancialGoal {
  id: string
  name: string
  description: string | null
  current_amount: number
  target_amount: number
  currency: string
  target_date: string | null
  color: string | null
}

interface CachedData {
  stats: FinanceStats
  transactions: Transaction[]
  goals: FinancialGoal[]
  lastFetch: number
  isStale: boolean
}

interface FinanceCacheContextType {
  data: CachedData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  invalidateCache: () => void
  isDataStale: boolean
}

const FinanceCacheContext = createContext<FinanceCacheContextType | undefined>(undefined)

const CACHE_DURATION = 60 * 60 * 1000 // 1 ora per dati freschi
const STALE_TIME = 30 * 60 * 1000 // 30 minuti (quando considerare i dati obsoleti ma utilizzabili)

const initialStats: FinanceStats = {
  totalBalance: 0,
  monthlyIncome: 0,
  monthlyExpenses: 0,
  savingsRate: 0,
  accountsCount: 0,
  transactionsCount: 0,
  topCategory: null,
  goalProgress: 0,
  currentMonth: 'Nessun dato',
  monthYear: ''
}

export function FinanceCacheProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CachedData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { user } = useAuth()
  const supabase = createClientComponentClient()

  const isDataExpired = useCallback((timestamp: number) => {
    return Date.now() - timestamp > CACHE_DURATION
  }, [])

  const isDataStale = useCallback((timestamp: number) => {
    return Date.now() - timestamp > STALE_TIME
  }, [])

  const fetchFinanceData = useCallback(async (forceRefresh = false) => {
    if (!user) return

    // Se abbiamo dati in cache e non sono scaduti, e non è un refresh forzato
    if (data && !isDataExpired(data.lastFetch) && !forceRefresh) {
      console.log('📊 Usando dati dalla cache')
      return
    }

    // Se stiamo già caricando, evita chiamate multiple
    if (loading) {
      console.log('📊 Caricamento già in corso, evito duplicazione')
      return
    }

    try {
      setLoading(true)
      setError(null)
      console.log('📊 Caricamento dati finanziari...')

      // Esegui tutte le query in parallelo per ottimizzare le performance
      const [accountsResult, transactionsResult, goalsResult] = await Promise.all([
        // Query accounts
        supabase
          .from('accounts')
          .select('current_balance')
          .eq('user_id', user.id),

        // Query TUTTE le transazioni per calcoli accurati (senza limit)
        supabase
          .from('transactions')
          .select(`
            id,
            transaction_date,
            transaction_details,
            current_amount,
            transaction_type,
            account_name
          `)
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false }),

        // Query obiettivi finanziari
        supabase
          .from('financial_goals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10) // Limitiamo per performance
      ])

      // Controllo errori
      if (accountsResult.error) {
        console.error('❌ Errore nella query accounts:', accountsResult.error)
        throw accountsResult.error
      }
      if (transactionsResult.error) {
        console.error('❌ Errore nella query transactions:', transactionsResult.error)
        throw transactionsResult.error
      }
      if (goalsResult.error) {
        console.error('❌ Errore nella query goals:', goalsResult.error)
        throw goalsResult.error
      }

      const accounts = accountsResult.data || []
      const allTransactions = transactionsResult.data || []
      const goals = goalsResult.data || []

      console.log('📊 Dati recuperati:', {
        accounts: accounts.length,
        transactions: allTransactions.length,
        goals: goals.length
      })

      if (allTransactions.length === 0) {
        console.log('⚠️ Nessuna transazione trovata nel database')
      }

      // Calcola statistiche
      const totalBalance = accounts.reduce((sum, account) => sum + Number(account.current_balance || 0), 0)

      // Trova l'ultimo mese con transazioni
      let lastMonthWithTransactions = '';
      let currentMonth = 'Nessun dato';
      let monthYear = '';
      
      if (allTransactions.length > 0) {
        // Prendi la transazione più recente per determinare l'ultimo mese
        const latestTransaction = allTransactions[0]; // Già ordinato per data decrescente
        const latestDate = new Date(latestTransaction.transaction_date);
        
        // Calcola mese e anno
        monthYear = `${latestDate.getFullYear()}-${String(latestDate.getMonth() + 1).padStart(2, '0')}`;
        
        // Formatta il nome del mese in italiano
        const monthNames = [
          'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
          'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
        ];
        currentMonth = `${monthNames[latestDate.getMonth()]} ${latestDate.getFullYear()}`;
      }

      // Filtra transazioni per l'ultimo mese disponibile
      const monthlyFilteredTransactions = monthYear ? allTransactions.filter((transaction: any) => {
        const transactionDate = new Date(transaction.transaction_date);
        const transactionMonthYear = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
        return transactionMonthYear === monthYear;
      }) : [];

      let monthlyIncome = 0
      let monthlyExpenses = 0
      const categoryAmounts: { [key: string]: number } = {}

      monthlyFilteredTransactions.forEach((transaction: any) => {
        const amount = Number(transaction.current_amount || 0)
        
        if (amount > 0) {
          monthlyIncome += Math.abs(amount)
        } else {
          monthlyExpenses += Math.abs(amount)
        }

        const categoryName = transaction.categories?.name || 'Altro'
        categoryAmounts[categoryName] = (categoryAmounts[categoryName] || 0) + Math.abs(amount)
      })

      const topCategory = Object.keys(categoryAmounts).length > 0 
        ? Object.keys(categoryAmounts).reduce((a, b) => categoryAmounts[a] > categoryAmounts[b] ? a : b)
        : null

      const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0

      // Query count transazioni totali (ottimizzata)
      const { count: transactionsCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // Calcola progresso obiettivi
      let goalProgress = 0
      if (goals.length > 0) {
        const totalTargetAmount = goals.reduce((sum, goal) => sum + Number(goal.target_amount || 0), 0)
        const totalCurrentAmount = goals.reduce((sum, goal) => sum + Number(goal.current_amount || 0), 0)
        goalProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0
      }

      const stats: FinanceStats = {
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        savingsRate: Math.max(0, Math.min(100, savingsRate)),
        accountsCount: accounts.length,
        transactionsCount: transactionsCount || 0,
        topCategory,
        goalProgress: Math.max(0, Math.min(100, goalProgress)),
        currentMonth,
        monthYear
      }

      // Processa transazioni per il formato corretto (solo le più recenti per la UI)
      const processedTransactions: Transaction[] = allTransactions.slice(0, 20).map((item: any) => ({
        ...item,
        categories: null // Temporaneamente non includiamo le categorie
      }))

      // Salva in cache
      const newCacheData: CachedData = {
        stats,
        transactions: processedTransactions,
        goals: goals as FinancialGoal[],
        lastFetch: Date.now(),
        isStale: false
      }

      setData(newCacheData)
      console.log('📊 Cache aggiornata con successo')

    } catch (err) {
      console.error('❌ Errore nel recupero dei dati finanziari:', err)
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }, [user, supabase, data, loading, isDataExpired])

  // Effetto per il caricamento iniziale
  useEffect(() => {
    if (user && !data) {
      fetchFinanceData()
    }
  }, [user, data, fetchFinanceData])

  // Effetto per verificare se i dati sono diventati stale
  useEffect(() => {
    if (!data) return

    const interval = setInterval(() => {
      if (isDataStale(data.lastFetch) && !data.isStale) {
        setData(prev => prev ? { ...prev, isStale: true } : null)
        console.log('📊 I dati sono diventati stale')
      }
    }, 5 * 60 * 1000) // Controlla ogni 5 minuti

    return () => clearInterval(interval)
  }, [data, isDataStale])

  const refetch = useCallback(async () => {
    await fetchFinanceData(true)
  }, [fetchFinanceData])

  const invalidateCache = useCallback(() => {
    console.log('🗑️ Cache invalidata')
    setData(null)
    setError(null)
  }, [])

  const contextValue: FinanceCacheContextType = {
    data,
    loading,
    error,
    refetch,
    invalidateCache,
    isDataStale: data ? isDataStale(data.lastFetch) : false
  }

  return (
    <FinanceCacheContext.Provider value={contextValue}>
      {children}
    </FinanceCacheContext.Provider>
  )
}

export function useFinanceCache() {
  const context = useContext(FinanceCacheContext)
  if (context === undefined) {
    throw new Error('useFinanceCache must be used within a FinanceCacheProvider')
  }
  return context
}

// Hook semplificato per retrocompatibilità
export function useFinanceData() {
  const { data, loading, error, refetch } = useFinanceCache()
  
  return {
    stats: data?.stats || initialStats,
    loading,
    error,
    refetch
  }
}

// Hook per transazioni
export function useTransactions(limit = 10) {
  const { data, loading, error } = useFinanceCache()
  
  return {
    transactions: data?.transactions.slice(0, limit) || [],
    loading,
    error
  }
}

// Hook per obiettivi
export function useFinancialGoals(limit = 10) {
  const { data, loading, error } = useFinanceCache()
  
  return {
    goals: data?.goals.slice(0, limit) || [],
    loading,
    error
  }
}
