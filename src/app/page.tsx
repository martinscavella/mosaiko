'use client'

import { useAuth } from '@/lib/auth'
import Link from 'next/link'
import { modules } from './modules'
import { useState, useEffect } from 'react'
import { MosaikoLogo } from '@/components/ui/MosaikoLogo'
import clsx from 'clsx'
import { LogOut, User } from 'lucide-react'

export default function HomePage() {
  const { user, loading, signOut } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
    } catch (error) {
      console.error('Errore durante il logout:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-blue-600" />
          <p className="text-sm text-gray-500">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className={clsx(
          "max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center transition-all duration-300",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          <div className="mb-6">
            <MosaikoLogo size={56} className="inline-block" src="/mosaiko.png" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Benvenuto in Mosaiko
          </h1>
          <p className="text-gray-600 mb-8">
            La tua piattaforma intelligente per la gestione personale
          </p>
          
          <div className="space-y-3">
            <Link
              href="/auth/register"
              className="block w-full bg-blue-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Inizia Ora
            </Link>
            <Link
              href="/auth/login"
              className="block w-full bg-gray-100 text-gray-700 px-5 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Accedi
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl 3xl:max-w-6xl 4xl:max-w-7xl mx-auto px-4 sm:px-6 3xl:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Ciao, {user.user_metadata?.firstName || user.user_metadata?.first_name || 'Utente'}!
            </h1>
            <p className="text-gray-600 mt-1">
              Seleziona un modulo per iniziare
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Profilo</span>
            </Link>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                isLoggingOut 
                  ? "text-gray-400 cursor-not-allowed" 
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">
                {isLoggingOut ? 'Uscita...' : 'Logout'}
              </span>
            </button>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4 gap-4 3xl:gap-6">
          {modules.map((module, index) => (
            <div 
              key={module.id}
              className={clsx(
                "bg-white border border-gray-200 rounded-xl p-6 transition-all duration-200",
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
                module.status === 'active' && "hover:shadow-md hover:border-gray-300"
              )}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={clsx(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                  module.status === 'active' ? "bg-blue-50" : "bg-gray-100"
                )}>
                  {module.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{module.name}</h3>
                  {module.status === 'active' && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Attivo
                    </span>
                  )}
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {module.description}
              </p>
              
              {module.status === 'active' ? (
                <Link
                  href={`/${module.id}/dashboard`}
                  className="block w-full text-center px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Apri
                </Link>
              ) : (
                <div className="w-full text-center px-4 py-2.5 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed">
                  Presto disponibile
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 text-gray-400 text-sm">
            <span>Powered by</span>
            <MosaikoLogo size={18} src="/mosaiko.png" />
            <span className="font-medium text-gray-500">Mosaiko</span>
          </div>
        </div>
      </div>
    </div>
  )
}
