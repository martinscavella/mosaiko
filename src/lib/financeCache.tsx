'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode, useMemo } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth';
import { normalizeAssetTransaction, aggregateAssetPurchaseData, type NormalizedAssetTransaction } from '@/lib/helpers/assetPurchaseData';

export interface FinanceStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  accountsCount: number;
  transactionsCount: number;
  topCategory: string | null;
  goalProgress: number;
  currentMonth: string; // Nome del mese corrente (es. "Giugno 2025")
  monthYear: string; // Anno-mese per riferimento (es. "2025-06")
}

export interface Transaction {
  id: string;
  transaction_date: string;
  transaction_details: string;
  current_amount: number;
  transaction_type: string;
  is_refunded?: boolean;
  account_name?: string;
  asset_id?: string | null;
  asset_quantity?: number | null;
  // Campi completi per dettaglio/modifica
  initial_amount?: number;
  transaction_code?: string | null;
  transaction_note?: string | null;
  currency?: string;
  account_id?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  created_at?: string;
  updated_at?: string;
  accounts?: {
    type: string;
    color?: string;
  } | null;
  categories?: {
    name: string;
  } | null;
  subcategories?: {
    name: string;
  } | null;
}

export interface Refund {
  id: string;
  refund_date: string;
  refund_details: string | null;
  current_amount: number;
  account_id?: string | null;
  account_name?: string;
  refund_code?: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface FundsTransfer {
  id: string;
  funds_transfer_date: string;
  funds_transfer_details: string | null;
  amount: number;
  account_id?: string | null;
  account_name?: string;
  funds_transfer_code?: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  description: string | null;
  current_amount: number;
  target_amount: number;
  currency: string;
  target_date: string | null;
  color: string | null;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  current_balance: number;
  initial_balance: number;
  currency: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  quantity: number;
  value: number;
  currency: string;
  account_id: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  symbol?: string | null;
}

interface CachedData {
  stats: FinanceStats;
  transactions: Transaction[];
  refunds: Refund[];
  fundsTransfer: FundsTransfer[];
  goals: FinancialGoal[];
  accounts: Account[];
  assets: Asset[];
  lastFetch: number;
  isStale: boolean;
  /** Data (YYYY-MM-DD) da cui sono caricate le transazioni; null = storico completo (T4.1) */
  transactionsSince: string | null;
}

interface FinanceCacheContextType {
  data: CachedData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  invalidateCache: () => void;
  isDataStale: boolean;
  /** true quando in cache c'è tutto lo storico transazioni (T4.1) */
  hasFullTransactionHistory: boolean;
  /** Scarica on-demand le transazioni più vecchie della finestra iniziale (T4.1) */
  loadFullTransactionHistory: () => Promise<void>;
}

const FinanceCacheContext = createContext<FinanceCacheContextType | undefined>(undefined);

const CACHE_DURATION = 60 * 60 * 1000; // 1 ora per dati freschi
const STALE_TIME = 30 * 60 * 1000; // 30 minuti (quando considerare i dati obsoleti ma utilizzabili)

// Finestra iniziale delle transazioni (T4.1): al login si scaricano solo gli
// ultimi N mesi; lo storico completo si carica on-demand con
// loadFullTransactionHistory (Reports "tutto lo storico", grafico "Tutto", …).
const TRANSACTIONS_WINDOW_MONTHS = 24;

const transactionsWindowStart = (): string => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - TRANSACTIONS_WINDOW_MONTHS, 1)
    .toISOString().slice(0, 10);
};

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
};

// Forma esatta delle colonne richieste nella select() di fetchTransactionsRange:
// evita `any` e fa emergere subito eventuali disallineamenti tra select e
// mapping. Il client Supabase (senza i tipi generati dello schema) inferisce le
// relazioni embedded come array anche quando a runtime sono oggetti singoli
// (relazione many-to-one via FK): normalizeEmbedded gestisce entrambe le forme
// senza assumere quale sia quella reale.
type RawTransactionRow = {
  id: string
  transaction_date: string
  transaction_details: string
  current_amount: number
  initial_amount: number
  transaction_type: string
  transaction_code: string | null
  transaction_note: string | null
  currency: string
  is_refunded: boolean | null
  account_id: string | null
  account_name: string | null
  category_id: string | null
  subcategory_id: string | null
  asset_id: string | null
  asset_quantity: number | null
  created_at: string
  updated_at: string
  accounts: { type: string } | { type: string }[] | null
  categories: { name: string } | { name: string }[] | null
  subcategories: { name: string } | { name: string }[] | null
}

