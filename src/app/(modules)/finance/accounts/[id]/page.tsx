'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ModuleLayout from '@/components/ModuleLayout'
import TotalBalanceChart from '@/components/ui/TotalBalanceChart'
import TransactionsTable, { TransactionTableColumn } from '@/components/ui/TransactionsTable'
import RowActionsMenu from '@/components/ui/RowActionsMenu'
import NewTransactionModal from '@/components/ui/NewTransactionModal'
import TransactionDetailsModal from '@/components/ui/TransactionDetailsModal'
import DeleteTransactionModal from '@/components/ui/DeleteTransactionModal'
import AccountFormModal from '@/components/ui/AccountFormModal'
import DeleteAccountModal, { type AccountUsage } from '@/components/ui/DeleteAccountModal'
import { useAuth } from '@/lib/auth'
import { useAccounts, useFinanceCache, useAccountOperations, type Transaction } from '@/lib/financeCache'
import { getAccountTypeLabel, getAccountTypeIcon } from '@/lib/accountTypes'
import { formatCurrency } from '@/lib/helpers/format'
import { formatTransactionDate, getTransactionIcon, getTransactionColor, formatTransactionAmount } from '@/lib/helpers/transactionDisplay'
import { useTransactionFilters } from '@/hooks/useTransactionFilters'
import {
  ArrowLeft,
  Edit2,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
  Wallet,
  ArrowLeftRight,
  RotateCcw,
  Package,
  PieChart,
  Calendar
} from 'lucide-react'

