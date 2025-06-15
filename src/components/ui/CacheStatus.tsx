'use client'

import { useFinanceCache } from '@/lib/financeCache'
import { Database, AlertCircle, Wifi } from 'lucide-react'

export default function CacheStatus() {
  const { data, loading, isDataStale } = useFinanceCache()

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
        <div className="relative">
          <Database className="h-3.5 w-3.5 text-blue-600" />
          <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75 scale-150"></div>
        </div>
        <span className="text-xs font-medium text-blue-700">
          Sincronizzazione...
        </span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full">
        <Database className="h-3.5 w-3.5 text-gray-500" />
        <span className="text-xs font-medium text-gray-600">
          Nessun dato
        </span>
      </div>
    )
  }

  const cacheAge = Math.floor((Date.now() - data.lastFetch) / 1000)
  const minutes = Math.floor(cacheAge / 60)
  const seconds = cacheAge % 60

  const getTimeString = () => {
    if (minutes > 0) {
      return `${minutes}m ${seconds}s fa`
    }
    return seconds < 10 ? 'Ora' : `${seconds}s fa`
  }

  if (isDataStale) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
        <div className="relative">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
          <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-amber-400 rounded-full animate-pulse"></div>
        </div>
        <span className="text-xs font-medium text-amber-700">
          {getTimeString()}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
      <div className="relative">
        <Wifi className="h-3.5 w-3.5 text-emerald-600" />
        <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-emerald-400 rounded-full"></div>
      </div>
      <span className="text-xs font-medium text-emerald-700">
        {getTimeString()}
      </span>
    </div>
  )
}
