'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '../supabase'
import { useAuth } from '../auth'
import { Database } from '../database.types'

type Transaction = Database['public']['Tables']['transactions']['Row']
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

export function useTransactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  const fetchTransactions = useCallback(async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      let allTransactions: Transaction[] = []
      let from = 0
      const limit = 1000
      let hasMore = true

      while (hasMore) {
        const { data, error, count } = await supabase
          .from('transactions')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false })
          .range(from, from + limit - 1)
        
        if (error) throw error
        
        if (data) {
          allTransactions = [...allTransactions, ...data]
          from += limit
          hasMore = data.length === limit && from < (count || 0)
        } else {
          hasMore = false
        }
      }
      
      setTransactions(allTransactions)
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions')
    } finally {
      setLoading(false)
    }
  }, [user?.id, supabase])

  useEffect(() => {
    if (user?.id) {
      fetchTransactions()
    } else {
      setTransactions([])
      setLoading(false)
    }
  }, [user?.id, fetchTransactions])

  const createTransaction = async (transaction: TransactionInsert) => {
    if (!user?.id) throw new Error('User not authenticated')
    
    try {
      setError(null)
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...transaction,
          user_id: user.id
        })
        .select()
        .single()
      
      if (error) throw error
      
      setTransactions(prev => [data, ...prev])
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create transaction'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const updateTransaction = async (id: string, updates: TransactionUpdate) => {
    if (!user?.id) throw new Error('User not authenticated')
    
    try {
      setError(null)
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()
      
      if (error) throw error
      
      setTransactions(prev => prev.map(transaction => 
        transaction.id === id ? data : transaction
      ))
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update transaction'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const deleteTransaction = async (id: string) => {
    if (!user?.id) throw new Error('User not authenticated')
    
    try {
      setError(null)
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      setTransactions(prev => prev.filter(transaction => transaction.id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete transaction'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const getTransactionById = (id: string) => {
    return transactions.find(transaction => transaction.id === id)
  }

  const getTransactionsByDateRange = (startDate: string, endDate: string) => {
    return transactions.filter(transaction => 
      transaction.transaction_date >= startDate && 
      transaction.transaction_date <= endDate
    )
  }

  const getTotalByType = (type: 'income' | 'expense') => {
    return transactions
      .filter(transaction => {
        const amount = transaction.current_amount
        return type === 'income' ? amount > 0 : amount < 0
      })
      .reduce((total, transaction) => total + Math.abs(transaction.current_amount), 0)
  }

  return {
    transactions,
    loading,
    error,
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionById,
    getTransactionsByDateRange,
    getTotalByType
  }
}
