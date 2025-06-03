import React from 'react'

interface FinanceCardProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  value: string | number
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  onActionClick?: () => void
  children?: React.ReactNode
}

export function FinanceCard({ 
  title, 
  icon: Icon, 
  value, 
  description,
  trend,
  onActionClick, 
  children 
}: FinanceCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Icon className="h-8 w-8 text-blue-600 mr-3" />
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>
        {trend && (
          <span className={`text-sm font-medium ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      
      <div className="mb-4">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>
      
      {children}
      
      {onActionClick && (
        <button
          onClick={onActionClick}
          className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200"
        >
          View Details
        </button>
      )}
    </div>
  )
}

interface QuickActionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  className?: string
}

export function QuickAction({ title, icon: Icon, onClick, className = '' }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:bg-gray-50 transition-all duration-200 ${className}`}
    >
      <Icon className="h-6 w-6 text-blue-600 mr-2" />
      <span className="text-sm font-medium text-gray-900">{title}</span>
    </button>
  )
}
