import { ArrowUpRight, ArrowDownLeft, TrendingUp } from 'lucide-react'
import type { Transaction } from '@/lib/financeCache'
import { formatCurrency } from './format'
import { transactionTypeKind } from '@/lib/transactionTypes'

/** Formattazione/colori condivisi tra la pagina Transazioni e il dettaglio account,
 * per non farli divergere silenziosamente in due posti diversi. */

export function formatTransactionDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    weekday: 'short'
  })
}

export function getTransactionIcon(transaction: Pick<Transaction, 'current_amount' | 'transaction_type'>) {
  if (transaction.current_amount > 0) {
    return <ArrowDownLeft className="h-4 w-4 text-success-strong" />
  } else if (transactionTypeKind(transaction.transaction_type) === 'investment') {
    return <TrendingUp className="h-4 w-4 text-primary" />
  } else {
    return <ArrowUpRight className="h-4 w-4 text-danger" />
  }
}

export function getTransactionColor(transaction: Pick<Transaction, 'current_amount' | 'transaction_type' | 'is_refunded'>): string {
  if (transaction.current_amount === 0 && transaction.is_refunded) {
    return 'text-success-strong'
  } else if (transaction.current_amount > 0) {
    return 'text-success-strong'
  } else if (transactionTypeKind(transaction.transaction_type) === 'investment') {
    return 'text-primary'
  } else {
    return 'text-danger'
  }
}

export function formatTransactionAmount(amount: number, isRefunded: boolean = false): string {
  if (amount === 0 && isRefunded) {
    return 'Rimborsato'
  }
  return formatCurrency(amount)
}
