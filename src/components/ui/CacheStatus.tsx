'use client'

import { useFinanceCache } from '@/lib/financeCache'
import { Database, AlertCircle, Wifi } from 'lucide-react'

export default function CacheStatus() {
  const { data, loading, isDataStale } = useFinanceCache()

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 bg-primary-subtle border border-primary-subtle rounded-full">
        <div className="relative">
          <Database className="h-3.5 w-3.5 text-primary" />
          <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-75 scale-150"></div>
        </div>
        <span className="text-xs font-medium text-primary-hover">
          Sincronizzazione...
        </span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 bg-canvas border border-edge rounded-full">
        <Database className="h-3.5 w-3.5 text-ink-muted" />
        <span className="text-xs font-medium text-ink-secondary">
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
      <div className="flex items-center space-x-2 px-3 py-1.5 bg-warning-subtle border border-warning-subtle rounded-full">
        <div className="relative">
          <AlertCircle className="h-3.5 w-3.5 text-warning" />
          <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-warning rounded-full animate-pulse"></div>
        </div>
        <span className="text-xs font-medium text-warning">
          {getTimeString()}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2 px-3 py-1.5 bg-success-subtle border border-success-subtle rounded-full">
      <div className="relative">
        <Wifi className="h-3.5 w-3.5 text-success-strong" />
        <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-success rounded-full"></div>
      </div>
      <span className="text-xs font-medium text-success-strong">
        {getTimeString()}
      </span>
    </div>
  )
}
