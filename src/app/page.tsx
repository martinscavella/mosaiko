'use client'

import { useAuth } from '@/lib/auth'
import Link from 'next/link'
import { modules } from './modules'
import { useState, useEffect } from 'react'
import AnimatedBackground from '@/components/AnimatedBackground'
import { useStaggeredAnimation } from '@/hooks/useAnimation'
import { MosaikoLogo } from '@/components/ui/MosaikoLogo'

export default function HomePage() {
  const { user, loading, signOut } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const visibleModules = useStaggeredAnimation(modules.length, 100)

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
          <div className="relative">
            {/* Animated loader with modern design */}
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-opacity-30 border-t-white" />
            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-white border-opacity-20" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white font-semibold text-xl">
              <MosaikoLogo size={32} src="/mosaiko.png" />
            </div>
          </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white bg-opacity-10 rounded-full filter blur-xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white bg-opacity-5 rounded-full filter blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-purple-300 bg-opacity-20 rounded-full filter blur-xl animate-bounce" style={{ animationDuration: '3s' }} />
        </div>
        
        <div className={`max-w-md w-full mx-auto p-8 text-center text-white relative z-10 transform transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          {/* Logo/Brand with animation */}
            <div className="mb-8 relative">
            <MosaikoLogo size={64} className="inline-block" src="/mosaiko.png" />
          </div>
          
          <h1 className="text-5xl font-debbie font-bold mb-4 text-white drop-shadow-lg">
            Benvenuto in Mosaiko
          </h1>
          <p className="text-xl mb-8 text-white text-opacity-90 leading-relaxed drop-shadow-md">
            La tua piattaforma intelligente per la gestione personale
          </p>
          
          <div className="space-y-4">
            <Link
              href="/auth/register"
              className="group block w-full bg-white text-blue-600 px-6 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center">
                <span className="mr-2">🚀</span>
                Inizia Ora
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-10 transition-all duration-300" />
            </Link>
            <Link
              href="/auth/login"
              className="group block w-full bg-white bg-opacity-20 backdrop-filter backdrop-blur-sm text-white px-6 py-4 rounded-xl font-semibold hover:bg-opacity-30 transition-all duration-300 transform hover:scale-105 border border-white border-opacity-40 hover:border-opacity-60 relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center">
                <span className="mr-2">✨</span>
                Accedi
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white to-white opacity-0 group-hover:opacity-10 transition-all duration-300" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Componente background animato */}
      <AnimatedBackground />
      
      {/* Animated background patterns */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-blue-200 to-purple-200 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-32 right-32 w-80 h-80 bg-gradient-to-r from-purple-200 to-pink-200 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full blur-3xl animate-pulse transform -translate-x-1/2 -translate-y-1/2" style={{ animationDelay: '2s' }} />
        </div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation buttons - positioned absolutely in top right */}
        <div className="absolute top-4 right-4 z-20 flex gap-3">
          {/* Profile button */}
          <Link
            href="/profile"
            className="group relative inline-flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg backdrop-blur-sm border bg-white bg-opacity-80 text-gray-700 hover:bg-opacity-100 border-white border-opacity-50 hover:border-opacity-100 hover:text-blue-600"
          >
            <span className="mr-2 text-sm transition-transform duration-300 group-hover:scale-110">
              👤
            </span>
            <span className="text-sm">
              Profilo
            </span>
            
            {/* Animated border effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm" />
          </Link>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`group relative inline-flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg backdrop-blur-sm border ${
              isLoggingOut 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
                : 'bg-white bg-opacity-80 text-gray-700 hover:bg-opacity-100 border-white border-opacity-50 hover:border-opacity-100 hover:text-red-600'
            }`}
          >
            <span className="mr-2 text-sm transition-transform duration-300 group-hover:rotate-12">
              {isLoggingOut ? '⏳' : '👋'}
            </span>
            <span className="text-sm">
              {isLoggingOut ? 'Uscita...' : 'Logout'}
            </span>
            
            {/* Animated border effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm" />
          </button>
        </div>

        {/* Header with improved animation */}
        <div className={`mb-12 text-center transform transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`} style={{ transitionDelay: '300ms' }}>
          <h1 className="text-4xl md:text-5xl font-debbie font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-3">
            Ciao, {user.user_metadata?.firstName || user.user_metadata?.first_name || 'Utente'}! 👋
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Benvenuto nella tua dashboard personale. Seleziona un modulo per iniziare!
          </p>
        </div>

        {/* Enhanced modules grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {modules.map((module, index) => (
            <div 
              key={module.id}
              className={`group relative backdrop-blur-sm p-8 rounded-2xl shadow-lg border hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 card-hover ${
                mounted && index < visibleModules ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}
              style={{ 
                transitionDelay: `${400 + index * 100}ms`,
                backgroundColor: module.status === 'active' 
                  ? 'rgba(255,255,255,0.9)'
                  : 'rgba(255,255,255,0.7)',
                borderColor: module.status === 'active' 
                  ? 'rgba(255,255,255,0.8)'
                  : 'rgba(255,255,255,0.5)'
              }}
            >
              {/* Animated border effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-sm" />
              
              {/* Module icon with animation */}
              <div className="relative z-10 flex items-center space-x-4 mb-6">
                <div className="relative">
                  <div className="text-4xl transform group-hover:scale-125 transition-all duration-300 group-hover:rotate-12">
                    {module.icon}
                  </div>
                  {module.status === 'active' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                  {module.name}
                </h3>
              </div>
              
              <p className="relative z-10 text-gray-600 text-sm mb-6 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                {module.description}
              </p>
              
              {module.status === 'active' ? (
                <Link
                  href={`/${module.id}/dashboard`}
                  className="relative z-10 inline-flex items-center justify-center w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl group/button btn-ripple"
                >
                  <span className="mr-2">🚀</span>
                  Apri
                  <div className="absolute inset-0 rounded-xl bg-white bg-opacity-20 opacity-0 group-hover/button:opacity-100 transition-opacity duration-300" />
                </Link>
              ) : (
                <div className="relative z-10 inline-flex items-center justify-center w-full px-6 py-3 bg-gray-100 text-gray-500 rounded-xl font-medium cursor-not-allowed">
                  <span className="mr-2">⏰</span>
                  Presto disponibile
                </div>
              )}
              
              {/* Floating animation elements */}
              <div className="absolute top-4 right-4 text-xs opacity-30 group-hover:opacity-60 transition-opacity duration-300">
                ✨
              </div>
            </div>
          ))}
        </div>
        
        {/* Bottom decorative elements */}
        <div className={`mt-16 text-center transform transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`} style={{ transitionDelay: '700ms' }}>
          <div className="inline-flex items-center space-x-2 text-gray-500 text-sm mb-4">
            <span>Powered by</span>
              <div className="inline-flex items-center space-x-1 font-semibold text-blue-600">
              <MosaikoLogo size={20} src="/mosaiko.png" />
              <span>Mosaiko</span>
            </div>
          </div>
          
        </div>
      </div>
      
    </div>
  )
}
