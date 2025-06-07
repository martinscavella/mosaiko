'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [language, setLanguage] = useState('it')
  const [appTheme, setAppTheme] = useState('dark')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Le password non coincidono')
      return
    }

    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri')
      return
    }

    if (!firstName.trim() || !lastName.trim()) {
      setError('Nome e cognome sono obbligatori')
      return
    }

    // Validazione data di nascita (deve essere maggiorenne)
    if (birthDate) {
      const today = new Date()
      const birth = new Date(birthDate)
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      
      if (age < 18) {
        setError('Devi essere maggiorenne per registrarti')
        return
      }
    }

    setLoading(true)

    // Passa i dati del profilo come metadati
    const { error } = await signUp(email, password, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birth_date: birthDate || null,
      phone_number: phoneNumber.trim() || null,
      language: language,
      app_theme: appTheme,
      notifications_enabled: notificationsEnabled
    })
    
    if (error) {
      console.error('Errore durante la registrazione:', error)
      setError(error.message)
    } else {
      router.push('/')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-72 h-72 bg-white bg-opacity-10 rounded-full filter blur-xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-white bg-opacity-5 rounded-full filter blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-pink-300 bg-opacity-20 rounded-full filter blur-xl animate-bounce" style={{ animationDuration: '4s' }} />
      </div>

      <div className="min-h-screen flex items-center justify-center relative z-10 py-8">
        <div className={`w-full max-w-lg mx-auto p-8 transform transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-6">
              <div className="inline-block p-4 bg-white bg-opacity-25 rounded-2xl backdrop-filter backdrop-blur-lg border border-white border-opacity-40 transform hover:scale-110 transition-all duration-300 shadow-2xl">
                <div className="text-4xl font-bold text-white">🌟</div>
              </div>
            </Link>
            <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">
              Crea il tuo account
            </h1>
            <p className="text-xl text-white text-opacity-90 leading-relaxed drop-shadow-md">
              Inizia il tuo percorso con Mosaiko
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white bg-opacity-95 backdrop-filter backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white border-opacity-50">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 animate-shake">
                <div className="flex items-center">
                  <span className="text-red-500 mr-2">⚠️</span>
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome e Cognome */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-3">
                    👤 Nome
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-gray-50 focus:bg-white outline-none"
                    placeholder="Il tuo nome"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-3">
                    👥 Cognome
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-gray-50 focus:bg-white outline-none"
                    placeholder="Il tuo cognome"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-3">
                  📧 Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-gray-50 focus:bg-white outline-none"
                  placeholder="La tua email"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-3">
                  🔒 Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-gray-50 focus:bg-white outline-none"
                  placeholder="Crea una password"
                />
                <p className="mt-2 text-xs text-gray-500 flex items-center">
                  <span className="mr-1">💡</span>
                  Minimo 6 caratteri
                </p>
              </div>

              {/* Conferma Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-3">
                  🔐 Conferma Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-gray-50 focus:bg-white outline-none"
                  placeholder="Conferma la password"
                />
              </div>

              {/* Data di Nascita e Telefono */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="birthDate" className="block text-sm font-semibold text-gray-700 mb-3">
                    📅 Data di Nascita (opzionale)
                  </label>
                  <input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-gray-50 focus:bg-white outline-none"
                  />
                  <p className="mt-2 text-xs text-gray-500 flex items-center">
                    <span className="mr-1">ℹ️</span>
                    Devi essere maggiorenne
                  </p>
                </div>
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-semibold text-gray-700 mb-3">
                    📱 Telefono (opzionale)
                  </label>
                  <input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-gray-50 focus:bg-white outline-none"
                    placeholder="+39 123 456 7890"
                  />
                </div>
              </div>

              {/* Preferenze */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                  <span className="mr-2">⚙️</span>
                  Preferenze
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="language" className="block text-sm font-semibold text-gray-700 mb-3">
                      🌍 Lingua
                    </label>
                    <select
                      id="language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white outline-none"
                    >
                      <option value="it">🇮🇹 Italiano</option>
                      <option value="en">🇬🇧 English</option>
                      <option value="es">🇪🇸 Español</option>
                      <option value="fr">🇫🇷 Français</option>
                      <option value="de">🇩🇪 Deutsch</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="appTheme" className="block text-sm font-semibold text-gray-700 mb-3">
                      🎨 Tema
                    </label>
                    <select
                      id="appTheme"
                      value={appTheme}
                      onChange={(e) => setAppTheme(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white outline-none"
                    >
                      <option value="dark">🌙 Scuro</option>
                      <option value="light">☀️ Chiaro</option>
                      <option value="auto">🔄 Automatico</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationsEnabled}
                      onChange={(e) => setNotificationsEnabled(e.target.checked)}
                      className="w-5 h-5 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 transition-all duration-300"
                    />
                    <span className="text-sm font-medium text-gray-700 flex items-center">
                      <span className="mr-2">🔔</span>
                      Abilita notifiche
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500 ml-8">
                    Ricevi aggiornamenti importanti e promemoria
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <span className="relative z-10 flex items-center justify-center">
                  <span className="mr-2">{loading ? '⏳' : '✨'}</span>
                  {loading ? 'Creazione account...' : 'Crea Account'}
                </span>
                <div className="absolute inset-0 rounded-xl bg-white bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-gray-600 text-sm mb-4">
                Hai già un account?
              </p>
              <Link 
                href="/auth/login" 
                className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300 transform hover:scale-105"
              >
                <span className="mr-2">🚀</span>
                Accedi
              </Link>
            </div>
          </div>

          {/* Back to home link */}
          <div className="mt-6 text-center">
            <Link 
              href="/" 
              className="inline-flex items-center text-white text-opacity-80 hover:text-opacity-100 transition-all duration-300"
            >
              <span className="mr-2">←</span>
              Torna alla homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}