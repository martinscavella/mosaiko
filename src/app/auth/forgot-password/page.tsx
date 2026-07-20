'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { resetPasswordForEmail } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await resetPasswordForEmail(email)

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
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
              <p className="text-ink-muted text-sm font-semibold tracking-widest mb-8">RECUPERO ACCESSO</p>
              <h2 className="text-5xl md:text-6xl font-bold text-ink-inverse mb-6 leading-tight">Recupera la Tua Password</h2>
              <p className="text-ink-muted text-lg max-w-sm mx-auto leading-relaxed">Ti invieremo un link sicuro per reimpostare la password del tuo account Mosaiko.</p>
            </div>
          </div>

          {/* Right side - Form */}
          <div className="flex items-center justify-center px-4 sm:px-6 md:px-8 py-8 h-full overflow-y-auto">
            <div className="w-full max-w-md">
              <div className={`w-full transform transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                {/* Header */}
                <div className="mb-8 text-center">
                  <h1 className="text-3xl sm:text-4xl font-bold text-ink mb-2">Password Dimenticata</h1>
                  <p className="text-ink-secondary text-sm">Inserisci la tua email per ricevere il link di reset</p>
                </div>

                {/* Form Card */}
                <div className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-danger-subtle border border-danger-subtle">
                      <p className="text-xs sm:text-sm text-danger">{error}</p>
                    </div>
                  )}

                  {sent ? (
                    <div className="p-4 rounded-lg bg-success-subtle border border-success-subtle text-center space-y-1">
                      <p className="text-sm font-medium text-success-strong">Controlla la tua email</p>
                      <p className="text-xs sm:text-sm text-ink-secondary">
                        Se esiste un account associato a <span className="font-medium text-ink">{email}</span>, riceverai un link per reimpostare la password.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
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
                          placeholder="Inserisci la tua email"
                        />
                      </div>

                      <button type="submit" disabled={loading} className="w-full bg-primary text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base">
                        {loading ? 'Invio in corso...' : 'Invia link di reset'}
                      </button>
                    </form>
                  )}

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
                      Ricordi la password?{' '}
                      <Link href="/auth/login" className="text-ink font-semibold hover:underline transition-colors">Torna al Login</Link>
                    </p>
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
