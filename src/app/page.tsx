'use client'

import { useAuth } from '@/lib/auth'
import Link from 'next/link'
import { modules } from './modules'

export default function HomePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="max-w-md w-full mx-auto p-8 text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Benvenuto in Mosaiko</h1>
          <p className="text-xl mb-8 text-blue-100">
            La tua piattaforma per la gestione personale
          </p>
          <div className="space-y-4">
            <Link
              href="/auth/register"
              className="block w-full bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              Inizia Ora
            </Link>
            <Link
              href="/auth/login"
              className="block w-full bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Benvenuto, {user.user_metadata?.first_name || 'Utente'}! 👋
          </h1>
          <p className="text-gray-600">
            Seleziona un modulo per iniziare
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((module) => (
            <div 
              key={module.id}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">{module.icon}</span>
                <h3 className="text-lg font-medium text-gray-900">{module.name}</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">{module.description}</p>
              {module.status === 'active' ? (
                <Link
                  href={`/${module.id}/dashboard`}
                  className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apri
                </Link>
              ) : (
                <span className="inline-block w-full text-center px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed">
                  Presto disponibile
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
