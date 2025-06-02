'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '../supabase'
import { useAuth } from '../auth'
import { Database } from '../database.types'

type Category = Database['public']['Tables']['categories']['Row']
type CategoryInsert = Database['public']['Tables']['categories']['Insert']
type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export function useCategories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (user) {
      fetchCategories()
    } else {
      setCategories([])
      setLoading(false)
    }
  }, [user])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          subcategories (*)
        `)
        .eq('user_id', user?.id)
        .order('name', { ascending: true })

      if (error) throw error

      setCategories(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const createCategory = async (categoryData: Omit<CategoryInsert, 'user_id'>) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ ...categoryData, user_id: user?.id }])
        .select()
        .single()

      if (error) throw error

      setCategories(prev => [...prev, data])
      return { data, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    }
  }

  const updateCategory = async (id: string, updates: CategoryUpdate) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user?.id)
        .select()
        .single()

      if (error) throw error

      setCategories(prev => 
        prev.map(category => category.id === id ? data : category)
      )
      return { data, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    }
  }

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id)

      if (error) throw error

      setCategories(prev => prev.filter(category => category.id !== id))
      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  return {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    refetch: fetchCategories
  }
}
