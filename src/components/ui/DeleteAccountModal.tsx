'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
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

  // La usage passata dal chiamante deriva dalla cache, che dalla T4.1 contiene
  // solo una finestra dello storico: un account con soli movimenti vecchi
  // sembrerebbe vuoto. Le FK in DB sono ON DELETE CASCADE, quindi un delete
  // "permesso" per errore cancellerebbe lo storico: riverifica i conteggi
  // direttamente sul server quando il modale si apre.
  const [serverUsage, setServerUsage] = useState<AccountUsage | null>(null)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (!isOpen || !account) {
      setServerUsage(null)
      return
    }
    let cancelled = false
    const verify = async () => {
      const countFor = async (table: string) => {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('account_id', account.id)
        if (error) throw error
        return count || 0
      }
      try {
        const [transactionsCount, refundsCount, fundsTransferCount, assetsCount] = await Promise.all([
          countFor('transactions'),
          countFor('refunds'),
          countFor('funds_transfer'),
          countFor('assets')
        ])
        if (!cancelled) {
          setServerUsage({ transactionsCount, refundsCount, fundsTransferCount, assetsCount })
        }
      } catch (error) {
        console.error('Errore nella verifica dello storico account:', error)
        // In dubbio, blocca l'eliminazione fisica come se ci fosse storico
        if (!cancelled) {
          setServerUsage({ transactionsCount: 1, refundsCount: 0, fundsTransferCount: 0, assetsCount: 0 })
        }
      }
    }
    verify()
    return () => { cancelled = true }
  }, [isOpen, account, supabase])

  if (!isOpen || !account) return null

  const effectiveUsage = serverUsage ?? usage
  const verifying = serverUsage === null
  const hasHistory = effectiveUsage.transactionsCount + effectiveUsage.refundsCount + effectiveUsage.fundsTransferCount + effectiveUsage.assetsCount > 0

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
            <ModalButton variant="danger" onClick={handleDelete} loading={loading} disabled={verifying}>
              {verifying ? 'Verifica storico…' : 'Elimina definitivamente'}
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
                {effectiveUsage.transactionsCount > 0 && <li>{effectiveUsage.transactionsCount} transazioni</li>}
                {effectiveUsage.refundsCount > 0 && <li>{effectiveUsage.refundsCount} rimborsi</li>}
                {effectiveUsage.fundsTransferCount > 0 && <li>{effectiveUsage.fundsTransferCount} trasferimenti</li>}
                {effectiveUsage.assetsCount > 0 && <li>{effectiveUsage.assetsCount} asset collegati</li>}
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
