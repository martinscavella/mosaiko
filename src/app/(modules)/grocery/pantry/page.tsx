'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import Modal, { ModalButton } from '@/components/ui/Modal'
import { useAuth } from '@/lib/auth'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useGroceryData, GROCERY_UNITS, type GroceryItem, type GroceryUnit } from '../groceryData'
import { Package, Plus, Search, Minus, Trash2, Pencil, AlertTriangle } from 'lucide-react'

const emptyForm = {
  name: '',
  unit: 'pezzo' as GroceryUnit,
  category: '',
  current_quantity: '',
  min_quantity: '',
  notes: '',
}

// Arrotonda a 3 decimali evitando errori di floating point
const round3 = (n: number) => Math.round(n * 1000) / 1000

const formatQty = (n: number) => {
  const r = round3(n)
  return Number.isInteger(r) ? String(r) : r.toString()
}

export default function GroceryPantryPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { data, loading, error, refetch } = useGroceryData()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<GroceryItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [adjustingId, setAdjustingId] = useState<string | null>(null)

  const items = useMemo(() => data?.items ?? [], [data?.items])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return items
    return items.filter(i =>
      i.name.toLowerCase().includes(term) || i.category?.toLowerCase().includes(term)
    )
  }, [items, search])

  const lowStockCount = useMemo(
    () => items.filter(i => i.min_quantity != null && i.current_quantity <= i.min_quantity).length,
    [items]
  )

  const openNew = useCallback(() => {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }, [])

  // FAB della navbar mobile
  useEffect(() => {
    window.addEventListener('openNewItemModal', openNew)
    return () => window.removeEventListener('openNewItemModal', openNew)
  }, [openNew])

  if (!authLoading && !user) {
    router.push('/auth/login')
    return null
  }

  const openEdit = (item: GroceryItem) => {
    setEditing(item)
    setForm({
      name: item.name,
      unit: item.unit,
      category: item.category ?? '',
      current_quantity: item.current_quantity.toString(),
      min_quantity: item.min_quantity?.toString() ?? '',
      notes: item.notes ?? '',
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !form.name.trim()) return

    setSaving(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const payload = {
        name: form.name.trim(),
        unit: form.unit,
        category: form.category.trim() || null,
        current_quantity: form.current_quantity ? parseFloat(form.current_quantity) : 0,
        min_quantity: form.min_quantity ? parseFloat(form.min_quantity) : null,
        notes: form.notes.trim() || null,
      }

      const { error: saveError } = editing
        ? await supabase.from('grocery_items').update(payload).eq('id', editing.id)
        : await supabase.from('grocery_items').insert({ user_id: user.id, ...payload })
      if (saveError) throw saveError

      setShowModal(false)
      await refetch()
    } catch (err) {
      console.error('Errore nel salvataggio dell\'articolo:', err)
    } finally {
      setSaving(false)
    }
  }

  // Aggiustamento rapido della giacenza (+/-), senza scendere sotto zero
  const adjustQuantity = async (item: GroceryItem, delta: number) => {
    if (!user) return
    const next = Math.max(0, round3(item.current_quantity + delta))
    if (next === item.current_quantity) return

    setAdjustingId(item.id)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: updateError } = await supabase
        .from('grocery_items')
        .update({ current_quantity: next })
        .eq('id', item.id)
      if (updateError) throw updateError
      await refetch()
    } catch (err) {
      console.error('Errore nell\'aggiornamento della giacenza:', err)
    } finally {
      setAdjustingId(null)
    }
  }

  const handleDelete = async (item: GroceryItem) => {
    if (!user) return
    if (!confirm(`Eliminare "${item.name}" dalla dispensa? Verrà rimosso anche dallo storico prezzi.`)) return

    const supabase = createSupabaseBrowserClient()
    const { error: deleteError } = await supabase.from('grocery_items').delete().eq('id', item.id)
    if (deleteError) {
      console.error('Errore nell\'eliminazione dell\'articolo:', deleteError)
      return
    }
    await refetch()
  }

  return (
    <ModuleLayout moduleId="grocery">
      <div className="max-w-7xl 3xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ModuleHeader
          title="Dispensa"
          subtitle="Catalogo articoli e giacenze correnti"
          icon={<Package className="w-5 h-5" />}
          stats={[
            { label: 'Articoli', value: String(items.length), color: 'green' },
            { label: 'Sotto scorta', value: String(lowStockCount), color: 'orange' },
          ]}
          actions={[{ label: 'Nuovo Articolo', onClick: openNew, icon: <Plus className="w-4 h-4" /> }]}
        />

        {error && (
          <div className="mb-6 bg-danger-subtle border border-danger-subtle rounded-lg p-4 text-sm text-danger">
            Errore nel caricamento: {error}
          </div>
        )}

        {items.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca per nome o categoria…"
              className="w-full pl-9 pr-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center text-ink-muted">Caricamento…</div>
        ) : items.length === 0 ? (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-module-grocery-subtle text-module-grocery mx-auto mb-4">
              <Package className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-1">Dispensa vuota</h3>
            <p className="text-sm text-ink-secondary mb-4">Aggiungi il primo articolo con la sua unità di misura e giacenza.</p>
            <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-primary hover:bg-primary-hover text-white transition-all active:scale-95">
              <Plus className="w-4 h-4" /> Aggiungi articolo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(item => {
              const isLow = item.min_quantity != null && item.current_quantity <= item.min_quantity
              const step = item.unit === 'pezzo' || item.unit === 'confezione' ? 1 : 0.5
              return (
                <div key={item.id} className="bg-surface border border-edge rounded-lg shadow-card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-ink truncate">{item.name}</h3>
                      {item.category && <p className="text-xs text-ink-muted">{item.category}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-inset transition-colors" title="Modifica">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item)} className="p-1.5 rounded-lg text-ink-muted hover:text-danger hover:bg-inset transition-colors" title="Elimina">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <p className="text-2xl font-bold font-amount text-ink">
                        {formatQty(item.current_quantity)}
                        <span className="text-sm font-normal text-ink-muted"> {item.unit}</span>
                      </p>
                      {isLow && (
                        <p className="text-xs text-warning inline-flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3" /> sotto scorta (min {formatQty(item.min_quantity!)})
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => adjustQuantity(item, -step)}
                        disabled={adjustingId === item.id || item.current_quantity <= 0}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-inset text-ink-secondary hover:bg-danger-subtle hover:text-danger transition-colors disabled:opacity-40"
                        title={`- ${step}`}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => adjustQuantity(item, step)}
                        disabled={adjustingId === item.id}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-module-grocery-subtle text-module-grocery hover:brightness-95 transition-colors disabled:opacity-40"
                        title={`+ ${step}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
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
        title={editing ? 'Modifica Articolo' : 'Nuovo Articolo'}
        subtitle="Catalogo e giacenza in dispensa"
        size="sm"
        footer={
          <>
            <ModalButton variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Annulla</ModalButton>
            <button type="submit" form="item-form" disabled={saving || !form.name.trim()} className="px-4 py-2 rounded-lg font-medium text-sm bg-primary hover:bg-primary-hover text-white disabled:bg-inset disabled:text-ink-muted disabled:cursor-not-allowed transition-all active:scale-95">
              {saving ? 'Salvataggio…' : editing ? 'Salva' : 'Crea Articolo'}
            </button>
          </>
        }
      >
        <form id="item-form" onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="i-name" className="block text-sm font-medium text-ink-secondary mb-1">Nome *</label>
            <input id="i-name" type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Es. Pasta, Latte…" className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="i-unit" className="block text-sm font-medium text-ink-secondary mb-1">Unità</label>
              <select id="i-unit" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value as GroceryUnit }))} className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary">
                {GROCERY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="i-category" className="block text-sm font-medium text-ink-secondary mb-1">Categoria</label>
              <input id="i-category" type="text" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Dispensa, freschi…" className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="i-qty" className="block text-sm font-medium text-ink-secondary mb-1">Giacenza attuale</label>
              <input id="i-qty" type="number" step="0.001" value={form.current_quantity} onChange={e => setForm(p => ({ ...p, current_quantity: e.target.value }))} placeholder="0" className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary font-amount" />
            </div>
            <div>
              <label htmlFor="i-min" className="block text-sm font-medium text-ink-secondary mb-1">Scorta minima</label>
              <input id="i-min" type="number" step="0.001" value={form.min_quantity} onChange={e => setForm(p => ({ ...p, min_quantity: e.target.value }))} placeholder="opzionale" className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary font-amount" />
            </div>
          </div>

          <div>
            <label htmlFor="i-notes" className="block text-sm font-medium text-ink-secondary mb-1">Note</label>
            <textarea id="i-notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary resize-none" />
          </div>
        </form>
      </Modal>
    </ModuleLayout>
  )
}
