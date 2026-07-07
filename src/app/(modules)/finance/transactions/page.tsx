'use client'

import { useState, useEffect } from 'react'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import TransactionsTable, { TransactionTableColumn } from '@/components/ui/TransactionsTable'
import CacheStatus from '@/components/ui/CacheStatus'
import NewTransactionModal from '@/components/ui/NewTransactionModal'
import TransactionDetailsModal from '@/components/ui/TransactionDetailsModal'
import DeleteTransactionModal from '@/components/ui/DeleteTransactionModal'
import RowActionsMenu from '@/components/ui/RowActionsMenu'
import { useAllTransactions, useFinanceCache, type Transaction } from '@/lib/financeCache'
import { useAuth } from '@/lib/auth'
import { useTransactionFilters } from '@/hooks/useTransactionFilters'
import {
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Plus,
  TrendingUp,
  RefreshCw
} from 'lucide-react'

export default function TransactionsPage() {
  const { transactions, loading, error, refetch } = useAllTransactions()
  const { isDataStale } = useFinanceCache()
  const { user, loading: authLoading } = useAuth()
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false)

  // Azioni di riga: dettaglio, modifica, eliminazione
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const openDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setShowDetailsModal(true)
  }
  const openEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setShowDetailsModal(false)
    setShowEditModal(true)
  }
  const openDelete = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setShowDetailsModal(false)
    setShowDeleteModal(true)
  }

  // Unica fonte di verità per filtri/ordinamento: usata sia dalla vista
  // mobile che dalla tabella desktop, cosi non possono più divergere.
  const {
    filters,
    setFilter,
    sortBy,
    sortOrder,
    handleSort,
    filteredTransactions,
    availableCategories,
    availableSubcategories
  } = useTransactionFilters(transactions)

  // Listener per il FAB della navbar mobile
  useEffect(() => {
    const handleOpenModal = () => {
      setShowNewTransactionModal(true);
    };

    window.addEventListener('openNewItemModal', handleOpenModal);
    return () => window.removeEventListener('openNewItemModal', handleOpenModal);
  }, []);

  // Statistiche sui dati filtrati (stessa fonte usata da mobile e desktop)
  const filteredStats = {
    total: filteredTransactions.length,
    income: filteredTransactions.filter((t: Transaction) => t.current_amount > 0).reduce((sum: number, t: Transaction) => sum + t.current_amount, 0),
    expenses: Math.abs(filteredTransactions.filter((t: Transaction) => t.current_amount < 0).reduce((sum: number, t: Transaction) => sum + t.current_amount, 0))
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
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-subtle text-success-strong">
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
      return <ArrowDownLeft className="h-4 w-4 text-success-strong" />
    } else if (transaction.transaction_type === 'investment') {
      return <TrendingUp className="h-4 w-4 text-primary" />
    } else {
      return <ArrowUpRight className="h-4 w-4 text-danger" />
    }
  }
  const getTransactionColor = (transaction: Transaction) => {
    // Verde solo se è completamente rimborsato (importo corrente = 0 e flag rimborso attivo)
    if (transaction.current_amount === 0 && transaction.is_refunded) {
      return 'text-success-strong'
    } else if (transaction.current_amount > 0) {
      return 'text-success-strong'
    } else if (transaction.transaction_type === 'investment') {
      return 'text-primary'
    } else {
      return 'text-danger'
    }
  }

  // Paginazione (condivisa tra vista mobile e desktop, sugli stessi dati filtrati+ordinati)
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const paginatedMobileData = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    (currentPage - 1) * itemsPerPage + itemsPerPage
  )

  // Definizione colonne tabella
  const columns: TransactionTableColumn[] = [
    {
      key: 'transaction_date',
      label: 'Data',
      sortable: true,
      render: (transaction: Transaction) => (
        <div className="flex flex-col">
          <span className="font-medium text-ink text-sm">
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
            <div className="h-8 w-8 bg-inset rounded-lg flex items-center justify-center">
              {getTransactionIcon(transaction)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-ink break-words leading-snug">
              {transaction.transaction_details}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {transaction.account_name && (
                <span className="text-sm text-ink-muted">
                  {transaction.account_name}
                </span>
              )}
              {transaction.is_refunded && (                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-subtle text-success-strong">
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
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-subtle text-primary">
              {transaction.categories.name}
            </span>
          ) : (
            <span className="text-ink-muted text-xs">Nessuna categoria</span>
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
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-module-health-subtle text-module-health">
              {transaction.subcategories.name}
            </span>
          ) : (
            <span className="text-ink-muted text-xs">Nessuna sottocategoria</span>
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
          <p className={`text-base font-semibold font-amount ${getTransactionColor(transaction)}`}>
            {transaction.current_amount > 0 ? '+' : ''}
            {formatAmount(transaction.current_amount, transaction.is_refunded)}
          </p>
          <p className="text-xs text-ink-muted mt-1 capitalize">
            {transaction.transaction_type}
          </p>
        </div>
      )
    },
    {
      key: 'actions',
      label: '',
      sortable: false,
      className: 'w-12 text-right',
      render: (transaction: Transaction) => (
        <RowActionsMenu
          onDetails={() => openDetails(transaction)}
          onEdit={() => openEdit(transaction)}
          onDelete={() => openDelete(transaction)}
        />
      )
    }
  ]

  if (authLoading) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-inset rounded w-64 mb-8"></div>
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-inset rounded-lg"></div>
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
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
          <div className="text-center">
            <p className="text-ink-muted">Devi effettuare il login per visualizzare le transazioni</p>
          </div>
        </div>
      </ModuleLayout>
    )
  }

  return (
    <ModuleLayout moduleId="finance">
      <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
        <ModuleHeader
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
            }
          ]}
          stats={!loading && transactions.length > 0 ? [
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
              onClick: () => setShowNewTransactionModal(true),
              icon: <Plus className="w-4 h-4" />,
              color: 'green',
              hideTextOnMobile: true,
              hideOnMobile: true
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
          ]}
        />

        {/* Vista Mobile - Card compatte */}
        <div className="md:hidden space-y-4">
          {/* Barra ricerca e filtri mobile */}
          <div className="bg-surface rounded-lg border border-edge p-3 space-y-3">
            <input
              type="text"
              placeholder="Cerca transazioni..."
              value={filters.search}
              onChange={(e) => {
                setFilter('search', e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 border border-edge rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filters.type}
                onChange={(e) => {
                  setFilter('type', e.target.value as typeof filters.type)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border border-edge rounded-lg text-sm focus:ring-2 focus:ring-primary"
              >
                <option value="all">Tutti</option>
                <option value="income">Entrate</option>
                <option value="expense">Uscite</option>
                <option value="transfer">Bonifici</option>
                <option value="refunded">Rimborsati</option>
                <option value="assets">Asset</option>
              </select>
              <select
                value={filters.dateRange}
                onChange={(e) => {
                  setFilter('dateRange', e.target.value as typeof filters.dateRange)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border border-edge rounded-lg text-sm focus:ring-2 focus:ring-primary"
              >
                <option value="all">Tutte le date</option>
                <option value="today">Oggi</option>
                <option value="week">Ultima settimana</option>
                <option value="month">Ultimo mese</option>
                <option value="quarter">Ultimo trimestre</option>
                <option value="year">Ultimo anno</option>
              </select>
            </div>
          </div>

          {/* Lista transazioni mobile */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-inset rounded-lg h-24 animate-pulse"></div>
              ))}
            </div>
          ) : paginatedMobileData.length === 0 ? (
            <div className="bg-surface rounded-lg border border-edge p-8 text-center">
              <Calendar className="h-12 w-12 text-ink-muted mx-auto mb-3" />
              <p className="text-ink-muted text-sm">Nessuna transazione trovata</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedMobileData.map((transaction: Transaction, index: number) => (
                  <div
                    key={`${transaction.transaction_date}-${index}`}
                    className="bg-surface rounded-lg border border-edge p-4 active:bg-canvas transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="h-10 w-10 bg-inset rounded-lg flex items-center justify-center">
                            {getTransactionIcon(transaction)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-ink text-sm mb-1 break-words leading-tight">
                            {transaction.transaction_details}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-xs text-ink-muted">
                              {formatDate(transaction.transaction_date)}
                            </span>
                            {transaction.account_name && (
                              <>
                                <span className="text-ink-muted">•</span>
                                <span className="text-xs text-ink-muted truncate">
                                  {transaction.account_name}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {transaction.categories?.name && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-subtle text-primary">
                                {transaction.categories.name}
                              </span>
                            )}
                            {transaction.subcategories?.name && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-module-health-subtle text-module-health">
                                {transaction.subcategories.name}
                              </span>
                            )}
                            {transaction.is_refunded && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-subtle text-success-strong">
                                Rimborsato
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-start gap-1">
                        <div className="text-right">
                          <p className={`text-base font-bold font-amount ${getTransactionColor(transaction)}`}>
                            {transaction.current_amount > 0 ? '+' : ''}
                            {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(transaction.current_amount)}
                          </p>
                          <p className="text-xs text-ink-muted mt-0.5 capitalize">
                            {transaction.transaction_type}
                          </p>
                        </div>
                        <RowActionsMenu
                          onDetails={() => openDetails(transaction)}
                          onEdit={() => openEdit(transaction)}
                          onDelete={() => openDelete(transaction)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginazione mobile */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-surface rounded-lg border border-edge p-3">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm font-medium text-ink-secondary bg-inset rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Prec
                  </button>
                  <span className="text-sm text-ink-secondary">
                    Pagina {currentPage} di {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm font-medium text-ink-secondary bg-inset rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Succ
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Tabella con filtri integrati - Solo Desktop */}
        <div className="hidden md:block">
          <TransactionsTable
            data={filteredTransactions}
            columns={columns}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            loading={loading}
            emptyMessage="Nessuna transazione trovata"
            emptyIcon={<Calendar className="h-16 w-16 text-ink-muted" />}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            enableFilters={true}
            enableSearch={true}
            searchPlaceholder="Cerca transazioni..."
            searchTerm={filters.search}
            onSearchChange={(value) => setFilter('search', value)}
            selectedFilter={filters.type}
            onFilterChange={(value) => setFilter('type', value)}
            selectedCategory={filters.category}
            onCategoryChange={(value) => setFilter('category', value)}
            selectedSubcategory={filters.subcategory}
            onSubcategoryChange={(value) => setFilter('subcategory', value)}
            selectedDateRange={filters.dateRange}
            onDateRangeChange={(value) => setFilter('dateRange', value as typeof filters.dateRange)}
            availableCategories={availableCategories}
            availableSubcategories={availableSubcategories}
          />
        </div>

        {error && (
          <div className="mt-4 bg-danger-subtle border border-danger-subtle rounded-lg p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 text-danger">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-danger text-sm font-medium">Errore nel caricamento: {error}</p>
            </div>
          </div>
        )}

        {/* Modale per Nuova Transazione */}
        <NewTransactionModal
          isOpen={showNewTransactionModal}
          onClose={() => setShowNewTransactionModal(false)}
          onSuccess={() => {
            setShowNewTransactionModal(false)
            // Le cache si aggiornano automaticamente tramite il componente modale
          }}
        />

        {/* Dettaglio completo con azioni */}
        <TransactionDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          transaction={selectedTransaction}
          onEdit={openEdit}
          onDelete={openDelete}
        />

        {/* Modifica transazione (riusa il form completo di creazione) */}
        <NewTransactionModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          editTransaction={showEditModal ? selectedTransaction : null}
          onSuccess={() => {
            setShowEditModal(false)
            setSelectedTransaction(null)
          }}
        />

        {/* Conferma eliminazione */}
        <DeleteTransactionModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          transaction={selectedTransaction}
          onDeleted={() => setSelectedTransaction(null)}
        />
      </div>
    </ModuleLayout>
  )
}
