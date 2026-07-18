'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import CacheStatus from '@/components/ui/CacheStatus'
import RowActionsMenu from '@/components/ui/RowActionsMenu'
import AccountFormModal from '@/components/ui/AccountFormModal'
import DeleteAccountModal, { type AccountUsage } from '@/components/ui/DeleteAccountModal'
import { useAuth } from '@/lib/auth'
import { useAccounts, useFinanceCache, useAccountOperations } from '@/lib/financeCache'
import type { Account } from '@/lib/financeCache'
import { getAccountTypeLabel, getAccountTypeBadgeClass, getAccountTypeIcon } from '@/lib/accountTypes'
import { CreditCard, Plus, TrendingUp, TrendingDown, RefreshCw, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, Clock, Power, PowerOff, RotateCw } from 'lucide-react'

interface ExtendedAccount extends Account {
  lastTransaction?: {
    date: string
    amount: number
    description: string
  }
  lastUpdated?: string
}

export default function AccountsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { accounts: cacheAccounts, loading, error, refetch } = useAccounts()
  const { data: financeData, isDataStale } = useFinanceCache()
  const { setAccountActive, recalculateAccountBalance, recalculateAllBalances } = useAccountOperations()

  const [showAddModal, setShowAddModal] = useState(false)
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null)
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)
  const [recalculatingId, setRecalculatingId] = useState<string | null>(null)
  const [recalculatingAll, setRecalculatingAll] = useState(false)

  // Filtri e sorting
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAccountType, setSelectedAccountType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('active')
  const [sortField, setSortField] = useState<'name' | 'type' | 'balance'>('balance')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Listener per il FAB della navbar mobile
  useEffect(() => {
    const handleOpenModal = () => {
      setShowAddModal(true);
    };

    window.addEventListener('openNewItemModal', handleOpenModal);
    return () => window.removeEventListener('openNewItemModal', handleOpenModal);
  }, []);

  // Deriva gli account con ultima operazione/ultimo aggiornamento filtrando
  // client-side i dati già disponibili in cache (transazioni, rimborsi,
  // trasferimenti sono già stati fetchati globalmente da FinanceCacheProvider).
  // Prima faceva 2 query Supabase per ogni account (N+1): non serve, i dati
  // ci sono già.
  const accounts: ExtendedAccount[] = useMemo(() => {
    if (!cacheAccounts.length || !financeData) return []

    return cacheAccounts.map((account) => {
      const accountTransactions = financeData.transactions.filter(
        (transaction) => transaction.account_id === account.id
      )
      const accountFundsTransfers = financeData.fundsTransfer.filter(
        (transfer) => transfer.account_id === account.id
      )
      const accountRefunds = financeData.refunds.filter(
        (refund) => refund.account_id === account.id
      )

      const allOperationDates: string[] = [
        ...accountTransactions.map((transaction) => transaction.transaction_date),
        ...accountFundsTransfers
          .map((transfer) => transfer.funds_transfer_date)
          .filter((date): date is string => Boolean(date)),
        ...accountRefunds.map((refund) => refund.refund_date)
      ]

      const lastTransaction = accountTransactions.length > 0
        ? [...accountTransactions].sort((a, b) =>
            new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
          )[0]
        : null

      const lastUpdated = allOperationDates.length > 0
        ? [...allOperationDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
        : (account.updated_at || account.created_at)

      return {
        ...account,
        lastTransaction: lastTransaction ? {
          date: lastTransaction.transaction_date,
          amount: lastTransaction.current_amount,
          description: lastTransaction.transaction_details
        } : undefined,
        lastUpdated
      }
    })
  }, [cacheAccounts, financeData])

  // Storico collegato per account (per bloccare l'eliminazione fisica quando
  // ci sono dati da preservare). Match per account_id (T3.8): due conti
  // omonimi non si contaminano le statistiche.
  const usageByAccountId = useMemo(() => {
    const map = new Map<string, AccountUsage>()
    if (!financeData) return map

    for (const account of cacheAccounts) {
      map.set(account.id, {
        transactionsCount: financeData.transactions.filter((t) => t.account_id === account.id).length,
        refundsCount: financeData.refunds.filter((r) => r.account_id === account.id).length,
        fundsTransferCount: financeData.fundsTransfer.filter((f) => f.account_id === account.id).length,
        assetsCount: financeData.assets.filter((a) => a.account_id === account.id).length
      })
    }
    return map
  }, [cacheAccounts, financeData])

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatRelativeTime = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInMinutes < 1) {
      return 'Appena aggiornato'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min fa`
    } else if (diffInHours < 24) {
      return `${diffInHours} ore fa`
    } else if (diffInDays === 1) {
      return 'Ieri'
    } else if (diffInDays < 7) {
      return `${diffInDays} giorni fa`
    } else {
      return new Intl.DateTimeFormat('it-IT', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      }).format(date)
    }
  }

  const getTotalBalance = () => {
    return accounts.reduce((total, account) => total + account.current_balance, 0)
  }

  // Funzioni per filtri e sorting
  const getUniqueAccountTypes = () => {
    const types = [...new Set(accounts.map(account => account.type))]
    return types.map(type => ({
      value: type,
      label: getAccountTypeLabel(type)
    }))
  }

  const handleSort = (field: 'name' | 'type' | 'balance') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: 'name' | 'type' | 'balance') => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-ink-muted" />
    return sortDirection === 'asc' ?
      <ArrowUp className="w-4 h-4 text-primary" /> :
      <ArrowDown className="w-4 h-4 text-primary" />
  }

  const filteredAndSortedAccounts = accounts
    .filter(account => {
      const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = selectedAccountType === 'all' || account.type === selectedAccountType
      const matchesStatus = selectedStatus === 'all'
        || (selectedStatus === 'active' && account.is_active)
        || (selectedStatus === 'inactive' && !account.is_active)
      return matchesSearch && matchesType && matchesStatus
    })
    .sort((a, b) => {
      let compareValue = 0

      switch (sortField) {
        case 'name':
          compareValue = a.name.localeCompare(b.name)
          break
        case 'type':
          compareValue = getAccountTypeLabel(a.type).localeCompare(getAccountTypeLabel(b.type))
          break
        case 'balance':
          compareValue = a.current_balance - b.current_balance
          break
      }

      return sortDirection === 'asc' ? compareValue : -compareValue
    })

  const handleToggleActive = async (account: Account) => {
    try {
      await setAccountActive(account.id, !account.is_active)
    } catch (err) {
      console.error('Errore nel cambiare stato account:', err)
      alert("Errore durante l'aggiornamento dello stato dell'account")
    }
  }

  const handleRecalculate = async (account: Account) => {
    setRecalculatingId(account.id)
    try {
      await recalculateAccountBalance(account.id)
    } catch (err) {
      console.error('Errore nel ricalcolo saldo:', err)
      alert('Errore durante il ricalcolo del saldo')
    } finally {
      setRecalculatingId(null)
    }
  }

  const handleRecalculateAll = async () => {
    setRecalculatingAll(true)
    try {
      await recalculateAllBalances()
    } catch (err) {
      console.error('Errore nel ricalcolo di tutti i saldi:', err)
      alert('Errore durante il ricalcolo dei saldi')
    } finally {
      setRecalculatingAll(false)
    }
  }

  if (authLoading) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-inset rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-inset rounded-lg"></div>
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
            <p className="text-ink-muted">Devi effettuare il login per visualizzare i tuoi account</p>
          </div>
        </div>
      </ModuleLayout>
    )
  }

  return (
    <ModuleLayout moduleId="finance">
      <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">

        {/* Header utilizzando il componente riutilizzabile */}
        <ModuleHeader
          title="I Miei Account"
          subtitle="Gestisci i tuoi conti bancari e investimenti in tempo reale"
          icon={<CreditCard className="h-6 w-6 text-white" />}
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
              show: !loading && !error && accounts.length > 0
            }
          ]}
          stats={!loading && accounts.length > 0 ? [
            {
              label: 'Patrimonio Totale',
              value: formatCurrency(getTotalBalance()),
              color: 'blue'
            },
            {
              label: 'Account Totali',
              value: accounts.length.toString(),
              color: 'green'
            }
          ] : []}
          actions={[
            {
              label: 'Aggiungi',
              onClick: () => setShowAddModal(true),
              icon: <Plus className="w-4 h-4" />,
              color: 'green',
              hideTextOnMobile: true,
              hideOnMobile: true
            },
            {
              label: 'Ricalcola saldi',
              onClick: handleRecalculateAll,
              icon: <RotateCw className="w-4 h-4" />,
              color: 'gray',
              disabled: recalculatingAll,
              loading: recalculatingAll,
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

        {/* Filters and Search */}
        <div className="mb-6">
          <div className="bg-surface border border-edge rounded-lg shadow-card p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-muted w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Cerca account..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Filter tipo */}
              <div className="md:w-48">
                <div className="relative">
                  <select
                    value={selectedAccountType}
                    onChange={(e) => setSelectedAccountType(e.target.value)}
                    className="w-full appearance-none pl-4 pr-10 py-2.5 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-surface transition-colors text-sm font-medium text-ink-secondary cursor-pointer"
                  >
                    <option value="all">Tutti i tipi</option>
                    {getUniqueAccountTypes().map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Filter className="w-4 h-4 text-ink-muted" />
                  </div>
                </div>
              </div>

              {/* Filter stato */}
              <div className="md:w-40">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
                  className="w-full appearance-none pl-4 pr-4 py-2.5 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-surface transition-colors text-sm font-medium text-ink-secondary cursor-pointer"
                >
                  <option value="all">Tutti gli stati</option>
                  <option value="active">Solo attivi</option>
                  <option value="inactive">Solo disattivati</option>
                </select>
              </div>

              {/* Results and Reset */}
              <div className="flex items-center gap-3">
                {(searchTerm || selectedAccountType !== 'all' || selectedStatus !== 'active') && (
                  <>
                    <span className="text-sm font-medium text-ink-secondary whitespace-nowrap">
                      {filteredAndSortedAccounts.length} risultati
                    </span>
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setSelectedAccountType('all')
                        setSelectedStatus('active')
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-primary hover:text-primary-hover border border-edge hover:border-edge rounded-lg transition-colors"
                    >
                      Reset
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Accounts Table */}
        {loading ? (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-5 bg-inset rounded-lg"></div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-inset rounded-lg"></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-surface border border-edge rounded-lg shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-canvas border-b border-edge">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider cursor-pointer hover:bg-inset transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Account</span>
                        {getSortIcon('name')}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider hidden md:table-cell cursor-pointer hover:bg-inset transition-colors"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Tipo</span>
                        {getSortIcon('type')}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-semibold text-ink-secondary uppercase tracking-wider cursor-pointer hover:bg-inset transition-colors"
                      onClick={() => handleSort('balance')}
                    >
                      <div className="flex items-center justify-end space-x-2">
                        <span>Saldo</span>
                        {getSortIcon('balance')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-ink-secondary uppercase tracking-wider hidden lg:table-cell">
                      Ultimo Aggiornamento
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-ink-secondary uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge-subtle">
                  {filteredAndSortedAccounts.map((account) => {
                    const usage = usageByAccountId.get(account.id) || { transactionsCount: 0, refundsCount: 0, fundsTransferCount: 0, assetsCount: 0 }
                    const hasHistory = usage.transactionsCount + usage.refundsCount + usage.fundsTransferCount + usage.assetsCount > 0

                    return (
                    <tr
                      key={account.id}
                      className={`hover:bg-canvas transition-colors cursor-pointer ${!account.is_active ? 'opacity-60' : ''}`}
                      style={{ borderLeft: `4px solid ${account.color}` }}
                      onClick={() => router.push(`/finance/accounts/${account.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center border"
                            style={{
                              backgroundColor: `${account.color}15`,
                              borderColor: (() => {
                                const hex = account.color.replace('#', '')
                                const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 40)
                                const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 40)
                                const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 40)
                                return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
                              })()
                            }}
                          >
                            {(() => {
                              const IconComponent = getAccountTypeIcon(account.type)
                              const hex = account.color.replace('#', '')
                              const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 40)
                              const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 40)
                              const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 40)
                              const iconColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
                              return <IconComponent className="w-5 h-5" style={{ color: iconColor }} />
                            })()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-ink">{account.name}</span>
                              {!account.is_active && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-inset text-ink-muted">
                                  Non attivo
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-ink-muted md:hidden">
                              {getAccountTypeLabel(account.type)}
                            </div>
                            <div className="flex items-center space-x-1 text-xs text-ink-muted lg:hidden">
                              <Clock className="w-3 h-3" />
                              <span>
                                {account.lastUpdated ? formatRelativeTime(account.lastUpdated) : 'Mai aggiornato'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full border ${getAccountTypeBadgeClass(account.type)}`}>
                          {getAccountTypeLabel(account.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <div className={`font-bold text-lg ${account.current_balance >= 0 ? 'text-success-strong' : 'text-danger'}`}>
                            {formatCurrency(account.current_balance)}
                          </div>
                          <div className={`p-1 rounded-full ${account.current_balance >= 0 ? 'bg-success-subtle' : 'bg-danger-subtle'}`}>
                            {account.current_balance >= 0 ? (
                              <TrendingUp className="w-4 h-4 text-success-strong" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-danger" />
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center hidden lg:table-cell">
                        <div className="flex items-center justify-center space-x-2">
                          <Clock className="w-4 h-4 text-ink-muted" />
                          <span className="text-sm text-ink-secondary font-medium">
                            {account.lastUpdated ? formatRelativeTime(account.lastUpdated) : 'Mai aggiornato'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <RowActionsMenu
                          onDetails={() => router.push(`/finance/accounts/${account.id}`)}
                          onEdit={() => setAccountToEdit(account)}
                          onDelete={() => setAccountToDelete(account)}
                          deleteDisabled={hasHistory}
                          deleteDisabledReason={hasHistory ? 'Account con storico collegato: disattiva invece di eliminare' : undefined}
                          extraActions={[
                            {
                              label: recalculatingId === account.id ? 'Ricalcolo...' : 'Ricalcola saldo',
                              icon: RefreshCw,
                              onClick: () => handleRecalculate(account),
                              disabled: recalculatingId === account.id
                            },
                            {
                              label: account.is_active ? 'Disattiva' : 'Riattiva',
                              icon: account.is_active ? PowerOff : Power,
                              onClick: () => handleToggleActive(account)
                            }
                          ]}
                        />
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            {/* No results message */}
            {filteredAndSortedAccounts.length === 0 && (
              <div className="text-center py-16 px-8">
                <div className="text-ink-muted mb-6">
                  <Search className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-ink mb-3">Nessun account trovato</h3>
                <p className="text-ink-secondary mb-6">Prova a modificare i filtri di ricerca per trovare i tuoi account</p>
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedAccountType('all')
                    setSelectedStatus('all')
                  }}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors shadow-card"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Cancella filtri
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modale Aggiungi Account */}
        <AccountFormModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />

        {/* Modale Modifica Account */}
        <AccountFormModal
          isOpen={!!accountToEdit}
          onClose={() => setAccountToEdit(null)}
          account={accountToEdit}
        />

        {/* Modale Elimina/Disattiva Account */}
        <DeleteAccountModal
          isOpen={!!accountToDelete}
          onClose={() => setAccountToDelete(null)}
          account={accountToDelete}
          usage={accountToDelete ? (usageByAccountId.get(accountToDelete.id) || { transactionsCount: 0, refundsCount: 0, fundsTransferCount: 0, assetsCount: 0 }) : { transactionsCount: 0, refundsCount: 0, fundsTransferCount: 0, assetsCount: 0 }}
          onDeactivate={(acc) => handleToggleActive(acc)}
        />
      </div>
    </ModuleLayout>
  )
}
