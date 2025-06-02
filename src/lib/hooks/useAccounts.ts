'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '../supabase'
import { useAuth } from '../auth'
import { Database } from '../database.types'

type Account = Database['public']['Tables']['accounts']['Row']
type AccountInsert = Database['public']['Tables']['accounts']['Insert']
type AccountUpdate = Database['public']['Tables']['accounts']['Update']

export function useAccounts() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (user) {
      fetchAccounts()
    } else {
      setAccounts([])
      setLoading(false)
    }
  }, [user])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setAccounts(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const createAccount = async (accountData: Omit<AccountInsert, 'user_id'>) => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert([{ ...accountData, user_id: user?.id }])
        .select()
        .single()

      if (error) throw error

      setAccounts(prev => [data, ...prev])
      return { data, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    }
  }

  const updateAccount = async (id: string, updates: AccountUpdate) => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user?.id)
        .select()
        .single()

      if (error) throw error

      setAccounts(prev => 
        prev.map(account => account.id === id ? data : account)
      )
      return { data, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    }
  }

  const deleteAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id)

      if (error) throw error

      setAccounts(prev => prev.filter(account => account.id !== id))
      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  const getTotalBalance = () => {
    return accounts.reduce((total, account) => total + Number(account.current_balance), 0)
  }

  return {
    accounts,
    loading,
    error,
    createAccount,
    updateAccount,
    deleteAccount,
    refetch: fetchAccounts,
    getTotalBalance
  }
}
