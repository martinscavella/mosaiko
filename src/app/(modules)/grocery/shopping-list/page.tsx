'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import { useAuth } from '@/lib/auth'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useGroceryData, type ShoppingListEntry } from '../groceryData'
import { ShoppingCart, Plus, Trash2, Check, PackageCheck } from 'lucide-react'

const round3 = (n: number) => Math.round(n * 1000) / 1000

export default function GroceryShoppingListPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { data, loading, error, refetch } = useGroceryData()

  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const items = useMemo(() => data?.items ?? [], [data?.items])
  const entries = useMemo(() => data?.shoppingList ?? [], [data?.shoppingList])
  const checkedCount = useMemo(() => entries.filter(e => e.is_checked).length, [entries])

  const focusInput = useCallback(() => inputRef.current?.focus(), [])

  // FAB della navbar mobile: mette il focus sull'aggiunta rapida
  useEffect(() => {
    window.addEventListener('openNewItemModal', focusInput)
    return () => window.removeEventListener('openNewItemModal', focusInput)
  }, [focusInput])

  if (!authLoading && !user) {
    router.push('/auth/login')
    return null
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !name.trim()) return

    setAdding(true)
    try {
      const supabase = createSupabaseBrowserClient()
      // Collega al catalogo se il nome coincide con un articolo esistente:
      // così a spesa conclusa si carica la dispensa e lo storico prezzi.
      const matched = items.find(i => i.name.toLowerCase() === name.trim().toLowerCase())
      const { error: insertError } = await supabase.from('grocery_shopping_list').insert({
        user_id: user.id,
        item_id: matched?.id ?? null,
        name: matched?.name ?? name.trim(),
        quantity: quantity ? parseFloat(quantity) : null,
        unit: matched?.unit ?? null,
        is_checked: false,
      })
      if (insertError) throw insertError

      setName('')
      setQuantity('')
      await refetch()
      focusInput()
    } catch (err) {
      console.error('Errore nell\'aggiunta alla lista:', err)
    } finally {
      setAdding(false)
    }
  }

  const toggleChecked = async (entry: ShoppingListEntry) => {
    if (!user) return
    const supabase = createSupabaseBrowserClient()
    const { error: updateError } = await supabase
      .from('grocery_shopping_list')
      .update({ is_checked: !entry.is_checked })
      .eq('id', entry.id)
    if (updateError) {
      console.error('Errore nell\'aggiornamento della voce:', updateError)
      return
    }
    await refetch()
  }

  const deleteEntry = async (entry: ShoppingListEntry) => {
    if (!user) return
    const supabase = createSupabaseBrowserClient()
    const { error: deleteError } = await supabase.from('grocery_shopping_list').delete().eq('id', entry.id)
    if (deleteError) {
      console.error('Errore nell\'eliminazione della voce:', deleteError)
      return
    }
    await refetch()
  }

  // Concludi la spesa: carica in dispensa i comprati collegati a un articolo,
  // poi rimuove tutte le voci spuntate.
  const completeShopping = async () => {
    if (!user) return
    const checked = entries.filter(e => e.is_checked)
    if (checked.length === 0) return

    setBusy(true)
    try {
      const supabase = createSupabaseBrowserClient()

      // Incrementa le giacenze per le voci collegate con quantità
      for (const entry of checked) {
        if (entry.item_id && entry.quantity && entry.quantity > 0) {
          const item = items.find(i => i.id === entry.item_id)
          if (!item) continue
          const next = round3(item.current_quantity + entry.quantity)
          const { error: updateError } = await supabase
            .from('grocery_items')
            .update({ current_quantity: next })
            .eq('id', item.id)
          if (updateError) throw updateError
        }
      }

      // Rimuove le voci comprate
      const { error: deleteError } = await supabase
        .from('grocery_shopping_list')
        .delete()
        .in('id', checked.map(e => e.id))
      if (deleteError) throw deleteError

      await refetch()
    } catch (err) {
      console.error('Errore nel completamento della spesa:', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModuleLayout moduleId="grocery">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ModuleHeader
          title="Lista della spesa"
          subtitle="Aggiunta rapida, spunta e carico in dispensa"
          icon={<ShoppingCart className="w-5 h-5" />}
          stats={[
            { label: 'Da comprare', value: String(entries.length - checkedCount), color: 'orange' },
            { label: 'Nel carrello', value: String(checkedCount), color: 'green' },
          ]}
        />

        {error && (
          <div className="mb-6 bg-danger-subtle border border-danger-subtle rounded-lg p-4 text-sm text-danger">
            Errore nel caricamento: {error}
          </div>
        )}

        {/* Aggiunta rapida */}
        <form onSubmit={handleAdd} className="flex gap-2 mb-4">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            list="grocery-items-list"
            placeholder="Aggiungi un articolo…"
            className="flex-1 px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <datalist id="grocery-items-list">
            {items.map(i => <option key={i.id} value={i.name} />)}
          </datalist>
          <input
            type="number"
            step="0.001"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="Qtà"
            className="w-20 px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary font-amount"
          />
          <button
            type="submit"
            disabled={adding || !name.trim()}
            className="px-4 py-2 rounded-lg font-medium text-sm bg-primary hover:bg-primary-hover text-white disabled:bg-inset disabled:text-ink-muted disabled:cursor-not-allowed transition-all active:scale-95 inline-flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Aggiungi
          </button>
        </form>

        {loading && entries.length === 0 ? (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center text-ink-muted">Caricamento…</div>
        ) : entries.length === 0 ? (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-module-grocery-subtle text-module-grocery mx-auto mb-4">
              <ShoppingCart className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-1">Lista vuota</h3>
            <p className="text-sm text-ink-secondary">Aggiungi articoli qui sopra. Se il nome coincide con la dispensa, a spesa conclusa la giacenza si aggiorna da sola.</p>
          </div>
        ) : (
          <>
            <div className="bg-surface border border-edge rounded-lg shadow-card divide-y divide-edge-subtle">
              {entries.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 p-3">
                  <button
                    onClick={() => toggleChecked(entry)}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      entry.is_checked
                        ? 'bg-module-grocery border-module-grocery text-white'
                        : 'border-edge text-transparent hover:border-module-grocery'
                    }`}
                    title={entry.is_checked ? 'Segna da comprare' : 'Segna preso'}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <div className={`flex-1 min-w-0 ${entry.is_checked ? 'opacity-50 line-through' : ''}`}>
                    <p className="text-sm font-medium text-ink truncate">
                      {entry.name}
                      {entry.item_id && <span className="ml-2 text-xs text-module-grocery no-underline">· in dispensa</span>}
                    </p>
                  </div>
                  {entry.quantity != null && (
                    <span className="text-sm font-amount text-ink-secondary shrink-0">
                      {entry.quantity}{entry.unit ? ` ${entry.unit}` : ''}
                    </span>
                  )}
                  <button onClick={() => deleteEntry(entry)} className="p-1.5 rounded-lg text-ink-muted hover:text-danger hover:bg-inset transition-colors shrink-0" title="Rimuovi">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {checkedCount > 0 && (
              <button
                onClick={completeShopping}
                disabled={busy}
                className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm bg-module-grocery text-white hover:brightness-95 transition-all active:scale-95 disabled:opacity-60"
              >
                <PackageCheck className="w-4 h-4" />
                {busy ? 'Aggiornamento…' : `Concludi spesa (${checkedCount}) e carica in dispensa`}
              </button>
            )}
          </>
        )}
      </div>
    </ModuleLayout>
  )
}
