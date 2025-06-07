'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { getUserProfile } from '@/lib/profiles'

export default function ProfileDebug() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadProfile = async () => {
    if (!user) return
    
    setLoading(true)
    setError('')
    
    try {
      const { data, error } = await getUserProfile(user.id)
      
      if (error) {
        setError(error.message)
      } else {
        setProfile(data)
      }
    } catch (err) {
      setError('Errore nel caricamento del profilo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  if (!user) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">👤 Utente non autenticato</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">🔍 Debug Profilo Utente</h3>
        
        <div className="space-y-2 text-sm">
          <div>
            <strong>ID Utente:</strong> {user.id}
          </div>
          <div>
            <strong>Email:</strong> {user.email}
          </div>
          <div>
            <strong>Metadati Utente:</strong>
            <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
              {JSON.stringify(user.user_metadata, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-green-900">📋 Profilo Database</h3>
          <button
            onClick={loadProfile}
            disabled={loading}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? '⏳' : '🔄'} Ricarica
          </button>
        </div>
        
        {error && (
          <div className="p-2 bg-red-100 border border-red-200 rounded mb-2">
            <p className="text-red-800 text-sm">❌ {error}</p>
          </div>
        )}
        
        {profile ? (
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(profile, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-600 text-sm">
            {loading ? '⏳ Caricamento...' : '❌ Nessun profilo trovato'}
          </p>
        )}
      </div>
    </div>
  )
}
