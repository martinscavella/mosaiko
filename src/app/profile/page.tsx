'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import AuthRequiredMessage from '@/components/ui/AuthRequiredMessage'
import { getUserProfile, updateUserProfile, ProfileData } from '@/lib/profiles'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import { User, Save, ArrowLeft } from 'lucide-react'

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
    <>
      {!user && <AuthRequiredMessage />}
      {user && (
        <ModuleLayout moduleId="profile">
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
          <ModuleHeader
            title="Profilo Utente"
            subtitle="Gestisci le informazioni del tuo account e le preferenze personali"
            icon={<User className="h-6 w-6 text-white" />}
            actions={[
              {
                label: 'Torna alla Dashboard',
                onClick: () => router.push('/'),
                icon: <ArrowLeft className="w-4 h-4" />,
                color: 'gray',
                hideTextOnMobile: true
              }
            ]}
          />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Profile Summary Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="text-center">
                  <div className="w-24 h-24 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {(profile?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {profile?.first_name || profile?.last_name 
                      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                      : 'Utente'
                    }
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              {/* Informazioni Personali */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <User className="h-5 w-5 text-gray-600 mr-2" />
                      Informazioni Personali
                    </h3>
                    <button
                      onClick={() => setEditing(!editing)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      {editing ? 'Annulla' : 'Modifica'}
                    </button>
                  </div>
                </div>

                <div className="px-6 py-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome
                      </label>
                      <input
                        type="text"
                        value={editing ? formData.first_name : (profile?.first_name || '')}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        disabled={!editing}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 sm:text-sm"
                        placeholder="Inserisci il tuo nome"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cognome
                      </label>
                      <input
                        type="text"
                        value={editing ? formData.last_name : (profile?.last_name || '')}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        disabled={!editing}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 sm:text-sm"
                        placeholder="Inserisci il tuo cognome"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data di Nascita
                      </label>
                      <input
                        type="date"
                        value={editing ? formData.birth_date : (profile?.birth_date || '')}
                        onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                        disabled={!editing}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telefono
                      </label>
                      <input
                        type="tel"
                        value={editing ? formData.phone_number : (profile?.phone_number || '')}
                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                        disabled={!editing}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 sm:text-sm"
                        placeholder="+39 123 456 7890"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Indirizzo
                      </label>
                      <input
                        type="text"
                        value={editing ? formData.address : (profile?.address || '')}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        disabled={!editing}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 sm:text-sm"
                        placeholder="Via, Città, CAP"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Biografia
                      </label>
                      <textarea
                        value={editing ? formData.bio : (profile?.bio || '')}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        disabled={!editing}
                        rows={3}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 sm:text-sm"
                        placeholder="Raccontaci qualcosa di te..."
                      />
                    </div>
                  </div>

                  {editing && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => setEditing(false)}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Annulla
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={loading}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {loading ? 'Salvataggio...' : 'Salva Modifiche'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Preferenze */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="h-5 w-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Preferenze
                  </h3>
                </div>
                
                <div className="px-6 py-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lingua
                      </label>
                      <select
                        value={editing ? formData.language : (profile?.language || 'it')}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                        disabled={!editing}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 sm:text-sm"
                      >
                        <option value="it">🇮🇹 Italiano</option>
                        <option value="en">🇬🇧 English</option>
                        <option value="es">🇪🇸 Español</option>
                        <option value="fr">🇫🇷 Français</option>
                        <option value="de">🇩🇪 Deutsch</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tema
                      </label>
                      <select
                        value={editing ? formData.app_theme : (profile?.app_theme || 'dark')}
                        onChange={(e) => setFormData({ ...formData, app_theme: e.target.value })}
                        disabled={!editing}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 sm:text-sm"
                      >
                        <option value="dark">Scuro</option>
                        <option value="light">Chiaro</option>
                        <option value="auto">Automatico</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex items-start p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={editing ? formData.notifications_enabled : (profile?.notifications_enabled ?? true)}
                            onChange={(e) => setFormData({ ...formData, notifications_enabled: e.target.checked })}
                            disabled={!editing}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
                          />
                        </div>
                        <div className="ml-3">
                          <label className="text-sm font-medium text-gray-900">
                            Notifiche Push
                          </label>
                          <p className="text-xs text-gray-600 mt-1">
                            Ricevi aggiornamenti importanti e promemoria
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Azioni Account */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="h-5 w-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                    Gestione Account
                  </h3>
                </div>
                
                <div className="px-6 py-6">
                  <div className="space-y-4">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center justify-between p-4 text-left bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors group"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-4">
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-red-900">Esci dall'Account</p>
                          <p className="text-sm text-red-700">Disconnettiti dall'applicazione</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-red-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    <button className="w-full flex items-center justify-between p-4 text-left bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors group">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-blue-900">Esporta Dati</p>
                          <p className="text-sm text-blue-700">Scarica una copia dei tuoi dati</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    
                    <button className="w-full flex items-center justify-between p-4 text-left bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors group">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center mr-4">
                          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2h-1m-2 2v3m0 0v3m0-3h3m-3 0h-3" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-yellow-900">Cambia Password</p>
                          <p className="text-sm text-yellow-700">Aggiorna le credenziali di accesso</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-yellow-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ModuleLayout>
      )}
    </>
  )
}
