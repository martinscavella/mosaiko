'use client'

import { TrendingUp, TrendingDown, DollarSign, Target, CreditCard, Activity, BadgePercent } from 'lucide-react'
import { clsx } from 'clsx'

interface FinanceWidgetProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: 'balance' | 'income' | 'expenses' | 'savings' | 'accounts' | 'transactions' | 'goals' | 'badge-percent'
  color?: 'blue' | 'green' | 'red' | 'purple'
  loading?: boolean
  onClick?: () => void
}

const iconMap = {
  balance: DollarSign,
  income: TrendingUp,
  expenses: TrendingDown,
  savings: Target,
  accounts: CreditCard,
  transactions: Activity,
  goals: Target,
  'badge-percent': BadgePercent
}

const iconBgColors = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  red: 'bg-red-100 text-red-600',
  purple: 'bg-purple-100 text-purple-600',
}

const valueColors = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  red: 'text-red-600',
  purple: 'text-purple-600',
}

export default function FinanceWidget({
  title,
  value,
  subtitle,
  trend,
  icon = 'balance',
  color = 'blue',
  loading = false,
  onClick
}: FinanceWidgetProps) {
  const IconComponent = iconMap[icon]

  // Loading skeleton - minimale
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <div className="animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-16" />
            </div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-28" />
        </div>
      </div>
    )
  }

  // Determina colore valore in base al trend
  const displayColor = trend === 'up' ? 'green' : trend === 'down' ? 'red' : color

  return (
    <div
      className={clsx(
        'bg-white border border-gray-200 rounded-xl shadow-sm p-5 transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-gray-300 active:scale-[0.98]'
      )}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={clsx('w-10 h-10 flex items-center justify-center rounded-lg', iconBgColors[color])}>
          <IconComponent className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">{title}</h3>
          {subtitle && (
            <p className="text-xs text-gray-500 truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Valore */}
      <div className="flex items-baseline gap-2">
        <span className={clsx('text-2xl font-bold', valueColors[displayColor])}>
          {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(2) : value}
        </span>
        {trend && trend !== 'neutral' && (
          <span className={clsx('text-sm', trend === 'up' ? 'text-green-500' : 'text-red-500')}>
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </div>
  )
}