const normalizeEmbedded = <T,>(value: T | T[] | null): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

// Scarica le transazioni a batch di 1000 (limite PostgREST), ordinate per data
// discendente. `since` limita alla finestra iniziale (>=), `before` scarica
// solo il periodo precedente alla finestra (<) per loadFullTransactionHistory.
async function fetchTransactionsRange(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  userId: string,
  bounds: { since?: string | null; before?: string | null }
): Promise<Transaction[]> {
  let all: Transaction[] = [];
  let hasMore = true;
  let offset = 0;
  const batchSize = 1000;

  while (hasMore) {
    let query = supabase
      .from('transactions')
      .select(`
        id,
        transaction_date,
        transaction_details,
        current_amount,
        initial_amount,
        transaction_type,
        transaction_code,
        transaction_note,
        currency,
        is_refunded,
        account_id,
        account_name,
        category_id,
        subcategory_id,
        asset_id,
        asset_quantity,
        created_at,
        updated_at,
        accounts(type),
        categories(name),
        subcategories(name)
      `)
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (bounds.since) query = query.gte('transaction_date', bounds.since);
    if (bounds.before) query = query.lt('transaction_date', bounds.before);

    const transactionsBatch = await query;

    if (transactionsBatch.error) {
      throw transactionsBatch.error;
    }

    const batchData: Transaction[] = ((transactionsBatch.data || []) as RawTransactionRow[]).map((item) => ({
      id: item.id,
      transaction_date: item.transaction_date,
      transaction_details: item.transaction_details,
      current_amount: item.current_amount,
      initial_amount: item.initial_amount,
      transaction_type: item.transaction_type,
      transaction_code: item.transaction_code,
      transaction_note: item.transaction_note,
      currency: item.currency,
      is_refunded: item.is_refunded ?? undefined,
      account_id: item.account_id,
      account_name: item.account_name ?? undefined,
      category_id: item.category_id,
      subcategory_id: item.subcategory_id,
      asset_id: item.asset_id,
      asset_quantity: item.asset_quantity,
      created_at: item.created_at,
      updated_at: item.updated_at,
      accounts: normalizeEmbedded(item.accounts),
      categories: normalizeEmbedded(item.categories),
      subcategories: normalizeEmbedded(item.subcategories)
    }));
    all = [...all, ...batchData];

    hasMore = batchData.length === batchSize;
    offset += batchSize;
  }

  return all;
}

