'use client'

import { useState, useEffect, useMemo } from 'react'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import CacheStatus from '@/components/ui/CacheStatus'
import { useAuth } from '@/lib/auth'
import { useAccounts, useFinanceCache } from '@/lib/financeCache'
import type { Account } from '@/lib/financeCache'
import { CreditCard, Plus, MoreVertical, TrendingUp, TrendingDown, Edit2, Trash2, RefreshCw, Wallet, PiggyBank, Building2, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, Clock } from 'lucide-react'

interface ExtendedAccount extends Account {
  lastTransaction?: {
    date: string
    amount: number
    description: string
  }
  lastUpdated?: string
}

export default function AccountsPage() {
  const { user, loading: authLoading } = useAuth()
  const { accounts: cacheAccounts, loading, error, refetch } = useAccounts()
  const { data: financeData, isDataStale } = useFinanceCache()

  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<ExtendedAccount | null>(null)
  
  // Filtri e sorting
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAccountType, setSelectedAccountType] = useState<string>('all')
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
        (transaction) => transaction.account_name === account.name
      )
      const accountFundsTransfers = financeData.fundsTransfer.filter(
        (transfer) => transfer.account_name === account.name
      )
      const accountRefunds = financeData.refunds.filter(
        (refund) => refund.account_name === account.name
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

  const getAccountTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      bank_account: 'Conto Bancario',
      debit_card: 'Carta di Debito',
      credit_card: 'Carta di Credito',
      saving_account: 'Conto Risparmio', 
      foreign_account: 'Conto Estero',
      investment_account: 'Conto Investimenti',
      cash: 'Contanti',
      voucher: 'Voucher',
      digital_wallet: 'Portafoglio Digitale'
    }
    return labels[type] || type
  }

  const getAccountTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      bank_account: 'bg-primary-subtle text-primary',
      debit_card: 'bg-primary-subtle text-primary',
      credit_card: 'bg-danger-subtle text-danger',
      saving_account: 'bg-success-subtle text-success-strong',
      foreign_account: 'bg-module-health-subtle text-module-health',
      investment_account: 'bg-warning-subtle text-warning',
      cash: 'bg-warning-subtle text-warning',
      voucher: 'bg-module-health-subtle text-module-health',
      digital_wallet: 'bg-module-tasks-subtle text-module-tasks'
    }
    return colors[type] || 'bg-inset text-ink'
  }

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'bank_account':
        return Building2
      case 'saving_account':
        return PiggyBank
      case 'credit_card':
      case 'debit_card':
        return CreditCard
      case 'investment_account':
        return TrendingUp
      case 'digital_wallet':
        return Wallet
      default:
        return CreditCard
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
      return matchesSearch && matchesType
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

              {/* Filter */}
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

              {/* Results and Reset */}
              <div className="flex items-center gap-3">
                {(searchTerm || selectedAccountType !== 'all') && (
                  <>
                    <span className="text-sm font-medium text-ink-secondary whitespace-nowrap">
                      {filteredAndSortedAccounts.length} risultati
                    </span>
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setSelectedAccountType('all')
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
                  {filteredAndSortedAccounts.map((account) => (
                    <tr
                      key={account.id}
                      className="hover:bg-canvas transition-colors"
                      style={{ borderLeft: `4px solid ${account.color}` }}
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
                              const IconComponent = getAccountIcon(account.type)
                              const hex = account.color.replace('#', '')
                              const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 40)
                              const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 40)
                              const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 40)
                              const iconColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
                              return <IconComponent className="w-5 h-5" style={{ color: iconColor }} />
                            })()}
                          </div>
                          <div>
                            <div className="font-semibold text-ink">{account.name}</div>
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
                        <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full border ${getAccountTypeColor(account.type)}`}>
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
                      <td className="px-6 py-4 text-center">
                        <div className="relative">
                          <button
                            onClick={() => setSelectedAccount(selectedAccount?.id === account.id ? null : account)}
                            className="p-2 rounded-full text-ink-muted hover:text-ink-secondary hover:bg-inset transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {selectedAccount?.id === account.id && (
                            <div className="absolute right-0 top-10 bg-surface border border-edge rounded-lg shadow-elevated py-2 z-20 min-w-[140px]">
                              <button className="flex items-center w-full px-4 py-2 text-sm text-ink-secondary hover:bg-canvas transition-colors">
                                <Edit2 className="w-4 h-4 mr-3" />
                                Modifica
                              </button>
                              <button className="flex items-center w-full px-4 py-2 text-sm text-danger hover:bg-danger-subtle transition-colors">
                                <Trash2 className="w-4 h-4 mr-3" />
                                Elimina
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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

        {/* Add Account Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-surface rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Aggiungi Nuovo Account</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
                    Nome Account
                  </label>
                  <input
                    type="text"
                    className="w-full border border-edge rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Es. Conto Corrente Principale"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
                    Tipo Account
                  </label>
                  <select className="w-full border border-edge rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="bank_account">Conto Bancario</option>
                    <option value="debit_card">Carta di Debito</option>
                    <option value="credit_card">Carta di Credito</option>
                    <option value="saving_account">Conto Risparmio</option>
                    <option value="foreign_account">Conto Estero</option>
                    <option value="investment_account">Conto Investimenti</option>
                    <option value="cash">Contanti</option>
                    <option value="voucher">Voucher</option>
                    <option value="digital_wallet">Portafoglio Digitale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
                    Colore
                  </label>
                  <input
                    type="color"
                    className="w-full border border-edge rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    defaultValue="#1D4ED8"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
                    Saldo Iniziale
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border border-edge rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
                    Valuta
                  </label>
                  <select className="w-full border border-edge rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="EUR">EUR - Euro</option>
                    <option value="USD">USD - Dollaro</option>
                    <option value="GBP">GBP - Sterlina</option>
                    <option value="CHF">CHF - Franco Svizzero</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-ink-secondary border border-edge rounded-md hover:bg-canvas"
                >
                  Annulla
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover"
                >
                  Aggiungi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModuleLayout>
  )
}
