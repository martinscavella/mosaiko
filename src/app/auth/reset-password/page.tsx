'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { user, loading: authLoading, updatePassword } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (success) {
      const timeout = setTimeout(() => router.push('/auth/login'), 2000)
      return () => clearTimeout(timeout)
    }
  }, [success, router])

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

    setLoading(true)

    const { error } = await updatePassword(password)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }

    setLoading(false)
  }

  const renderContent = () => {
    if (authLoading) {
      return (
        <div className="p-4 rounded-lg border border-edge text-center">
          <p className="text-sm text-ink-secondary">Verifica del link in corso...</p>
        </div>
      )
    }

    if (!user) {
      return (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-danger-subtle border border-danger-subtle text-center space-y-1">
            <p className="text-sm font-medium text-danger">Link non valido o scaduto</p>
            <p className="text-xs sm:text-sm text-ink-secondary">Richiedi un nuovo link per reimpostare la password.</p>
          </div>
          <Link href="/auth/forgot-password" className="block w-full text-center bg-primary text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium hover:bg-primary-hover transition-colors text-sm sm:text-base">
            Richiedi nuovo link
          </Link>
        </div>
      )
    }

    if (success) {
      return (
        <div className="p-4 rounded-lg bg-success-subtle border border-success-subtle text-center space-y-1">
          <p className="text-sm font-medium text-success-strong">Password aggiornata</p>
          <p className="text-xs sm:text-sm text-ink-secondary">Ora puoi accedere con la nuova password. Reindirizzamento al login...</p>
        </div>
      )
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-ink-secondary">
            Nuova Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-edge focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-surface outline-none text-sm sm:text-base"
            placeholder="Inserisci la nuova password"
          />
          <p className="text-xs text-ink-muted">Minimo 6 caratteri</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-ink-secondary">
            Conferma Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-edge focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-surface outline-none text-sm sm:text-base"
            placeholder="Conferma la nuova password"
          />
        </div>

        <button type="submit" disabled={loading} className="w-full bg-primary text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base">
          {loading ? 'Aggiornamento in corso...' : 'Reimposta Password'}
        </button>
      </form>
    )
  }

  return (
    <div className="min-h-screen w-screen bg-surface">
      <div className="w-full h-screen">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 h-full">
          {/* Left side - Decorative */}
          <div className="hidden md:flex flex-col items-center justify-center p-8 h-full w-full bg-ink">
            <div className="text-center">
              <p className="text-ink-muted text-sm font-semibold tracking-widest mb-8">NUOVA PASSWORD</p>
              <h2 className="text-5xl md:text-6xl font-bold text-ink-inverse mb-6 leading-tight">Quasi Fatto</h2>
              <p className="text-ink-muted text-lg max-w-sm mx-auto leading-relaxed">Scegli una nuova password sicura per il tuo account Mosaiko.</p>
            </div>
          </div>

          {/* Right side - Form */}
          <div className="flex items-center justify-center px-4 sm:px-6 md:px-8 py-8 h-full overflow-y-auto">
            <div className="w-full max-w-md">
              <div className={`w-full transform transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                {/* Header */}
                <div className="mb-8 text-center">
                  <h1 className="text-3xl sm:text-4xl font-bold text-ink mb-2">Reimposta Password</h1>
                  <p className="text-ink-secondary text-sm">Crea una nuova password per il tuo account</p>
                </div>

                {/* Form Card */}
                <div className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-danger-subtle border border-danger-subtle">
                      <p className="text-xs sm:text-sm text-danger">{error}</p>
                    </div>
                  )}

                  {renderContent()}

                  <div className="text-center text-xs sm:text-sm text-ink-secondary">
                    <Link href="/auth/login" className="text-ink font-semibold hover:underline transition-colors">Torna al Login</Link>
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
