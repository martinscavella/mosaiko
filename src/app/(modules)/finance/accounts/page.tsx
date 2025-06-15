'use client'

import { useState, useEffect } from 'react'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import CacheStatus from '@/components/ui/CacheStatus'
import { useAuth } from '@/lib/auth'
import { useAccounts, useFinanceCache } from '@/lib/financeCache'
import type { Account } from '@/lib/financeCache'
import { CreditCard, Plus, MoreVertical, TrendingUp, TrendingDown, Edit2, Trash2, RefreshCw, Wallet, PiggyBank, Building2, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

interface ExtendedAccount extends Account {
  lastTransaction?: {
    date: string
    amount: number
    description: string
  }
}

export default function AccountsPage() {
  const { user, loading: authLoading } = useAuth()
  const { accounts: cacheAccounts, loading, error, refetch } = useAccounts()
  const { data: financeData, isDataStale } = useFinanceCache()
  
  const [accounts, setAccounts] = useState<ExtendedAccount[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<ExtendedAccount | null>(null)
  
  // Filtri e sorting
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAccountType, setSelectedAccountType] = useState<string>('all')
  const [sortField, setSortField] = useState<'name' | 'type' | 'balance'>('balance')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Trasforma gli account dalla cache aggiungendo proprietà di visibilità e ultime transazioni
  useEffect(() => {
    if (!cacheAccounts.length || !financeData) return

    const processAccountsWithTransactions = () => {
      const accountsWithExtras = cacheAccounts.map((account) => {
        // Trova l'ultima transazione per questo account dalla cache
        const lastTransaction = financeData.transactions.find(
          (transaction) => transaction.account_name === account.name
        )

        return {
          ...account,
          lastTransaction: lastTransaction ? {
            date: lastTransaction.transaction_date,
            amount: lastTransaction.current_amount,
            description: lastTransaction.transaction_details
          } : undefined
        }
      })
      
      setAccounts(accountsWithExtras)
    }

    processAccountsWithTransactions()
  }, [cacheAccounts, financeData])

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency
    }).format(amount)
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
      bank_account: 'bg-blue-100 text-blue-800',
      debit_card: 'bg-indigo-100 text-indigo-800',
      credit_card: 'bg-red-100 text-red-800',
      saving_account: 'bg-green-100 text-green-800',
      foreign_account: 'bg-purple-100 text-purple-800',
      investment_account: 'bg-orange-100 text-orange-800',
      cash: 'bg-yellow-100 text-yellow-800',
      voucher: 'bg-pink-100 text-pink-800',
      digital_wallet: 'bg-cyan-100 text-cyan-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
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
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-gray-400" />
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 text-blue-600" /> : 
      <ArrowDown className="w-4 h-4 text-blue-600" />
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
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
            <p className="text-gray-500">Devi effettuare il login per visualizzare i tuoi account</p>
          </div>
        </div>
      </ModuleLayout>
    )
  }

  return (
    <ModuleLayout moduleId="finance">
      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #CBD5E0 #EDF2F7;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #EDF2F7;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #CBD5E0, #A0AEC0);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #A0AEC0, #718096);
        }
        .shimmer-effect {
          animation: shimmer 2s infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        .btn-refresh:hover .shimmer-effect {
          animation: shimmer 0.7s ease-out;
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 custom-scrollbar">
        
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
          ]}
        />

        {/* Filters and Search */}
        <div className="mb-6">
          <div className="bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm rounded-xl p-4 transition-all duration-200 hover:shadow-md">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Cerca account..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 focus:bg-white text-sm"
                  />
                </div>
              </div>

              {/* Filter */}
              <div className="md:w-48">
                <div className="relative">
                  <select
                    value={selectedAccountType}
                    onChange={(e) => setSelectedAccountType(e.target.value)}
                    className="w-full appearance-none pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 focus:bg-white transition-all duration-200 text-sm font-medium text-gray-700 cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <option value="all">Tutti i tipi</option>
                    {getUniqueAccountTypes().map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Filter className="w-4 h-4 text-gray-500" />
                  </div>
                </div>
              </div>

              {/* Results and Reset */}
              <div className="flex items-center gap-3">
                {(searchTerm || selectedAccountType !== 'all') && (
                  <>
                    <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                      {filteredAndSortedAccounts.length} risultati
                    </span>
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setSelectedAccountType('all')
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 border border-purple-200 hover:border-purple-300 rounded-lg transition-colors"
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
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 to-purple-50/80 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
            <div className="relative bg-white/80 backdrop-blur-sm border border-white/60 shadow-lg rounded-xl p-6 transition-all duration-200 hover:shadow-xl">
              <div className="animate-pulse space-y-4">
                <div className="h-5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg"></div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 to-purple-50/80 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
            <div className="relative bg-white/80 backdrop-blur-sm border border-white/60 shadow-lg rounded-xl overflow-hidden transition-all duration-200 hover:shadow-xl">
              
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-gray-50/60 to-white/40">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100/40 transition-all duration-200 group/header"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center space-x-2">
                          <span>Account</span>
                          <div className="transition-transform duration-200 group-hover/header:scale-110">
                            {getSortIcon('name')}
                          </div>
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell cursor-pointer hover:bg-gray-100/40 transition-all duration-200 group/header"
                        onClick={() => handleSort('type')}
                      >
                        <div className="flex items-center space-x-2">
                          <span>Tipo</span>
                          <div className="transition-transform duration-200 group-hover/header:scale-110">
                            {getSortIcon('type')}
                          </div>
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100/40 transition-all duration-200 group/header"
                        onClick={() => handleSort('balance')}
                      >
                        <div className="flex items-center justify-end space-x-2">
                          <span>Saldo</span>
                          <div className="transition-transform duration-200 group-hover/header:scale-110">
                            {getSortIcon('balance')}
                          </div>
                        </div>
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Azioni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/50">
                    {filteredAndSortedAccounts.map((account) => (
                      <tr 
                        key={account.id} 
                        className="hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-purple-50/30 transition-all duration-200 group/row"
                        style={{ borderLeft: `4px solid ${account.color}` }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border transition-all duration-200 group-hover/row:shadow-md group-hover/row:scale-105"
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
                              <div className="font-semibold text-gray-900">{account.name}</div>
                              <div className="text-sm text-gray-500 md:hidden">
                                {getAccountTypeLabel(account.type)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full border ${getAccountTypeColor(account.type)} transition-all duration-200 group-hover/row:scale-105`}>
                            {getAccountTypeLabel(account.type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <div className={`font-bold text-lg ${account.current_balance >= 0 ? 'text-green-600' : 'text-red-600'} transition-all duration-200 group-hover/row:scale-105`}>
                              {formatCurrency(account.current_balance)}
                            </div>
                            <div className={`p-1 rounded-full ${account.current_balance >= 0 ? 'bg-green-100' : 'bg-red-100'} transition-all duration-200 group-hover/row:scale-110`}>
                              {account.current_balance >= 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-600" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="relative">
                            <button
                              onClick={() => setSelectedAccount(selectedAccount?.id === account.id ? null : account)}
                              className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 transition-all duration-200 hover:scale-110"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {selectedAccount?.id === account.id && (
                              <div className="absolute right-0 top-10 bg-white/95 backdrop-blur-sm border border-gray-200/80 rounded-xl shadow-xl py-2 z-20 min-w-[140px]">
                                <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50/70 transition-colors">
                                  <Edit2 className="w-4 h-4 mr-3" />
                                  Modifica
                                </button>
                                <button className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50/70 transition-colors">
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
                <div className="text-center py-16">
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 to-purple-50/80 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                    <div className="relative bg-white/60 backdrop-blur-sm border border-white/70 shadow-sm rounded-xl p-8 transition-all duration-200 hover:shadow-md">
                      <div className="text-gray-400 mb-6">
                        <Search className="w-20 h-20 mx-auto" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-3">Nessun account trovato</h3>
                      <p className="text-gray-600 mb-6">Prova a modificare i filtri di ricerca per trovare i tuoi account</p>
                      <button
                        onClick={() => {
                          setSearchTerm('')
                          setSelectedAccountType('all')
                        }}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Cancella filtri
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Account Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Aggiungi Nuovo Account</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Account
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Es. Conto Corrente Principale"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo Account
                  </label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Colore
                  </label>
                  <input
                    type="color"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue="#3B82F6"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Saldo Iniziale
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valuta
                  </label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
