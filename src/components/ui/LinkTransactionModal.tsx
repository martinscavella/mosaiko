'use client'

import { useMemo, useState } from 'react'
import { Search, Link2, Check } from 'lucide-react'
import Modal from './Modal'
import { useAllTransactions, useFinanceCache, type Transaction } from '@/lib/financeCache'
import { formatCurrency } from '@/lib/helpers/format'

interface LinkTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  /** Transazioni già collegate all'entità: escluse dai candidati */
  linkedTransactionIds: string[]
  /** Chiamato quando l'utente sceglie una transazione da collegare */
  onSelect: (transaction: Transaction) => Promise<void> | void
  title?: string
  subtitle?: string
  /** Importo dell'entità: usato per ordinare i candidati per vicinanza (es. importo bolletta) */
  suggestedAmount?: number
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * Selettore riusabile "collega a transazione" (T6.0, implementazione concreta
 * di LinkEntityPicker per il caso entità→transazione Finance: bollette,
 * abbonamenti, corsi…). Legge le transazioni dalla cache Finance globale.
 *
 * Gestisce la finestra T4.1: se la ricerca non trova nulla e lo storico non è
 * completo, offre di caricarlo on-demand.
 */
export default function LinkTransactionModal({
  isOpen,
  onClose,
  linkedTransactionIds,
  onSelect,
  title = 'Collega transazione',
  subtitle = 'Cerca la transazione corrispondente',
  suggestedAmount,
}: LinkTransactionModalProps) {
  const { transactions } = useAllTransactions()
  const { hasFullTransactionHistory, loadFullTransactionHistory } = useFinanceCache()

  const [search, setSearch] = useState('')
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  const linkedSet = useMemo(() => new Set(linkedTransactionIds), [linkedTransactionIds])

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = transactions.filter(t => {
      if (linkedSet.has(t.id)) return false
      if (!term) return true
      return (
        t.transaction_details?.toLowerCase().includes(term) ||
        t.account_name?.toLowerCase().includes(term) ||
        String(Math.abs(t.current_amount)).includes(term)
      )
    })

    // Ordina per vicinanza all'importo suggerito, poi per data più recente
    if (suggestedAmount !== undefined) {
      const target = Math.abs(suggestedAmount)
      return filtered
        .slice()
        .sort((a, b) => {
          const da = Math.abs(Math.abs(a.current_amount) - target)
          const db = Math.abs(Math.abs(b.current_amount) - target)
          if (da !== db) return da - db
          return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
        })
        .slice(0, 50)
    }

    return filtered.slice(0, 50)
  }, [transactions, search, linkedSet, suggestedAmount])

  const handleSelect = async (transaction: Transaction) => {
    setLinkingId(transaction.id)
    try {
      await onSelect(transaction)
      onClose()
    } catch (err) {
      console.error('Errore nel collegamento della transazione:', err)
    } finally {
      setLinkingId(null)
    }
  }

  const handleLoadHistory = async () => {
    setLoadingHistory(true)
    try {
      await loadFullTransactionHistory()
    } finally {
      setLoadingHistory(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} subtitle={subtitle} size="md">
      <div className="space-y-4">
        {/* Ricerca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per descrizione, conto o importo…"
            className="w-full pl-9 pr-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary"
            autoFocus
          />
        </div>

        {/* Lista candidati */}
        <div className="max-h-80 overflow-y-auto space-y-2">
          {candidates.length === 0 ? (
            <div className="text-center py-8 text-ink-muted">
              <p className="text-sm mb-3">Nessuna transazione trovata.</p>
              {!hasFullTransactionHistory && (
                <button
                  onClick={handleLoadHistory}
                  disabled={loadingHistory}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary bg-primary-subtle hover:bg-primary-subtle/80 rounded-lg disabled:opacity-50"
                >
                  {loadingHistory ? 'Caricamento…' : 'Cerca in tutto lo storico'}
                </button>
              )}
            </div>
          ) : (
            candidates.map(transaction => {
              const isIncome = transaction.current_amount > 0
              return (
                <button
                  key={transaction.id}
                  onClick={() => handleSelect(transaction)}
                  disabled={linkingId !== null}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-canvas hover:bg-inset text-left transition-colors disabled:opacity-50"
                >
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-subtle text-primary shrink-0">
                    {linkingId === transaction.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Link2 className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {transaction.transaction_details || 'Senza descrizione'}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {formatDate(transaction.transaction_date)}
                      {transaction.account_name && ` · ${transaction.account_name}`}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold font-amount shrink-0 ${isIncome ? 'text-success-strong' : 'text-ink'}`}>
                    {formatCurrency(transaction.current_amount)}
                  </span>
                </button>
              )
            })
          )}
        </div>

        {!hasFullTransactionHistory && candidates.length > 0 && (
          <p className="text-xs text-ink-muted text-center">
            Vengono cercate le transazioni degli ultimi 24 mesi.{' '}
            <button
              onClick={handleLoadHistory}
              disabled={loadingHistory}
              className="text-primary hover:underline disabled:opacity-50"
            >
              {loadingHistory ? 'Caricamento…' : 'Cerca in tutto lo storico'}
            </button>
          </p>
        )}
      </div>
    </Modal>
  )
}
