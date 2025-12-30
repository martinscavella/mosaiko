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
  blue: 'bg-blue-600 hover:bg-blue-700 text-white',
  green: 'bg-green-600 hover:bg-green-700 text-white',
  gray: 'bg-gray-600 hover:bg-gray-700 text-white',
  red: 'bg-red-600 hover:bg-red-700 text-white',
  purple: 'bg-purple-600 hover:bg-purple-700 text-white',
}

const statColors = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  orange: 'text-orange-600',
}

const statusColors = {
  success: { bg: 'bg-green-50', dot: 'bg-green-500', text: 'text-green-700' },
  warning: { bg: 'bg-amber-50', dot: 'bg-amber-500', text: 'text-amber-700' },
  error: { bg: 'bg-red-50', dot: 'bg-red-500', text: 'text-red-700' },
  info: { bg: 'bg-blue-50', dot: 'bg-blue-500', text: 'text-blue-700' },
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
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        
        {/* Left side - Title and status */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              {icon}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-500">{subtitle}</p>
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
            <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-xs text-gray-500">{stat.label}</div>
                  <div className={clsx('text-sm font-semibold', statColors[stat.color || 'blue'])}>
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
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
