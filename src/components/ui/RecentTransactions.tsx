'use client'

import { useTransactions } from '@/lib/financeCache'
import { ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react'

interface RecentTransactionsProps {
  limit?: number
}

export default function RecentTransactions({ limit = 5 }: RecentTransactionsProps) {
  const { transactions, loading, error } = useTransactions(limit)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(Math.abs(amount))
  }

  if (loading) {
    return (
      <div className="relative">
        {/* Shimmer background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100/50 to-gray-200/50 rounded-xl blur-sm animate-pulse"></div>
        
        {/* Loading container */}
        <div className="relative bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Transazioni Recenti</h3>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4 p-3 rounded-lg">
                <div className="h-10 w-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16"></div>
              </div>
            ))}
          </div>
          
          {/* Loading shimmer effect */}
          <div className="absolute inset-0 -top-2 -left-2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 transform -translate-x-full animate-shimmer rounded-xl"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative">
        {/* Error gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 rounded-xl blur-sm"></div>
        
        {/* Error container */}
        <div className="relative bg-white/95 backdrop-blur-sm border border-red-200/50 shadow-lg rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Transazioni Recenti</h3>
          <div className="text-center py-8">
            <div className="mx-auto mb-4 h-12 w-12 text-red-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-600 text-sm font-medium">Errore nel caricamento: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="relative">
        {/* Empty state gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-blue-500/5 rounded-xl blur-sm"></div>
        
        {/* Empty state container */}
        <div className="relative bg-white/95 backdrop-blur-sm border border-white/50 shadow-lg rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Transazioni Recenti</h3>
          <div className="text-center py-12">
            <div className="mx-auto mb-4 h-16 w-16 text-gray-400">
              <Calendar className="h-full w-full" />
            </div>
            <p className="text-gray-500 text-sm font-medium">Nessuna transazione trovata</p>
            <p className="text-gray-400 text-xs mt-2">Le tue transazioni appariranno qui</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative">
      {/* Floating gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
      
      {/* Main container */}
      <div className="relative bg-white/95 backdrop-blur-sm border border-white/50 shadow-lg rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:bg-white/98 hover:border-white/70 hover:-translate-y-1">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Transazioni Recenti
          </h3>
          <div className="p-2 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg transition-all duration-300 group-hover:from-blue-100 group-hover:to-purple-100">
            <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
        
        <div className="space-y-3">
          {transactions.filter(transaction => transaction.current_amount !== 0).map((transaction) => {
            const isIncome = transaction.transaction_type === 'income' || transaction.current_amount > 0
            const amount = Math.abs(transaction.current_amount)
            
            return (
              <div key={transaction.id} className="group/item flex items-center space-x-4 p-3 hover:bg-gradient-to-r hover:from-gray-50/80 hover:to-blue-50/50 rounded-xl transition-all duration-300 hover:shadow-sm">
                <div className={`p-2.5 rounded-xl shadow-sm transition-all duration-300 group-hover/item:shadow-md group-hover/item:scale-110 ${
                  isIncome ? 'bg-gradient-to-br from-green-100 to-emerald-100' : 'bg-gradient-to-br from-red-100 to-orange-100'
                }`}>
                  {isIncome ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownLeft className="h-4 w-4 text-red-600" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate transition-all duration-300 group-hover/item:text-gray-800">
                    {transaction.transaction_details || 'Transazione'}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 transition-all duration-300 group-hover/item:text-gray-600">
                    <span>{formatDate(transaction.transaction_date)}</span>
                    {transaction.account_name && (
                      <>
                        <span>•</span>
                        <span>{transaction.account_name}</span>
                      </>
                    )}
                    {transaction.categories?.name && (
                      <>
                        <span>•</span>
                        <span>{transaction.categories.name}</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className={`text-sm font-semibold transition-all duration-300 ${
                  isIncome ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isIncome ? '+' : '-'}{formatAmount(amount)}
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      </div>
    </div>
  )
}
