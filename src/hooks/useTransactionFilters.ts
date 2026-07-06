'use client'

import { useCallback, useMemo, useState } from 'react'
import type { Transaction } from '@/lib/financeCache'
import { isInDateRange, type DateRangeType } from '@/lib/helpers/dateRange'

export type TransactionFilterType = 'all' | 'income' | 'expense' | 'transfer' | 'refunded' | 'assets'
export type TransactionSortField = string
export type SortOrder = 'asc' | 'desc'

export interface TransactionFiltersState {
  search: string
  type: TransactionFilterType
  category: string
  subcategory: string
  dateRange: DateRangeType
}

const DEFAULT_FILTERS: TransactionFiltersState = {
  search: '',
  type: 'all',
  category: 'all',
  subcategory: 'all',
  dateRange: 'all'
}

/**
 * Unica fonte di verità per filtro/ordinamento delle transazioni.
 * Usata sia dalla vista mobile che dalla tabella desktop in
 * finance/transactions, cosi' i due non applicano due volte la stessa
 * logica (e non possono più divergere).
 */
export function useTransactionFilters(transactions: Transaction[]) {
  const [filters, setFilters] = useState<TransactionFiltersState>(DEFAULT_FILTERS)
  const [sortBy, setSortBy] = useState<TransactionSortField>('transaction_date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const setFilter = useCallback(<K extends keyof TransactionFiltersState>(
    key: K,
    value: TransactionFiltersState[K]
  ) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value }
      // Reset sottocategoria quando cambia la categoria, come nel comportamento originale
      if (key === 'category') {
        next.subcategory = 'all'
      }
      return next
    })
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const handleSort = useCallback((field: TransactionSortField, order?: SortOrder) => {
    if (order) {
      setSortBy(field)
      setSortOrder(order)
      return
    }
    setSortBy(prevSortBy => {
      if (prevSortBy === field) {
        setSortOrder(prevOrder => (prevOrder === 'asc' ? 'desc' : 'asc'))
        return prevSortBy
      }
      setSortOrder('asc')
      return field
    })
  }, [])

  // Opzioni categoria/sottocategoria derivate dal set COMPLETO di transazioni
  // (non da quello filtrato), cosi' i filtri disponibili non si restringono
  // via via che l'utente filtra.
  const availableCategories = useMemo(() => {
    const categories = new Set<string>()
    transactions.forEach(t => {
      if (t.categories?.name) categories.add(t.categories.name)
    })
    return Array.from(categories).sort()
  }, [transactions])

  const availableSubcategories = useMemo(() => {
    const subcategories = new Set<string>()
    transactions.forEach(t => {
      if (t.subcategories?.name && (filters.category === 'all' || t.categories?.name === filters.category)) {
        subcategories.add(t.subcategories.name)
      }
    })
    return Array.from(subcategories).sort()
  }, [transactions, filters.category])

  const filteredTransactions = useMemo(() => {
    let result = transactions

    if (filters.type !== 'all') {
      switch (filters.type) {
        case 'income':
          result = result.filter(t => t.current_amount > 0 || t.transaction_type === 'income')
          break
        case 'expense':
          result = result.filter(t => t.current_amount < 0 || t.transaction_type === 'expense')
          break
        case 'transfer':
          result = result.filter(t => t.transaction_type === 'transfer')
          break
        case 'refunded':
          result = result.filter(t => t.is_refunded === true)
          break
        case 'assets':
          result = result.filter(t => t.asset_id !== null && t.asset_id !== undefined)
          break
      }
    }

    if (filters.category !== 'all') {
      result = result.filter(t => t.categories?.name === filters.category)
    }

    if (filters.subcategory !== 'all') {
      result = result.filter(t => t.subcategories?.name === filters.subcategory)
    }

    if (filters.dateRange !== 'all') {
      result = result.filter(t => isInDateRange(t.transaction_date, filters.dateRange))
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(t =>
        t.transaction_details?.toLowerCase().includes(searchLower) ||
        t.account_name?.toLowerCase().includes(searchLower) ||
        t.categories?.name?.toLowerCase().includes(searchLower) ||
        t.subcategories?.name?.toLowerCase().includes(searchLower)
      )
    }

    return result
  }, [transactions, filters])

  const filteredAndSortedTransactions = useMemo(() => {
    const data = [...filteredTransactions]

    data.sort((a, b) => {
      const aVal = a[sortBy as keyof Transaction]
      const bVal = b[sortBy as keyof Transaction]

      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      }
      return aVal < bVal ? 1 : -1
    })

    return data
  }, [filteredTransactions, sortBy, sortOrder])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.type !== 'all') count++
    if (filters.category !== 'all') count++
    if (filters.subcategory !== 'all') count++
    if (filters.dateRange !== 'all') count++
    if (filters.search) count++
    return count
  }, [filters])

  return {
    filters,
    setFilter,
    resetFilters,
    sortBy,
    sortOrder,
    handleSort,
    filteredTransactions: filteredAndSortedTransactions,
    availableCategories,
    availableSubcategories,
    activeFilterCount
  }
}
