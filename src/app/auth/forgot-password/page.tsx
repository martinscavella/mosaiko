'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const supabase = createClientComponentClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Check your email for the password reset link!')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-gray-400">Enter your email to receive a reset link</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-500/20 border border-green-500/30 text-green-300 px-4 py-3 rounded-lg">
                {message}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-gray-300 text-sm mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black/20 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                placeholder="Enter your email"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white py-3 rounded-lg transition-colors font-semibold"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/20 text-center">
            <p className="text-gray-400 text-sm">
              Remember your password?{' '}
              <Link href="/auth/login" className="text-blue-400 hover:text-blue-300">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
