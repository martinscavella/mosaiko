'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MosaikoLogo } from '@/components/ui/MosaikoLogo'

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
    <div className="min-h-screen bg-gray-100 w-screen">
      <div className="w-full h-screen">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 h-full">
        {/* Left side - Form */}
        <div className="flex items-center justify-center px-6 sm:px-8 py-8 md:py-12 h-full">
          <div className="w-full max-w-md">
            <div className="bg-white p-6 md:p-8 shadow-lg h-full">
              <div className={`w-full transform transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                {/* Logo */}
                <div className="mb-10">
                  <Link href="/" className="inline-flex items-center gap-3">
                    <div className="w-12 h-12">
                      <MosaikoLogo size={48} />
                    </div>
                    <span className="text-xl font-bold text-gray-900">Mosaiko</span>
                  </Link>
                </div>

                {/* Header */}
                <div className="mb-8">
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Bentornato</h1>
                  <p className="text-gray-600">Accedi al tuo account Mosaiko</p>
                </div>

                {/* Form Card */}
                <div className="space-y-6">
                  {error && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                      <div className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">⚠️</span>
                        <p className="text-sm text-red-600 font-medium">{error}</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
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
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-300 bg-white focus:bg-white outline-none"
                        placeholder="name@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="password" className="block text-sm font-semibold text-gray-700">Password</label>
                      <input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-300 bg-white focus:bg-white outline-none"
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500" />
                        <span className="text-sm text-gray-600">Ricordami</span>
                      </label>
                      <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">Password dimenticata?</Link>
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:bg-blue-700 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed">
                      {loading ? 'Accesso in corso...' : 'Accedi'}
                    </button>
                  </form>

                  <div className="text-center text-sm text-gray-600">
                    Non hai un account?{' '}
                    <Link href="/auth/register" className="text-blue-600 hover:text-blue-800 font-semibold transition-colors">Registrati</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Illustration as background */}
        <div
          className="hidden md:flex flex-col items-center justify-center relative overflow-hidden p-8 h-full w-full"
          style={{ backgroundImage: "url('/images/auth-illustration.png')", backgroundSize: 'cover', backgroundPosition: 'center center' }}
        >
          {/* Subtle gradient overlay to keep contrast */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 opacity-40 pointer-events-none" />

          {/* Background decorative elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-12 right-12 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-12 left-12 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
          </div>

          {/* empty center area (keeps layout) */}
          <div className="relative z-10 w-full h-full" />
        </div>
      </div>
      </div>
    </div>
  )
}