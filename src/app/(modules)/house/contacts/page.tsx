'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import Modal, { ModalButton } from '@/components/ui/Modal'
import { useAuth } from '@/lib/auth'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useHouseData, type HouseContact } from '../houseData'
import { Users, Plus, Phone, Mail, Trash2, Pencil, Wrench } from 'lucide-react'

const emptyForm = { name: '', role: '', phone: '', email: '', notes: '' }

export default function HouseContactsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { data, loading, error, refetch } = useHouseData()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<HouseContact | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const contacts = useMemo(() => data?.contacts ?? [], [data?.contacts])
  const maintenances = useMemo(() => data?.maintenances ?? [], [data?.maintenances])

  const maintenanceCountByContact = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of maintenances) {
      if (m.contact_id) map.set(m.contact_id, (map.get(m.contact_id) ?? 0) + 1)
    }
    return map
  }, [maintenances])

  if (!authLoading && !user) {
    router.push('/auth/login')
    return null
  }

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (contact: HouseContact) => {
    setEditing(contact)
    setForm({
      name: contact.name,
      role: contact.role ?? '',
      phone: contact.phone ?? '',
      email: contact.email ?? '',
      notes: contact.notes ?? '',
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
        role: form.role.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
      }

      const { error: saveError } = editing
        ? await supabase.from('house_contacts').update(payload).eq('id', editing.id)
        : await supabase.from('house_contacts').insert({ user_id: user.id, ...payload })
      if (saveError) throw saveError

      setShowModal(false)
      await refetch()
    } catch (err) {
      console.error('Errore nel salvataggio del contatto:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (contact: HouseContact) => {
    if (!user) return
    const linked = maintenanceCountByContact.get(contact.id) ?? 0
    const message = linked > 0
      ? `${contact.name} è collegato a ${linked} manutenzion${linked === 1 ? 'e' : 'i'}: verranno scollegate. Eliminare?`
      : `Eliminare il contatto ${contact.name}?`
    if (!confirm(message)) return

    const supabase = createSupabaseBrowserClient()
    // house_maintenances.contact_id è ON DELETE SET NULL: le manutenzioni restano
    const { error: deleteError } = await supabase.from('house_contacts').delete().eq('id', contact.id)
    if (deleteError) {
      console.error('Errore nell\'eliminazione del contatto:', deleteError)
      return
    }
    await refetch()
  }

  return (
    <ModuleLayout moduleId="house">
      <div className="max-w-7xl 3xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ModuleHeader
          title="Fornitori e contatti"
          subtitle="Idraulici, elettricisti, amministratori collegabili alle manutenzioni"
          icon={<Users className="w-5 h-5" />}
          stats={[{ label: 'Contatti', value: String(contacts.length), color: 'orange' }]}
          actions={[{ label: 'Nuovo Contatto', onClick: openNew, icon: <Plus className="w-4 h-4" /> }]}
        />

        {error && (
          <div className="mb-6 bg-danger-subtle border border-danger-subtle rounded-lg p-4 text-sm text-danger">
            Errore nel caricamento: {error}
          </div>
        )}

        {loading && contacts.length === 0 ? (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center text-ink-muted">Caricamento…</div>
        ) : contacts.length === 0 ? (
          <div className="bg-surface border border-edge rounded-lg shadow-card p-8 text-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-module-house-subtle text-module-house mx-auto mb-4">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-1">Nessun contatto</h3>
            <p className="text-sm text-ink-secondary mb-4">Aggiungi i fornitori di fiducia da collegare alle manutenzioni.</p>
            <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-primary hover:bg-primary-hover text-white transition-all active:scale-95">
              <Plus className="w-4 h-4" /> Aggiungi contatto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map(contact => {
              const linked = maintenanceCountByContact.get(contact.id) ?? 0
              return (
                <div key={contact.id} className="bg-surface border border-edge rounded-lg shadow-card p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-module-house-subtle text-module-house">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(contact)} className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-inset transition-colors" title="Modifica">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(contact)} className="p-1.5 rounded-lg text-ink-muted hover:text-danger hover:bg-inset transition-colors" title="Elimina">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-ink">{contact.name}</h3>
                  {contact.role && <p className="text-xs text-ink-muted mb-2">{contact.role}</p>}
                  <div className="space-y-1 mt-2">
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="text-sm text-ink-secondary flex items-center gap-1.5 hover:text-primary">
                        <Phone className="w-3.5 h-3.5" /> {contact.phone}
                      </a>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="text-sm text-ink-secondary flex items-center gap-1.5 hover:text-primary truncate">
                        <Mail className="w-3.5 h-3.5 shrink-0" /> {contact.email}
                      </a>
                    )}
                  </div>
                  {linked > 0 && (
                    <div className="mt-3 pt-3 border-t border-edge-subtle text-xs text-ink-muted flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5" /> {linked} manutenzion{linked === 1 ? 'e' : 'i'}
                    </div>
                  )}
                  {contact.notes && <p className="text-xs text-ink-muted mt-2">{contact.notes}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Modifica Contatto' : 'Nuovo Contatto'}
        subtitle="Fornitore o persona di riferimento"
        size="sm"
        footer={
          <>
            <ModalButton variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Annulla</ModalButton>
            <button type="submit" form="contact-form" disabled={saving || !form.name.trim()} className="px-4 py-2 rounded-lg font-medium text-sm bg-primary hover:bg-primary-hover text-white disabled:bg-inset disabled:text-ink-muted disabled:cursor-not-allowed transition-all active:scale-95">
              {saving ? 'Salvataggio…' : editing ? 'Salva' : 'Crea Contatto'}
            </button>
          </>
        }
      >
        <form id="contact-form" onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="contact-name" className="block text-sm font-medium text-ink-secondary mb-1">Nome *</label>
            <input id="contact-name" type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Es. Mario Rossi" className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary" required />
          </div>
          <div>
            <label htmlFor="contact-role" className="block text-sm font-medium text-ink-secondary mb-1">Ruolo</label>
            <input id="contact-role" type="text" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} placeholder="Idraulico, elettricista, amministratore…" className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-phone" className="block text-sm font-medium text-ink-secondary mb-1">Telefono</label>
              <input id="contact-phone" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+39…" className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary" />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-sm font-medium text-ink-secondary mb-1">Email</label>
              <input id="contact-email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="nome@email.it" className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary" />
            </div>
          </div>
          <div>
            <label htmlFor="contact-notes" className="block text-sm font-medium text-ink-secondary mb-1">Note</label>
            <textarea id="contact-notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-edge rounded-lg bg-surface text-ink focus:ring-2 focus:ring-primary focus:border-primary resize-none" />
          </div>
        </form>
      </Modal>
    </ModuleLayout>
  )
}
