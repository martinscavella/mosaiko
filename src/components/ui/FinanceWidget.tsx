'use client'

import { TrendingUp, TrendingDown, DollarSign, Target, CreditCard, Activity, BadgePercent } from 'lucide-react'

interface FinanceWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: 'balance' | 'income' | 'expenses' | 'savings' | 'accounts' | 'transactions' | 'goals' | 'badge-percent';
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'gray';
  loading?: boolean;
  onClick?: () => void;
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
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300"></div>

      {/* Main widget container */}
      <div className="relative bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-6 mb-4 min-h-[180px] max-h-[300px] flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:bg-white/98 hover:border-white/70 hover:-translate-y-1">
        {/* Header: icona, titolo, sottotitolo */}
        <div className="flex items-center space-x-4 mb-2">
          <div
            className={`p-3 rounded-xl shadow-lg transition-all duration-300 ${
              trend === 'up'
                ? 'bg-gradient-to-br from-green-400 to-emerald-600'
                : trend === 'down'
                  ? 'bg-gradient-to-br from-red-400 to-pink-600'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600'
            }`}
          >
            <IconComponent 
              className={`h-6 w-6 transition-colors duration-300 ${
                trend === 'up' ? 'text-green-50' : trend === 'down' ? 'text-red-50' : 'text-white'
              }`} 
            />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-600 font-medium mt-1">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Footer: valore in basso a destra, più grande */}
        <div className="flex items-end justify-end mt-4">
          <p className={`text-4xl font-extrabold ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : colors.text}`}> 
            {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(2) : value}
            {trend && (
              <span className={`ml-3 text-2xl align-middle ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>{trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}</span>
            )}
          </p>
        </div>

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      </div>
    </div>
  )
}
