'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useMemo } from 'react'
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
  is_refunded?: boolean
  account_name?: string
  asset_id?: string | null
  asset_quantity?: number | null
  accounts?: {
    type: string
  } | null
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

export interface Account {
  id: string
  name: string
  type: string
  current_balance: number
  initial_balance: number
  currency: string
  color: string
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  name: string
  type: string
  quantity: number
  value: number
  currency: string
  account_id: string | null
  created_at: string
  updated_at: string
  user_id: string
  symbol?: string | null 
}

export interface AssetValuation {
  id: string
  asset_id: string
  valuation_date: string
  value: number
  source: string
  confidence_score: number | null
  created_at: string
}

interface CachedData {
  stats: FinanceStats
  transactions: Transaction[]
  goals: FinancialGoal[]
  accounts: Account[]
  assets: Asset[]
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
      const [accountsResult, transactionsResult, goalsResult, assetsResult] = await Promise.all([
        // Query accounts - recupera tutti i dati degli account
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),        // Query TUTTE le transazioni per calcoli accurati (senza limit)
        supabase
          .from('transactions')
          .select(`
            id,
            transaction_date,
            transaction_details,
            current_amount,
            transaction_type,
            is_refunded,
            account_name,
            asset_id,
            accounts(type),
            categories(name)
          `)
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false }),

        // Query obiettivi finanziari
        supabase
          .from('financial_goals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10), // Limitiamo per performance

        // Query assets
        supabase
          .from('assets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
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
      if (assetsResult.error) {
        console.error('❌ Errore nella query assets:', assetsResult.error)
        throw assetsResult.error
      }

      const accounts = accountsResult.data || []
      const allTransactions = (transactionsResult.data as unknown as TransactionWithRelations[]) || []
      const goals = goalsResult.data || []
      const rawAssets = (assetsResult.data as RawAssetData[]) || []

      console.log('📊 Dati recuperati:', {
        accounts: accounts.length,
        transactions: allTransactions.length,
        goals: goals.length,
        assets: rawAssets.length
      })      // Debug per verificare se asset_id è presente nelle transazioni
      if (allTransactions.length > 0) {
        console.log('🔍 Sample transaction with all fields:', allTransactions[0])
        const transactionsWithAssetId = allTransactions.filter((t: TransactionWithRelations) => t.asset_id)
        console.log('🔍 Transactions with asset_id:', transactionsWithAssetId.length)
        if (transactionsWithAssetId.length > 0) {
          console.log('🔍 First transaction with asset_id:', transactionsWithAssetId[0])
          console.log('🔍 All asset_ids found:', [...new Set(transactionsWithAssetId.map(t => t.asset_id))])
        }
      }

      if (allTransactions.length === 0) {
        console.log('⚠️ Nessuna transazione trovata nel database')
      } else {
        // Debug: mostra tutti i tipi di account e categorie presenti
        const accountTypes = [...new Set(allTransactions.map((t: TransactionWithRelations) => t.accounts?.type).filter(Boolean))]
        const categoryNames = [...new Set(allTransactions.map((t: TransactionWithRelations) => t.categories?.name).filter(Boolean))]
        
        console.log('📋 Tipi di account presenti:', accountTypes)
        console.log('📋 Categorie presenti:', categoryNames)
      }

      // Filtra transazioni di acquisto asset (saving_account + categoria "ASSET & INVESTIMENTI")
      const assetPurchaseTransactions = allTransactions.filter((transaction: TransactionWithRelations) => {
        return transaction.asset_id != null
      })

      console.log('💎 Transazioni di acquisto asset trovate:', assetPurchaseTransactions.length)
      console.log('💎 Dettagli transazioni asset:', assetPurchaseTransactions.map(t => ({
        id: t.id,
        details: t.transaction_details,
        amount: t.current_amount,
        date: t.transaction_date
      })))      // Arricchisci gli asset con i dati delle transazioni correlate
      const assets = rawAssets.map((asset: RawAssetData) => {
        return asset as Asset
      })

      // Calcola statistiche
      // Calcola il valore totale degli asset
      const totalAssetsValue = assets.reduce((sum, asset) => sum + Number(asset.value || 0), 0)

      // Aggiorna il totalBalance includendo gli asset
      const totalBalance = accounts.reduce((sum, account) => sum + Number(account.current_balance || 0), 0) + totalAssetsValue

      // Trova l'ultimo mese con transazioni
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
      const monthlyFilteredTransactions = monthYear ? allTransactions.filter((transaction: TransactionWithRelations) => {
        const transactionDate = new Date(transaction.transaction_date);
        const transactionMonthYear = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
        return transactionMonthYear === monthYear;
      }) : [];

      let monthlyIncome = 0
      let monthlyExpenses = 0
      const categoryAmounts: CategoryAmounts = {}

      monthlyFilteredTransactions.forEach((transaction: TransactionWithRelations) => {
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
      const processedTransactions: Transaction[] = allTransactions.slice(0, 20).map((item: TransactionWithRelations) => ({
        ...item,
        accounts: item.accounts,
        categories: item.categories
      }))

      // Salva in cache
      const newCacheData: CachedData = {
        stats,
        transactions: processedTransactions,
        goals: goals as FinancialGoal[],
        accounts: accounts as Account[],
        assets: assets as Asset[],
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

// Hook per account
export function useAccounts() {
  const { data, loading, error, refetch } = useFinanceCache()
  
  return {
    accounts: data?.accounts || [],
    loading,
    error,
    refetch
  }
}

// Hook per asset
export function useAssets() {
  const { data, loading, error, refetch } = useFinanceCache()
  
  return {
    assets: data?.assets || [],
    loading,
    error,
    refetch
  }
}

// Hook per statistiche asset
export function useAssetStats() {
  const { data } = useFinanceCache()
  
  const assets = data?.assets || []
  
  const totalValue = assets.reduce((sum, asset) => sum + Number(asset.value || 0), 0)
  // Dato che non abbiamo purchase_price nel db, usiamo il valore attuale per i calcoli
  const totalCost = totalValue // Temporaneo - andrebbe calcolato dalle transazioni
  const totalPerformance = 0 // Temporaneo - richiederebbe dati storici
  
  // Raggruppa per tipo
  const assetsByType = assets.reduce((acc, asset) => {
    const type = asset.type || 'other'
    if (!acc[type]) {
      acc[type] = {
        count: 0,
        totalValue: 0,
        totalCost: 0
      }
    }
    acc[type].count++
    acc[type].totalValue += Number(asset.value || 0)
    acc[type].totalCost += Number(asset.value || 0) // Temporaneo
    return acc
  }, {} as Record<string, { count: number; totalValue: number; totalCost: number }>)
  
  return {
    totalValue,
    totalCost,
    totalPerformance,
    assetCount: assets.length,
    assetsByType,
    topPerformingAsset: assets.length > 0 ? assets[0] : null // Temporaneo - senza purchase_price non possiamo calcolare performance
  }
}

// Hook per asset con valutazione automatica - RIMOSSO: campo non presente nel database
// export function useAutoValuationAssets() {
//   ...
// }

// Hook per transazioni di acquisto asset
export function useAssetPurchaseTransactions() {
  const { data } = useFinanceCache()
  
  const allTransactions = data?.transactions || []
  const assetPurchaseTransactions = allTransactions.filter(transaction => {
    const accountType = transaction.accounts?.type
    const categoryName = transaction.categories?.name
    return accountType === 'saving_account' && categoryName === 'ASSET & INVESTIMENTI'
  })
  
  return {
    assetPurchaseTransactions,
    count: assetPurchaseTransactions.length,
    totalSpent: assetPurchaseTransactions.reduce((sum, transaction) => 
      sum + Math.abs(transaction.current_amount), 0
    )
  }
}

// Hook per recuperare le transazioni correlate a un asset
export function useAssetTransactions(assetId: string | null) {
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  const [assetTransactions, setAssetTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAssetTransactions = useCallback(async () => {
    if (!user || !assetId) {
      setAssetTransactions([])
      return
    }    setLoading(true)
    setError(null)

    try {
      const { data, error: queryError } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('asset_id', assetId)
        .order('transaction_date', { ascending: false })

      if (queryError) {
        console.error('Error fetching asset transactions:', queryError)
        throw queryError
      }

      setAssetTransactions(data || [])
    } catch (err) {
      console.error('Error in fetchAssetTransactions:', err)
      setError(err instanceof Error ? err.message : 'Errore nel caricamento delle transazioni')
      setAssetTransactions([])
    } finally {
      setLoading(false)
    }
  }, [user, assetId, supabase])

  useEffect(() => {
    fetchAssetTransactions()
  }, [fetchAssetTransactions])

  const totalSpentOnAsset = useMemo(() => {
    return assetTransactions.reduce((sum, transaction) => {
      // Considera solo le transazioni in uscita (negative) come spese per l'asset
      return transaction.current_amount < 0 ? sum + Math.abs(transaction.current_amount) : sum
    }, 0)
  }, [assetTransactions])

  const totalReceivedFromAsset = useMemo(() => {
    return assetTransactions.reduce((sum, transaction) => {
      // Considera solo le transazioni in entrata (positive) come ricavi dall'asset
      return transaction.current_amount > 0 ? sum + transaction.current_amount : sum
    }, 0)
  }, [assetTransactions])

  return {
    assetTransactions,
    totalSpentOnAsset,
    totalReceivedFromAsset,
    transactionCount: assetTransactions.length,
    loading,
    error,
    refetch: fetchAssetTransactions
  }
}

// Hook per asset CRUD operations
export function useAssetOperations() {
  const { refetch } = useFinanceCache()
  const { user } = useAuth()
  const supabase = createClientComponentClient()

  const createAsset = useCallback(async (assetData: Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('assets')
      .insert([{
        ...assetData,
        user_id: user.id
      }])
      .select()
      .single()

    if (error) throw error

    await refetch()
    return data
  }, [user, supabase, refetch])

  const updateAsset = useCallback(async (id: string, updates: Partial<Asset>) => {
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('assets')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    await refetch()
    return data
  }, [user, supabase, refetch])

  const deleteAsset = useCallback(async (id: string) => {
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    await refetch()
  }, [user, supabase, refetch])

  const updateAssetValue = useCallback(async (id: string, newValue: number) => {
    if (!user) throw new Error('User not authenticated')

    // Aggiorna il valore dell'asset
    const { error: assetError } = await supabase
      .from('assets')
      .update({
        value: newValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (assetError) throw assetError

    // Nota: rimozione della creazione del record di valutazione 
    // dato che non abbiamo la tabella asset_valuations nel database

    await refetch()
  }, [user, supabase, refetch])

  const linkAssetToTransaction = useCallback(async (assetId: string, transactionId: string) => {
    if (!user) throw new Error('User not authenticated')

    console.log('🔗 linkAssetToTransaction called:', { assetId, transactionId, userId: user.id })

    // Aggiorna la transazione con l'asset_id
    const { error } = await supabase
      .from('transactions')
      .update({
        asset_id: assetId,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .eq('user_id', user.id)

    if (error) {
      console.error('❌ Error linking transaction to asset:', error)
      throw error
    }    console.log('✅ Transaction successfully linked to asset in database')
    
    // Refresh cache data after linking
    await refetch()
    console.log('🔄 Cache refreshed after linking')
  }, [user, supabase, refetch])

  const unlinkAssetFromTransaction = useCallback(async (transactionId: string) => {
    if (!user) throw new Error('User not authenticated')

    // Rimuove l'asset_id dalla transazione
    const { error } = await supabase
      .from('transactions')
      .update({
        asset_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .eq('user_id', user.id)

    if (error) throw error

    await refetch()
  }, [user, supabase, refetch])
  const updateAssetFromTransactions = useCallback(async (assetId: string) => {
    if (!user) throw new Error('User not authenticated')

    console.log('📊 Aggiornamento asset da transazioni:', assetId)

    try {
      // 0. Verifica che l'asset esista
      const { data: assetExists, error: assetCheckError } = await supabase
        .from('assets')
        .select('id, name')
        .eq('id', assetId)
        .eq('user_id', user.id)
        .single()

      if (assetCheckError || !assetExists) {
        console.error('❌ Asset non trovato:', assetCheckError)
        throw new Error(`Asset con ID ${assetId} non trovato`)
      }

      console.log(`📦 Asset trovato: ${assetExists.name}`)

      // 1. Recupera tutte le transazioni collegate all'asset
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('asset_id', assetId)
        .not('asset_quantity', 'is', null)
        .order('transaction_date', { ascending: true })

      if (transactionsError) {
        console.error('❌ Errore nel recupero transazioni:', transactionsError)
        throw transactionsError
      }

      if (!transactions || transactions.length === 0) {
        console.log('⚠️ Nessuna transazione trovata per l\'asset:', assetId)
        return { message: 'Nessuna transazione trovata per questo asset' }
      }

      console.log(`📈 Trovate ${transactions.length} transazioni per l'asset`)      // 2. Calcola quantity e value totali dalle transazioni
      let totalQuantity = 0
      let totalCostSpent = 0
      let totalQuantityBought = 0

      transactions.forEach((transaction, index) => {
        const quantity = Math.abs(transaction.asset_quantity || 0)
        const amount = Math.abs(transaction.current_amount || 0)
        
        // Validazione dei dati
        if (quantity === 0) {
          console.warn(`⚠️ Transazione ${index + 1} ignorata: quantity è 0`, transaction.id)
          return
        }
        
        if (amount === 0) {
          console.warn(`⚠️ Transazione ${index + 1} ignorata: amount è 0`, transaction.id)
          return
        }
        
        const unitPrice = amount / quantity
        
        // Verifica che unitPrice sia valido
        if (!isFinite(unitPrice) || unitPrice <= 0) {
          console.warn(`⚠️ Transazione ${index + 1} ignorata: prezzo unitario non valido (${unitPrice})`, transaction.id)
          return
        }
        
        if ((transaction.asset_quantity || 0) > 0) {
          // Acquisto: aggiungi alla quantità totale
          totalQuantity += quantity
          totalCostSpent += quantity * unitPrice
          totalQuantityBought += quantity
          console.log(`🟢 Acquisto: +${quantity} a ${unitPrice.toFixed(2)}€/unità`)
        } else {
          // Vendita: sottrai dalla quantità totale
          totalQuantity -= quantity
          console.log(`🔴 Vendita: -${quantity} a ${unitPrice.toFixed(2)}€/unità`)
        }      })

      // Verifica se abbiamo processato almeno una transazione valida
      if (totalQuantityBought === 0 && totalQuantity === 0) {
        console.log('⚠️ Nessuna transazione valida trovata per calcolare i valori')
        return { 
          success: true,
          message: 'Nessuna transazione valida trovata per questo asset',
          calculations: {
            transactionsProcessed: 0,
            totalQuantity: 0,
            avgPurchasePrice: 0,
            currentValue: 0
          }
        }
      }

      // 3. Calcola il prezzo medio di acquisto e il valore attuale dell'asset
      const avgPurchasePrice = totalQuantityBought > 0 ? totalCostSpent / totalQuantityBought : 0
      const currentValue = Math.max(0, totalQuantity * avgPurchasePrice)

      console.log('📊 Calcoli finali:', {
        totalQuantity: totalQuantity.toFixed(4),
        avgPurchasePrice: avgPurchasePrice.toFixed(2),
        currentValue: currentValue.toFixed(2)
      })      // 4. Aggiorna l'asset nel database
      const { data: updatedAssets, error: updateError } = await supabase
        .from('assets')
        .update({
          quantity: Math.max(0, totalQuantity),
          value: currentValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId)
        .eq('user_id', user.id)
        .select()

      if (updateError) {
        console.error('❌ Errore nell\'aggiornamento asset:', updateError)
        throw updateError
      }

      if (!updatedAssets || updatedAssets.length === 0) {
        console.error('❌ Nessun asset aggiornato - possibile problema con i filtri')
        throw new Error('Asset non trovato o non aggiornato')
      }

      const updatedAsset = updatedAssets[0]

      console.log('✅ Asset aggiornato con successo:', {
        id: assetId,
        quantity: updatedAsset.quantity,
        value: updatedAsset.value
      })

      // 5. Refresh della cache
      await refetch()

      return {
        success: true,
        message: 'Asset aggiornato con successo',
        asset: updatedAsset,
        calculations: {
          transactionsProcessed: transactions.length,
          totalQuantity: Math.max(0, totalQuantity),
          avgPurchasePrice,
          currentValue
        }
      }

    } catch (error) {
      console.error('❌ Errore in updateAssetFromTransactions:', error)
      throw error
    }
  }, [user, supabase, refetch])

  const updateAllAssetsFromTransactions = useCallback(async () => {
    if (!user) throw new Error('User not authenticated')

    console.log('🔄 Aggiornamento di tutti gli asset da transazioni')

    try {
      // Recupera tutti gli asset dell'utente
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('id, name')
        .eq('user_id', user.id)

      if (assetsError) throw assetsError

      if (!assets || assets.length === 0) {
        return { message: 'Nessun asset trovato' }
      }

      console.log(`📦 Aggiornamento di ${assets.length} asset`)

      const results = []
      
      // Aggiorna ogni asset
      for (const asset of assets) {
        try {
          console.log(`🔄 Aggiornamento asset: ${asset.name} (${asset.id})`)
          const result = await updateAssetFromTransactions(asset.id)
          results.push({
            assetId: asset.id,
            assetName: asset.name,
            ...result
          })        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto'
          console.error(`❌ Errore nell'aggiornamento asset ${asset.name} (${asset.id}):`, error)
          console.error(`   Dettagli errore: ${errorMessage}`)
          
          results.push({
            assetId: asset.id,
            assetName: asset.name,
            success: false,
            error: errorMessage,
            message: `Errore durante l'aggiornamento di ${asset.name}: ${errorMessage}`
          })
        }
      }

      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      console.log(`✅ Aggiornamento completato: ${successful} successi, ${failed} errori`)

      return {
        success: true,
        message: `Aggiornati ${successful}/${assets.length} asset`,
        results
      }

    } catch (error) {
      console.error('❌ Errore in updateAllAssetsFromTransactions:', error)
      throw error
    }  }, [user, supabase, updateAssetFromTransactions])

  // Funzione di debug per verificare lo stato delle transazioni asset
  const debugAssetTransactions = useCallback(async (assetId?: string) => {
    if (!user) throw new Error('User not authenticated')

    console.log('🔍 Debug transazioni asset...')

    try {
      // Se assetId è specificato, mostra solo quello, altrimenti tutti
      const assetsQuery = supabase
        .from('assets')
        .select('id, name, quantity, value')
        .eq('user_id', user.id)

      if (assetId) {
        assetsQuery.eq('id', assetId)
      }

      const { data: assets, error: assetsError } = await assetsQuery

      if (assetsError) throw assetsError

      for (const asset of assets || []) {
        console.log(`\n📦 Asset: ${asset.name} (${asset.id})`)
        console.log(`   Quantità attuale: ${asset.quantity}`)
        console.log(`   Valore attuale: ${asset.value}€`)

        // Recupera tutte le transazioni per questo asset
        const { data: transactions, error: transError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('asset_id', asset.id)
          .order('transaction_date', { ascending: true })

        if (transError) {
          console.error(`❌ Errore nel recupero transazioni per ${asset.name}:`, transError)
          continue
        }

        console.log(`   📊 Transazioni totali: ${transactions?.length || 0}`)
        
        if (transactions && transactions.length > 0) {
          transactions.forEach((t, i) => {
            console.log(`   ${i + 1}. Data: ${t.transaction_date}`)
            console.log(`      Amount: ${t.current_amount}€`)
            console.log(`      Asset Quantity: ${t.asset_quantity}`)
            console.log(`      Dettagli: ${t.transaction_details}`)
          })
        }
      }

      return { success: true, message: 'Debug completato' }
    } catch (error) {
      console.error('❌ Errore durante il debug:', error)
      throw error
    }
  }, [user, supabase])

  // Funzione per aggiornare il valore di un asset con il prezzo di mercato corrente
  const updateAssetMarketValue = useCallback(async (assetId: string) => {
    if (!user) throw new Error('User not authenticated')

    console.log('💰 Aggiornamento valore asset con prezzo di mercato:', assetId)

    try {
      // 1. Recupera l'asset con simbolo e quantità
      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .select('id, name, symbol, type, quantity')
        .eq('id', assetId)
        .eq('user_id', user.id)
        .single()

      if (assetError || !asset) {
        console.error('❌ Asset non trovato:', assetError)
        throw new Error('Asset non trovato')
      }

      if (!asset.symbol) {
        console.log('⚠️ Asset senza simbolo, impossibile recuperare prezzo di mercato')
        throw new Error('Asset non ha un simbolo per il prezzo di mercato')
      }

      // 2. Recupera il prezzo di mercato corrente
      console.log(`🌐 Recupero prezzo di mercato per ${asset.symbol}...`)
      const priceResponse = await fetch(`/api/market-price?symbol=${encodeURIComponent(asset.symbol)}&type=${encodeURIComponent(asset.type)}`)
      
      if (!priceResponse.ok) {
        throw new Error('Prezzo di mercato non disponibile')
      }

      const priceData = await priceResponse.json()
      const currentMarketPrice = priceData.price || 0

      if (currentMarketPrice <= 0) {
        throw new Error('Prezzo di mercato non valido')
      }

      // 3. Calcola il nuovo valore
      const newValue = asset.quantity * currentMarketPrice
      console.log(`💰 Nuovo valore calcolato: ${asset.quantity} * ${currentMarketPrice} = ${newValue} EUR`)

      // 4. Aggiorna l'asset nel database
      const { error: updateError } = await supabase
        .from('assets')
        .update({
          value: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('❌ Errore nell\'aggiornamento:', updateError)
        throw updateError
      }

      console.log(`✅ Asset "${asset.name}" aggiornato con successo`)
      
      // 5. Refresh della cache
      await refetch()

      return {
        success: true,
        message: `Valore aggiornato a ${newValue.toFixed(2)} EUR`,
        newValue
      }

    } catch (error) {
      console.error('❌ Errore in updateAssetMarketValue:', error)
      throw error
    }
  }, [user, supabase, refetch])

  return {
    createAsset,
    updateAsset,
    deleteAsset,
    updateAssetValue,
    linkAssetToTransaction,
    unlinkAssetFromTransaction,
    updateAssetFromTransactions,
    updateAllAssetsFromTransactions,
    debugAssetTransactions,
    updateAssetMarketValue
  }
}

// Aggiungi queste interfacce dopo le interfacce esistenti
interface TransactionWithRelations extends Transaction {
  accounts: { type: string } | null
  categories: { name: string } | null
}

interface RawAssetData {
  id: string
  name: string
  type: string
  quantity: number
  value: number
  currency: string
  account_id: string | null
  created_at: string
  updated_at: string
  user_id: string
}

interface CategoryAmounts {
  [key: string]: number
}

// Hook per recuperare le transazioni non collegate ad asset con categoria specifica
export function useUnlinkedAssetTransactions() {
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  const [unlinkedTransactions, setUnlinkedTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUnlinkedTransactions = useCallback(async () => {
    if (!user) {
      setUnlinkedTransactions([])
      return
    }    setLoading(true)
    setError(null)

    try {
      // Prima trova l'ID della categoria 'ASSET & INVESTIMENTI'
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('name', 'ASSET & INVESTIMENTI')
        .single()

      if (categoryError) {
        console.error('Error finding category:', categoryError)
        throw new Error('Categoria ASSET & INVESTIMENTI non trovata')
      }

      if (!categoryData) {
        console.log('⚠️ Categoria ASSET & INVESTIMENTI non esiste')
        setUnlinkedTransactions([])
        return
      }

      // Poi cerca le transazioni con quella categoria e senza asset_id
      const { data, error: queryError } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .is('asset_id', null)
        .eq('category_id', categoryData.id)
        .order('transaction_date', { ascending: false })
        .limit(200) // Limite ragionevole ma alto per trovare le transazioni

      if (queryError) {
        console.error('Error fetching unlinked asset transactions:', queryError)
        throw queryError
      }

      console.log('🔍 Unlinked asset transactions found:', data?.length || 0)
      setUnlinkedTransactions(data || [])
    } catch (err) {
      console.error('Error in fetchUnlinkedTransactions:', err)
      setError(err instanceof Error ? err.message : 'Errore nel caricamento delle transazioni')
      setUnlinkedTransactions([])
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchUnlinkedTransactions()
  }, [fetchUnlinkedTransactions])

  return {
    unlinkedTransactions,
    loading,
    error,
    refetch: fetchUnlinkedTransactions,
    count: unlinkedTransactions.length
  }
}
