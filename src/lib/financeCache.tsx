'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/lib/auth';

export interface FinanceStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  accountsCount: number;
  transactionsCount: number;
  topCategory: string | null;
  goalProgress: number;
  currentMonth: string;
  monthYear: string;
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
}

interface FinanceCacheContextType {
  data: CachedData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  invalidateCache: () => void;
  isDataStale: boolean;
}

const FinanceCacheContext = createContext<FinanceCacheContextType | undefined>(undefined);

const CACHE_DURATION = 60 * 60 * 1000;
const STALE_TIME = 30 * 60 * 1000;

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

export function FinanceCacheProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CachedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const supabase = createClientComponentClient();

  const isDataExpired = useCallback((timestamp: number) => {
    return Date.now() - timestamp > CACHE_DURATION;
  }, []);

  const isDataStale = useCallback((timestamp: number) => {
    return Date.now() - timestamp > STALE_TIME;
  }, []);

  // FIX: dipendenze corrette — rimossi `data` e `loading` che causavano loop infinito.
  const fetchFinanceData = useCallback(async (forceRefresh = false) => {
    if (!user) return;

    let shouldFetch = true;

    await new Promise<void>(resolve => {
      setData(prevData => {
        if (prevData && !isDataExpired(prevData.lastFetch) && !forceRefresh) {
          shouldFetch = false;
        }
        resolve();
        return prevData;
      });
    });

    await new Promise<void>(resolve => {
      setLoading(prevLoading => {
        if (prevLoading) {
          shouldFetch = false;
        }
        resolve();
        return prevLoading;
      });
    });

    if (!shouldFetch) return;

    try {
      setLoading(true);
      setError(null);

      const [accountsResult, goalsResult, assetsResult, refundsResult, fundsTransferResult] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('financial_goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('assets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('refunds').select('*').eq('user_id', user.id).order('refund_date', { ascending: false }),
        supabase.from('funds_transfer').select('*').eq('user_id', user.id).order('funds_transfer_date', { ascending: false })
      ]);

      let allTransactions: Transaction[] = [];
      let hasMore = true;
      let offset = 0;
      const batchSize = 1000;

      while (hasMore) {
        const transactionsBatch = await supabase
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
            categories(name),
            subcategories(name)
          `)
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false })
          .range(offset, offset + batchSize - 1);

        if (transactionsBatch.error) {
          throw transactionsBatch.error;
        }

        const batchData: Transaction[] = (transactionsBatch.data || []).map((item: any) => ({
          id: item.id,
          transaction_date: item.transaction_date,
          transaction_details: item.transaction_details,
          current_amount: item.current_amount,
          transaction_type: item.transaction_type,
          is_refunded: item.is_refunded,
          account_name: item.account_name,
          asset_id: item.asset_id,
          asset_quantity: item.asset_quantity,
          accounts: item.accounts,
          categories: item.categories,
          subcategories: item.subcategories
        }));
        allTransactions = [...allTransactions, ...batchData];

        hasMore = batchData.length === batchSize;
        offset += batchSize;
      }

      const accounts = accountsResult.data || [];
      const goals = goalsResult.data || [];
      const assets = (assetsResult.data || []) as Asset[];
      const refunds = refundsResult.data || [];
      const fundsTransfer = fundsTransferResult.data || [];

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

      let monthlyIncome = 0;
      let monthlyExpenses = 0;
      const categoryAmounts: CategoryAmounts = {};

      if (monthYear) {
        const monthlyFilteredTransactions = allTransactions.filter((transaction: Transaction) => {
          const transactionDate = new Date(transaction.transaction_date);
          const transactionMonthYear = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
          return transactionMonthYear === monthYear;
        });

        monthlyFilteredTransactions.forEach((transaction: Transaction) => {
          const amount = Number(transaction.current_amount || 0);
          if (amount > 0) {
            monthlyIncome += Math.abs(amount);
          } else if (transaction.asset_id === null) {
            monthlyExpenses += Math.abs(amount);
            const categoryName = transaction.categories?.name || 'Altro';
            categoryAmounts[categoryName] = (categoryAmounts[categoryName] || 0) + Math.abs(amount);
          }
        });
      }

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
        assets: assets as Asset[],
        lastFetch: Date.now(),
        isStale: false
      };

      setData(newCacheData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, [user, supabase, isDataExpired])

  useEffect(() => {
    if (user) {
      fetchFinanceData()
    }
  }, [user, fetchFinanceData])

  // FIX: effetto separato per stale check con cleanup corretto dell'intervallo
  useEffect(() => {
    if (!data) return;

    const interval = setInterval(() => {
      setData(prev => {
        if (!prev) {
          clearInterval(interval);
          return null;
        }
        if (isDataStale(prev.lastFetch) && !prev.isStale) {
          return { ...prev, isStale: true };
        }
        return prev;
      });
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [data?.lastFetch, isDataStale])

  const refetch = useCallback(async () => {
    await fetchFinanceData(true)
  }, [fetchFinanceData])

  const invalidateCache = useCallback(() => {
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
  };

  return <FinanceCacheContext.Provider value={contextValue}>{children}</FinanceCacheContext.Provider>;
}

export function useFinanceCache() {
  const context = useContext(FinanceCacheContext);
  if (context === undefined) {
    throw new Error('useFinanceCache must be used within a FinanceCacheProvider');
  }
  return context;
}

export function useFinanceData() {
  const { data, loading, error, refetch } = useFinanceCache();
  return {
    stats: data?.stats || initialStats,
    loading,
    error,
    refetch
  };
}

export function useTransactions(limit = 10) {
  const { data, loading, error } = useFinanceCache();
  return {
    transactions: data?.transactions.slice(0, limit) || [],
    loading,
    error
  }
}

export function useAllTransactions() {
  const { data, loading, error, refetch } = useFinanceCache();
  return {
    transactions: data?.transactions || [],
    loading,
    error,
    refetch
  }
}

export function useFinancialGoals(limit = 10) {
  const { data, loading, error } = useFinanceCache();
  return {
    goals: data?.goals.slice(0, limit) || [],
    loading,
    error
  }
}

export function useAccounts() {
  const { data, loading, error, refetch } = useFinanceCache();
  return {
    accounts: data?.accounts || [],
    loading,
    error,
    refetch
  }
}

export function useAssets() {
  const { data, loading, error, refetch } = useFinanceCache();
  return {
    assets: data?.assets || [],
    loading,
    error,
    refetch
  }
}

// FIX #11: calcoli memoizzati con useMemo per evitare ricalcoli ad ogni render
export function useAssetStats() {
  const { data } = useFinanceCache();

  return useMemo(() => {
    const assets = data?.assets || [];

    const totalValue = assets.reduce((sum, asset) => sum + Number(asset.value || 0), 0);
    const totalCost = totalValue; // Temporaneo - andrebbe calcolato dalle transazioni
    const totalPerformance = 0;  // Temporaneo - richiederebbe dati storici

    const assetsByType = assets.reduce((acc, asset) => {
      const type = asset.type || 'other';
      if (!acc[type]) {
        acc[type] = { count: 0, totalValue: 0, totalCost: 0 };
      }
      acc[type].count++;
      acc[type].totalValue += Number(asset.value || 0);
      acc[type].totalCost += Number(asset.value || 0); // Temporaneo
      return acc;
    }, {} as Record<string, { count: number; totalValue: number; totalCost: number }>);

    return {
      totalValue,
      totalCost,
      totalPerformance,
      assetCount: assets.length,
      assetsByType,
      topPerformingAsset: assets.length > 0 ? assets[0] : null
    };
  }, [data?.assets]);
}

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
    }
    setLoading(true)
    setError(null)

    try {
      const { data, error: queryError } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (id, name),
          subcategories (id, name)
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
      return transaction.current_amount < 0 ? sum + Math.abs(transaction.current_amount) : sum
    }, 0)
  }, [assetTransactions])

  const totalReceivedFromAsset = useMemo(() => {
    return assetTransactions.reduce((sum, transaction) => {
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

export function useAssetOperations() {
  const { refetch } = useFinanceCache()
  const { user } = useAuth()
  const supabase = createClientComponentClient()

  const createAsset = useCallback(async (assetData: Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    if (!user) throw new Error('User not authenticated')
    const { data, error } = await supabase
      .from('assets')
      .insert([{ ...assetData, user_id: user.id }])
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
      .update({ ...updates, updated_at: new Date().toISOString() })
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
    const { error: assetError } = await supabase
      .from('assets')
      .update({ value: newValue, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
    if (assetError) throw assetError
    await refetch()
  }, [user, supabase, refetch])

  const linkAssetToTransaction = useCallback(async (assetId: string, transactionId: string) => {
    if (!user) throw new Error('User not authenticated')
    const { error } = await supabase
      .from('transactions')
      .update({ asset_id: assetId, updated_at: new Date().toISOString() })
      .eq('id', transactionId)
      .eq('user_id', user.id)
    if (error) {
      console.error('Error linking transaction to asset:', error)
      throw error
    }
    await refetch()
  }, [user, supabase, refetch])

  const unlinkAssetFromTransaction = useCallback(async (transactionId: string) => {
    if (!user) throw new Error('User not authenticated')
    const { error } = await supabase
      .from('transactions')
      .update({ asset_id: null, updated_at: new Date().toISOString() })
      .eq('id', transactionId)
      .eq('user_id', user.id)
    if (error) throw error
    await refetch()
  }, [user, supabase, refetch])

  const updateAssetFromTransactions = useCallback(async (assetId: string) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const { data: assetExists, error: assetCheckError } = await supabase
        .from('assets')
        .select('id, name')
        .eq('id', assetId)
        .eq('user_id', user.id)
        .single()

      if (assetCheckError || !assetExists) {
        console.error('Asset non trovato:', assetCheckError)
        throw new Error(`Asset con ID ${assetId} non trovato`)
      }

      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('asset_id', assetId)
        .not('asset_quantity', 'is', null)
        .order('transaction_date', { ascending: true })

      if (transactionsError) {
        console.error('Errore nel recupero transazioni:', transactionsError)
        throw transactionsError
      }

      if (!transactions || transactions.length === 0) {
        return { message: 'Nessuna transazione trovata per questo asset' }
      }

      let totalQuantity = 0
      let totalCostSpent = 0
      let totalQuantityBought = 0

      transactions.forEach((transaction) => {
        const quantity = Math.abs(transaction.asset_quantity || 0)
        const amount = Math.abs(transaction.current_amount || 0)
        if (quantity === 0 || amount === 0) return
        const unitPrice = amount / quantity
        if (!isFinite(unitPrice) || unitPrice <= 0) return
        if ((transaction.asset_quantity || 0) > 0) {
          totalQuantity += quantity
          totalCostSpent += quantity * unitPrice
          totalQuantityBought += quantity
        } else {
          totalQuantity -= quantity
        }
      })

      if (totalQuantityBought === 0 && totalQuantity === 0) {
        return {
          success: true,
          message: 'Nessuna transazione valida trovata per questo asset',
          calculations: { transactionsProcessed: 0, totalQuantity: 0, avgPurchasePrice: 0, currentValue: 0 }
        }
      }

      const avgPurchasePrice = totalQuantityBought > 0 ? totalCostSpent / totalQuantityBought : 0
      const currentValue = Math.max(0, totalQuantity * avgPurchasePrice)

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
        console.error('Errore aggiornamento asset:', updateError)
        throw updateError
      }

      if (!updatedAssets || updatedAssets.length === 0) {
        throw new Error('Asset non trovato o non aggiornato')
      }

      await refetch()

      return {
        success: true,
        message: 'Asset aggiornato con successo',
        asset: updatedAssets[0],
        calculations: {
          transactionsProcessed: transactions.length,
          totalQuantity: Math.max(0, totalQuantity),
          avgPurchasePrice,
          currentValue
        }
      }
    } catch (error) {
      console.error('Errore in updateAssetFromTransactions:', error)
      throw error
    }
  }, [user, supabase, refetch])

  const updateAllAssetsFromTransactions = useCallback(async () => {
    if (!user) throw new Error('User not authenticated')

    try {
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('id, name')
        .eq('user_id', user.id)

      if (assetsError) throw assetsError
      if (!assets || assets.length === 0) return { message: 'Nessun asset trovato' }

      const results = []
      for (const asset of assets) {
        try {
          const result = await updateAssetFromTransactions(asset.id)
          results.push({ assetId: asset.id, assetName: asset.name, ...result })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto'
          console.error(`Errore aggiornamento asset ${asset.name}:`, error)
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

      return {
        success: true,
        message: `Aggiornati ${successful}/${assets.length} asset`,
        results
      }
    } catch (error) {
      console.error('Errore in updateAllAssetsFromTransactions:', error)
      throw error
    }
  }, [user, supabase, updateAssetFromTransactions])

  const debugAssetTransactions = useCallback(async (assetId?: string) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const assetsQuery = supabase
        .from('assets')
        .select('id, name, quantity, value')
        .eq('user_id', user.id)

      if (assetId) assetsQuery.eq('id', assetId)

      const { data: assets, error: assetsError } = await assetsQuery
      if (assetsError) throw assetsError

      for (const asset of assets || []) {
        const { data: transactions, error: transError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('asset_id', asset.id)
          .order('transaction_date', { ascending: true })

        if (transError) {
          console.error(`Errore recupero transazioni per ${asset.name}:`, transError)
        }
      }

      return { success: true, message: 'Debug completato' }
    } catch (error) {
      console.error('Errore durante il debug:', error)
      throw error
    }
  }, [user, supabase])

  const updateAssetMarketValue = useCallback(async (assetId: string) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .select('id, name, symbol, type, quantity')
        .eq('id', assetId)
        .eq('user_id', user.id)
        .single()

      if (assetError || !asset) {
        console.error('Asset non trovato:', assetError)
        throw new Error('Asset non trovato')
      }

      if (!asset.symbol) throw new Error('Asset non ha un simbolo per il prezzo di mercato')

      const priceResponse = await fetch(`/api/market-price?symbol=${encodeURIComponent(asset.symbol)}&type=${encodeURIComponent(asset.type)}`)
      if (!priceResponse.ok) throw new Error('Prezzo di mercato non disponibile')

      const priceData = await priceResponse.json()
      const currentMarketPrice = priceData.price || 0
      if (currentMarketPrice <= 0) throw new Error('Prezzo di mercato non valido')

      const newValue = asset.quantity * currentMarketPrice

      const { error: updateError } = await supabase
        .from('assets')
        .update({ value: newValue, updated_at: new Date().toISOString() })
        .eq('id', assetId)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Errore aggiornamento valore asset:', updateError)
        throw updateError
      }

      await refetch()

      return {
        success: true,
        message: `Valore aggiornato a ${newValue.toFixed(2)} EUR`,
        newValue
      }
    } catch (error) {
      console.error('Errore in updateAssetMarketValue:', error)
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
    }
    setLoading(true)
    setError(null)

    try {
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
        setUnlinkedTransactions([])
        return
      }

      const { data, error: queryError } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (id, name),
          subcategories (id, name)
        `)
        .eq('user_id', user.id)
        .is('asset_id', null)
        .eq('category_id', categoryData.id)
        .order('transaction_date', { ascending: false })
        .limit(200)

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

export function useAllRefunds() {
  const { data, loading, error, refetch } = useFinanceCache()
  return {
    refunds: data?.refunds || [],
    loading,
    error,
    refetch
  }
}

export function useAllFundsTransfer() {
  const { data, loading, error, refetch } = useFinanceCache()
  return {
    fundsTransfer: data?.fundsTransfer || [],
    loading,
    error,
    refetch
  }
}

export function useAllFinancialOperations() {
  const { data, loading, error, refetch } = useFinanceCache()

  const allOperations = useMemo(() => {
    if (!data) return []
    const operations = [
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
