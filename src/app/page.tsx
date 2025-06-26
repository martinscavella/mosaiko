'use client';

import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { modules } from './modules';
import { useState, useEffect } from 'react';
import AnimatedBackground from '@/components/AnimatedBackground';
import { useStaggeredAnimation } from '@/hooks/useAnimation';
import { MosaikoLogo } from '@/components/ui/MosaikoLogo';

export default function HomePage() {
  const { user, loading, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const visibleModules = useStaggeredAnimation(modules.length, 100);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Errore durante il logout:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration issues
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-opacity-30 border-t-white" />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-opacity-30 border-t-white" />
          <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-white border-opacity-20" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white font-semibold text-xl">
            <MosaikoLogo size={32} />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        <AnimatedBackground />
        
        <div className="relative z-10 max-w-md mx-auto text-center px-6">
          <div className="mb-8">
            <MosaikoLogo size={80} className="mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-white mb-2">Mosaiko</h1>
            <p className="text-blue-100 text-lg">La tua piattaforma per la gestione personale</p>
          </div>
          
          <div className="space-y-4">
            <Link
              href="/auth/login"
              className="block w-full bg-white text-blue-600 py-3 px-6 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Accedi
            </Link>
            <Link
              href="/auth/register"
              className="block w-full bg-blue-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-400 transition-all duration-200 border-2 border-white border-opacity-20 hover:border-opacity-30"
            >
              Registrati
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // User logged in - show modules dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10">
        {/* Header Desktop */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-20 hidden md:block">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <MosaikoLogo size={40} />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Mosaiko</h1>
                  <p className="text-sm text-gray-600">Benvenuto, {user.email}</p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoggingOut ? 'Disconnessione...' : 'Logout'}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-12">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-4">I tuoi moduli</h2>
            <p className="text-gray-600 text-base md:text-lg">Seleziona un modulo per iniziare</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 max-w-5xl mx-auto">
            {modules.filter(module => module.status === 'active').map((module, index) => (
              <Link
                key={module.id}
                href={module.href}
                className={`group block transform transition-all duration-300 hover:scale-105 ${
                  visibleModules >= index + 1
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 group-hover:bg-white/80">
                  <div className="text-center">
                    <div className={`w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-2xl ${module.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <module.icon className="h-6 w-6 md:h-8 md:w-8 text-white" />
                    </div>
                    <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-1 md:mb-2">{module.name}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{module.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Coming Soon Modules */}
          {modules.filter(module => module.status === 'coming_soon').length > 0 && (
            <div className="mt-12">
              <div className="text-center mb-8">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Prossimamente</h3>
                <p className="text-gray-600">Moduli in arrivo</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 max-w-5xl mx-auto">
                {modules.filter(module => module.status === 'coming_soon').map((module, index) => (
                  <div
                    key={module.id}
                    className="bg-white/50 backdrop-blur-sm border border-white/20 rounded-2xl p-6 md:p-8 shadow-lg opacity-60"
                  >
                    <div className="text-center">
                      <div className={`w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-2xl ${module.color} flex items-center justify-center`}>
                        <module.icon className="h-6 w-6 md:h-8 md:w-8 text-white" />
                      </div>
                      <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-1 md:mb-2">{module.name}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed mb-2">{module.description}</p>
                      <span className="text-xs text-blue-600 font-medium">In arrivo</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}