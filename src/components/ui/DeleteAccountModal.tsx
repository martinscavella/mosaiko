'use client'

import { useState } from 'react'
import { AlertTriangle, PowerOff } from 'lucide-react'
import Modal, { ModalButton } from './Modal'
import { useAccountOperations } from '@/lib/financeCache'
import type { Account } from '@/lib/financeCache'
import { formatCurrency } from '@/lib/helpers/format'

export interface AccountUsage {
  transactionsCount: number
  refundsCount: number
  fundsTransferCount: number
  assetsCount: number
}

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
  account: Account | null
  usage: AccountUsage
  onDeactivate: (account: Account) => void
  onDeleted?: () => void
}

/**
 * Conferma eliminazione account. Se l'account ha storico collegato
 * (transazioni/rimborsi/trasferimenti/asset), l'eliminazione fisica è
 * bloccata: si perderebbero dati storici referenziati altrove. In quel caso
 * l'unica azione proposta è "Disattiva".
 */
export default function DeleteAccountModal({ isOpen, onClose, account, usage, onDeactivate, onDeleted }: DeleteAccountModalProps) {
  const { deleteAccount } = useAccountOperations()
  const [loading, setLoading] = useState(false)

  if (!isOpen || !account) return null

  const hasHistory = usage.transactionsCount + usage.refundsCount + usage.fundsTransferCount + usage.assetsCount > 0

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteAccount(account.id)
      onDeleted?.()
      onClose()
    } catch (error) {
      console.error("Errore nell'eliminare l'account:", error)
      alert("Errore durante l'eliminazione dell'account")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Elimina Account"
      subtitle={hasHistory ? undefined : 'Questa azione non può essere annullata'}
      size="sm"
      footer={
        hasHistory ? (
          <>
            <ModalButton variant="secondary" onClick={onClose}>
              Annulla
            </ModalButton>
            <ModalButton variant="primary" onClick={() => { onDeactivate(account); onClose() }}>
              <span className="inline-flex items-center gap-2">
                <PowerOff className="w-4 h-4" />
                Disattiva invece
              </span>
            </ModalButton>
          </>
        ) : (
          <>
            <ModalButton variant="secondary" onClick={onClose} disabled={loading}>
              Annulla
            </ModalButton>
            <ModalButton variant="danger" onClick={handleDelete} loading={loading}>
              Elimina definitivamente
            </ModalButton>
          </>
        )
      }
    >
      <div className="space-y-4">
        <div className="bg-canvas rounded-lg p-4 space-y-1">
          <p className="font-medium text-ink">{account.name}</p>
          <p className="text-sm text-ink-secondary">
            Saldo: {formatCurrency(account.current_balance)}
          </p>
        </div>

        {hasHistory ? (
          <div className="flex items-start gap-2 text-sm text-warning bg-warning-subtle rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Questo account ha storico collegato:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {usage.transactionsCount > 0 && <li>{usage.transactionsCount} transazioni</li>}
                {usage.refundsCount > 0 && <li>{usage.refundsCount} rimborsi</li>}
                {usage.fundsTransferCount > 0 && <li>{usage.fundsTransferCount} trasferimenti</li>}
                {usage.assetsCount > 0 && <li>{usage.assetsCount} asset collegati</li>}
              </ul>
              <p className="mt-2">
                Per non perdere questi dati, l&apos;eliminazione è bloccata. Disattiva l&apos;account per escluderlo dalle scelte future mantenendo lo storico.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-secondary">
            Sei sicuro di voler eliminare questo account? Non ha movimenti o asset collegati.
          </p>
        )}
      </div>
    </Modal>
  )
}