export default function AccountDetailPage() {
  const params = useParams<{ id: string }>()
  const accountId = params.id
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { accounts, loading: accountsLoading } = useAccounts()
  const { data: financeData, loading: dataLoading, hasFullTransactionHistory, loadFullTransactionHistory } = useFinanceCache()
  const { setAccountActive, recalculateAccountBalance } = useAccountOperations()

  const account = useMemo(() => accounts.find((a) => a.id === accountId) || null, [accounts, accountId])

  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [recalculating, setRecalculating] = useState(false)

  // Azioni sui movimenti dell'account (riusa gli stessi modali della pagina Transazioni)
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditTxModal, setShowEditTxModal] = useState(false)
  const [showDeleteTxModal, setShowDeleteTxModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const openTxDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setShowDetailsModal(true)
  }
  const openTxEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setShowDetailsModal(false)
    setShowEditTxModal(true)
  }
  const openTxDelete = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setShowDetailsModal(false)
    setShowDeleteTxModal(true)
  }

  // Movimenti/rimborsi/trasferimenti/asset di questo account, derivati dalla
  // cache già caricata globalmente (nessuna query aggiuntiva). Match per
  // account_id (T3.8): due conti omonimi non si contaminano.
  const accountTransactions = useMemo(() => {
    if (!financeData || !account) return []
    return financeData.transactions.filter((t) => t.account_id === account.id)
  }, [financeData, account])

  const accountRefunds = useMemo(() => {
    if (!financeData || !account) return []
    return financeData.refunds.filter((r) => r.account_id === account.id)
  }, [financeData, account])

  const accountFundsTransfer = useMemo(() => {
    if (!financeData || !account) return []
    return financeData.fundsTransfer.filter((f) => f.account_id === account.id)
  }, [financeData, account])

  const accountAssets = useMemo(() => {
    if (!financeData || !account) return []
    return financeData.assets.filter((a) => a.account_id === account.id)
  }, [financeData, account])

  const usage: AccountUsage = useMemo(() => ({
    transactionsCount: accountTransactions.length,
    refundsCount: accountRefunds.length,
    fundsTransferCount: accountFundsTransfer.length,
    assetsCount: accountAssets.length
  }), [accountTransactions, accountRefunds, accountFundsTransfer, accountAssets])

  const stats = useMemo(() => {
    const totalIn = accountTransactions.filter((t) => t.current_amount > 0).reduce((sum, t) => sum + t.current_amount, 0)
    const totalOut = Math.abs(accountTransactions.filter((t) => t.current_amount < 0).reduce((sum, t) => sum + t.current_amount, 0))
    const refundsTotal = accountRefunds.reduce((sum, r) => sum + r.current_amount, 0)
    const transfersTotal = accountFundsTransfer.reduce((sum, f) => sum + f.amount, 0)
    const assetsValue = accountAssets.reduce((sum, a) => sum + a.value, 0)
    return { totalIn, totalOut, refundsTotal, transfersTotal, assetsValue }
  }, [accountTransactions, accountRefunds, accountFundsTransfer, accountAssets])

  // Spese per categoria (tutto lo storico dell'account, top 5 + resto accorpato)
  const categoryBreakdown = useMemo(() => {
    const totals = new Map<string, number>()
    for (const t of accountTransactions) {
      const amount = Number(t.current_amount || 0)
      if (amount >= 0 || t.asset_id) continue
      const name = t.categories?.name || 'Altro'
      totals.set(name, (totals.get(name) || 0) + Math.abs(amount))
    }
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1])
    const top = sorted.slice(0, 5)
    const restTotal = sorted.slice(5).reduce((sum, [, v]) => sum + v, 0)
    if (restTotal > 0) top.push(['Altre categorie', restTotal])
    const total = sorted.reduce((sum, [, v]) => sum + v, 0)
    return { rows: top.map(([name, value]) => ({ name, value })), total }
  }, [accountTransactions])

  const {
    filters,
    setFilter,
    sortBy,
    sortOrder,
    handleSort,
    filteredTransactions,
    availableCategories,
    availableSubcategories
  } = useTransactionFilters(accountTransactions)

  const handleToggleActive = async () => {
    if (!account) return
    try {
      await setAccountActive(account.id, !account.is_active)
    } catch (err) {
      console.error('Errore nel cambiare stato account:', err)
      alert("Errore durante l'aggiornamento dello stato dell'account")
    }
  }

  const handleRecalculate = async () => {
    if (!account) return
    setRecalculating(true)
    try {
      await recalculateAccountBalance(account.id)
    } catch (err) {
      console.error('Errore nel ricalcolo saldo:', err)
      alert('Errore durante il ricalcolo del saldo')
    } finally {
      setRecalculating(false)
    }
  }

  const columns: TransactionTableColumn[] = [
    {
      key: 'transaction_date',
      label: 'Data',
      sortable: true,
      render: (transaction) => (
        <span className="font-medium text-ink text-sm">{formatTransactionDate(transaction.transaction_date)}</span>
      )
    },
    {
      key: 'transaction_details',
      label: 'Descrizione',
      sortable: true,
      className: 'max-w-xs',
      render: (transaction) => (
        <div className="flex items-start space-x-3">
          <div className="h-8 w-8 bg-inset rounded-lg flex items-center justify-center flex-shrink-0">
            {getTransactionIcon(transaction)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-ink break-words leading-snug">{transaction.transaction_details}</p>
            {transaction.categories?.name && (
              <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-xs font-medium bg-primary-subtle text-primary">
                {transaction.categories.name}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'current_amount',
      label: 'Importo',
      sortable: true,
      className: 'text-right',
      render: (transaction) => (
        <div className="text-right">
          <p className={`text-base font-semibold font-amount ${getTransactionColor(transaction)}`}>
            {transaction.current_amount > 0 ? '+' : ''}
            {formatTransactionAmount(transaction.current_amount, transaction.is_refunded)}
          </p>
          <p className="text-xs text-ink-muted mt-1 capitalize">{transaction.transaction_type}</p>
        </div>
      )
    },
    {
      key: 'actions',
      label: '',
      sortable: false,
      className: 'w-12 text-right',
      render: (transaction) => (
        <RowActionsMenu
          onDetails={() => openTxDetails(transaction)}
          onEdit={() => openTxEdit(transaction)}
          onDelete={() => openTxDelete(transaction)}
        />
      )
    }
  ]

  if (authLoading || accountsLoading || dataLoading) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-inset rounded w-64"></div>
            <div className="h-40 bg-inset rounded-lg"></div>
            <div className="h-80 bg-inset rounded-lg"></div>
          </div>
        </div>
      </ModuleLayout>
    )
  }

  if (!user) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
          <p className="text-ink-muted">Devi effettuare il login per visualizzare questo account</p>
        </div>
      </ModuleLayout>
    )
  }

  if (!account) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8 text-center">
          <p className="text-ink-muted mb-4">Account non trovato</p>
          <button
            onClick={() => router.push('/finance/accounts')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna agli account
          </button>
        </div>
      </ModuleLayout>
    )
  }

  const AccountIcon = getAccountTypeIcon(account.type)

  return (
    <ModuleLayout moduleId="finance">
      <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8 space-y-6">

        {/* Back link */}
        <button
          onClick={() => router.push('/finance/accounts')}
          className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Tutti gli account
        </button>

        {/* Header account */}
        <div className="bg-surface border border-edge rounded-lg shadow-card p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center border"
                style={{ backgroundColor: `${account.color}15`, borderColor: account.color }}
              >
                <AccountIcon className="w-6 h-6" style={{ color: account.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-ink">{account.name}</h1>
                  {!account.is_active && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-inset text-ink-muted">
                      Non attivo
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink-muted">{getAccountTypeLabel(account.type)} · {account.currency}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-canvas rounded-lg border border-edge text-center">
                <div className="text-xs text-ink-muted">Saldo Attuale</div>
                <div className={`text-lg font-semibold font-amount ${account.current_balance >= 0 ? 'text-success-strong' : 'text-danger'}`}>
                  {formatCurrency(account.current_balance)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNewTransactionModal(true)}
                  disabled={!account.is_active}
                  title={account.is_active ? undefined : 'Riattiva l\'account per aggiungere nuovi movimenti'}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-success-strong text-white rounded-lg hover:opacity-90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Movimento</span>
                </button>
                <button
                  onClick={handleRecalculate}
                  disabled={recalculating}
                  title="Ricalcola saldo"
                  className="p-2 rounded-lg text-ink-secondary hover:bg-inset transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setShowEditModal(true)}
                  title="Modifica account"
                  className="p-2 rounded-lg text-ink-secondary hover:bg-inset transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleToggleActive}
                  title={account.is_active ? 'Disattiva account' : 'Riattiva account'}
                  className="p-2 rounded-lg text-ink-secondary hover:bg-inset transition-colors"
                >
                  {account.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  title="Elimina account"
                  className="p-2 rounded-lg text-danger hover:bg-danger-subtle transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiche secondarie */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface border border-edge rounded-lg shadow-card p-4">
            <div className="flex items-center gap-2 text-success-strong mb-1">
              <span className="text-xs font-medium text-ink-muted">Entrate Totali</span>
            </div>
            <p className="text-lg font-semibold font-amount text-success-strong">{formatCurrency(stats.totalIn)}</p>
          </div>
          <div className="bg-surface border border-edge rounded-lg shadow-card p-4">
            <span className="text-xs font-medium text-ink-muted">Uscite Totali</span>
            <p className="text-lg font-semibold font-amount text-danger">{formatCurrency(stats.totalOut)}</p>
          </div>
          <div className="bg-surface border border-edge rounded-lg shadow-card p-4">
            <div className="flex items-center gap-1.5 text-ink-muted mb-1">
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Rimborsi ({accountRefunds.length})</span>
            </div>
            <p className="text-lg font-semibold font-amount text-ink">{formatCurrency(stats.refundsTotal)}</p>
          </div>
          <div className="bg-surface border border-edge rounded-lg shadow-card p-4">
            <div className="flex items-center gap-1.5 text-ink-muted mb-1">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Trasferimenti ({accountFundsTransfer.length})</span>
            </div>
            <p className="text-lg font-semibold font-amount text-ink">{formatCurrency(stats.transfersTotal)}</p>
          </div>
        </div>

        {accountAssets.length > 0 && (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-ink-secondary">
              <Package className="w-4 h-4" />
              <span className="text-sm">{accountAssets.length} asset collegati a questo account</span>
            </div>
            <span className="font-semibold font-amount text-ink">{formatCurrency(stats.assetsValue)}</span>
          </div>
        )}

        {/* Grafico saldo + ripartizione categorie */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TotalBalanceChart
              data={{ transactions: accountTransactions, accounts: [account], assets: [] }}
              title="Andamento Saldo"
              emptyLabel="Andamento del saldo di questo account"
              icon={<Wallet className="h-5 w-5" />}
              hasFullHistory={hasFullTransactionHistory}
              onLoadFullHistory={loadFullTransactionHistory}
            />
          </div>
          <div className="bg-surface border border-edge rounded-lg shadow-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-danger-subtle text-danger">
                <PieChart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-ink">Spese per Categoria</h3>
                <p className="text-sm text-ink-muted">Storico completo dell&apos;account</p>
              </div>
            </div>
            {categoryBreakdown.rows.length === 0 ? (
              <p className="text-sm text-ink-muted py-6 text-center">Nessuna spesa registrata</p>
            ) : (
              <ul className="space-y-3">
                {categoryBreakdown.rows.map((row) => {
                  const isRest = row.name === 'Altre categorie'
                  const pct = categoryBreakdown.total > 0 ? (row.value / categoryBreakdown.total) * 100 : 0
                  const max = categoryBreakdown.rows[0]?.value || 0
                  return (
                    <li key={row.name}>
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className={isRest ? 'text-sm text-ink-muted' : 'text-sm text-ink-secondary'}>{row.name}</span>
                        <span className="text-sm font-medium font-amount text-ink shrink-0">
                          {formatCurrency(row.value)}
                          <span className="text-ink-muted font-sans font-normal"> · {pct.toFixed(0)}%</span>
                        </span>
                      </div>
                      <div className="w-full bg-inset rounded-full h-2 overflow-hidden">
                        <div
                          className={isRest ? 'h-2 rounded-full bg-ink-muted' : 'h-2 rounded-full bg-primary'}
                          style={{ width: `${max > 0 ? Math.max((row.value / max) * 100, 2) : 0}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Movimenti dell'account */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-ink-secondary" />
            <h2 className="text-lg font-semibold text-ink">Movimenti</h2>
          </div>
          <TransactionsTable
            data={filteredTransactions}
            columns={columns}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            emptyMessage="Nessun movimento su questo account"
            emptyIcon={<Calendar className="h-16 w-16 text-ink-muted" />}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            enableFilters={true}
            enableSearch={true}
            searchPlaceholder="Cerca movimenti..."
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

        {/* Modali account */}
        <AccountFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          account={account}
        />
        <DeleteAccountModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          account={account}
          usage={usage}
          onDeactivate={() => handleToggleActive()}
          onDeleted={() => router.push('/finance/accounts')}
        />

        {/* Modali movimenti */}
        <NewTransactionModal
          isOpen={showNewTransactionModal}
          onClose={() => setShowNewTransactionModal(false)}
          prefilledData={{ account_id: account.id }}
        />
        <TransactionDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          transaction={selectedTransaction}
          onEdit={openTxEdit}
          onDelete={openTxDelete}
        />
        <NewTransactionModal
          isOpen={showEditTxModal}
          onClose={() => setShowEditTxModal(false)}
          editTransaction={showEditTxModal ? selectedTransaction : null}
          onSuccess={() => {
            setShowEditTxModal(false)
            setSelectedTransaction(null)
          }}
        />
        <DeleteTransactionModal
          isOpen={showDeleteTxModal}
          onClose={() => setShowDeleteTxModal(false)}
          transaction={selectedTransaction}
          onDeleted={() => setSelectedTransaction(null)}
        />
      </div>
    </ModuleLayout>
  )
}
