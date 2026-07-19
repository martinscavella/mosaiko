'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import Modal, { ModalButton } from '@/components/ui/Modal'
import { useAuth } from '@/lib/auth'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/helpers/format'
import { useHouseData, type HouseHousing } from '../houseData'
import { KeyRound, Plus, Trash2, Pencil, CalendarClock, Home, Landmark } from 'lucide-react'

const formatDate = (date: string | null) =>
  date ? new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const emptyForm = {
  property_id: '',
  kind: 'affitto' as HouseHousing['kind'],
  monthly_amount: '',
  due_day: '',
  start_date: '',
  end_date: '',
  notes: '',
}

export default function HouseHousingPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { data, loading, error, refetch } = useHouseData()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<HouseHousing | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const properties = useMemo(() => data?.properties ?? [], [data?.properties])
  const housing = useMemo(() => data?.housing ?? [], [data?.housing])

  const propertyName = useMemo(() => {
    const map = new Map(properties.map(p => [p.id, p.name]))
    return (id: string) => map.get(id) ?? '—'
  }, [properties])

  const monthlyTotal = useMemo(
    () => housing.reduce((s, h) => s + Number(h.monthly_amount || 0), 0),
    [housing]
  )

  if (!authLoading && !user) {
    router.push('/auth/login')
    return null
  }

  const openNew = () => {
    setEditing(null)
    setForm({ ...emptyForm, property_id: properties[0]?.id ?? '' })
    setShowModal(true)
  }

  const openEdit = (h: HouseHousing) => {
    setEditing(h)
    setForm({
      property_id: h.property_id,
      kind: h.kind,
      monthly_amount: h.monthly_amount.toString(),
      due_day: h.due_day?.toString() ?? '',
      start_date: h.start_date ?? '',
      end_date: h.end_date ?? '',
      notes: h.notes ?? '',
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !form.property_id || !form.monthly_amount) return

    setSaving(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const payload = {
        property_id: form.property_id,
        kind: form.kind,
        monthly_amount: parseFloat(form.monthly_amount),
        due_day: form.due_day ? parseInt(form.due_day, 10) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        notes: form.notes.trim() || null,
      }

      const { error: saveError } = editing
        ? await supabase.from('house_housing').update(payload).eq('id', editing.id)
        : await supabase.from('house_housing').insert({ user_id: user.id, ...payload })
      if (saveError) throw saveError

      setShowModal(false)
      await refetch()
    } catch (err) {
      console.error('Errore nel salvataggio del contratto:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (h: HouseHousing) => {
    if (!user) return
    if (!confirm(`Eliminare il contratto di ${h.kind} da ${formatCurrency(Number(h.monthly_amount))}/mese?`)) return

    const supabase = createSupabaseBrowserClient()
    const { error: deleteError } = await supabase.from('house_housing').delete().eq('id', h.id)
    if (deleteError) {
      console.error('Errore nell\'eliminazione del contratto:', deleteError)
      return
    }
    await refetch()
  }

  return (
    <ModuleLayout moduleId="house">
      <div className="max-w-7xl 3xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ModuleHeader
          title="Affitto e mutuo"
          subtitle="Contratti ricorrenti per proprietà"
          icon={<KeyRound className="w-5 h-5" />}
          stats={[
            { label: 'Contratti', value: String(housing.length), color: 'blue' },
            { label: 'Totale mensile', value: formatCurrency(monthlyTotal), color: 'orange' },
          ]}
          actions={[{ label: 'Nuovo Contratto', onClick: openNew, icon: <Plus className="w-4 h-4" />, disabled: properties.length === 0 }]}
        />

        {error && (
          <div className="mb-6 bg-danger-subtle border border-danger-subtle rounded-lg p-4 text-sm text-danger">
            Errore nel caricamento: {error}
          </div>
        )}

        {properties.length === 0 && !loading ? (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center">
            <p className="text-sm text-ink-secondary">Aggiungi prima una proprietà: ogni contratto appartiene a una casa.</p>
          </div>
        ) : loading && housing.length === 0 ? (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center text-ink-muted">Caricamento…</div>
        ) : housing.length === 0 ? (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-module-house-subtle text-module-house mx-auto mb-4">
              <KeyRound className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-1">Nessun contratto</h3>
            <p className="text-sm text-ink-secondary mb-4">Registra affitto o mutuo con rata mensile e scadenza del pagamento.</p>
            <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-primary hover:bg-primary-hover text-white transition-all active:scale-95">
              <Plus className="w-4 h-4" /> Aggiungi contratto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {housing.map(h => (
              <div key={h.id} className="bg-surface border border-edge rounded-lg shadow-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-module-house-subtle text-module-house">
                    {h.kind === 'mutuo' ? <Landmark className="w-5 h-5" /> : <Home className="w-5 h-5" />}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(h)} className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-inset transition-colors" title="Modifica">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(h)} className="p-1.5 rounded-lg text-ink-muted hover:text-danger hover:bg-inset transition-colors" title="Elimina">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-ink capitalize">{h.kind}</h3>
                <p className="text-xs text-ink-muted mb-3">{propertyName(h.property_id)}</p>
                <p className="text-2xl font-bold font-amount text-ink">
                  {formatCurrency(Number(h.monthly_amount))}
                  <span className="text-sm font-normal text-ink-muted"> /mese</span>
                </p>
                <div className="mt-3 pt-3 border-t border-edge-subtle flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-secondary">
                  {h.due_day && (
                    <span className="inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> il {h.due_day} del mese</span>
                  )}
                  {(h.start_date || h.end_date) && (
                    <span>{formatDate(h.start_date)} → {formatDate(h.end_date)}</span>
                  )}
                </div>
                {h.notes && <p className="text-xs text-ink-muted mt-2">{h.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Modifica Contratto' : 'Nuovo Contratto'}
        subtitle="Affitto o mutuo"
        size="sm"
        footer={
          <>
            <ModalButton variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Annulla</ModalButton>
            <button type="submit" form="housing-form" disabled={saving || !form.property_id || !form.monthly_amount} className="px-4 py-2 rounded-lg font-medium text-sm bg-primary hover:bg-primary-hover text-white disabled:bg-inset disabled:text-ink-muted disabled:cursor-not-allowed transition-all active:scale-95">
              {saving ? 'Salvataggio…' : editing ? 'Salva' : 'Crea'}
            </button>
          </>
        }
      >
        <form id="housing-form" onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="h-property" className="block text-sm font-medium text-ink-secondary mb-1">Proprietà *</label>
              <select id="h-property" value={form.property_id} onChange={e => setForm(p => ({ ...p, property_id: e.target.value }))} className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary" required>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="h-kind" className="block text-sm font-medium text-ink-secondary mb-1">Tipo</label>
              <select id="h-kind" value={form.kind} onChange={e => setForm(p => ({ ...p, kind: e.target.value as HouseHousing['kind'] }))} className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary capitalize">
                <option value="affitto">Affitto</option>
                <option value="mutuo">Mutuo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="h-amount" className="block text-sm font-medium text-ink-secondary mb-1">Rata mensile (€) *</label>
              <input id="h-amount" type="number" step="0.01" value={form.monthly_amount} onChange={e => setForm(p => ({ ...p, monthly_amount: e.target.value }))} placeholder="0,00" className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary font-amount" required />
            </div>
            <div>
              <label htmlFor="h-due-day" className="block text-sm font-medium text-ink-secondary mb-1">Giorno di scadenza</label>
              <input id="h-due-day" type="number" min="1" max="31" value={form.due_day} onChange={e => setForm(p => ({ ...p, due_day: e.target.value }))} placeholder="1-31" className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary font-amount" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="h-start" className="block text-sm font-medium text-ink-secondary mb-1">Inizio</label>
              <input id="h-start" type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary" />
            </div>
            <div>
              <label htmlFor="h-end" className="block text-sm font-medium text-ink-secondary mb-1">Fine</label>
              <input id="h-end" type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary" />
            </div>
          </div>

          <div>
            <label htmlFor="h-notes" className="block text-sm font-medium text-ink-secondary mb-1">Note</label>
            <textarea id="h-notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary resize-none" />
          </div>
        </form>
      </Modal>
    </ModuleLayout>
  )
}
