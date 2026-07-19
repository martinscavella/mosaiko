'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import Modal, { ModalButton } from '@/components/ui/Modal'
import LinkTransactionModal from '@/components/ui/LinkTransactionModal'
import { useAuth } from '@/lib/auth'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { type Transaction } from '@/lib/financeCache'
import { formatCurrency } from '@/lib/helpers/format'
import {
  uploadAttachment,
  getAttachmentUrl,
  deleteAttachment,
  validateAttachment,
} from '@/lib/attachments'
import { useHouseData, type HouseBill } from '../houseData'
import {
  Receipt, Plus, FileText, Link2, Unlink, Check, Calendar,
  Zap, Flame, Droplet, Wifi, Phone, Trash2, Paperclip,
} from 'lucide-react'

const UTILITY_TYPES: HouseBill['utility_type'][] = [
  'luce', 'gas', 'acqua', 'internet', 'telefono', 'rifiuti', 'condominio', 'altro',
]

const utilityIcon: Record<HouseBill['utility_type'], React.ReactNode> = {
  luce: <Zap className="w-4 h-4" />,
  gas: <Flame className="w-4 h-4" />,
  acqua: <Droplet className="w-4 h-4" />,
  internet: <Wifi className="w-4 h-4" />,
  telefono: <Phone className="w-4 h-4" />,
  rifiuti: <Trash2 className="w-4 h-4" />,
  condominio: <Receipt className="w-4 h-4" />,
  altro: <Receipt className="w-4 h-4" />,
}

const formatDate = (date: string | null) =>
  date ? new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const emptyForm = {
  property_id: '',
  utility_type: 'luce' as HouseBill['utility_type'],
  provider_name: '',
  amount: '',
  consumption: '',
  consumption_unit: '',
  period_start: '',
  period_end: '',
  due_date: '',
  notes: '',
}

