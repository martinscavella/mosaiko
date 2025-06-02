'use client'

import { useState, useEffect, useCallback } from 'react'
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

  const fetchCategories = useCallback(async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name')
      
      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error('Error fetching categories:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }, [user?.id, supabase])

  useEffect(() => {
    if (user?.id) {
      fetchCategories()
    } else {
      setCategories([])
      setLoading(false)
    }
  }, [user?.id, fetchCategories])

  const createCategory = async (category: CategoryInsert) => {
    if (!user?.id) throw new Error('User not authenticated')
    
    try {
      setError(null)
      const { data, error } = await supabase
        .from('categories')
        .insert({
          ...category,
          user_id: user.id
        })
        .select()
        .single()
      
      if (error) throw error
      
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create category'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const updateCategory = async (id: string, updates: CategoryUpdate) => {
    if (!user?.id) throw new Error('User not authenticated')
    
    try {
      setError(null)
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()
      
      if (error) throw error
      
      setCategories(prev => prev.map(category => 
        category.id === id ? data : category
      ).sort((a, b) => a.name.localeCompare(b.name)))
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update category'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const deleteCategory = async (id: string) => {
    if (!user?.id) throw new Error('User not authenticated')
    
    try {
      setError(null)
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      setCategories(prev => prev.filter(category => category.id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete category'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const getCategoryById = (id: string) => {
    return categories.find(category => category.id === id)
  }

  const getCategoriesByType = (searchTerm: string) => {
    return categories.filter(category => 
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    getCategoriesByType
  }
}
