'use client'

import { AlertCircle, TrendingUp } from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/helpers/format'

interface BudgetCategoryWidgetProps {
  categoryName: string
  budget: number
  spent: number
  remaining: number
  percentUsed: number
  status: 'under' | 'warning' | 'over'
  comparison?: {
    label: string
    value: number
    percentDiff: number
  }
}

export default function BudgetCategoryWidget({
  categoryName,
  budget,
  spent,
  remaining,
  percentUsed,
  status
}: BudgetCategoryWidgetProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'over':
        return 'bg-red-100 border-red-200'
      case 'warning':
        return 'bg-yellow-100 border-yellow-200'
      case 'under':
        return 'bg-green-100 border-green-200'
    }
  }

  const getProgressColor = () => {
    switch (status) {
      case 'over':
        return 'bg-red-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'under':
        return 'bg-green-500'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'over':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'under':
        return <TrendingUp className="h-4 w-4 text-green-600" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'over':
        return `Oltre il budget di ${formatCurrency(Math.abs(remaining))}`
      case 'warning':
        return `Attenzione: ${formatPercentage(percentUsed)} del budget`
      case 'under':
        return `${formatCurrency(remaining)} rimasti`
    }
  }

  return (
    <div className={`rounded-lg border p-4 ${getStatusColor()}`}>
      {/* Header con nome categoria e status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <h4 className="font-semibold text-gray-900">{categoryName}</h4>
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-white bg-opacity-60">
          {formatPercentage(percentUsed)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="w-full bg-gray-200 bg-opacity-50 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-300`}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-gray-600 text-xs">Budget</p>
          <p className="font-semibold text-gray-900">{formatCurrency(budget)}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs">Speso</p>
          <p className="font-semibold text-gray-900">{formatCurrency(spent)}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs">Rimasto</p>
          <p className={`font-semibold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(remaining)}
          </p>
        </div>
      </div>

      {/* Comparison info (optional) */}
      {comparison && (
        <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-700">
          <p className="font-medium">{comparison.label}</p>
          <p>
            {formatCurrency(comparison.value)} ({comparison.percentDiff >= 0 ? '+' : '-'}
            {formatPercentage(Math.abs(comparison.percentDiff))})
          </p>
        </div>
      )}

      {/* Status message */}
      <p className="mt-3 text-xs text-gray-700 flex items-center space-x-1">
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </p>
    </div>
  )
}
