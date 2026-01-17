'use client'

import { ReactNode } from 'react'
import { clsx } from 'clsx'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  onClick?: () => void
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

/**
 * Card - Componente base unificato per tutti i container
 * Stile minimale e pulito
 */
export function Card({ 
  children, 
  className, 
  padding = 'md',
  hover = false,
  onClick 
}: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white border border-gray-200 rounded-xl shadow-sm',
        paddingClasses[padding],
        hover && 'hover:shadow-md hover:border-gray-300 transition-all duration-200',
        onClick && 'cursor-pointer active:scale-[0.98]',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  icon?: ReactNode
  iconColor?: 'primary' | 'success' | 'danger' | 'neutral'
  title: string
  subtitle?: string
  action?: ReactNode
}

const iconColorClasses = {
  primary: 'bg-blue-100 text-blue-600',
  success: 'bg-green-100 text-green-600',
  danger: 'bg-red-100 text-red-600',
  neutral: 'bg-gray-100 text-gray-600',
}

/**
 * CardHeader - Header unificato per le card
 */
export function CardHeader({ 
  icon, 
  iconColor = 'primary',
  title, 
  subtitle,
  action 
}: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className={clsx(
            'w-10 h-10 flex items-center justify-center rounded-lg',
            iconColorClasses[iconColor]
          )}>
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>
      {action && (
        <div>{action}</div>
      )}
    </div>
  )
}

/**
 * CardContent - Wrapper per il contenuto della card
 */
export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('', className)}>
      {children}
    </div>
  )
}

/**
 * CardFooter - Footer opzionale per le card
 */
export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('mt-4 pt-4 border-t border-gray-100', className)}>
      {children}
    </div>
  )
}
