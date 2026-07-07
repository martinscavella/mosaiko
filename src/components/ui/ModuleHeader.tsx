'use client'

import { ReactNode } from 'react'
import { clsx } from 'clsx'

export interface HeaderAction {
  label: string
  onClick: () => void
  icon: ReactNode
  color?: 'blue' | 'green' | 'gray' | 'red' | 'purple'
  disabled?: boolean
  loading?: boolean
  hideTextOnMobile?: boolean
  hideOnMobile?: boolean
}

export interface HeaderStat {
  label: string
  value: string
  color?: 'blue' | 'green' | 'purple' | 'orange'
}

export interface HeaderStatusIndicator {
  type: 'success' | 'warning' | 'error' | 'info'
  label: string
  show: boolean
}

interface ModuleHeaderProps {
  title: string
  subtitle: string
  icon: ReactNode
  statusIndicators?: HeaderStatusIndicator[]
  stats?: HeaderStat[]
  actions?: HeaderAction[]
  customContent?: ReactNode
}

const buttonColors = {
  blue: 'bg-primary hover:bg-primary-hover text-white',
  green: 'bg-success-strong hover:bg-success-strong text-white',
  gray: 'bg-ink-secondary hover:bg-ink-secondary text-white',
  red: 'bg-danger hover:bg-danger text-white',
  purple: 'bg-module-health hover:opacity-90 text-white',
}

const statColors = {
  blue: 'text-primary',
  green: 'text-success-strong',
  purple: 'text-module-health',
  orange: 'text-warning',
}

const statusColors = {
  success: { bg: 'bg-success-subtle', dot: 'bg-success', text: 'text-success-strong' },
  warning: { bg: 'bg-warning-subtle', dot: 'bg-warning', text: 'text-warning' },
  error: { bg: 'bg-danger-subtle', dot: 'bg-danger', text: 'text-danger' },
  info: { bg: 'bg-primary-subtle', dot: 'bg-primary', text: 'text-primary-hover' },
}

export default function ModuleHeader({
  title,
  subtitle,
  icon,
  statusIndicators = [],
  stats = [],
  actions = [],
  customContent
}: ModuleHeaderProps) {
  return (
    <div className="bg-surface border border-edge rounded-lg shadow-card p-5 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        
        {/* Left side - Title and status */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-subtle text-primary">
              {icon}
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink">{title}</h1>
              <p className="text-sm text-ink-muted">{subtitle}</p>
            </div>
          </div>
          
          {/* Status indicators */}
          <div className="flex flex-wrap items-center gap-2">
            {customContent}
            
            {statusIndicators.map((indicator, index) => {
              if (!indicator.show) return null
              const colors = statusColors[indicator.type]
              return (
                <div
                  key={index}
                  className={clsx('flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium', colors.bg, colors.text)}
                >
                  <div className={clsx('w-2 h-2 rounded-full', colors.dot, indicator.type === 'warning' && 'animate-pulse')} />
                  {indicator.label}
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Right side - Stats and actions */}
        <div className="flex items-center gap-4">
          {/* Stats */}
          {stats.length > 0 && (
            <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-canvas rounded-lg border border-edge">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-xs text-ink-muted">{stat.label}</div>
                  <div className={clsx('text-sm font-semibold font-amount', statColors[stat.color || 'blue'])}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Action buttons */}
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              className={clsx(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150',
                action.disabled || action.loading
                  ? 'bg-inset text-ink-muted cursor-not-allowed'
                  : buttonColors[action.color || 'blue'],
                'active:scale-95',
                action.hideOnMobile && 'hidden md:inline-flex'
              )}
            >
              <span className={action.loading ? 'animate-spin' : ''}>{action.icon}</span>
              {action.hideTextOnMobile ? (
                <span className="hidden sm:inline">{action.loading ? 'Caricamento...' : action.label}</span>
              ) : (
                <span>{action.loading ? 'Caricamento...' : action.label}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
