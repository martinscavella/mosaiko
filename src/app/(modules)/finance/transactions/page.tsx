'use client'

import { useState, useMemo } from 'react'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import TransactionsTable, { TransactionTableColumn } from '@/components/ui/TransactionsTable'
import CacheStatus from '@/components/ui/CacheStatus'
import { useAllTransactions, useFinanceCache, type Transaction } from '@/lib/financeCache'
import { useAuth } from '@/lib/auth'
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Plus,
  TrendingUp,
  RefreshCw
} from 'lucide-react'

export default function TransactionsPage() {  const { transactions, loading, error, refetch } = useAllTransactions()
  const { isDataStale } = useFinanceCache()
  const { user, loading: authLoading } = useAuth()
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [sortBy, setSortBy] = useState('transaction_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSubcategory, setSelectedSubcategory] = useState('all')
  const [selectedDateRange, setSelectedDateRange] = useState('all')  // Logica di filtri duplicata dalla tabella per calcolare le statistiche
  const filteredData = useMemo(() => {
    // Funzione helper per filtrare in base alla data
    const isInDateRange = (transactionDate: string, range: string): boolean => {
      if (range === "all") return true;
      
      const date = new Date(transactionDate);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (range) {
        case "today":
          return date >= startOfToday;
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return date >= weekAgo;
        case "month":
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          return date >= monthAgo;
        case "quarter":
          const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          return date >= quarterAgo;
        case "year":
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          return date >= yearAgo;
        default:
          return true;
      }
    };

    let filtered = [...transactions]

    // Applicazione filtri
    if (selectedFilter !== 'all') {
      switch (selectedFilter) {
        case 'income':
          filtered = filtered.filter((t: Transaction) => 
            t.current_amount > 0 || t.transaction_type === 'income'
          )
          break
        case 'expense':
          filtered = filtered.filter((t: Transaction) => 
            t.current_amount < 0 || t.transaction_type === 'expense'
          )
          break
        case 'transfer':
          filtered = filtered.filter((t: Transaction) => 
            t.transaction_type === 'transfer'
          )
          break
        case 'refunded':
          filtered = filtered.filter((t: Transaction) => 
            t.is_refunded === true
          )
          break
        case 'assets':
          filtered = filtered.filter((t: Transaction) => 
            t.asset_id !== null && t.asset_id !== undefined
          )
          break
      }
    }

    // Filtro per categoria
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t: Transaction) => 
        t.categories?.name === selectedCategory
      )
    }

    // Filtro per sottocategoria
    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter((t: Transaction) => 
        t.subcategories?.name === selectedSubcategory
      )
    }

    // Filtro per intervallo di date
    if (selectedDateRange !== 'all') {
      filtered = filtered.filter((t: Transaction) => 
        isInDateRange(t.transaction_date, selectedDateRange)
      )
    }

    // Applicazione ricerca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter((transaction: Transaction) => {
        return (
          transaction.transaction_details?.toLowerCase().includes(searchLower) ||
          transaction.account_name?.toLowerCase().includes(searchLower) ||
          transaction.categories?.name?.toLowerCase().includes(searchLower) ||
          transaction.subcategories?.name?.toLowerCase().includes(searchLower)
        )
      })
    }

    return filtered
  }, [transactions, selectedFilter, searchTerm, selectedCategory, selectedSubcategory, selectedDateRange])

  // Gestori per filtri avanzati
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setSelectedSubcategory('all') // Reset sottocategoria quando cambia categoria
  }

  const handleSubcategoryChange = (subcategory: string) => {
    setSelectedSubcategory(subcategory)
  }

  const handleDateRangeChange = (dateRange: string) => {
    setSelectedDateRange(dateRange)
  }

  // Calcola le statistiche sui dati filtrati
  const filteredStats = {
    total: filteredData.length,
    income: filteredData.filter((t: Transaction) => t.current_amount > 0).reduce((sum: number, t: Transaction) => sum + t.current_amount, 0),
    expenses: Math.abs(filteredData.filter((t: Transaction) => t.current_amount < 0).reduce((sum: number, t: Transaction) => sum + t.current_amount, 0))
  }

  // Funzioni utili
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      weekday: 'short'
    })
  }
  const formatAmount = (amount: number, isRefunded: boolean = false) => {
    // Mostra "Rimborsato" solo se l'importo corrente è 0 (rimborso totale)
    if (amount === 0 && isRefunded) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Rimborsato
        </span>
      )
    }
    // Altrimenti mostra sempre l'importo corrente
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.current_amount > 0) {
      return <ArrowDownLeft className="h-4 w-4 text-green-600" />
    } else if (transaction.transaction_type === 'investment') {
      return <TrendingUp className="h-4 w-4 text-blue-600" />
    } else {
      return <ArrowUpRight className="h-4 w-4 text-red-600" />
    }
  }
  const getTransactionColor = (transaction: Transaction) => {
    // Verde solo se è completamente rimborsato (importo corrente = 0 e flag rimborso attivo)
    if (transaction.current_amount === 0 && transaction.is_refunded) {
      return 'text-green-600'
    } else if (transaction.current_amount > 0) {
      return 'text-green-600'
    } else if (transaction.transaction_type === 'investment') {
      return 'text-blue-600'
    } else {
      return 'text-red-600'
    }
  }
  // Definizione colonne tabella
  const columns: TransactionTableColumn[] = [
    {
      key: 'transaction_date',
      label: 'Data',
      sortable: true,
      render: (transaction: Transaction) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 text-sm">
            {formatDate(transaction.transaction_date)}
          </span>
        </div>
      )
    },
    {
      key: 'transaction_details',
      label: 'Descrizione',
      sortable: true,
      className: 'max-w-xs',
      render: (transaction: Transaction) => (
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
              {getTransactionIcon(transaction)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 break-words leading-snug">
              {transaction.transaction_details}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {transaction.account_name && (
                <span className="text-sm text-gray-500">
                  {transaction.account_name}
                </span>
              )}
              {transaction.is_refunded && (                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Rimborsato
                </span>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'categories',
      label: 'Categoria',
      sortable: true,
      render: (transaction: Transaction) => (
        <div className="flex flex-col">
          {transaction.categories?.name ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {transaction.categories.name}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">Nessuna categoria</span>
          )}
        </div>
      )
    },    {
      key: 'subcategories',
      label: 'Sottocategoria',
      sortable: true,
      render: (transaction: Transaction) => (
        <div className="flex flex-col">
          {transaction.subcategories?.name ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {transaction.subcategories.name}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">Nessuna sottocategoria</span>
          )}
        </div>
      )
    },
    {
      key: 'current_amount',
      label: 'Importo',
      sortable: true,
      className: 'text-right',
      render: (transaction: Transaction) => (
        <div className="text-right">
          <p className={`text-base font-semibold ${getTransactionColor(transaction)}`}>
            {transaction.current_amount > 0 ? '+' : ''}
            {formatAmount(transaction.current_amount, transaction.is_refunded)}
          </p>
          <p className="text-xs text-gray-500 mt-1 capitalize">
            {transaction.transaction_type}
          </p>
        </div>
      )
    }
  ]
  // Gestione ordinamento
  const handleSort = (columnKey: string, order: 'asc' | 'desc') => {
    setSortBy(columnKey)
    setSortOrder(order)
  }

  if (authLoading) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </ModuleLayout>
    )
  }

  if (!user) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-500">Devi effettuare il login per visualizzare le transazioni</p>
          </div>
        </div>
      </ModuleLayout>
    )
  }

  return (
    <ModuleLayout moduleId="finance">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">        <ModuleHeader
          title="Transazioni"
          subtitle="Visualizza e gestisci tutte le tue transazioni finanziarie"
          icon={<Calendar className="h-6 w-6 text-white" />}
          customContent={<CacheStatus />}
          statusIndicators={[
            {
              type: 'warning',
              label: 'Aggiornamento consigliato',
              show: isDataStale
            },
            {
              type: 'success',
              label: 'Tutti i sistemi operativi',
              show: !loading && !error && transactions.length > 0
            }          ]}          stats={!loading && transactions.length > 0 ? [
            {
              label: 'Totale Transazioni',
              value: filteredStats.total.toString(),
              color: 'blue'
            },
            {
              label: 'Entrate',
              value: new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(
                filteredStats.income
              ),
              color: 'green'
            },
            {
              label: 'Uscite',
              value: new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(
                filteredStats.expenses
              ),
              color: 'orange'
            }
          ] : []}
          actions={[
            {
              label: 'Nuova',
              onClick: () => {},
              icon: <Plus className="w-4 h-4" />,
              color: 'green',
              hideTextOnMobile: true
            },
            {
              label: 'Aggiorna',
              onClick: () => refetch(),
              icon: <RefreshCw className="w-4 h-4" />,
              color: 'blue',
              disabled: loading,
              loading: loading,
              hideTextOnMobile: true
            }
          ]}        />        {/* Tabella con filtri integrati */}        <TransactionsTable
          data={transactions}
          columns={columns}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          loading={loading}
          emptyMessage="Nessuna transazione trovata"
          emptyIcon={<Calendar className="h-16 w-16 text-gray-400" />}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          enableFilters={true}
          enableSearch={true}
          searchPlaceholder="Cerca transazioni..."
          searchFields={['transaction_details', 'account_name', 'categories.name', 'subcategories.name']}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          selectedSubcategory={selectedSubcategory}
          onSubcategoryChange={handleSubcategoryChange}
          selectedDateRange={selectedDateRange}
          onDateRangeChange={handleDateRangeChange}
        />

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 text-red-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-600 text-sm font-medium">Errore nel caricamento: {error}</p>
            </div>
          </div>
        )}
      </div>
    </ModuleLayout>
  )
}