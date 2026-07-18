'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { AlertTriangle } from 'lucide-react'
import Modal, { ModalButton } from './Modal'
import { useAllTransactions, useFinanceCache, type Transaction } from '@/lib/financeCache'
import { formatCurrency } from '@/lib/helpers/format'

interface DeleteTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: Transaction | null
  onDeleted?: () => void
}

export default function DeleteTransactionModal({
  isOpen,
  onClose,
  transaction,
  onDeleted,
}: DeleteTransactionModalProps) {
  const { refetch } = useAllTransactions()
  const { refetch: refetchFinanceCache } = useFinanceCache()
  const [loading, setLoading] = useState(false)

  if (!isOpen || !transaction) return null

  const handleDelete = async () => {
    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id)

      if (error) throw error

      // Riallinea il saldo dell'account dal DB (fonte canonica)
      if (transaction.account_id) {
        const { error: recalcError } = await supabase.rpc('recalculate_current_balance_by_id', {
          account_id_param: transaction.account_id,
        })
        if (recalcError) {
          console.error('Errore ricalcolo saldo account:', recalcError)
        }
      }

      try {
        await Promise.all([refetch(), refetchFinanceCache()])
      } catch (refetchError) {
        console.error("Errore durante l'aggiornamento della cache:", refetchError)
      }

      onDeleted?.()
      onClose()
    } catch (error) {
      console.error('Error deleting transaction:', error)
      alert("Errore durante l'eliminazione della transazione")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Elimina Transazione"
      subtitle="Questa azione non può essere annullata"
      size="sm"
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose} disabled={loading}>
            Annulla
          </ModalButton>
          <ModalButton variant="danger" onClick={handleDelete} loading={loading}>
            Elimina definitivamente
          </ModalButton>
        </>
      }
    >
      <div className="space-y-4">
        {/* Riepilogo transazione */}
        <div className="bg-canvas rounded-lg p-4 space-y-2">
          <p className="font-medium text-ink break-words">{transaction.transaction_details}</p>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm text-ink-muted">
              {new Date(transaction.transaction_date).toLocaleDateString('it-IT', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
              {transaction.account_name && ` · ${transaction.account_name}`}
            </span>
            <span
              className={`font-semibold font-amount ${
                transaction.current_amount > 0 ? 'text-success-strong' : 'text-danger'
              }`}
            >
              {transaction.current_amount > 0 ? '+' : ''}
              {formatCurrency(transaction.current_amount)}
            </span>
          </div>
        </div>

        {/* Avvisi */}
        <div className="flex items-start gap-2 text-sm text-ink-secondary">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p>Il saldo dell&apos;account verrà ricalcolato automaticamente.</p>
        </div>

        {transaction.is_refunded && (
          <div className="flex items-start gap-2 text-sm text-warning bg-warning-subtle rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Questa transazione risulta rimborsata: i rimborsi collegati resteranno
              nella pagina Rimborsi e potrebbero dover essere sistemati a mano.
            </p>
          </div>
        )}

        {transaction.asset_id && (
          <div className="flex items-start gap-2 text-sm text-warning bg-warning-subtle rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Transazione legata a un asset: quantità e storico dell&apos;asset non
              verranno aggiornati automaticamente, verifica poi nella pagina Asset.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
