'use client'

import { useFinancialGoals } from '@/lib/financeCache'
import { Target, TrendingUp } from 'lucide-react'

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

  if (loading) {
    return (
      <div className="group relative">
        {/* Shimmer background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-green-500/5 rounded-xl blur-sm animate-pulse"></div>

        {/* Loading container */}
        <div className="relative bg-white/95 backdrop-blur-sm border border-white/50 shadow-lg rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Obiettivi Finanziari</h3>
          <div className="space-y-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16"></div>
                </div>
                <div className="h-2 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-full"></div>
                <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20"></div>
              </div>
            ))}
          </div>

          {/* Loading shimmer effect */}
          <div className="absolute inset-0 -top-2 -left-2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transform -translate-x-full animate-shimmer rounded-xl"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="group relative">
        {/* Error gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 rounded-xl blur-sm"></div>

        {/* Error container */}
        <div className="relative bg-white/95 backdrop-blur-sm border border-red-200/50 shadow-lg rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Obiettivi Finanziari</h3>
          <div className="text-center py-8">
            <div className="mx-auto mb-4 h-12 w-12 text-red-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-600 text-sm font-medium">Errore nel caricamento: {error}</p>
          </div>
        </div>
      </div>
    )
  }
  if (true === true) {
    return (
      <div className="group relative min-h-[200px] h-full flex flex-col">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-purple-500/5 rounded-2xl blur-sm"></div>

        {/* Main container */}
        <div className="relative bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-6 flex-1 flex flex-col justify-center overflow-hidden mb-4 min-h-[180px] max-h-[300px]">
          {/* Header stile FinanceWidget */}
          <div className="flex items-center space-x-4 mb-2">
            <div className="p-3 rounded-xl shadow-lg bg-gradient-to-br from-purple-400 to-indigo-600">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Obiettivi Finanziari</h3>
              <p className="text-sm text-gray-600 font-medium mt-1">Monitora i tuoi traguardi di risparmio</p>
            </div>
          </div>
          {/* Content */}
          <div className="flex-1 flex flex-col justify-center items-center px-2 py-8">
            <p className="text-gray-800 text-m mt-2 text-center">La gestione degli obiettivi sarà disponibile a breve!</p>
          </div>
        </div>
      </div>
    )
  }
  if (goals.length === 0) {
    return (
      <div className="group relative min-h-[200px] h-full flex flex-col">
        {/* Empty state gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-purple-500/5 rounded-2xl blur-sm"></div>

        {/* Empty state container stile FinanceWidget */}
        <div className="relative bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-6 flex-1 flex flex-col justify-center overflow-hidden mb-4 min-h-[180px] max-h-[300px]">
          <div className="flex items-center space-x-4 mb-2">
            <div className="p-3 rounded-xl shadow-lg bg-gradient-to-br from-purple-400 to-indigo-600">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Obiettivi Finanziari</h3>
              <p className="text-sm text-gray-600 font-medium mt-1">Monitora i tuoi traguardi di risparmio</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center px-2 py-8">
            <div className="mx-auto mb-4 h-16 w-16 text-gray-400">
              <Target className="h-full w-full" />
            </div>
            <p className="text-gray-500 text-sm font-medium">Nessun obiettivo impostato</p>
            <p className="text-gray-400 text-xs mt-2">Crea il tuo primo obiettivo finanziario</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative">
      {/* Floating gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-green-500/5 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500"></div>

      {/* Main container */}
      <div className="relative bg-white/95 backdrop-blur-sm border border-white/50 shadow-lg rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:bg-white/98 hover:border-white/70">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Obiettivi Finanziari
          </h3>
          <div className="p-2 bg-gradient-to-br from-purple-50 to-green-50 rounded-lg transition-all duration-300 group-hover:from-purple-100 group-hover:to-green-100">
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </div>
        </div>

        <div className="space-y-6">
          {goals.map((goal) => {
            const progress = calculateProgress(goal.current_amount, goal.target_amount)
            const isCompleted = progress >= 100

            return (
              <div key={goal.id} className="group/item space-y-3 p-3 hover:bg-gradient-to-r hover:from-gray-50/80 hover:to-purple-50/50 rounded-xl transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 transition-all duration-300 group-hover/item:text-gray-800">
                      {goal.name}
                    </h4>
                    {goal.description && (
                      <p className="text-xs text-gray-500 mt-1 transition-all duration-300 group-hover/item:text-gray-600">
                        {goal.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-semibold transition-all duration-300 ${isCompleted ? 'text-green-600' : 'text-purple-600'
                      }`}>
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Progress bar moderna */}
                <div className="w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-full h-2.5 overflow-hidden shadow-inner">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-700 ease-out shadow-sm ${isCompleted
                        ? 'bg-gradient-to-r from-green-400 to-green-600'
                        : goal.color
                          ? 'bg-gradient-to-r from-purple-400 to-purple-600'
                          : 'bg-gradient-to-r from-blue-400 to-blue-600'
                      }`}
                    style={{
                      width: `${Math.min(100, progress)}%`,
                      background: goal.color && !isCompleted
                        ? `linear-gradient(90deg, ${goal.color}cc, ${goal.color})`
                        : undefined
                    }}
                  >
                    {/* Shimmer effect on progress bar */}
                    <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-500 transition-all duration-300 group-hover/item:text-gray-600">
                  <span className="font-medium">
                    {formatCurrency(goal.current_amount, goal.currency)} di{' '}
                    {formatCurrency(goal.target_amount, goal.currency)}
                  </span>
                  {goal.target_date && (
                    <span className="px-2 py-1 bg-gray-100 rounded-md transition-all duration-300 group-hover/item:bg-gray-200">
                      Entro {formatDate(goal.target_date)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      </div>
    </div>
  )
}
