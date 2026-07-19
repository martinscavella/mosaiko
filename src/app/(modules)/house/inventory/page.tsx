'use client'

import { useMemo, useState } from 'react'
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
import { useHouseData, type HouseInventoryItem } from '../houseData'
import { Package, Plus, FileText, Trash2, Pencil, Paperclip, ShieldCheck, ShieldX } from 'lucide-react'

const formatDate = (date: string | null) =>
  date ? new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const emptyForm = {
  property_id: '',
  name: '',
  category: '',
  purchase_date: '',
  warranty_until: '',
  value: '',
  notes: '',
}

export default function HouseInventoryPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { data, loading, error, refetch } = useHouseData()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<HouseInventoryItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [openingAttachment, setOpeningAttachment] = useState<string | null>(null)

  const properties = useMemo(() => data?.properties ?? [], [data?.properties])
  const inventory = useMemo(() => data?.inventory ?? [], [data?.inventory])

  const propertyName = useMemo(() => {
    const map = new Map(properties.map(p => [p.id, p.name]))
    return (id: string) => map.get(id) ?? '—'
  }, [properties])

  const totalValue = useMemo(
    () => inventory.reduce((s, i) => s + Number(i.value || 0), 0),
    [inventory]
  )

  const today = new Date().toISOString().slice(0, 10)

  if (!authLoading && !user) {
    router.push('/auth/login')
    return null
  }

  const openNew = () => {
    setEditing(null)
    setForm({ ...emptyForm, property_id: properties[0]?.id ?? '' })
    setFile(null)
    setFileError(null)
    setShowModal(true)
  }

  const openEdit = (item: HouseInventoryItem) => {
    setEditing(item)
    setForm({
      property_id: item.property_id,
      name: item.name,
      category: item.category ?? '',
      purchase_date: item.purchase_date ?? '',
      warranty_until: item.warranty_until ?? '',
      value: item.value?.toString() ?? '',
      notes: item.notes ?? '',
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
    if (!user || !form.property_id || !form.name.trim()) return

    setSaving(true)
    try {
      const supabase = createSupabaseBrowserClient()

      let attachmentPath = editing?.attachment_path ?? null
      if (file) {
        const uploaded = await uploadAttachment(user.id, 'house', 'inventory', file)
        attachmentPath = uploaded.path
      }

      const payload = {
        property_id: form.property_id,
        name: form.name.trim(),
        category: form.category.trim() || null,
        purchase_date: form.purchase_date || null,
        warranty_until: form.warranty_until || null,
        value: form.value ? parseFloat(form.value) : null,
        notes: form.notes.trim() || null,
        attachment_path: attachmentPath,
      }

      const { error: saveError } = editing
        ? await supabase.from('house_inventory_items').update(payload).eq('id', editing.id)
        : await supabase.from('house_inventory_items').insert({ user_id: user.id, ...payload })
      if (saveError) throw saveError

      setShowModal(false)
      await refetch()
    } catch (err) {
      console.error('Errore nel salvataggio dell\'oggetto:', err)
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

  const handleDelete = async (item: HouseInventoryItem) => {
    if (!user) return
    if (!confirm(`Eliminare "${item.name}" dall'inventario?`)) return

    const supabase = createSupabaseBrowserClient()
    const { error: deleteError } = await supabase.from('house_inventory_items').delete().eq('id', item.id)
    if (deleteError) {
      console.error('Errore nell\'eliminazione dell\'oggetto:', deleteError)
      return
    }
    if (item.attachment_path) await deleteAttachment(item.attachment_path).catch(() => {})
    await refetch()
  }

  return (
    <ModuleLayout moduleId="house">
      <div className="max-w-7xl 3xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ModuleHeader
          title="Inventario"
          subtitle="Oggetti, garanzie e documenti"
          icon={<Package className="w-5 h-5" />}
          stats={[
            { label: 'Oggetti', value: String(inventory.length), color: 'blue' },
            { label: 'Valore totale', value: formatCurrency(totalValue), color: 'orange' },
          ]}
          actions={[{ label: 'Nuovo Oggetto', onClick: openNew, icon: <Plus className="w-4 h-4" />, disabled: properties.length === 0 }]}
        />

        {error && (
          <div className="mb-6 bg-danger-subtle border border-danger-subtle rounded-lg p-4 text-sm text-danger">
            Errore nel caricamento: {error}
          </div>
        )}

        {properties.length === 0 && !loading ? (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center">
            <p className="text-sm text-ink-secondary">Aggiungi prima una proprietà: ogni oggetto appartiene a una casa.</p>
          </div>
        ) : loading && inventory.length === 0 ? (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center text-ink-muted">Caricamento…</div>
        ) : inventory.length === 0 ? (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-module-house-subtle text-module-house mx-auto mb-4">
              <Package className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-1">Inventario vuoto</h3>
            <p className="text-sm text-ink-secondary mb-4">Registra elettrodomestici e oggetti di valore con garanzia e scontrino allegato.</p>
            <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-primary hover:bg-primary-hover text-white transition-all active:scale-95">
              <Plus className="w-4 h-4" /> Aggiungi oggetto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.map(item => {
              const warrantyActive = item.warranty_until ? item.warranty_until >= today : null
              return (
                <div key={item.id} className="bg-surface border border-edge rounded-lg shadow-card p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-module-house-subtle text-module-house">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1">
                      {item.attachment_path && (
                        <button onClick={() => handleOpenAttachment(item.attachment_path!)} disabled={openingAttachment === item.attachment_path} className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-inset transition-colors disabled:opacity-50" title="Apri allegato">
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-inset transition-colors" title="Modifica">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item)} className="p-1.5 rounded-lg text-ink-muted hover:text-danger hover:bg-inset transition-colors" title="Elimina">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-ink truncate">{item.name}</h3>
                  <p className="text-xs text-ink-muted mb-2">
                    {propertyName(item.property_id)}
                    {item.category && ` · ${item.category}`}
                  </p>
                  {item.value != null && (
                    <p className="text-lg font-semibold font-amount text-ink">{formatCurrency(Number(item.value))}</p>
                  )}
                  <div className="mt-2 space-y-1 text-xs text-ink-secondary">
                    {item.purchase_date && <p>Acquisto: {formatDate(item.purchase_date)}</p>}
                    {item.warranty_until && (
                      <p className={`inline-flex items-center gap-1 ${warrantyActive ? 'text-success-strong' : 'text-ink-muted'}`}>
                        {warrantyActive ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldX className="w-3.5 h-3.5" />}
                        Garanzia {warrantyActive ? 'fino al' : 'scaduta il'} {formatDate(item.warranty_until)}
                      </p>
                    )}
                  </div>
                  {item.notes && <p className="text-xs text-ink-muted mt-2">{item.notes}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Modifica Oggetto' : 'Nuovo Oggetto'}
        subtitle="Elettrodomestico, mobile, oggetto di valore"
        size="md"
        footer={
          <>
            <ModalButton variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Annulla</ModalButton>
            <button type="submit" form="inventory-form" disabled={saving || !form.property_id || !form.name.trim()} className="px-4 py-2 rounded-lg font-medium text-sm bg-primary hover:bg-primary-hover text-white disabled:bg-inset disabled:text-ink-muted disabled:cursor-not-allowed transition-all active:scale-95">
              {saving ? 'Salvataggio…' : editing ? 'Salva' : 'Crea'}
            </button>
          </>
        }
      >
        <form id="inventory-form" onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="i-name" className="block text-sm font-medium text-ink-secondary mb-1">Nome *</label>
            <input id="i-name" type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Es. Lavatrice Bosch" className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="i-property" className="block text-sm font-medium text-ink-secondary mb-1">Proprietà *</label>
              <select id="i-property" value={form.property_id} onChange={e => setForm(p => ({ ...p, property_id: e.target.value }))} className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary" required>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="i-category" className="block text-sm font-medium text-ink-secondary mb-1">Categoria</label>
              <input id="i-category" type="text" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Elettrodomestici, arredo…" className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="i-value" className="block text-sm font-medium text-ink-secondary mb-1">Valore (€)</label>
              <input id="i-value" type="number" step="0.01" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} placeholder="0,00" className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary font-amount" />
            </div>
            <div>
              <label htmlFor="i-purchase" className="block text-sm font-medium text-ink-secondary mb-1">Acquisto</label>
              <input id="i-purchase" type="date" value={form.purchase_date} onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))} className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary" />
            </div>
            <div>
              <label htmlFor="i-warranty" className="block text-sm font-medium text-ink-secondary mb-1">Garanzia fino</label>
              <input id="i-warranty" type="date" value={form.warranty_until} onChange={e => setForm(p => ({ ...p, warranty_until: e.target.value }))} className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary" />
            </div>
          </div>

          <div>
            <label htmlFor="i-notes" className="block text-sm font-medium text-ink-secondary mb-1">Note</label>
            <textarea id="i-notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1">Allegato (scontrino, garanzia…)</label>
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
