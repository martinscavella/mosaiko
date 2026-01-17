'use client'

import type { Transaction } from '@/lib/financeCache'
import { useTransactions } from '@/lib/financeCache'
import { ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react'
import { useState } from 'react'
import { clsx } from 'clsx'
import TransactionDetailsModal from './TransactionDetailsModal'

interface RecentTransactionsProps {
  limit?: number
  onTransactionClick?: (transaction: Transaction) => void
}

export default function RecentTransactions({ limit = 5, onTransactionClick }: RecentTransactionsProps) {
  const { transactions, loading, error } = useTransactions(limit)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const openModal = (transaction: Transaction) => {
    if (onTransactionClick) {
      onTransactionClick(transaction)
    } else {
      setSelectedTransaction(transaction)
      setIsModalOpen(true)
    }
  }

  const closeModal = () => {
    setSelectedTransaction(null)
    setIsModalOpen(false)
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: new Date(dateString).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  })

  const formatAmount = (amount: number) => new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(Math.abs(amount))

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-5 bg-gray-200 rounded w-36 animate-pulse" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 animate-pulse">
              <div className="w-9 h-9 bg-gray-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="h-4 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-red-100 text-red-600">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Transazioni Recenti</h3>
        </div>
        <p className="text-sm text-red-600">Errore: {error}</p>
      </div>
    )
  }

  // Empty state
  if (transactions.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Transazioni Recenti</h3>
        </div>
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Nessuna transazione</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-100 text-blue-600">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Transazioni Recenti</h3>
          <p className="text-sm text-gray-500">Ultime {transactions.length} transazioni</p>
        </div>
      </div>

      {/* Lista transazioni */}
      <div className="space-y-2">
        {transactions
          .filter(t => t.current_amount !== 0)
          .map((transaction: Transaction) => {
            const isIncome = transaction.transaction_type === 'income' || transaction.current_amount > 0
            const amount = Math.abs(transaction.current_amount)

            return (
              <div
                key={transaction.id}
                onClick={() => openModal(transaction)}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors duration-150"
              >
                {/* Icona */}
                <div className={clsx(
                  'w-9 h-9 flex items-center justify-center rounded-lg',
                  isIncome ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                )}>
                  {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                </div>

                {/* Dettagli */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {transaction.transaction_details || 'Transazione'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {formatDate(transaction.transaction_date)}
                    {transaction.account_name && ` • ${transaction.account_name}`}
                  </p>
                </div>

                {/* Importo */}
                <span className={clsx(
                  'text-sm font-semibold tabular-nums',
                  isIncome ? 'text-green-600' : 'text-red-600'
                )}>
                  {isIncome ? '+' : '-'}{formatAmount(amount)}
                </span>
              </div>
            )
          })}
      </div>

      {!onTransactionClick && (
        <TransactionDetailsModal
          isOpen={isModalOpen}
          onClose={closeModal}
          transaction={selectedTransaction}
        />
      )}
    </div>
  )
}
