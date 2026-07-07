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
  const [language] = useState('it')
  const [appTheme] = useState('dark')
  const [notificationsEnabled] = useState(true)
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

    // Passa i dati del profilo come metadati (snake_case per ProfileData)
    const { error } = await signUp(email, password, {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
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
    <div className="min-h-screen w-screen bg-surface">
      <div className="w-full h-screen">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 h-full">
          {/* Left side - Decorative */}
          <div className="hidden md:flex flex-col items-center justify-center p-8 h-full w-full bg-ink">
            <div className="text-center">
              <p className="text-ink-muted text-sm font-semibold tracking-widest mb-8">INIZIA ORA</p>
              <h2 className="text-5xl md:text-6xl font-bold text-ink-inverse mb-6 leading-tight">Gestisci Tutto in Un Posto</h2>
              <p className="text-ink-muted text-lg max-w-sm mx-auto leading-relaxed">Finanze, salute, apprendimento e task. Tutto organizzato e semplificato.</p>
            </div>
          </div>

          {/* Right side - Form */}
          <div className="flex items-center justify-center px-4 sm:px-6 md:px-8 py-8 h-full overflow-y-auto">
            <div className="w-full max-w-md">
              <div className="p-0">
                <div className={`w-full transform transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                  {/* Header */}
                  <div className="mb-8 text-center">
                    <h1 className="text-3xl sm:text-4xl font-bold text-ink mb-2">Sign Up</h1>
                    <p className="text-ink-secondary text-sm">Crea il tuo account Mosaiko</p>
                  </div>

                  {/* Form Card */}
                  <div className="space-y-4">
                    {error && (
                      <div className="p-3 rounded-lg bg-danger-subtle border border-danger-subtle">
                        <p className="text-xs sm:text-sm text-danger">{error}</p>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Nome e Cognome */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label htmlFor="firstName" className="block text-xs sm:text-sm font-medium text-ink-secondary">
                            First Name
                          </label>
                          <input
                            id="firstName"
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-edge focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-surface outline-none text-sm sm:text-base"
                            placeholder="First name"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="lastName" className="block text-xs sm:text-sm font-medium text-ink-secondary">
                            Last Name
                          </label>
                          <input
                            id="lastName"
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-edge focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-surface outline-none text-sm sm:text-base"
                            placeholder="Last name"
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-ink-secondary">
                          Email
                        </label>
                        <input
                          id="email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-edge focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-surface outline-none text-sm sm:text-base"
                          placeholder="Enter your email"
                        />
                      </div>

                      {/* Password */}
                      <div className="space-y-1.5">
                        <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-ink-secondary">
                          Password
                        </label>
                        <input
                          id="password"
                          type="password"
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-edge focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-surface outline-none text-sm sm:text-base"
                          placeholder="Enter password"
                        />
                        <p className="text-xs text-ink-muted">Minimum 6 characters</p>
                      </div>

                      {/* Conferma Password */}
                      <div className="space-y-1.5">
                        <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-ink-secondary">
                          Confirm Password
                        </label>
                        <input
                          id="confirmPassword"
                          type="password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-edge focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-surface outline-none text-sm sm:text-base"
                          placeholder="Confirm password"
                        />
                      </div>

                      {/* Data di Nascita e Telefono */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label htmlFor="birthDate" className="block text-xs sm:text-sm font-medium text-ink-secondary">
                            Birth Date
                          </label>
                          <input
                            id="birthDate"
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-edge focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-surface outline-none text-xs sm:text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="phoneNumber" className="block text-xs sm:text-sm font-medium text-ink-secondary">
                            Phone
                          </label>
                          <input
                            id="phoneNumber"
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-edge focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-surface outline-none text-xs sm:text-sm"
                            placeholder="+39 123 456"
                          />
                        </div>
                      </div>

                      <button type="submit" disabled={loading} className="w-full bg-primary text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base">
                        {loading ? 'Creating account...' : 'Sign Up'}
                      </button>
                    </form>

                    <div className="text-center text-xs sm:text-sm text-ink-secondary space-y-3">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-edge"></div>
                        </div>
                        <div className="relative flex justify-center">
                          <span className="px-2 bg-surface text-ink-muted">or</span>
                        </div>
                      </div>
                      <p>
                        Already have an account?{' '}
                        <Link href="/auth/login" className="text-ink font-semibold hover:underline transition-colors">Sign In</Link>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}