'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import Modal, { ModalButton } from '@/components/ui/Modal'
import LinkTransactionModal from '@/components/ui/LinkTransactionModal'
import { useAuth } from '@/lib/auth'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAllTransactions, type Transaction } from '@/lib/financeCache'
import { formatCurrency } from '@/lib/helpers/format'
import { useGroceryData, type ReceiptLine } from '../groceryData'
import { Receipt, Plus, Trash2, TrendingUp, Link2, ShoppingBasket } from 'lucide-react'

const round3 = (n: number) => Math.round(n * 1000) / 1000
const formatQty = (n: number) => (Number.isInteger(n) ? String(n) : round3(n).toString())
const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })

export default function GroceryReceiptsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { data, loading, error, refetch } = useGroceryData()
  const { transactions } = useAllTransactions()

  const [showLinkModal, setShowLinkModal] = useState(false)
  const [activeTransaction, setActiveTransaction] = useState<Transaction | null>(null)
  const [lineForm, setLineForm] = useState({ item_id: '', quantity: '', unit_price: '', loadPantry: true })
  const [savingLine, setSavingLine] = useState(false)

  const items = useMemo(() => data?.items ?? [], [data?.items])
  const receiptLines = useMemo(() => data?.receiptLines ?? [], [data?.receiptLines])

  const itemById = useMemo(() => new Map(items.map(i => [i.id, i])), [items])
  const txById = useMemo(() => new Map(transactions.map(t => [t.id, t])), [transactions])

  // Righe raggruppate per transazione (scontrino)
  const receipts = useMemo(() => {
    const groups = new Map<string, ReceiptLine[]>()
    for (const line of receiptLines) {
      const arr = groups.get(line.transaction_id) ?? []
      arr.push(line)
      groups.set(line.transaction_id, arr)
    }
    return Array.from(groups.entries())
      .map(([transactionId, lines]) => ({
        transactionId,
        lines,
        transaction: txById.get(transactionId) ?? null,
        total: lines.reduce((s, l) => s + l.quantity * l.unit_price, 0),
      }))
      .sort((a, b) => {
        const da = a.transaction?.transaction_date ?? ''
        const db = b.transaction?.transaction_date ?? ''
        return db.localeCompare(da)
      })
  }, [receiptLines, txById])

  // Storico prezzi per articolo
  const priceHistory = useMemo(() => {
    return items
      .map(item => {
        const lines = receiptLines
          .filter(l => l.item_id === item.id)
          .map(l => ({ ...l, date: txById.get(l.transaction_id)?.transaction_date ?? l.created_at }))
          .sort((a, b) => b.date.localeCompare(a.date))
        if (lines.length === 0) return null
        const prices = lines.map(l => l.unit_price)
        return {
          item,
          count: lines.length,
          latest: prices[0],
          min: Math.min(...prices),
          max: Math.max(...prices),
          avg: prices.reduce((s, p) => s + p, 0) / prices.length,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.item.name.localeCompare(b.item.name))
  }, [items, receiptLines, txById])

  if (!authLoading && !user) {
    router.push('/auth/login')
    return null
  }

  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !activeTransaction || !lineForm.item_id || !lineForm.quantity || !lineForm.unit_price) return

    setSavingLine(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const quantity = parseFloat(lineForm.quantity)
      const unitPrice = parseFloat(lineForm.unit_price)

      const { error: insertError } = await supabase.from('grocery_receipt_lines').insert({
        user_id: user.id,
        transaction_id: activeTransaction.id,
        item_id: lineForm.item_id,
        quantity,
        unit_price: unitPrice,
      })
      if (insertError) throw insertError

      // Carica in dispensa se richiesto
      if (lineForm.loadPantry) {
        const item = itemById.get(lineForm.item_id)
        if (item) {
          await supabase
            .from('grocery_items')
            .update({ current_quantity: round3(item.current_quantity + quantity) })
            .eq('id', item.id)
        }
      }

      setLineForm({ item_id: '', quantity: '', unit_price: '', loadPantry: true })
      await refetch()
    } catch (err) {
      console.error('Errore nell\'aggiunta della riga:', err)
    } finally {
      setSavingLine(false)
    }
  }

  const handleDeleteLine = async (line: ReceiptLine) => {
    if (!user) return
    const supabase = createSupabaseBrowserClient()
    const { error: deleteError } = await supabase.from('grocery_receipt_lines').delete().eq('id', line.id)
    if (deleteError) {
      console.error('Errore nell\'eliminazione della riga:', deleteError)
      return
    }
    await refetch()
  }

  const linesForActive = activeTransaction
    ? receiptLines.filter(l => l.transaction_id === activeTransaction.id)
    : []

  return (
    <ModuleLayout moduleId="grocery">
      <div className="max-w-7xl 3xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ModuleHeader
          title="Scontrini e prezzi"
          subtitle="Esplodi una spesa in righe e traccia i prezzi per articolo"
          icon={<Receipt className="w-5 h-5" />}
          stats={[
            { label: 'Scontrini', value: String(receipts.length), color: 'green' },
            { label: 'Righe', value: String(receiptLines.length), color: 'blue' },
          ]}
          actions={[{
            label: 'Esplodi spesa',
            onClick: () => setShowLinkModal(true),
            icon: <Link2 className="w-4 h-4" />,
            disabled: items.length === 0,
          }]}
        />

        {error && (
          <div className="mb-6 bg-danger-subtle border border-danger-subtle rounded-lg p-4 text-sm text-danger">
            Errore nel caricamento: {error}
          </div>
        )}

        {items.length === 0 && !loading ? (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center">
            <p className="text-sm text-ink-secondary">Aggiungi prima qualche articolo in dispensa: le righe scontrino li referenziano.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scontrini */}
            <section>
              <h2 className="text-lg font-semibold text-ink mb-4">Scontrini</h2>
              {receipts.length === 0 ? (
                <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center">
                  <div className="w-14 h-14 flex items-center justify-center rounded-full bg-module-grocery-subtle text-module-grocery mx-auto mb-4">
                    <Receipt className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-ink mb-1">Nessuno scontrino</h3>
                  <p className="text-sm text-ink-secondary mb-4">Collega una spesa di Finance ed esplodila in righe: caricherai la dispensa e lo storico prezzi.</p>
                  <button onClick={() => setShowLinkModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-primary hover:bg-primary-hover text-white transition-all active:scale-95">
                    <Link2 className="w-4 h-4" /> Esplodi una spesa
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {receipts.map(receipt => (
                    <div key={receipt.transactionId} className="bg-surface border border-edge rounded-lg shadow-card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="min-w-0">
                          <p className="font-medium text-ink truncate">
                            {receipt.transaction?.transaction_details ?? 'Transazione'}
                          </p>
                          <p className="text-xs text-ink-muted">
                            {receipt.transaction ? formatDate(receipt.transaction.transaction_date) : '—'}
                          </p>
                        </div>
                        <button
                          onClick={() => { setActiveTransaction(receipt.transaction); }}
                          disabled={!receipt.transaction}
                          className="text-xs font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline shrink-0"
                        >
                          Aggiungi righe
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {receipt.lines.map(line => {
                          const item = itemById.get(line.item_id)
                          return (
                            <div key={line.id} className="flex items-center gap-2 text-sm">
                              <ShoppingBasket className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                              <span className="flex-1 min-w-0 truncate text-ink">{item?.name ?? 'Articolo'}</span>
                              <span className="text-ink-muted font-amount">
                                {formatQty(line.quantity)}{item ? ` ${item.unit}` : ''} × {formatCurrency(line.unit_price)}
                              </span>
                              <span className="font-amount font-medium text-ink w-16 text-right">{formatCurrency(line.quantity * line.unit_price)}</span>
                              <button onClick={() => handleDeleteLine(line)} className="p-1 rounded text-ink-muted hover:text-danger hover:bg-inset transition-colors" title="Rimuovi riga">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-edge-subtle">
                        <span className="text-xs text-ink-muted">Totale righe</span>
                        <span className="font-amount font-semibold text-ink">{formatCurrency(receipt.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Storico prezzi */}
            <section>
              <h2 className="text-lg font-semibold text-ink mb-4">Storico prezzi</h2>
              {priceHistory.length === 0 ? (
                <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center text-ink-muted text-sm">
                  Lo storico prezzi si popola man mano che esplodi le spese in righe.
                </div>
              ) : (
                <div className="bg-surface border border-edge rounded-lg shadow-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-ink-muted border-b border-edge-subtle">
                          <th className="px-4 py-2 font-medium">Articolo</th>
                          <th className="px-4 py-2 font-medium text-right">Ultimo</th>
                          <th className="px-4 py-2 font-medium text-right">Min</th>
                          <th className="px-4 py-2 font-medium text-right">Max</th>
                          <th className="px-4 py-2 font-medium text-right">Acquisti</th>
                        </tr>
                      </thead>
                      <tbody>
                        {priceHistory.map(row => (
                          <tr key={row.item.id} className="border-b border-edge-subtle last:border-0">
                            <td className="px-4 py-2.5">
                              <span className="text-ink font-medium">{row.item.name}</span>
                              <span className="text-ink-muted text-xs"> /{row.item.unit}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-amount text-ink">
                              <span className="inline-flex items-center gap-1">
                                {row.latest > row.avg && <TrendingUp className="w-3 h-3 text-danger" />}
                                {formatCurrency(row.latest)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-amount text-success-strong">{formatCurrency(row.min)}</td>
                            <td className="px-4 py-2.5 text-right font-amount text-ink-secondary">{formatCurrency(row.max)}</td>
                            <td className="px-4 py-2.5 text-right font-amount text-ink-muted">{row.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Selettore transazione da esplodere (T6.0) */}
      <LinkTransactionModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        linkedTransactionIds={[]}
        onSelect={(t) => { setShowLinkModal(false); setActiveTransaction(t) }}
        title="Esplodi una spesa"
        subtitle="Scegli la transazione della spesa da dettagliare"
      />

      {/* Aggiunta righe per la transazione selezionata */}
      <Modal
        isOpen={activeTransaction !== null}
        onClose={() => setActiveTransaction(null)}
        title="Righe scontrino"
        subtitle={activeTransaction?.transaction_details ?? undefined}
        size="md"
        footer={
          <ModalButton variant="secondary" onClick={() => setActiveTransaction(null)}>Chiudi</ModalButton>
        }
      >
        <div className="space-y-4">
          {/* Righe già presenti */}
          {linesForActive.length > 0 && (
            <div className="space-y-1.5">
              {linesForActive.map(line => {
                const item = itemById.get(line.item_id)
                return (
                  <div key={line.id} className="flex items-center gap-2 text-sm bg-canvas rounded-lg px-3 py-2">
                    <span className="flex-1 min-w-0 truncate text-ink">{item?.name ?? 'Articolo'}</span>
                    <span className="text-ink-muted font-amount">
                      {formatQty(line.quantity)}{item ? ` ${item.unit}` : ''} × {formatCurrency(line.unit_price)}
                    </span>
                    <button onClick={() => handleDeleteLine(line)} className="p-1 rounded text-ink-muted hover:text-danger hover:bg-inset transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Form nuova riga */}
          <form onSubmit={handleAddLine} className="space-y-3 border-t border-edge-subtle pt-4">
            <div>
              <label htmlFor="line-item" className="block text-sm font-medium text-ink-secondary mb-1">Articolo *</label>
              <select id="line-item" value={lineForm.item_id} onChange={e => setLineForm(p => ({ ...p, item_id: e.target.value }))} className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary" required>
                <option value="">Seleziona…</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="line-qty" className="block text-sm font-medium text-ink-secondary mb-1">Quantità *</label>
                <input id="line-qty" type="number" step="0.001" value={lineForm.quantity} onChange={e => setLineForm(p => ({ ...p, quantity: e.target.value }))} placeholder="0" className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary font-amount" required />
              </div>
              <div>
                <label htmlFor="line-price" className="block text-sm font-medium text-ink-secondary mb-1">Prezzo unitario (€) *</label>
                <input id="line-price" type="number" step="0.0001" value={lineForm.unit_price} onChange={e => setLineForm(p => ({ ...p, unit_price: e.target.value }))} placeholder="0,00" className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary font-amount" required />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-secondary">
              <input type="checkbox" checked={lineForm.loadPantry} onChange={e => setLineForm(p => ({ ...p, loadPantry: e.target.checked }))} className="rounded border-edge text-primary focus:ring-primary" />
              Carica la quantità in dispensa
            </label>
            <button
              type="submit"
              disabled={savingLine || !lineForm.item_id || !lineForm.quantity || !lineForm.unit_price}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-primary hover:bg-primary-hover text-white disabled:bg-inset disabled:text-ink-muted disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> {savingLine ? 'Aggiunta…' : 'Aggiungi riga'}
            </button>
          </form>
        </div>
      </Modal>
    </ModuleLayout>
  )
}
