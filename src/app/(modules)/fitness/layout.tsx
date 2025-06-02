'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const fitnessNavigation = [
  { name: 'Workouts', href: '/fitness/workouts', icon: '💪' },
  { name: 'Nutrition', href: '/fitness/nutrition', icon: '🥗' },
  { name: 'Progress', href: '/fitness/progress', icon: '📊' },
  { name: 'Goals', href: '/fitness/goals', icon: '🎯' },
]

interface FitnessLayoutProps {
  children: React.ReactNode
}

export default function FitnessLayout({ children }: FitnessLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-black/20 backdrop-blur-md border-r border-white/10">
        <div className="p-6">
          <Link href="/" className="flex items-center space-x-2 mb-8">
            <span className="text-2xl">💪</span>
            <span className="text-xl font-bold text-white">Fitness</span>
          </Link>
          
          <nav className="space-y-2">
            {fitnessNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                  pathname === item.href
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
