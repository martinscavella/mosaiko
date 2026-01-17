'use client'

import { useFinancialGoals } from '@/lib/financeCache'
import { Target } from 'lucide-react'
import { clsx } from 'clsx'

interface FinancialGoalsWidgetProps {
  limit?: number
}

export default function FinancialGoalsWidget({ limit = 3 }: FinancialGoalsWidgetProps) {
  const { goals, loading, error } = useFinancialGoals(limit)

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const calculateProgress = (current: number, target: number) => {
    if (target === 0) return 0
    return Math.min(100, (current / target) * 100)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-5 bg-gray-200 rounded w-36 animate-pulse" />
        </div>
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-2 bg-gray-200 rounded w-full mb-1" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-red-100 text-red-600">
            <Target className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Obiettivi Finanziari</h3>
        </div>
        <p className="text-sm text-red-600">Errore: {error}</p>
      </div>
    )
  }

  // Coming soon / Empty state (temporaneo)
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-purple-100 text-purple-600">
          <Target className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Obiettivi Finanziari</h3>
          <p className="text-sm text-gray-500">Monitora i tuoi traguardi</p>
        </div>
      </div>

      {/* Coming soon o lista obiettivi */}
      {goals.length === 0 ? (
        <div className="text-center py-6">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Funzionalità in arrivo</p>
          <p className="text-xs text-gray-400 mt-1">Potrai impostare e monitorare i tuoi obiettivi</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const progress = calculateProgress(goal.current_amount, goal.target_amount)
            const isCompleted = progress >= 100

            return (
              <div key={goal.id} className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{goal.name}</h4>
                    {goal.description && (
                      <p className="text-xs text-gray-500 truncate">{goal.description}</p>
                    )}
                  </div>
                  <span className={clsx(
                    'text-sm font-semibold ml-2',
                    isCompleted ? 'text-green-600' : 'text-purple-600'
                  )}>
                    {progress.toFixed(0)}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={clsx(
                      'h-2 rounded-full transition-all duration-500',
                      isCompleted ? 'bg-green-500' : 'bg-purple-500'
                    )}
                    style={{ 
                      width: `${Math.min(100, progress)}%`,
                      backgroundColor: goal.color && !isCompleted ? goal.color : undefined 
                    }}
                  />
                </div>

                <div className="flex justify-between text-xs text-gray-500">
                  <span>{formatCurrency(goal.current_amount, goal.currency)} / {formatCurrency(goal.target_amount, goal.currency)}</span>
                  {goal.target_date && (
                    <span>Entro {formatDate(goal.target_date)}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
