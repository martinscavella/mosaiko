'use client'

import { TrendingUp, TrendingDown, DollarSign, Target, CreditCard, Activity, BadgePercent } from 'lucide-react'
import { clsx } from 'clsx'

interface FinanceWidgetProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  /**
   * Variazione vs periodo precedente. `direction` è il verso della variazione,
   * `sentiment` dice se è positiva o negativa (per le uscite un aumento è ↑ ma bad).
   * Se presente, sostituisce `trend` e non altera il colore del valore.
   */
  delta?: { label: string; direction: 'up' | 'down'; sentiment: 'good' | 'bad' | 'neutral' }
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
  blue: 'bg-primary-subtle text-primary',
  green: 'bg-success-subtle text-success-strong',
  red: 'bg-danger-subtle text-danger',
  purple: 'bg-module-health-subtle text-module-health',
}

const valueColors = {
  blue: 'text-primary',
  green: 'text-success-strong',
  red: 'text-danger',
  purple: 'text-module-health',
}

const sentimentColors = {
  good: 'text-success-strong',
  bad: 'text-danger',
  neutral: 'text-ink-muted',
}

export default function FinanceWidget({
  title,
  value,
  subtitle,
  trend,
  delta,
  icon = 'balance',
  color = 'blue',
  loading = false,
  onClick
}: FinanceWidgetProps) {
  const IconComponent = iconMap[icon]

  // Loading skeleton - minimale
  if (loading) {
    return (
      <div className="bg-surface border border-edge rounded-lg shadow-card p-5">
        <div className="animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-inset rounded-lg" />
            <div className="flex-1">
              <div className="h-4 bg-inset rounded w-24 mb-2" />
              <div className="h-3 bg-inset rounded w-16" />
            </div>
          </div>
          <div className="h-8 bg-inset rounded w-28" />
        </div>
      </div>
    )
  }

  // Con delta esplicito il colore del valore resta quello semantico del widget;
  // il legacy trend colora il valore in base alla direzione
  const displayColor = delta ? color : trend === 'up' ? 'green' : trend === 'down' ? 'red' : color

  return (
    <div
      className={clsx(
        'bg-surface border border-edge rounded-lg shadow-card p-5 transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-elevated hover:border-edge active:scale-[0.98]'
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
          <h3 className="text-sm font-medium text-ink truncate">{title}</h3>
          {subtitle && (
            <p className="text-xs text-ink-muted truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Valore */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={clsx('text-2xl font-bold font-amount', valueColors[displayColor])}>
          {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(2) : value}
        </span>
        {delta ? (
          <span className={clsx('text-sm font-medium', sentimentColors[delta.sentiment])}>
            {delta.direction === 'up' ? '↑' : '↓'} {delta.label}
          </span>
        ) : trend && trend !== 'neutral' ? (
          <span className={clsx('text-sm', trend === 'up' ? 'text-success' : 'text-danger')}>
            {trend === 'up' ? '↑' : '↓'}
          </span>
        ) : null}
      </div>
    </div>
  )
}
