'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import AuthRequiredMessage from '@/components/ui/AuthRequiredMessage'
import { getUserProfile, updateUserProfile, ProfileData } from '@/lib/profiles'
import { useTheme, type ThemePreference } from '@/lib/theme'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import { User, Save, ArrowLeft } from 'lucide-react'

// Il DB salva 'auto', il ThemeProvider usa 'system'
const toThemePreference = (appTheme: string): ThemePreference =>
  appTheme === 'light' || appTheme === 'dark' ? appTheme : 'system'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const { setPreference } = useTheme()
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
    app_theme: 'auto',
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
            app_theme: data.app_theme || 'auto',
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
              <div className="bg-surface rounded-lg shadow-card border border-edge p-6">
                <div className="text-center">
                  <div className="w-24 h-24 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {(profile?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-ink">
                    {profile?.first_name || profile?.last_name 
                      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                      : 'Utente'
                    }
                  </h3>
                  <p className="text-sm text-ink-secondary mt-1">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              {/* Informazioni Personali */}
              <div className="bg-surface rounded-lg shadow-card border border-edge">
                <div className="px-6 py-4 border-b border-edge">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-ink flex items-center">
                      <User className="h-5 w-5 text-ink-secondary mr-2" />
                      Informazioni Personali
                    </h3>
                    <button
                      onClick={() => setEditing(!editing)}
                      className="inline-flex items-center px-3 py-2 border border-edge shadow-card text-sm leading-4 font-medium rounded-md text-ink-secondary bg-surface hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                    >
                      {editing ? 'Annulla' : 'Modifica'}
                    </button>
                  </div>
                </div>

                <div className="px-6 py-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-ink-secondary mb-2">
                        Nome
                      </label>
                      <input
                        type="text"
                        value={editing ? formData.first_name : (profile?.first_name || '')}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        disabled={!editing}
                        className="block w-full px-3 py-2 border border-edge rounded-md shadow-card placeholder-ink-muted focus:outline-none focus:ring-primary focus:border-primary disabled:bg-canvas disabled:text-ink-muted sm:text-sm"
                        placeholder="Inserisci il tuo nome"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ink-secondary mb-2">
                        Cognome
                      </label>
                      <input
                        type="text"
                        value={editing ? formData.last_name : (profile?.last_name || '')}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        disabled={!editing}
                        className="block w-full px-3 py-2 border border-edge rounded-md shadow-card placeholder-ink-muted focus:outline-none focus:ring-primary focus:border-primary disabled:bg-canvas disabled:text-ink-muted sm:text-sm"
                        placeholder="Inserisci il tuo cognome"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ink-secondary mb-2">
                        Data di Nascita
                      </label>
                      <input
                        type="date"
                        value={editing ? formData.birth_date : (profile?.birth_date || '')}
                        onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                        disabled={!editing}
                        className="block w-full px-3 py-2 border border-edge rounded-md shadow-card placeholder-ink-muted focus:outline-none focus:ring-primary focus:border-primary disabled:bg-canvas disabled:text-ink-muted sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ink-secondary mb-2">
                        Telefono
                      </label>
                      <input
                        type="tel"
                        value={editing ? formData.phone_number : (profile?.phone_number || '')}
                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                        disabled={!editing}
                        className="block w-full px-3 py-2 border border-edge rounded-md shadow-card placeholder-ink-muted focus:outline-none focus:ring-primary focus:border-primary disabled:bg-canvas disabled:text-ink-muted sm:text-sm"
                        placeholder="+39 123 456 7890"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-ink-secondary mb-2">
                        Indirizzo
                      </label>
                      <input
                        type="text"
                        value={editing ? formData.address : (profile?.address || '')}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        disabled={!editing}
                        className="block w-full px-3 py-2 border border-edge rounded-md shadow-card placeholder-ink-muted focus:outline-none focus:ring-primary focus:border-primary disabled:bg-canvas disabled:text-ink-muted sm:text-sm"
                        placeholder="Via, Città, CAP"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-ink-secondary mb-2">
                        Biografia
                      </label>
                      <textarea
                        value={editing ? formData.bio : (profile?.bio || '')}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        disabled={!editing}
                        rows={3}
                        className="block w-full px-3 py-2 border border-edge rounded-md shadow-card placeholder-ink-muted focus:outline-none focus:ring-primary focus:border-primary disabled:bg-canvas disabled:text-ink-muted sm:text-sm"
                        placeholder="Raccontaci qualcosa di te..."
                      />
                    </div>
                  </div>

                  {editing && (
                    <div className="mt-6 pt-6 border-t border-edge">
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => setEditing(false)}
                          className="inline-flex items-center px-4 py-2 border border-edge shadow-card text-sm font-medium rounded-md text-ink-secondary bg-surface hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                          Annulla
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={loading}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-card text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="bg-surface rounded-lg shadow-card border border-edge">
                <div className="px-6 py-4 border-b border-edge">
                  <h3 className="text-lg font-semibold text-ink flex items-center">
                    <svg className="h-5 w-5 text-ink-secondary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Preferenze
                  </h3>
                </div>
                
                <div className="px-6 py-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-ink-secondary mb-2">
                        Lingua
                      </label>
                      <select
                        value={editing ? formData.language : (profile?.language || 'it')}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                        disabled={!editing}
                        className="block w-full px-3 py-2 border border-edge rounded-md shadow-card focus:outline-none focus:ring-primary focus:border-primary disabled:bg-canvas disabled:text-ink-muted sm:text-sm"
                      >
                        <option value="it">🇮🇹 Italiano</option>
                        <option value="en">🇬🇧 English</option>
                        <option value="es">🇪🇸 Español</option>
                        <option value="fr">🇫🇷 Français</option>
                        <option value="de">🇩🇪 Deutsch</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ink-secondary mb-2">
                        Tema
                      </label>
                      <select
                        value={editing ? formData.app_theme : (profile?.app_theme || 'auto')}
                        onChange={(e) => {
                          setFormData({ ...formData, app_theme: e.target.value })
                          // Applica subito il tema, oltre a salvarlo nel profilo
                          setPreference(toThemePreference(e.target.value))
                        }}
                        disabled={!editing}
                        className="block w-full px-3 py-2 border border-edge rounded-md shadow-card focus:outline-none focus:ring-primary focus:border-primary disabled:bg-canvas disabled:text-ink-muted sm:text-sm"
                      >
                        <option value="auto">Sistema</option>
                        <option value="light">Chiaro</option>
                        <option value="dark">Scuro</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex items-start p-4 bg-canvas rounded-lg border border-edge">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={editing ? formData.notifications_enabled : (profile?.notifications_enabled ?? true)}
                            onChange={(e) => setFormData({ ...formData, notifications_enabled: e.target.checked })}
                            disabled={!editing}
                            className="w-4 h-4 text-primary bg-inset border-edge rounded focus:ring-primary focus:ring-2 disabled:opacity-50"
                          />
                        </div>
                        <div className="ml-3">
                          <label className="text-sm font-medium text-ink">
                            Notifiche Push
                          </label>
                          <p className="text-xs text-ink-secondary mt-1">
                            Ricevi aggiornamenti importanti e promemoria
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Azioni Account */}
              <div className="bg-surface rounded-lg shadow-card border border-edge">
                <div className="px-6 py-4 border-b border-edge">
                  <h3 className="text-lg font-semibold text-ink flex items-center">
                    <svg className="h-5 w-5 text-ink-secondary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                    Gestione Account
                  </h3>
                </div>
                
                <div className="px-6 py-6">
                  <div className="space-y-4">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center justify-between p-4 text-left bg-danger-subtle border border-danger-subtle rounded-lg hover:bg-danger-subtle transition-colors group"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-danger-subtle flex items-center justify-center mr-4">
                          <svg className="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-danger">Esci dall'Account</p>
                          <p className="text-sm text-danger">Disconnettiti dall'applicazione</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-danger group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    <button className="w-full flex items-center justify-between p-4 text-left bg-primary-subtle border border-primary-subtle rounded-lg hover:bg-primary-subtle transition-colors group">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-primary-subtle flex items-center justify-center mr-4">
                          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-primary">Esporta Dati</p>
                          <p className="text-sm text-primary-hover">Scarica una copia dei tuoi dati</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    
                    <button className="w-full flex items-center justify-between p-4 text-left bg-warning-subtle border border-warning-subtle rounded-lg hover:bg-warning-subtle transition-colors group">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-warning-subtle flex items-center justify-center mr-4">
                          <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2h-1m-2 2v3m0 0v3m0-3h3m-3 0h-3" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-warning">Cambia Password</p>
                          <p className="text-sm text-warning">Aggiorna le credenziali di accesso</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-warning group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
