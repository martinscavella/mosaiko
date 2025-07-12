'use client'

import { TrendingUp, TrendingDown, DollarSign, Target, CreditCard, Activity } from 'lucide-react'

interface FinanceWidgetProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: 'balance' | 'income' | 'expenses' | 'savings' | 'accounts' | 'transactions' | 'goals'
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'gray'
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
  goals: Target
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    icon: 'text-blue-500'
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    icon: 'text-green-500'
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    icon: 'text-red-500'
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    icon: 'text-purple-500'
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    icon: 'text-orange-500'
  },
  gray: {
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    icon: 'text-gray-500'
  }
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
  const colors = colorMap[color]

  if (loading) {
    return (
      <div className="relative">
        {/* Shimmer background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100/50 to-gray-200/50 rounded-xl blur-sm animate-pulse"></div>
        
        {/* Loading container */}
        <div className="relative bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg rounded-xl p-6">
          <div className="animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24"></div>
              <div className="h-10 w-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl"></div>
            </div>
            <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20"></div>
          </div>
          
          {/* Loading shimmer effect */}
          <div className="absolute inset-0 -top-2 -left-2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 transform -translate-x-full animate-shimmer rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`group relative ${onClick ? 'cursor-pointer hover:scale-[1.025] active:scale-95 transition-transform duration-150' : ''}`}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      aria-label={onClick ? title : undefined}
    >
      {/* Floating gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300"></div>

      {/* Main widget container */}
      <div className="relative bg-white/95 backdrop-blur-sm border border-white/50 shadow-lg rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:bg-white/98 hover:border-white/70 hover:-translate-y-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          <div className={`p-2.5 rounded-xl shadow-sm transition-all duration-300 ${colors.bg} group-hover:shadow-md group-hover:scale-110`}>
            <IconComponent className={`h-4 w-4 ${colors.icon} transition-all duration-300`} />
          </div>
        </div>

        <div className="flex items-baseline space-x-2">
          <p className={`text-2xl font-bold transition-all duration-300 ${colors.text}`}>
            {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(2) : value}
          </p>
          {trend && (
            <span className={`text-sm font-medium transition-all duration-300 ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-sm text-gray-500 mt-2 transition-all duration-300 group-hover:text-gray-600">{subtitle}</p>
        )}

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      </div>
    </div>
  )
}
