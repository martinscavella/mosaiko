'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import Modal, { ModalButton } from '@/components/ui/Modal'
import { useAuth } from '@/lib/auth'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/helpers/format'
import { useHouseData, type HouseProperty } from '../houseData'
import { Home, Plus, Receipt, Wrench, Star, MapPin, KeyRound, Package, Users } from 'lucide-react'

const PROPERTY_TYPES: HouseProperty['type'][] = ['casa', 'appartamento', 'box', 'terreno', 'altro']

const SECTIONS = [
  { href: '/house/bills', icon: Receipt, title: 'Bollette', desc: 'Utenze con PDF e collegamento a Finance' },
  { href: '/house/maintenances', icon: Wrench, title: 'Manutenzioni', desc: 'Interventi periodici e straordinari con scadenze' },
  { href: '/house/housing', icon: KeyRound, title: 'Affitto e mutuo', desc: 'Contratti ricorrenti e rate mensili' },
  { href: '/house/inventory', icon: Package, title: 'Inventario', desc: 'Oggetti, garanzie e documenti' },
  { href: '/house/contacts', icon: Users, title: 'Fornitori e contatti', desc: 'Idraulici, elettricisti, amministratori' },
] as const

export default function HouseDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { data, loading, error, refetch } = useHouseData()

  const [showNewProperty, setShowNewProperty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    address: '',
    type: 'casa' as HouseProperty['type'],
    is_primary: false,
  })

  const billsDue = useMemo(
    () => (data?.bills ?? []).filter(b => b.status === 'da_pagare'),
    [data?.bills]
  )
  const billsDueTotal = useMemo(
    () => billsDue.reduce((sum, b) => sum + Number(b.amount || 0), 0),
    [billsDue]
  )
  const upcomingMaintenances = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return (data?.maintenances ?? []).filter(m => m.next_due_date && m.next_due_date >= today)
  }, [data?.maintenances])

  if (!authLoading && !user) {
    router.push('/auth/login')
    return null
  }

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !form.name.trim()) return

    setSaving(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: insertError } = await supabase.from('house_properties').insert({
        user_id: user.id,
        name: form.name.trim(),
        address: form.address.trim() || null,
        type: form.type,
        is_primary: form.is_primary,
      })
      if (insertError) throw insertError

      setShowNewProperty(false)
      setForm({ name: '', address: '', type: 'casa', is_primary: false })
      await refetch()
    } catch (err) {
      console.error('Errore nella creazione della proprietà:', err)
    } finally {
      setSaving(false)
    }
  }

  const properties = data?.properties ?? []

  return (
    <ModuleLayout moduleId="house">
      <div className="max-w-7xl 3xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ModuleHeader
          title="House"
          subtitle="Gestionale della casa: proprietà, bollette, manutenzioni"
          icon={<Home className="w-5 h-5" />}
          stats={[
            { label: 'Proprietà', value: String(properties.length), color: 'orange' },
            { label: 'Bollette da pagare', value: formatCurrency(billsDueTotal), color: 'blue' },
          ]}
          actions={[
            {
              label: 'Nuova Proprietà',
              onClick: () => setShowNewProperty(true),
              icon: <Plus className="w-4 h-4" />,
            },
          ]}
        />

        {error && (
          <div className="mb-6 bg-danger-subtle border border-danger-subtle rounded-lg p-4 text-sm text-danger">
            Errore nel caricamento: {error}
          </div>
        )}

        {/* Proprietà */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-ink mb-4">Le tue proprietà</h2>
          {loading && properties.length === 0 ? (
            <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center text-ink-muted">
              Caricamento…
            </div>
          ) : properties.length === 0 ? (
            <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center">
              <div className="w-14 h-14 flex items-center justify-center rounded-full bg-module-house-subtle text-module-house mx-auto mb-4">
                <Home className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-1">Nessuna proprietà</h3>
              <p className="text-sm text-ink-secondary mb-4">
                Aggiungi la tua prima casa: bollette, manutenzioni e inventario appartengono a una proprietà.
              </p>
              <button
                onClick={() => setShowNewProperty(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-primary hover:bg-primary-hover text-white transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Aggiungi proprietà
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties.map(property => {
                const propertyBillsDue = billsDue.filter(b => b.property_id === property.id)
                return (
                  <div key={property.id} className="bg-surface border border-edge rounded-lg shadow-card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-module-house-subtle text-module-house">
                        <Home className="w-5 h-5" />
                      </div>
                      {property.is_primary && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-module-house-subtle text-module-house">
                          <Star className="w-3 h-3" /> Principale
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-ink">{property.name}</h3>
                    <p className="text-xs text-ink-muted capitalize mb-1">{property.type}</p>
                    {property.address && (
                      <p className="text-sm text-ink-secondary flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" /> {property.address}
                      </p>
                    )}
                    <div className="mt-4 pt-3 border-t border-edge-subtle flex items-center gap-4 text-sm text-ink-secondary">
                      <span className="flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-ink-muted" />
                        {propertyBillsDue.length} da pagare
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Wrench className="w-4 h-4 text-ink-muted" />
                        {upcomingMaintenances.filter(m => m.property_id === property.id).length} in scadenza
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Sezioni del modulo */}
        <section>
          <h2 className="text-lg font-semibold text-ink mb-4">Sezioni</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SECTIONS.map(section => {
              const Icon = section.icon
              return (
                <button
                  key={section.href}
                  onClick={() => router.push(section.href)}
                  className="bg-surface border border-edge rounded-lg shadow-card p-5 text-left hover:border-module-house transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-module-house-subtle text-module-house shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink">{section.title}</h3>
                      <p className="text-sm text-ink-muted">{section.desc}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      {/* Modale nuova proprietà */}
      <Modal
        isOpen={showNewProperty}
        onClose={() => setShowNewProperty(false)}
        title="Nuova Proprietà"
        subtitle="Aggiungi una casa o un immobile"
        size="sm"
        footer={
          <>
            <ModalButton variant="secondary" onClick={() => setShowNewProperty(false)} disabled={saving}>
              Annulla
            </ModalButton>
            <button
              type="submit"
              form="new-property-form"
              disabled={saving || !form.name.trim()}
              className="px-4 py-2 rounded-lg font-medium text-sm bg-primary hover:bg-primary-hover text-white disabled:bg-inset disabled:text-ink-muted disabled:cursor-not-allowed transition-all active:scale-95"
            >
              {saving ? 'Salvataggio…' : 'Crea Proprietà'}
            </button>
          </>
        }
      >
        <form id="new-property-form" onSubmit={handleCreateProperty} className="space-y-4">
          <div>
            <label htmlFor="property-name" className="block text-sm font-medium text-ink-secondary mb-1">Nome *</label>
            <input
              id="property-name"
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Es. Casa principale"
              className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
          </div>
          <div>
            <label htmlFor="property-address" className="block text-sm font-medium text-ink-secondary mb-1">Indirizzo</label>
            <input
              id="property-address"
              type="text"
              value={form.address}
              onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Via, città"
              className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="property-type" className="block text-sm font-medium text-ink-secondary mb-1">Tipo</label>
            <select
              id="property-type"
              value={form.type}
              onChange={e => setForm(prev => ({ ...prev, type: e.target.value as HouseProperty['type'] }))}
              className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary capitalize"
            >
              {PROPERTY_TYPES.map(t => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-secondary">
            <input
              type="checkbox"
              checked={form.is_primary}
              onChange={e => setForm(prev => ({ ...prev, is_primary: e.target.checked }))}
              className="rounded border-edge text-primary focus:ring-primary"
            />
            Proprietà principale
          </label>
        </form>
      </Modal>
    </ModuleLayout>
  )
}
