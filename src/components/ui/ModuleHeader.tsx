'use client'

import { ReactNode } from 'react'

export interface HeaderAction {
  label: string
  onClick: () => void
  icon: ReactNode
  color?: 'blue' | 'green' | 'gray' | 'red' | 'purple'
  disabled?: boolean
  loading?: boolean
  hideTextOnMobile?: boolean
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

const getColorClasses = (color: string = 'blue', type: 'button' | 'text' = 'button'): string => {
  const colors = {
    button: {
      blue: 'bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700',
      green: 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700',
      gray: 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700',
      red: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
      purple: 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
    },
    text: {
      blue: 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent',
      green: 'bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent',
      purple: 'bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent',
      orange: 'bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent'
    }
  }
  
  if (type === 'button') {
    return colors.button[color as keyof typeof colors.button] || colors.button.blue
  } else {
    return colors.text[color as keyof typeof colors.text] || colors.text.blue
  }
}

const getStatusIndicatorClasses = (type: HeaderStatusIndicator['type']) => {
  const classes = {
    success: {
      container: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200',
      dot: 'bg-gradient-to-r from-green-400 to-emerald-400',
      text: 'text-green-700'
    },
    warning: {
      container: 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-200',
      dot: 'bg-gradient-to-r from-orange-400 to-red-400',
      text: 'text-orange-700'
    },
    error: {
      container: 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200',
      dot: 'bg-gradient-to-r from-red-400 to-pink-400',
      text: 'text-red-700'
    },
    info: {
      container: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200',
      dot: 'bg-gradient-to-r from-blue-400 to-indigo-400',
      text: 'text-blue-700'
    }
  }
  return classes[type]
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
    <>
      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #CBD5E0 #EDF2F7;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #EDF2F7;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #CBD5E0, #A0AEC0);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #A0AEC0, #718096);
        }
        .shimmer-effect {
          animation: shimmer 2s infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        .btn-refresh:hover .shimmer-effect {
          animation: shimmer 0.7s ease-out;
        }
        .glow-effect {
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .btn-refresh:hover .glow-effect {
          opacity: 1;
        }
        .refresh-icon {
          transition: transform 0.3s ease;
        }
        .btn-refresh:hover .refresh-icon {
          transform: rotate(180deg);
        }
        @keyframes animate-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: animate-shimmer 2s infinite;
        }
      `}</style>
      
      <div className="sticky top-4 z-50 mb-4">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-green-500/10 rounded-2xl blur-xl transition-all duration-700 group-hover:from-blue-500/20 group-hover:via-purple-500/20 group-hover:to-green-500/20"></div>
        
        {/* Floating orbs effect */}
        <div className="absolute top-4 right-4 h-32 w-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-4 left-4 h-24 w-24 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        {/* Main header container */}
        <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 shadow-2xl rounded-2xl p-6 transition-all duration-300 hover:bg-white/95 hover:shadow-3xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            
            {/* Left side - Title and status */}
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="relative p-3 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl shadow-lg">
                  {icon}
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                    {title}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {subtitle}
                  </p>
                </div>
              </div>
              
              {/* Status indicators */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Custom content (es. CacheStatus) */}
                {customContent}
                
                {statusIndicators.map((indicator, index) => {
                  if (!indicator.show) return null
                  const classes = getStatusIndicatorClasses(indicator.type)
                  return (
                    <div key={index} className={`flex items-center space-x-2 px-3 py-1.5 ${classes.container} border rounded-full ${indicator.type === 'warning' ? 'animate-pulse' : ''}`}>
                      <div className={`h-2 w-2 ${classes.dot} rounded-full ${indicator.type === 'warning' ? 'animate-bounce' : 'animate-pulse'}`}></div>
                      <span className={`text-xs font-medium ${classes.text}`}>
                        {indicator.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Right side - Stats and actions */}
            <div className="flex items-center space-x-4">
              {/* Stats summary card */}
              {stats.length > 0 && (
                <div className="hidden md:block">
                  <div className="flex items-center space-x-4 px-4 py-3 bg-gradient-to-br from-gray-50/90 to-gray-100/90 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                    {stats.map((stat, index) => (
                      <div key={index} className="flex items-center">
                        <div className="text-center">
                          <div className="text-xs font-medium text-gray-500 mb-1">{stat.label}</div>
                          <div className={`text-sm font-bold ${getColorClasses(stat.color || 'blue', 'text')}`}>
                            {stat.value}
                          </div>
                        </div>
                        {index < stats.length - 1 && (
                          <div className="h-10 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent ml-4"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Action buttons */}
              {actions.length > 0 && (
                <div className="flex items-center space-x-4">
                  {actions.map((action, index) => (
                    <div key={index} className="relative">
                      <button
                        onClick={action.onClick}
                        disabled={action.disabled || action.loading}
                        className={`btn-refresh relative overflow-hidden px-6 py-3 rounded-xl font-medium transition-all duration-300 transform ${
                          action.disabled || action.loading
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed scale-95' 
                            : `${getColorClasses(action.color || 'blue')} text-white shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95`
                        }`}
                      >
                        {/* Shimmer effect - solo al hover del button */}
                        {!action.loading && !action.disabled && (
                          <div className="shimmer-effect absolute inset-0 -top-2 -left-2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transform -translate-x-full transition-transform duration-700"></div>
                        )}
                        
                        {/* Button content */}
                        <div className="relative flex items-center space-x-2 z-10">
                          <div className={`refresh-icon transition-all duration-300 ${action.loading ? 'animate-spin' : ''}`}>
                            {action.icon}
                          </div>
                          {action.hideTextOnMobile ? (
                            <span className="hidden sm:inline transition-all duration-300">
                              {action.loading ? 'Sincronizzazione...' : action.label}
                            </span>
                          ) : (
                            <span className="transition-all duration-300">
                              {action.loading ? 'Sincronizzazione...' : action.label}
                            </span>
                          )}
                        </div>
                        
                        {/* Glow effect - solo al hover del button */}
                        {!action.loading && !action.disabled && (
                          <div className={`glow-effect absolute inset-0 -m-1 rounded-xl ${getColorClasses(action.color || 'blue').replace('hover:', '').replace('bg-gradient-to-r', 'bg-gradient-to-r')}/50 opacity-0 transition-all duration-300 blur-sm`}></div>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Animated loading progress bar */}
          {actions.some(action => action.loading) && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/50 rounded-b-2xl overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 animate-pulse relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
