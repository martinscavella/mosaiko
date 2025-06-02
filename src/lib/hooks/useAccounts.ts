'use client'

import { useState, useEffect, useCallback } from 'react'
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

  const fetchAccounts = useCallback(async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setAccounts(data || [])
    } catch (err) {
      console.error('Error fetching accounts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts')
    } finally {
      setLoading(false)
    }
  }, [user?.id, supabase])

  useEffect(() => {
    if (user?.id) {
      fetchAccounts()
    } else {
      setAccounts([])
      setLoading(false)
    }
  }, [user?.id, fetchAccounts])

  const createAccount = async (account: AccountInsert) => {
    if (!user?.id) throw new Error('User not authenticated')
    
    try {
      setError(null)
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          ...account,
          user_id: user.id
        })
        .select()
        .single()
      
      if (error) throw error
      
      setAccounts(prev => [data, ...prev])
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const updateAccount = async (id: string, updates: AccountUpdate) => {
    if (!user?.id) throw new Error('User not authenticated')
    
    try {
      setError(null)
      const { data, error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()
      
      if (error) throw error
      
      setAccounts(prev => prev.map(account => 
        account.id === id ? data : account
      ))
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update account'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const deleteAccount = async (id: string) => {
    if (!user?.id) throw new Error('User not authenticated')
    
    try {
      setError(null)
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      setAccounts(prev => prev.filter(account => account.id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete account'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const getAccountById = (id: string) => {
    return accounts.find(account => account.id === id)
  }

  const getTotalBalance = () => {
    return accounts.reduce((total, account) => total + (account.current_balance || 0), 0)
  }

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    getAccountById,
    getTotalBalance
  }
}