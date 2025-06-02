'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    if (user) {
      fetchTransactions()
    } else {
      setTransactions([])
      setLoading(false)
    }
  }, [user])

  const fetchTransactions = async (limit = 50) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts (name, type),
          categories (name, icon),
          subcategories (name, icon)
        `)
        .eq('user_id', user?.id)
        .order('transaction_date', { ascending: false })
        .limit(limit)

      if (error) throw error

      setTransactions(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const createTransaction = async (transactionData: Omit<TransactionInsert, 'user_id'>) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{ ...transactionData, user_id: user?.id }])
        .select(`
          *,
          accounts (name, type),
          categories (name, icon),
          subcategories (name, icon)
        `)
        .single()

      if (error) throw error

      setTransactions(prev => [data, ...prev])
      return { data, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    }
  }

  const updateTransaction = async (id: string, updates: TransactionUpdate) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user?.id)
        .select(`
          *,
          accounts (name, type),
          categories (name, icon),
          subcategories (name, icon)
        `)
        .single()

      if (error) throw error

      setTransactions(prev => 
        prev.map(transaction => transaction.id === id ? data : transaction)
      )
      return { data, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    }
  }

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id)

      if (error) throw error

      setTransactions(prev => prev.filter(transaction => transaction.id !== id))
      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return { error: errorMessage }
    }
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
        const amount = Number(transaction.current_amount)
        return type === 'income' ? amount > 0 : amount < 0
      })
      .reduce((total, transaction) => total + Math.abs(Number(transaction.current_amount)), 0)
  }

  const getMonthlyTotal = (year: number, month: number) => {
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`
    return transactions
      .filter(transaction => transaction.transaction_date.startsWith(monthStr))
      .reduce((total, transaction) => total + Number(transaction.current_amount), 0)
  }

  return {
    transactions,
    loading,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
    getTransactionsByDateRange,
    getTotalByType,
    getMonthlyTotal
  }
}
