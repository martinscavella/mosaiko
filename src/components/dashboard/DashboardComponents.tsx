import React from 'react'

interface ModuleCardProps {
  title: string
  icon: string
  status: 'active' | 'coming-soon'
  stats: Array<{ label: string; value: string | number }>
  onActionClick?: () => void
  children?: React.ReactNode
}

export function ModuleCard({ 
  title, 
  icon, 
  status, 
  stats, 
  onActionClick, 
  children 
}: ModuleCardProps) {
  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl border border-white/20 p-6 card-hover">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center">
          <span className="mr-3">{icon}</span>
          {title}
        </h3>
        <span className={`px-3 py-1 rounded-lg text-sm ${
          status === 'active' 
            ? 'bg-blue-500/20 text-blue-300' 
            : 'bg-gray-500/20 text-gray-300'
        }`}>
          {status === 'active' ? 'Active' : 'Coming Soon'}
        </span>
      </div>
      
      <div className="space-y-4 mb-6">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
            <span className="text-gray-300">{stat.label}</span>
            <span className="text-white font-semibold">{stat.value}</span>
          </div>
        ))}
      </div>
      
      {children}
      
      <button 
        onClick={onActionClick}
        disabled={status === 'coming-soon'}
        className={`w-full py-3 rounded-xl font-medium transition-all duration-200 ${
          status === 'active'
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
            : 'bg-gray-600/20 text-gray-400 cursor-not-allowed'
        }`}
      >
        {status === 'active' ? `Manage ${title}` : 'Coming Soon'}
      </button>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  icon: string
  gradient: string
  iconBg: string
  textColor: string
}

export function StatCard({ title, value, icon, gradient, iconBg, textColor }: StatCardProps) {
  return (
    <div className={`${gradient} backdrop-blur-sm border ${iconBg.replace('/30', '/30')} rounded-2xl p-6 card-hover`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`${textColor} text-sm font-medium`}>{title}</p>
          <p className="text-white text-2xl font-bold">{value}</p>
        </div>
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}>
          <span className={`${textColor} text-xl`}>{icon}</span>
        </div>
      </div>
    </div>
  )
}

interface QuickActionProps {
  icon: string
  label: string
  gradient: string
  border: string
  onClick?: () => void
}

export function QuickAction({ icon, label, gradient, border, onClick }: QuickActionProps) {
  return (
    <button 
      onClick={onClick}
      className={`p-4 ${gradient} hover:${gradient.replace('/20', '/30')} rounded-xl border ${border} transition-all duration-200 card-hover`}
    >
      <span className="block text-2xl mb-2">{icon}</span>
      <span className="text-white text-sm font-medium">{label}</span>
    </button>
  )
}