export default function HouseBillsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { data, loading, error, refetch } = useHouseData()

  const [showNewBill, setShowNewBill] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  // Collegamento a transazione (T6.0)
  const [billToLink, setBillToLink] = useState<HouseBill | null>(null)
  const [openingAttachment, setOpeningAttachment] = useState<string | null>(null)

  const properties = useMemo(() => data?.properties ?? [], [data?.properties])
  const bills = useMemo(() => data?.bills ?? [], [data?.bills])
  const billPayments = useMemo(() => data?.billPayments ?? [], [data?.billPayments])

  const paymentByBillId = useMemo(() => {
    const map = new Map<string, (typeof billPayments)[number]>()
    for (const p of billPayments) map.set(p.bill_id, p)
    return map
  }, [billPayments])

  const propertyName = useMemo(() => {
    const map = new Map(properties.map(p => [p.id, p.name]))
    return (id: string) => map.get(id) ?? '—'
  }, [properties])

  const dueTotal = useMemo(
    () => bills.filter(b => b.status === 'da_pagare').reduce((s, b) => s + Number(b.amount || 0), 0),
    [bills]
  )

  if (!authLoading && !user) {
    router.push('/auth/login')
    return null
  }

  const openNewBill = () => {
    setForm({ ...emptyForm, property_id: properties[0]?.id ?? '' })
    setFile(null)
    setFileError(null)
    setShowNewBill(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    if (selected) {
      const err = validateAttachment(selected)
      setFileError(err)
      setFile(err ? null : selected)
    } else {
      setFile(null)
      setFileError(null)
    }
  }

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !form.property_id || !form.amount) return

    setSaving(true)
    try {
      const supabase = createSupabaseBrowserClient()

      let attachmentPath: string | null = null
      if (file) {
        const uploaded = await uploadAttachment(user.id, 'house', 'bills', file)
        attachmentPath = uploaded.path
      }

      const { error: insertError } = await supabase.from('house_bills').insert({
        user_id: user.id,
        property_id: form.property_id,
        utility_type: form.utility_type,
        provider_name: form.provider_name.trim() || null,
        amount: parseFloat(form.amount),
        consumption: form.consumption ? parseFloat(form.consumption) : null,
        consumption_unit: form.consumption_unit.trim() || null,
        period_start: form.period_start || null,
        period_end: form.period_end || null,
        due_date: form.due_date || null,
        notes: form.notes.trim() || null,
        attachment_path: attachmentPath,
      })
      if (insertError) throw insertError

      setShowNewBill(false)
      await refetch()
    } catch (err) {
      console.error('Errore nella creazione della bolletta:', err)
    } finally {
      setSaving(false)
    }
  }

  // Segna la bolletta come pagata collegandola a una transazione (T6.0)
  const handleLinkTransaction = async (transaction: Transaction) => {
    if (!user || !billToLink) return
    const supabase = createSupabaseBrowserClient()

    const { error: linkError } = await supabase.from('bill_payments').insert({
      user_id: user.id,
      bill_id: billToLink.id,
      transaction_id: transaction.id,
      amount: billToLink.amount,
    })
    if (linkError) throw linkError

    const { error: updateError } = await supabase
      .from('house_bills')
      .update({ status: 'pagata' })
      .eq('id', billToLink.id)
    if (updateError) throw updateError

    await refetch()
  }

  const handleUnlink = async (bill: HouseBill) => {
    if (!user) return
    const payment = paymentByBillId.get(bill.id)
    if (!payment) return

    const supabase = createSupabaseBrowserClient()
    const { error: deleteError } = await supabase.from('bill_payments').delete().eq('id', payment.id)
    if (deleteError) {
      console.error('Errore nello scollegamento:', deleteError)
      return
    }
    await supabase.from('house_bills').update({ status: 'da_pagare' }).eq('id', bill.id)
    await refetch()
  }

  const handleOpenAttachment = async (path: string) => {
    setOpeningAttachment(path)
    try {
      const url = await getAttachmentUrl(path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('Errore nell\'apertura dell\'allegato:', err)
    } finally {
      setOpeningAttachment(null)
    }
  }

  const handleDeleteBill = async (bill: HouseBill) => {
    if (!user) return
    if (!confirm(`Eliminare la bolletta ${bill.utility_type} da ${formatCurrency(Number(bill.amount))}?`)) return

    const supabase = createSupabaseBrowserClient()
    // bill_payments cascada; se pagata, riporta la transazione libera dal vincolo
    const { error: deleteError } = await supabase.from('house_bills').delete().eq('id', bill.id)
    if (deleteError) {
      console.error('Errore nell\'eliminazione della bolletta:', deleteError)
      return
    }
    if (bill.attachment_path) {
      await deleteAttachment(bill.attachment_path).catch(() => {})
    }
    await refetch()
  }

  return (
    <ModuleLayout moduleId="house">
      <div className="max-w-7xl 3xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ModuleHeader
          title="Bollette"
          subtitle="Utenze, scadenze e collegamento ai pagamenti"
          icon={<Receipt className="w-5 h-5" />}
          stats={[
            { label: 'Da pagare', value: formatCurrency(dueTotal), color: 'orange' },
            { label: 'Totale bollette', value: String(bills.length), color: 'blue' },
          ]}
          actions={[
            {
              label: 'Nuova Bolletta',
              onClick: openNewBill,
              icon: <Plus className="w-4 h-4" />,
              disabled: properties.length === 0,
            },
          ]}
        />

        {error && (
          <div className="mb-6 bg-danger-subtle border border-danger-subtle rounded-lg p-4 text-sm text-danger">
            Errore nel caricamento: {error}
          </div>
        )}

        {properties.length === 0 && !loading ? (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center">
            <p className="text-sm text-ink-secondary">
              Aggiungi prima una proprietà: ogni bolletta appartiene a una casa.
            </p>
          </div>
        ) : loading && bills.length === 0 ? (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center text-ink-muted">
            Caricamento…
          </div>
        ) : bills.length === 0 ? (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-module-house-subtle text-module-house mx-auto mb-4">
              <Receipt className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-1">Nessuna bolletta</h3>
            <p className="text-sm text-ink-secondary mb-4">
              Registra la prima utenza: potrai allegare il PDF e collegarla al pagamento in Finance.
            </p>
            <button
              onClick={openNewBill}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-primary hover:bg-primary-hover text-white transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Aggiungi bolletta
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {bills.map(bill => {
              const isPaid = bill.status === 'pagata'
              const linked = paymentByBillId.get(bill.id)
              return (
                <div key={bill.id} className="bg-surface border border-edge rounded-lg shadow-card p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-module-house-subtle text-module-house shrink-0">
                      {utilityIcon[bill.utility_type]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-ink capitalize truncate">{bill.utility_type}</h3>
                        {bill.provider_name && (
                          <span className="text-sm text-ink-muted truncate">· {bill.provider_name}</span>
                        )}
                      </div>
                      <p className="text-xs text-ink-muted">
                        {propertyName(bill.property_id)}
                        {bill.due_date && (
                          <span className="inline-flex items-center gap-1 ml-2">
                            <Calendar className="w-3 h-3" /> scad. {formatDate(bill.due_date)}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Allegato */}
                    {bill.attachment_path && (
                      <button
                        onClick={() => handleOpenAttachment(bill.attachment_path!)}
                        disabled={openingAttachment === bill.attachment_path}
                        className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-inset transition-colors disabled:opacity-50"
                        title="Apri allegato"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}

                    <span className="text-base font-semibold font-amount text-ink shrink-0">
                      {formatCurrency(Number(bill.amount))}
                    </span>

                    {/* Stato + azione pagamento */}
                    {isPaid ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-success-subtle text-success-strong">
                          <Check className="w-3 h-3" /> Pagata
                        </span>
                        {linked && (
                          <button
                            onClick={() => handleUnlink(bill)}
                            className="p-1.5 rounded-lg text-ink-muted hover:text-danger hover:bg-inset transition-colors"
                            title="Scollega dalla transazione"
                          >
                            <Unlink className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setBillToLink(bill)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-subtle text-primary hover:bg-primary-subtle/80 transition-colors shrink-0"
                      >
                        <Link2 className="w-4 h-4" /> Segna pagata
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteBill(bill)}
                      className="p-1.5 rounded-lg text-ink-muted hover:text-danger hover:bg-inset transition-colors shrink-0"
                      title="Elimina bolletta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modale nuova bolletta */}
      <Modal
        isOpen={showNewBill}
        onClose={() => setShowNewBill(false)}
        title="Nuova Bolletta"
        subtitle="Registra un'utenza con eventuale PDF"
        size="md"
        footer={
          <>
            <ModalButton variant="secondary" onClick={() => setShowNewBill(false)} disabled={saving}>
              Annulla
            </ModalButton>
            <button
              type="submit"
              form="new-bill-form"
              disabled={saving || !form.property_id || !form.amount}
              className="px-4 py-2 rounded-lg font-medium text-sm bg-primary hover:bg-primary-hover text-white disabled:bg-inset disabled:text-ink-muted disabled:cursor-not-allowed transition-all active:scale-95"
            >
              {saving ? 'Salvataggio…' : 'Crea Bolletta'}
            </button>
          </>
        }
      >
        <form id="new-bill-form" onSubmit={handleCreateBill} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="bill-property" className="block text-sm font-medium text-ink-secondary mb-1">Proprietà *</label>
              <select
                id="bill-property"
                value={form.property_id}
                onChange={e => setForm(p => ({ ...p, property_id: e.target.value }))}
                className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary"
                required
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="bill-utility" className="block text-sm font-medium text-ink-secondary mb-1">Utenza</label>
              <select
                id="bill-utility"
                value={form.utility_type}
                onChange={e => setForm(p => ({ ...p, utility_type: e.target.value as HouseBill['utility_type'] }))}
                className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary capitalize"
              >
                {UTILITY_TYPES.map(t => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="bill-provider" className="block text-sm font-medium text-ink-secondary mb-1">Fornitore</label>
              <input
                id="bill-provider"
                type="text"
                value={form.provider_name}
                onChange={e => setForm(p => ({ ...p, provider_name: e.target.value }))}
                placeholder="Es. Enel, A2A…"
                className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="bill-amount" className="block text-sm font-medium text-ink-secondary mb-1">Importo (€) *</label>
              <input
                id="bill-amount"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="0,00"
                className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary font-amount"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="bill-consumption" className="block text-sm font-medium text-ink-secondary mb-1">Consumo</label>
              <input
                id="bill-consumption"
                type="number"
                step="0.001"
                value={form.consumption}
                onChange={e => setForm(p => ({ ...p, consumption: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary font-amount"
              />
            </div>
            <div>
              <label htmlFor="bill-unit" className="block text-sm font-medium text-ink-secondary mb-1">Unità</label>
              <input
                id="bill-unit"
                type="text"
                value={form.consumption_unit}
                onChange={e => setForm(p => ({ ...p, consumption_unit: e.target.value }))}
                placeholder="kWh, Smc, m³"
                className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="bill-due" className="block text-sm font-medium text-ink-secondary mb-1">Scadenza</label>
              <input
                id="bill-due"
                type="date"
                value={form.due_date}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="bill-period-start" className="block text-sm font-medium text-ink-secondary mb-1">Periodo dal</label>
              <input
                id="bill-period-start"
                type="date"
                value={form.period_start}
                onChange={e => setForm(p => ({ ...p, period_start: e.target.value }))}
                className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="bill-period-end" className="block text-sm font-medium text-ink-secondary mb-1">Periodo al</label>
              <input
                id="bill-period-end"
                type="date"
                value={form.period_end}
                onChange={e => setForm(p => ({ ...p, period_end: e.target.value }))}
                className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Upload PDF (T6.1) */}
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1">Allegato (PDF o immagine)</label>
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-edge rounded-lg cursor-pointer hover:bg-inset transition-colors">
              <Paperclip className="w-4 h-4 text-ink-muted" />
              <span className="text-sm text-ink-secondary truncate">
                {file ? file.name : 'Scegli un file (max 10 MB)'}
              </span>
              <input type="file" accept="application/pdf,image/*" onChange={handleFileChange} className="hidden" />
            </label>
            {fileError && <p className="text-xs text-danger mt-1">{fileError}</p>}
          </div>
        </form>
      </Modal>

      {/* Collega a transazione Finance (T6.0) */}
      <LinkTransactionModal
        isOpen={billToLink !== null}
        onClose={() => setBillToLink(null)}
        linkedTransactionIds={billPayments.map(p => p.transaction_id)}
        onSelect={handleLinkTransaction}
        title="Segna bolletta come pagata"
        subtitle="Collega la transazione del pagamento"
        suggestedAmount={billToLink ? Number(billToLink.amount) : undefined}
      />
    </ModuleLayout>
  )
}
