'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await signIn(email, password)
    
    if (error) {
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
              <p className="text-ink-muted text-sm font-semibold tracking-widest mb-8">GESTIONE INTELLIGENTE</p>
              <h2 className="text-5xl md:text-6xl font-bold text-ink-inverse mb-6 leading-tight">Controlla le Tue Finanze</h2>
              <p className="text-ink-muted text-lg max-w-sm mx-auto leading-relaxed">Raggiungi i tuoi obiettivi finanziari con uno strumento semplice ma potente.</p>
            </div>
          </div>

          {/* Right side - Form */}
          <div className="flex items-center justify-center px-4 sm:px-6 md:px-8 py-8 h-full overflow-y-auto">
            <div className="w-full max-w-md">
              <div className={`w-full transform transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                {/* Header */}
                <div className="mb-8 text-center">
                  <h1 className="text-3xl sm:text-4xl font-bold text-ink mb-2">Welcome Back</h1>
                  <p className="text-ink-secondary text-sm">Accedi al tuo account Mosaiko</p>
                </div>

                {/* Form Card */}
                <div className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-danger-subtle border border-danger-subtle">
                      <p className="text-xs sm:text-sm text-danger">{error}</p>
                    </div>
                  )}

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
                        placeholder="Enter your email"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-ink-secondary">Password</label>
                      <input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-edge focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-surface outline-none text-sm sm:text-base"
                        placeholder="Enter your password"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded border-edge text-primary focus:ring-primary" />
                        <span className="text-ink-secondary">Remember me</span>
                      </label>
                      <Link href="/auth/forgot-password" className="text-ink-secondary hover:text-ink font-medium transition-colors">Forgot Password</Link>
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-primary text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base">
                      {loading ? 'Accesso in corso...' : 'Sign In'}
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
                      Don't have an account?{' '}
                      <Link href="/auth/register" className="text-ink font-semibold hover:underline transition-colors">Sign Up</Link>
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