export function FinanceCacheProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CachedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const supabase = createSupabaseBrowserClient();

  // Ref sincronizzati con data/loading: permettono a fetchFinanceData di leggere
  // sempre il valore corrente senza doverli includere nelle dipendenze di
  // useCallback (che ricreerebbe la funzione e reinnescherebbe l'effetto di
  // caricamento iniziale ad ogni fetch, causando un loop infinito).
  const dataRef = useRef(data);
  const loadingRef = useRef(loading);

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  const isDataExpired = useCallback((timestamp: number) => {
    return Date.now() - timestamp > CACHE_DURATION;
  }, []);

  const isDataStale = useCallback((timestamp: number) => {
    return Date.now() - timestamp > STALE_TIME;
  }, []);

  const fetchFinanceData = useCallback(async (forceRefresh = false) => {
    if (!user) return;

    if (dataRef.current && !isDataExpired(dataRef.current.lastFetch) && !forceRefresh) {
      return;
    }

    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      const [accountsResult, goalsResult, assetsResult, refundsResult, fundsTransferResult] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('financial_goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('assets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('refunds').select('*').eq('user_id', user.id).order('refund_date', { ascending: false }),
        supabase.from('funds_transfer').select('*').eq('user_id', user.id).order('funds_transfer_date', { ascending: false })
      ]);

      // Finestra iniziale (T4.1): se lo storico completo era già stato caricato
      // in questa sessione, un refetch lo mantiene completo.
      const since = dataRef.current?.transactionsSince === null ? null : transactionsWindowStart();
      const allTransactions = await fetchTransactionsRange(supabase, user.id, { since });

      const accounts = accountsResult.data || [];
      const goals = goalsResult.data || [];
      const rawAssets = assetsResult.data || [];
      const refunds = refundsResult.data || [];
      const fundsTransfer = fundsTransferResult.data || [];

      // Valida la forma minima invece di castare alla cieca: scarta righe
      // malformate anziché propagarle silenziosamente nel resto dell'app.
      const assets = rawAssets.filter((asset): asset is Asset =>
        typeof asset?.id === 'string' &&
        typeof asset?.name === 'string' &&
        typeof asset?.type === 'string' &&
        typeof asset?.value === 'number'
      );

      const totalAssetsValue = assets.reduce((sum, asset) => sum + Number(asset.value || 0), 0);

      const totalBalance = accounts.reduce((sum, account) => sum + Number(account.current_balance || 0), 0) + totalAssetsValue;

      let currentMonth = 'Nessun dato';
      let monthYear = '';

      if (allTransactions.length > 0) {
        const latestTransaction = allTransactions[0];
        const latestDate = new Date(latestTransaction.transaction_date);

        monthYear = `${latestDate.getFullYear()}-${String(latestDate.getMonth() + 1).padStart(2, '0')}`;

        const monthNames = [
          'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
          'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
        ];
        currentMonth = `${monthNames[latestDate.getMonth()]} ${latestDate.getFullYear()}`;
      }

      // Calcola transazioni mensili solo se abbiamo un mese valido
      const monthlyFilteredTransactions = monthYear 
        ? allTransactions.filter((transaction: Transaction) => {
            const transactionDate = new Date(transaction.transaction_date);
            const transactionMonthYear = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
            return transactionMonthYear === monthYear;
          }) 
        : [];

      let monthlyIncome = 0;
      let monthlyExpenses = 0;
      const categoryAmounts: CategoryAmounts = {};

      monthlyFilteredTransactions.forEach((transaction: Transaction) => {
        const amount = Number(transaction.current_amount || 0);

        if (amount > 0) {
          monthlyIncome += Math.abs(amount);
        } else if(transaction.asset_id === null) {
          monthlyExpenses += Math.abs(amount);

          const categoryName = transaction.categories?.name || 'Altro';
          categoryAmounts[categoryName] = (categoryAmounts[categoryName] || 0) + Math.abs(amount);
        }
      });

      const topCategory = Object.keys(categoryAmounts).length > 0 
        ? Object.keys(categoryAmounts).reduce((a, b) => categoryAmounts[a] > categoryAmounts[b] ? a : b)
        : null;

      const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

      const { count: transactionsCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      let goalProgress = 0;
      if (goals.length > 0) {
        const totalTargetAmount = goals.reduce((sum, goal) => sum + Number(goal.target_amount || 0), 0);
        const totalCurrentAmount = goals.reduce((sum, goal) => sum + Number(goal.current_amount || 0), 0);
        goalProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;
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
      };

      const processedTransactions: Transaction[] = allTransactions.map((item: Transaction) => ({
        ...item,
        accounts: item.accounts,
        categories: item.categories
      }));

      const processedRefunds: Refund[] = refunds.map((item) => ({
        id: item.id,
        refund_date: item.refund_date,
        refund_details: item.refund_details,
        current_amount: item.current_amount,
        account_id: item.account_id || null,
        account_name: item.account_name || null,
        refund_code: item.refund_code,
        user_id: item.user_id,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      const processedFundsTransfer: FundsTransfer[] = fundsTransfer.map((item) => ({
        id: item.id,
        funds_transfer_date: item.funds_transfer_date,
        funds_transfer_details: item.funds_transfer_details,
        amount: item.amount,
        account_id: item.account_id || null,
        account_name: item.account_name || null,
        funds_transfer_code: item.funds_transfer_code,
        user_id: item.user_id,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      const newCacheData: CachedData = {
        stats,
        transactions: processedTransactions,
        refunds: processedRefunds,
        fundsTransfer: processedFundsTransfer,
        goals: goals as FinancialGoal[],
        accounts: accounts as Account[],
        assets,
        lastFetch: Date.now(),
        isStale: false,
        transactionsSince: since
      };

      dataRef.current = newCacheData;
      setData(newCacheData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [user, supabase, isDataExpired])

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
      }
    }, 5 * 60 * 1000) // Controlla ogni 5 minuti

    return () => clearInterval(interval)
  }, [data, isDataStale])

  const refetch = useCallback(async () => {
    await fetchFinanceData(true)
  }, [fetchFinanceData])

  const invalidateCache = useCallback(() => {
    dataRef.current = null
    setData(null)
    setError(null)
  }, [])

  // Ref per non far partire due download dello storico in parallelo
  const loadingFullHistoryRef = useRef(false)

  const loadFullTransactionHistory = useCallback(async () => {
    const current = dataRef.current
    if (!user || !current || current.transactionsSince === null) return
    if (loadingFullHistoryRef.current) return

    try {
      loadingFullHistoryRef.current = true
      const older = await fetchTransactionsRange(supabase, user.id, {
        before: current.transactionsSince
      })

      // Ricontrolla dopo l'await: un refetch concorrente può aver sostituito i dati
      const base = dataRef.current
      if (!base || base.transactionsSince === null) return

      const updated: CachedData = {
        ...base,
        // le liste sono entrambe ordinate per data discendente: append diretto
        transactions: [...base.transactions, ...older],
        transactionsSince: null
      }
      dataRef.current = updated
      setData(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento dello storico')
    } finally {
      loadingFullHistoryRef.current = false
    }
  }, [user, supabase])

  // Memoizzato: il provider wrappa l'intero layout, senza useMemo ogni cambio
  // di stato interno ricreerebbe l'oggetto e ri-renderizzerebbe tutti i
  // consumer di useFinanceCache (fix I4, perso in un merge e ripristinato).
  const contextValue: FinanceCacheContextType = useMemo(() => ({
    data,
    loading,
    error,
    refetch,
    invalidateCache,
    isDataStale: data ? isDataStale(data.lastFetch) : false,
    hasFullTransactionHistory: data ? data.transactionsSince === null : false,
    loadFullTransactionHistory
  }), [data, loading, error, refetch, invalidateCache, isDataStale, loadFullTransactionHistory]);

  return <FinanceCacheContext.Provider value={contextValue}>{children}</FinanceCacheContext.Provider>;
}

export function useFinanceCache() {
  const context = useContext(FinanceCacheContext);
  if (context === undefined) {
    throw new Error('useFinanceCache must be used within a FinanceCacheProvider');
  }
  return context;
}

// Hook semplificato per retrocompatibilità
export function useFinanceData() {
  const { data, loading, error, refetch } = useFinanceCache();

  return {
    stats: data?.stats || initialStats,
    loading,
    error,
    refetch
  };
}

// Hook per transazioni
export function useTransactions(limit = 10) {
  const { data, loading, error } = useFinanceCache();
  
  return {
    transactions: data?.transactions.slice(0, limit) || [],
    loading,
    error
  }
}

// Hook per tutte le transazioni (senza limite)
export function useAllTransactions() {
  const { data, loading, error, refetch } = useFinanceCache();
  
  return {
    transactions: data?.transactions || [],
    loading,
    error,
    refetch
  }
}

// Hook per obiettivi
export function useFinancialGoals(limit = 10) {
  const { data, loading, error } = useFinanceCache();
  
  return {
    goals: data?.goals.slice(0, limit) || [],
    loading,
    error
  }
}

// Hook per account
export function useAccounts() {
  const { data, loading, error, refetch } = useFinanceCache();

  return {
    accounts: data?.accounts || [],
    loading,
    error,
    refetch
  }
}

// Hook per account CRUD operations, attivazione/disattivazione e ricalcolo
// saldo (usa le funzioni RPC recalculate_current_balance* già presenti sul
// DB e usate internamente da NewTransactionModal/DeleteTransactionModal).
export function useAccountOperations() {
  const { refetch } = useFinanceCache()
  const { user } = useAuth()
  const supabase = createSupabaseBrowserClient()

  const createAccount = useCallback(async (accountData: {
    name: string
    type: string
    color: string
    currency: string
    initial_balance: number
  }) => {
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('accounts')
      .insert([{
        ...accountData,
        current_balance: accountData.initial_balance,
        is_active: true,
        user_id: user.id
      }])
      .select()
      .single()

    if (error) throw error

    await refetch()
    return data
  }, [user, supabase, refetch])

  // Solo i campi anagrafici sono modificabili: current_balance/initial_balance
  // sono derivati dai movimenti collegati (trigger DB), modificarli a mano
  // dopo la creazione disallineerebbe il saldo dalla sua fonte canonica.
  const updateAccount = useCallback(async (id: string, updates: Partial<Pick<Account, 'name' | 'type' | 'color' | 'currency'>>) => {
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('accounts')
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

  const setAccountActive = useCallback(async (id: string, isActive: boolean) => {
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('accounts')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    await refetch()
  }, [user, supabase, refetch])

  const deleteAccount = useCallback(async (id: string) => {
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    await refetch()
  }, [user, supabase, refetch])

  // Ricalcola il saldo di un singolo account dai suoi movimenti collegati
  // (fonte canonica sul DB), utile se si sospetta un disallineamento.
  const recalculateAccountBalance = useCallback(async (id: string) => {
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase.rpc('recalculate_current_balance_by_id', {
      account_id_param: id
    })

    if (error) throw error

    await refetch()
    return data as number
  }, [user, supabase, refetch])

  // Ricalcola il saldo di tutti gli account dell'utente in un colpo solo.
  // La funzione RPC non filtra per user_id lato SQL, ma la RLS sulla UPDATE
  // (accounts_update: user_id = auth.uid()) limita comunque l'effetto alle
  // sole righe dell'utente autenticato.
  const recalculateAllBalances = useCallback(async () => {
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase.rpc('recalculate_current_balance')

    if (error) throw error

    await refetch()
  }, [user, supabase, refetch])

  return {
    createAccount,
    updateAccount,
    setAccountActive,
    deleteAccount,
    recalculateAccountBalance,
    recalculateAllBalances
  }
}

// Hook per asset
export function useAssets() {
  const { data, loading, error, refetch } = useFinanceCache();
  
  return {
    assets: data?.assets || [],
    loading,
    error,
    refetch
  }
}

// Hook per statistiche asset
export function useAssetStats() {
  const { data } = useFinanceCache();
  
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


// Hook per recuperare le transazioni correlate a un asset
export function useAssetTransactions(assetId: string | null) {
  const { user } = useAuth()
  const supabase = createSupabaseBrowserClient()
  const [assetTransactions, setAssetTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAssetTransactions = useCallback(async () => {
    if (!user || !assetId) {
      setAssetTransactions([])
      return
    }    setLoading(true)
    setError(null)

    try {      const { data, error: queryError } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (
            id,
            name
          ),
          subcategories (
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
  const supabase = createSupabaseBrowserClient()

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

  // Ricalcola la quantità di un asset dalle sue transazioni collegate e la
  // persiste sul DB. Query sempre fresca (non dalla cache): quando viene
  // chiamata subito dopo aver collegato/scollegato una transazione, la cache
  // non riflette ancora il cambio di asset_id appena scritto.
  const recalcAssetQuantity = useCallback(async (assetId: string) => {
    if (!user) return

    const { data: txs, error } = await supabase
      .from('transactions')
      .select('asset_quantity, current_amount, transaction_date')
      .eq('user_id', user.id)
      .eq('asset_id', assetId)

    if (error) {
      console.error('Errore nel ricalcolo quantità asset:', error)
      return
    }

    const normalized = (txs || [])
      .map(normalizeAssetTransaction)
      .filter((t): t is NormalizedAssetTransaction => t !== null)
    const purchaseData = aggregateAssetPurchaseData(normalized)

    // Nessuna transazione collegata: la quantità resta un campo manuale
    if (!purchaseData.hasTransactions) return

    const { error: updateError } = await supabase
      .from('assets')
      .update({
        quantity: purchaseData.totalQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', assetId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Errore nell\'aggiornamento quantità asset:', updateError)
    }
  }, [user, supabase])

  const linkAssetToTransaction = useCallback(async (assetId: string, transactionId: string) => {
    if (!user) throw new Error('User not authenticated')

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
      console.error('Errore nel collegare la transazione all\'asset:', error)
      throw error
    }

    await recalcAssetQuantity(assetId)
    await refetch()
  }, [user, supabase, refetch, recalcAssetQuantity])

  const unlinkAssetFromTransaction = useCallback(async (assetId: string, transactionId: string) => {
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

    await recalcAssetQuantity(assetId)
    await refetch()
  }, [user, supabase, refetch, recalcAssetQuantity])
  const updateAssetMarketValue = useCallback(async (assetId: string) => {
    if (!user) throw new Error('User not authenticated')

    try {
      // 1. Recupera l'asset con simbolo e quantità
      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .select('id, name, symbol, type, quantity')
        .eq('id', assetId)
        .eq('user_id', user.id)
        .single()

      if (assetError || !asset) {
        throw new Error('Asset non trovato')
      }

      if (!asset.symbol) {
        throw new Error('Asset non ha un simbolo per il prezzo di mercato')
      }

      // 2. Recupera il prezzo di mercato corrente
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
        console.error('Errore nell\'aggiornamento del valore asset:', updateError)
        throw updateError
      }

      return {
        success: true,
        message: `Valore aggiornato a ${newValue.toFixed(2)} EUR`,
        newValue
      }

    } catch (error) {
      console.error('Errore in updateAssetMarketValue:', error)
      throw error
    }
  }, [user, supabase])

  return {
    createAsset,
    updateAsset,
    deleteAsset,
    linkAssetToTransaction,
    unlinkAssetFromTransaction,
    updateAssetMarketValue,
    recalcAssetQuantity
  }
}

interface CategoryAmounts {
  [key: string]: number
}

// Hook per recuperare le transazioni non collegate ad asset con categoria specifica
export function useUnlinkedAssetTransactions() {
  const { user } = useAuth()
  const supabase = createSupabaseBrowserClient()
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
      // La categoria asset si individua per slug (stabile), non per nome
      // visualizzato: vedi migration 20260718_onboarding_default_categories
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', 'assets')
        .single()

      if (categoryError) {
        console.error('Error finding category:', categoryError)
        throw new Error('Categoria asset non trovata')
      }

      if (!categoryData) {
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
          ),
          subcategories (
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

// Hook combinato per tutte le operazioni finanziarie (transazioni + refunds + transfers)
export function useAllFinancialOperations() {
  const { data, loading, error, refetch } = useFinanceCache()
  
  const allOperations = useMemo(() => {
    if (!data) return []
    
    // Combina transazioni, refunds e transfers in un formato unificato
    const operations = [
      // Transazioni normali
      ...data.transactions.map(t => ({
        id: t.id,
        date: t.transaction_date,
        type: 'transaction' as const,
        operationType: t.transaction_type,
        details: t.transaction_details,
        amount: t.current_amount,
        accountName: t.account_name,
        isRefunded: t.is_refunded,
        categories: t.categories
      })),
      // Refunds
      ...data.refunds.map(r => ({
        id: r.id,
        date: r.refund_date,
        type: 'refund' as const,
        operationType: 'Refund',
        details: r.refund_details,
        amount: r.current_amount,
        accountName: r.account_name,
        isRefunded: false,
        categories: null
      })),
      // Funds transfers
      ...data.fundsTransfer.map(ft => ({
        id: ft.id,
        date: ft.funds_transfer_date,
        type: 'fund_transfer' as const,
        operationType: 'Fund Transfer',
        details: ft.funds_transfer_details,
        amount: ft.amount,
        accountName: ft.account_name,
        isRefunded: false,
        categories: null
      }))
    ]
    
    // Ordina per data (più recenti primi)
    return operations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [data])
  
  return {
    operations: allOperations,
    transactions: data?.transactions || [],
    refunds: data?.refunds || [],
    fundsTransfer: data?.fundsTransfer || [],
    loading,
    error,
    refetch
  }
}
