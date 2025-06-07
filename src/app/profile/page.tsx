'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { getUserProfile, updateUserProfile, ProfileData } from '@/lib/profiles'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    phone_number: '',
    address: '',
    bio: '',
    language: 'it',
    app_theme: 'dark',
    notifications_enabled: true,
  })

  // Carica il profilo dell'utente
  useEffect(() => {
    const loadProfile = async () => {
      if (user?.id) {
        const { data, error } = await getUserProfile(user.id)
        if (data && !error) {
          setProfile(data)
          setFormData({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            birth_date: data.birth_date || '',
            phone_number: data.phone_number || '',
            address: data.address || '',
            bio: data.bio || '',
            language: data.language || 'it',
            app_theme: data.app_theme || 'dark',
            notifications_enabled: data.notifications_enabled ?? true,
          })
        }
      }
    }

    loadProfile()
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  const handleSave = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const { error } = await updateUserProfile(user.id, formData)
      if (error) {
        console.error('Errore aggiornamento profilo:', error)
      } else {
        setEditing(false)
        // Ricarica il profilo
        const { data } = await getUserProfile(user.id)
        if (data) setProfile(data)
      }
    } catch (error) {
      console.error('Errore aggiornamento profilo:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
        {/* Navigation */}
        <nav className="backdrop-blur-md bg-white/10 border-b border-white/20 p-6">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <Link href="/" className="text-white text-xl font-bold flex items-center">
              <span className="mr-2">←</span>
              Torna alla Dashboard
            </Link>
            <button
              onClick={handleSignOut}
              className="bg-red-500/20 text-red-300 px-4 py-2 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-colors"
            >
              Esci
            </button>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Impostazioni Profilo</h1>
            <p className="text-gray-400">Gestisci le informazioni del tuo account e le preferenze</p>
          </div>

          <div className="space-y-6">
            {/* Informazioni Profilo */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-semibold text-lg">Informazioni Profilo</h3>
                <button
                  onClick={() => setEditing(!editing)}
                  className="bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                >
                  {editing ? 'Annulla' : 'Modifica'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full bg-black/20 text-gray-400 border border-white/20 rounded-lg px-4 py-3"
                  />
                  <p className="text-gray-500 text-xs mt-1">L'email non può essere modificata</p>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm mb-2">ID Utente</label>
                  <input
                    type="text"
                    value={user?.id || ''}
                    disabled
                    className="w-full bg-black/20 text-gray-400 border border-white/20 rounded-lg px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm mb-2">Nome</label>
                  <input
                    type="text"
                    value={editing ? formData.first_name : (profile?.first_name || '')}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    disabled={!editing}
                    className="w-full bg-black/20 text-white border border-white/20 rounded-lg px-4 py-3 disabled:text-gray-400"
                    placeholder="Inserisci il tuo nome"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm mb-2">Cognome</label>
                  <input
                    type="text"
                    value={editing ? formData.last_name : (profile?.last_name || '')}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    disabled={!editing}
                    className="w-full bg-black/20 text-white border border-white/20 rounded-lg px-4 py-3 disabled:text-gray-400"
                    placeholder="Inserisci il tuo cognome"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm mb-2">Data di Nascita</label>
                  <input
                    type="date"
                    value={editing ? formData.birth_date : (profile?.birth_date || '')}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    disabled={!editing}
                    className="w-full bg-black/20 text-white border border-white/20 rounded-lg px-4 py-3 disabled:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm mb-2">Telefono</label>
                  <input
                    type="tel"
                    value={editing ? formData.phone_number : (profile?.phone_number || '')}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    disabled={!editing}
                    className="w-full bg-black/20 text-white border border-white/20 rounded-lg px-4 py-3 disabled:text-gray-400"
                    placeholder="+39 123 456 7890"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-gray-300 text-sm mb-2">Indirizzo</label>
                  <input
                    type="text"
                    value={editing ? formData.address : (profile?.address || '')}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={!editing}
                    className="w-full bg-black/20 text-white border border-white/20 rounded-lg px-4 py-3 disabled:text-gray-400"
                    placeholder="Via, Città, CAP"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-gray-300 text-sm mb-2">Biografia</label>
                  <textarea
                    value={editing ? formData.bio : (profile?.bio || '')}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    disabled={!editing}
                    rows={3}
                    className="w-full bg-black/20 text-white border border-white/20 rounded-lg px-4 py-3 disabled:text-gray-400"
                    placeholder="Raccontaci qualcosa di te..."
                  />
                </div>
              </div>

              {editing && (
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    onClick={() => setEditing(false)}
                    className="px-6 py-3 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Salvataggio...' : 'Salva Modifiche'}
                  </button>
                </div>
              )}
            </div>

            {/* Preferenze */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-white font-semibold text-lg mb-6">Preferenze</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Lingua</label>
                  <select
                    value={editing ? formData.language : (profile?.language || 'it')}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    disabled={!editing}
                    className="w-full bg-black/20 text-white border border-white/20 rounded-lg px-4 py-3 disabled:text-gray-400"
                  >
                    <option value="it">🇮🇹 Italiano</option>
                    <option value="en">🇬🇧 English</option>
                    <option value="es">🇪🇸 Español</option>
                    <option value="fr">🇫🇷 Français</option>
                    <option value="de">🇩🇪 Deutsch</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm mb-2">Tema</label>
                  <select
                    value={editing ? formData.app_theme : (profile?.app_theme || 'dark')}
                    onChange={(e) => setFormData({ ...formData, app_theme: e.target.value })}
                    disabled={!editing}
                    className="w-full bg-black/20 text-white border border-white/20 rounded-lg px-4 py-3 disabled:text-gray-400"
                  >
                    <option value="dark">🌙 Scuro</option>
                    <option value="light">☀️ Chiaro</option>
                    <option value="auto">🔄 Automatico</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editing ? formData.notifications_enabled : (profile?.notifications_enabled ?? true)}
                      onChange={(e) => setFormData({ ...formData, notifications_enabled: e.target.checked })}
                      disabled={!editing}
                      className="w-5 h-5 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 transition-all duration-300"
                    />
                    <span className="text-gray-300 flex items-center">
                      <span className="mr-2">🔔</span>
                      Abilita notifiche
                    </span>
                  </label>
                  <p className="text-gray-500 text-xs mt-1 ml-8">
                    Ricevi aggiornamenti importanti e promemoria
                  </p>
                </div>
              </div>
            </div>

            {/* Azioni Account */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-white font-semibold text-lg mb-6">Azioni Account</h3>
              
              <div className="space-y-4">
                <button className="w-full bg-blue-500/20 text-blue-300 py-3 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors text-left px-4">
                  Esporta Dati Account
                </button>
                
                <button className="w-full bg-yellow-500/20 text-yellow-300 py-3 rounded-lg border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors text-left px-4">
                  Cambia Password
                </button>
                
                <button className="w-full bg-red-500/20 text-red-300 py-3 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-colors text-left px-4">
                  Elimina Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
