'use client'

import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export default function ProtectedRoute({ 
  children, 
  redirectTo = '/' 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push(redirectTo)
    }
  }, [user, loading, router, redirectTo])

  // Mostra loading spinner mentre verifica l'autenticazione
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className="text-white/70 mt-4 text-center">Caricamento...</p>
        </div>
      </div>
    )
  }

  // Se non è autenticato, non mostra nulla (verrà reindirizzato)
  if (!user) {
    return null
  }

  // Se è autenticato, mostra il contenuto
  return <>{children}</>
}
