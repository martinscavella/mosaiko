'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import Modal, { ModalButton } from '@/components/ui/Modal'
import { useAuth } from '@/lib/auth'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/helpers/format'
import {
  uploadAttachment, getAttachmentUrl, deleteAttachment, validateAttachment,
} from '@/lib/attachments'
import { useHouseData, type HouseMaintenance } from '../houseData'
import {
  Wrench, Plus, Calendar, FileText, Trash2, Pencil, Paperclip,
  AlertTriangle, RotateCw, User,
} from 'lucide-react'

const formatDate = (date: string | null) =>
  date ? new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const emptyForm = {
  property_id: '',
  title: '',
  kind: 'straordinaria' as HouseMaintenance['kind'],
  interval_months: '',
  last_done_date: '',
  next_due_date: '',
  cost: '',
  contact_id: '',
  notes: '',
}

export default function HouseMaintenancesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { data, loading, error, refetch } = useHouseData()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<HouseMaintenance | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [openingAttachment, setOpeningAttachment] = useState<string | null>(null)

  const properties = useMemo(() => data?.properties ?? [], [data?.properties])
  const contacts = useMemo(() => data?.contacts ?? [], [data?.contacts])
  const maintenances = useMemo(() => data?.maintenances ?? [], [data?.maintenances])

  const propertyName = useMemo(() => {
    const map = new Map(properties.map(p => [p.id, p.name]))
    return (id: string) => map.get(id) ?? '—'
  }, [properties])

  const contactName = useMemo(() => {
    const map = new Map(contacts.map(c => [c.id, c.name]))
    return (id: string | null) => (id ? map.get(id) ?? null : null)
  }, [contacts])

  const today = new Date().toISOString().slice(0, 10)
  const overdueCount = useMemo(
    () => maintenances.filter(m => m.next_due_date && m.next_due_date < today).length,
    [maintenances, today]
  )

  const openNew = useCallback(() => {
    setEditing(null)
    setForm({ ...emptyForm, property_id: properties[0]?.id ?? '' })
    setFile(null)
    setFileError(null)
    setShowModal(true)
  }, [properties])

  // FAB della navbar mobile: apre "Nuova Manutenzione"
  useEffect(() => {
    window.addEventListener('openNewItemModal', openNew)
    return () => window.removeEventListener('openNewItemModal', openNew)
  }, [openNew])

  if (!authLoading && !user) {
    router.push('/auth/login')
    return null
  }

  const openEdit = (m: HouseMaintenance) => {
    setEditing(m)
    setForm({
      property_id: m.property_id,
      title: m.title,
      kind: m.kind,
      interval_months: m.interval_months?.toString() ?? '',
      last_done_date: m.last_done_date ?? '',
      next_due_date: m.next_due_date ?? '',
      cost: m.cost?.toString() ?? '',
      contact_id: m.contact_id ?? '',
      notes: m.notes ?? '',
    })
    setFile(null)
    setFileError(null)
    setShowModal(true)
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !form.property_id || !form.title.trim()) return

    setSaving(true)
    try {
      const supabase = createSupabaseBrowserClient()

      let attachmentPath = editing?.attachment_path ?? null
      if (file) {
        const uploaded = await uploadAttachment(user.id, 'house', 'maintenances', file)
        attachmentPath = uploaded.path
      }

      const payload = {
        property_id: form.property_id,
        title: form.title.trim(),
        kind: form.kind,
        interval_months: form.interval_months ? parseInt(form.interval_months, 10) : null,
        last_done_date: form.last_done_date || null,
        next_due_date: form.next_due_date || null,
        cost: form.cost ? parseFloat(form.cost) : null,
        contact_id: form.contact_id || null,
        notes: form.notes.trim() || null,
        attachment_path: attachmentPath,
      }

      const { error: saveError } = editing
        ? await supabase.from('house_maintenances').update(payload).eq('id', editing.id)
        : await supabase.from('house_maintenances').insert({ user_id: user.id, ...payload })
      if (saveError) throw saveError

      setShowModal(false)
      await refetch()
    } catch (err) {
      console.error('Errore nel salvataggio della manutenzione:', err)
    } finally {
      setSaving(false)
    }
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

  const handleDelete = async (m: HouseMaintenance) => {
    if (!user) return
    if (!confirm(`Eliminare la manutenzione "${m.title}"?`)) return

    const supabase = createSupabaseBrowserClient()
    const { error: deleteError } = await supabase.from('house_maintenances').delete().eq('id', m.id)
    if (deleteError) {
      console.error('Errore nell\'eliminazione della manutenzione:', deleteError)
      return
    }
    if (m.attachment_path) await deleteAttachment(m.attachment_path).catch(() => {})
    await refetch()
  }

  return (
    <ModuleLayout moduleId="house">
      <div className="max-w-7xl 3xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ModuleHeader
          title="Manutenzioni"
          subtitle="Interventi periodici e straordinari, con scadenze"
          icon={<Wrench className="w-5 h-5" />}
          stats={[
            { label: 'Totale', value: String(maintenances.length), color: 'blue' },
            { label: 'In ritardo', value: String(overdueCount), color: 'orange' },
          ]}
          actions={[{ label: 'Nuova Manutenzione', onClick: openNew, icon: <Plus className="w-4 h-4" />, disabled: properties.length === 0 }]}
        />

        {error && (
          <div className="mb-6 bg-danger-subtle border border-danger-subtle rounded-lg p-4 text-sm text-danger">
            Errore nel caricamento: {error}
          </div>
        )}

        {properties.length === 0 && !loading ? (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center">
            <p className="text-sm text-ink-secondary">Aggiungi prima una proprietà: ogni manutenzione appartiene a una casa.</p>
          </div>
        ) : loading && maintenances.length === 0 ? (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center text-ink-muted">Caricamento…</div>
        ) : maintenances.length === 0 ? (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-module-house-subtle text-module-house mx-auto mb-4">
              <Wrench className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-1">Nessuna manutenzione</h3>
            <p className="text-sm text-ink-secondary mb-4">Registra caldaia, filtri, revisioni: terrai traccia di storico e prossima scadenza.</p>
            <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-primary hover:bg-primary-hover text-white transition-all active:scale-95">
              <Plus className="w-4 h-4" /> Aggiungi manutenzione
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {maintenances.map(m => {
              const isOverdue = m.next_due_date && m.next_due_date < today
              const contact = contactName(m.contact_id)
              return (
                <div key={m.id} className="bg-surface border border-edge rounded-lg shadow-card p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-module-house-subtle text-module-house shrink-0">
                      {m.kind === 'periodica' ? <RotateCw className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-ink truncate">{m.title}</h3>
                        <span className="text-xs text-ink-muted capitalize shrink-0">· {m.kind}</span>
                      </div>
                      <p className="text-xs text-ink-muted flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span>{propertyName(m.property_id)}</span>
                        {m.kind === 'periodica' && m.interval_months && <span>ogni {m.interval_months} mesi</span>}
                        {m.last_done_date && <span>ultima: {formatDate(m.last_done_date)}</span>}
                        {contact && <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{contact}</span>}
                      </p>
                    </div>

                    {m.next_due_date && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${isOverdue ? 'bg-danger-subtle text-danger' : 'bg-inset text-ink-secondary'}`}>
                        {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                        {formatDate(m.next_due_date)}
                      </span>
                    )}

                    {m.cost != null && (
                      <span className="text-sm font-semibold font-amount text-ink shrink-0">{formatCurrency(Number(m.cost))}</span>
                    )}

                    {m.attachment_path && (
                      <button onClick={() => handleOpenAttachment(m.attachment_path!)} disabled={openingAttachment === m.attachment_path} className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-inset transition-colors disabled:opacity-50" title="Apri allegato">
                        <FileText className="w-4 h-4" />
                      </button>
                    )}

                    <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-inset transition-colors shrink-0" title="Modifica">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(m)} className="p-1.5 rounded-lg text-ink-muted hover:text-danger hover:bg-inset transition-colors shrink-0" title="Elimina">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Modifica Manutenzione' : 'Nuova Manutenzione'}
        subtitle="Intervento periodico o straordinario"
        size="md"
        footer={
          <>
            <ModalButton variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Annulla</ModalButton>
            <button type="submit" form="maintenance-form" disabled={saving || !form.property_id || !form.title.trim()} className="px-4 py-2 rounded-lg font-medium text-sm bg-primary hover:bg-primary-hover text-white disabled:bg-inset disabled:text-ink-muted disabled:cursor-not-allowed transition-all active:scale-95">
              {saving ? 'Salvataggio…' : editing ? 'Salva' : 'Crea'}
            </button>
          </>
        }
      >
        <form id="maintenance-form" onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="m-title" className="block text-sm font-medium text-ink-secondary mb-1">Titolo *</label>
            <input id="m-title" type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Es. Revisione caldaia" className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="m-property" className="block text-sm font-medium text-ink-secondary mb-1">Proprietà *</label>
              <select id="m-property" value={form.property_id} onChange={e => setForm(p => ({ ...p, property_id: e.target.value }))} className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary" required>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="m-kind" className="block text-sm font-medium text-ink-secondary mb-1">Tipo</label>
              <select id="m-kind" value={form.kind} onChange={e => setForm(p => ({ ...p, kind: e.target.value as HouseMaintenance['kind'] }))} className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary capitalize">
                <option value="straordinaria">Straordinaria</option>
                <option value="periodica">Periodica</option>
              </select>
            </div>
          </div>

          {form.kind === 'periodica' && (
            <div>
              <label htmlFor="m-interval" className="block text-sm font-medium text-ink-secondary mb-1">Intervallo (mesi)</label>
              <input id="m-interval" type="number" min="1" value={form.interval_months} onChange={e => setForm(p => ({ ...p, interval_months: e.target.value }))} placeholder="Es. 12" className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary font-amount" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="m-last" className="block text-sm font-medium text-ink-secondary mb-1">Ultimo intervento</label>
              <input id="m-last" type="date" value={form.last_done_date} onChange={e => setForm(p => ({ ...p, last_done_date: e.target.value }))} className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary" />
            </div>
            <div>
              <label htmlFor="m-next" className="block text-sm font-medium text-ink-secondary mb-1">Prossima scadenza</label>
              <input id="m-next" type="date" value={form.next_due_date} onChange={e => setForm(p => ({ ...p, next_due_date: e.target.value }))} className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="m-cost" className="block text-sm font-medium text-ink-secondary mb-1">Costo (€)</label>
              <input id="m-cost" type="number" step="0.01" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} placeholder="0,00" className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary font-amount" />
            </div>
            <div>
              <label htmlFor="m-contact" className="block text-sm font-medium text-ink-secondary mb-1">Fornitore</label>
              <select id="m-contact" value={form.contact_id} onChange={e => setForm(p => ({ ...p, contact_id: e.target.value }))} className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary">
                <option value="">Nessuno</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.role ? ` (${c.role})` : ''}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="m-notes" className="block text-sm font-medium text-ink-secondary mb-1">Note</label>
            <textarea id="m-notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1">Allegato (PDF o immagine)</label>
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-edge rounded-lg cursor-pointer hover:bg-inset transition-colors">
              <Paperclip className="w-4 h-4 text-ink-muted" />
              <span className="text-sm text-ink-secondary truncate">
                {file ? file.name : editing?.attachment_path ? 'Sostituisci allegato' : 'Scegli un file (max 10 MB)'}
              </span>
              <input type="file" accept="application/pdf,image/*" onChange={handleFileChange} className="hidden" />
            </label>
            {fileError && <p className="text-xs text-danger mt-1">{fileError}</p>}
          </div>
        </form>
      </Modal>
    </ModuleLayout>
  )
}
