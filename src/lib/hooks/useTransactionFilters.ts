import { useMemo, useState, useCallback } from 'react'
import { type Transaction } from '@/lib/financeCache'
import { isInDateRange, type DateRangeType } from '@/lib/helpers/dateRange'

export interface TransactionFilters {
  searchTerm: string
  selectedFilter: string
  selectedCategory: string
  selectedSubcategory: string
  selectedDateRange: string
}

export interface UseTransactionFiltersReturn {
  filters: TransactionFilters
  setSearchTerm: (v: string) => void
  setSelectedFilter: (v: string) => void
  setSelectedCategory: (v: string) => void
  setSelectedSubcategory: (v: string) => void
  setSelectedDateRange: (v: string) => void
  resetFilters: () => void
  applyFilters: (transactions: Transaction[]) => Transaction[]
}

const defaultFilters: TransactionFilters = {
  searchTerm: '',
  selectedFilter: 'all',
  selectedCategory: 'all',
  selectedSubcategory: 'all',
  selectedDateRange: 'all',
}

/**
 * Hook condiviso per la logica di filtraggio delle transazioni.
 * Usato da TransactionsPage (mobile + desktop) e TransactionsTable.
 * Elimina la duplicazione della logica filtri tra i due componenti.
 */
export function useTransactionFilters(): UseTransactionFiltersReturn {
  const [filters, setFilters] = useState<TransactionFilters>(defaultFilters)

  const setSearchTerm = useCallback(
    (v: string) => setFilters(prev => ({ ...prev, searchTerm: v })),
    []
  )
  const setSelectedFilter = useCallback(
    (v: string) => setFilters(prev => ({ ...prev, selectedFilter: v })),
    []
  )
  const setSelectedCategory = useCallback(
    (v: string) => setFilters(prev => ({ ...prev, selectedCategory: v, selectedSubcategory: 'all' })),
    []
  )
  const setSelectedSubcategory = useCallback(
    (v: string) => setFilters(prev => ({ ...prev, selectedSubcategory: v })),
    []
  )
  const setSelectedDateRange = useCallback(
    (v: string) => setFilters(prev => ({ ...prev, selectedDateRange: v })),
    []
  )
  const resetFilters = useCallback(() => setFilters(defaultFilters), [])

  const applyFilters = useCallback(
    (transactions: Transaction[]): Transaction[] => {
      let filtered = [...transactions]

      // Filtro per tipo
      if (filters.selectedFilter !== 'all') {
        switch (filters.selectedFilter) {
          case 'income':
            filtered = filtered.filter(t => t.current_amount > 0 || t.transaction_type === 'income')
            break
          case 'expense':
            filtered = filtered.filter(t => t.current_amount < 0 || t.transaction_type === 'expense')
            break
          case 'transfer':
            filtered = filtered.filter(t => t.transaction_type === 'transfer')
            break
          case 'refunded':
            filtered = filtered.filter(t => t.is_refunded === true)
            break
          case 'assets':
            filtered = filtered.filter(t => t.asset_id != null)
            break
        }
      }

      // Filtro per categoria
      if (filters.selectedCategory !== 'all') {
        filtered = filtered.filter(t => t.categories?.name === filters.selectedCategory)
      }

      // Filtro per sottocategoria
      if (filters.selectedSubcategory !== 'all') {
        filtered = filtered.filter(t => t.subcategories?.name === filters.selectedSubcategory)
      }

      // Filtro per intervallo date
      if (filters.selectedDateRange !== 'all') {
        filtered = filtered.filter(t =>
          isInDateRange(t.transaction_date, filters.selectedDateRange as DateRangeType)
        )
      }

      // Ricerca testuale
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase()
        filtered = filtered.filter(t =>
          t.transaction_details?.toLowerCase().includes(term) ||
          t.account_name?.toLowerCase().includes(term) ||
          t.categories?.name?.toLowerCase().includes(term) ||
          t.subcategories?.name?.toLowerCase().includes(term)
        )
      }

      return filtered
    },
    [filters]
  )

  return {
    filters,
    setSearchTerm,
    setSelectedFilter,
    setSelectedCategory,
    setSelectedSubcategory,
    setSelectedDateRange,
    resetFilters,
    applyFilters,
  }
}

/**
 * Versione memoizzata: accetta transazioni esterne e restituisce
 * direttamente il risultato filtrato (utile per componenti che
 * ricevono le transazioni come prop).
 */
export function useFilteredTransactions(
  transactions: Transaction[],
  filters: TransactionFilters
): Transaction[] {
  return useMemo(() => {
    let filtered = [...transactions]

    if (filters.selectedFilter !== 'all') {
      switch (filters.selectedFilter) {
        case 'income':
          filtered = filtered.filter(t => t.current_amount > 0 || t.transaction_type === 'income')
          break
        case 'expense':
          filtered = filtered.filter(t => t.current_amount < 0 || t.transaction_type === 'expense')
          break
        case 'transfer':
          filtered = filtered.filter(t => t.transaction_type === 'transfer')
          break
        case 'refunded':
          filtered = filtered.filter(t => t.is_refunded === true)
          break
        case 'assets':
          filtered = filtered.filter(t => t.asset_id != null)
          break
      }
    }

    if (filters.selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.categories?.name === filters.selectedCategory)
    }

    if (filters.selectedSubcategory !== 'all') {
      filtered = filtered.filter(t => t.subcategories?.name === filters.selectedSubcategory)
    }

    if (filters.selectedDateRange !== 'all') {
      filtered = filtered.filter(t =>
        isInDateRange(t.transaction_date, filters.selectedDateRange as DateRangeType)
      )
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(t =>
        t.transaction_details?.toLowerCase().includes(term) ||
        t.account_name?.toLowerCase().includes(term) ||
        t.categories?.name?.toLowerCase().includes(term) ||
        t.subcategories?.name?.toLowerCase().includes(term)
      )
    }

    return filtered
  }, [transactions, filters])
}
