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
      <div className="bg-surface border border-edge rounded-lg shadow-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-inset rounded-lg animate-pulse" />
          <div className="h-5 bg-inset rounded w-36 animate-pulse" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-canvas animate-pulse">
              <div className="w-9 h-9 bg-inset rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-inset rounded w-3/4 mb-2" />
                <div className="h-3 bg-inset rounded w-1/2" />
              </div>
              <div className="h-4 bg-inset rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-surface border border-danger-subtle rounded-lg shadow-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-danger-subtle text-danger">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-ink">Transazioni Recenti</h3>
        </div>
        <p className="text-sm text-danger">Errore: {error}</p>
      </div>
    )
  }

  // Empty state
  if (transactions.length === 0) {
    return (
      <div className="bg-surface border border-edge rounded-lg shadow-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-subtle text-primary">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-ink">Transazioni Recenti</h3>
        </div>
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-ink-muted mx-auto mb-3" />
          <p className="text-sm text-ink-muted">Nessuna transazione</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-edge rounded-lg shadow-card p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-subtle text-primary">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-ink">Transazioni Recenti</h3>
          <p className="text-sm text-ink-muted">Ultime {transactions.length} transazioni</p>
        </div>
      </div>

      {/* Lista transazioni */}
      <div className="space-y-2">
        {transactions
          .filter(t => t.current_amount !== 0)
          .map((transaction: Transaction) => {
            const isIncome = transaction.current_amount > 0
            const amount = Math.abs(transaction.current_amount)

            return (
              <div
                key={transaction.id}
                onClick={() => openModal(transaction)}
                className="flex items-center gap-3 p-3 rounded-lg bg-canvas hover:bg-inset cursor-pointer transition-colors duration-150"
              >
                {/* Icona */}
                <div className={clsx(
                  'w-9 h-9 flex items-center justify-center rounded-lg',
                  isIncome ? 'bg-success-subtle text-success-strong' : 'bg-danger-subtle text-danger'
                )}>
                  {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                </div>

                {/* Dettagli */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {transaction.transaction_details || 'Transazione'}
                  </p>
                  <p className="text-xs text-ink-muted truncate">
                    {formatDate(transaction.transaction_date)}
                    {transaction.account_name && ` • ${transaction.account_name}`}
                  </p>
                </div>

                {/* Importo */}
                <span className={clsx(
                  'text-sm font-semibold font-amount',
                  isIncome ? 'text-success-strong' : 'text-danger'
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
