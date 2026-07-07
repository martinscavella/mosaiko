'use client'

import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import Modal, { ModalButton } from './Modal'
import { useAccountOperations } from '@/lib/financeCache'
import type { Account } from '@/lib/financeCache'
import { ACCOUNT_TYPE_OPTIONS, CURRENCY_OPTIONS } from '@/lib/accountTypes'

interface AccountFormModalProps {
  isOpen: boolean
  onClose: () => void
  /** Se presente, il modale lavora in modalità modifica su questo account */
  account?: Account | null
  onSaved?: () => void
}

interface AccountFormData {
  name: string
  type: string
  color: string
  currency: string
  initial_balance: string
}

const EMPTY_FORM: AccountFormData = {
  name: '',
  type: 'bank_account',
  color: '#1D4ED8',
  currency: 'EUR',
  initial_balance: '0'
}

export default function AccountFormModal({ isOpen, onClose, account, onSaved }: AccountFormModalProps) {
  const { createAccount, updateAccount } = useAccountOperations()
  const isEdit = !!account
  const [formData, setFormData] = useState<AccountFormData>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Precompila/reset ad ogni apertura, così il form non conserva dati
  // dell'account precedentemente modificato.
  useEffect(() => {
    if (!isOpen) return
    setError(null)
    if (account) {
      setFormData({
        name: account.name,
        type: account.type,
        color: account.color,
        currency: account.currency,
        initial_balance: account.initial_balance.toString()
      })
    } else {
      setFormData(EMPTY_FORM)
    }
  }, [isOpen, account])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setLoading(true)
    setError(null)
    try {
      if (isEdit && account) {
        await updateAccount(account.id, {
          name: formData.name.trim(),
          type: formData.type,
          color: formData.color,
          currency: formData.currency
        })
      } else {
        await createAccount({
          name: formData.name.trim(),
          type: formData.type,
          color: formData.color,
          currency: formData.currency,
          initial_balance: parseFloat(formData.initial_balance) || 0
        })
      }
      onSaved?.()
      onClose()
    } catch (err) {
      console.error('Errore nel salvare l\'account:', err)
      setError('Errore nel salvare l\'account. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Modifica Account' : 'Aggiungi Nuovo Account'}
      size="sm"
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose} disabled={loading}>
            Annulla
          </ModalButton>
          <button
            type="submit"
            form="account-form"
            disabled={loading || !formData.name.trim()}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150 active:scale-95',
              loading || !formData.name.trim()
                ? 'bg-inset text-ink-muted cursor-not-allowed'
                : 'bg-primary hover:bg-primary-hover text-white'
            )}
          >
            {loading ? 'Salvataggio...' : isEdit ? 'Salva Modifiche' : 'Aggiungi Account'}
          </button>
        </>
      }
    >
      <form id="account-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-secondary mb-1">
            Nome Account
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full border border-edge rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Es. Conto Corrente Principale"
            required
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-secondary mb-1">
            Tipo Account
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full border border-edge rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {ACCOUNT_TYPE_OPTIONS.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1">
              Colore
            </label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full h-10 border border-edge rounded-md px-1 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1">
              Valuta
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full border border-edge rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CURRENCY_OPTIONS.map((currency) => (
                <option key={currency.value} value={currency.value}>{currency.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-secondary mb-1">
            Saldo Iniziale
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.initial_balance}
            onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })}
            className="w-full border border-edge rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-inset disabled:text-ink-muted disabled:cursor-not-allowed"
            placeholder="0.00"
            disabled={isEdit}
          />
          {isEdit && (
            <p className="text-xs text-ink-muted mt-1">
              Non modificabile dopo la creazione: il saldo attuale è calcolato dai movimenti collegati. Usa &quot;Ricalcola saldo&quot; se sospetti un disallineamento.
            </p>
          )}
        </div>
        {error && (
          <p className="text-sm text-danger">{error}</p>
        )}
      </form>
    </Modal>
  )
}
