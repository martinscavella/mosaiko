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
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white bg-opacity-10 rounded-full filter blur-xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white bg-opacity-5 rounded-full filter blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-purple-300 bg-opacity-20 rounded-full filter blur-xl animate-bounce" style={{ animationDuration: '3s' }} />
      </div>

      <div className="min-h-screen flex items-center justify-center relative z-10">
        <div className={`w-full max-w-md mx-auto p-8 transform transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-6">
              <div className="inline-block p-4 bg-white bg-opacity-25 rounded-2xl backdrop-filter backdrop-blur-lg border border-white border-opacity-40 transform hover:scale-110 transition-all duration-300 shadow-2xl">
                <div className="text-4xl font-bold text-white">🌟</div>
              </div>
            </Link>
            <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">
              Bentornato!
            </h1>
            <p className="text-xl text-white text-opacity-90 leading-relaxed drop-shadow-md">
              Accedi al tuo account Mosaiko
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
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 focus:bg-white outline-none"
                  placeholder="Inserisci la tua email"
                />
              </div>

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
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 focus:bg-white outline-none"
                  placeholder="Inserisci la password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <span className="relative z-10 flex items-center justify-center">
                  <span className="mr-2">{loading ? '⏳' : '🚀'}</span>
                  {loading ? 'Accesso in corso...' : 'Accedi'}
                </span>
                <div className="absolute inset-0 rounded-xl bg-white bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link 
                href="/auth/forgot-password" 
                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-300"
              >
                🤔 Password dimenticata?
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-gray-600 text-sm mb-4">
                Non hai un account?
              </p>
              <Link 
                href="/auth/register" 
                className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300 transform hover:scale-105"
              >
                <span className="mr-2">✨</span>
                Crea un account
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