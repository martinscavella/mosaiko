'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const learningNavigation = [
  { name: 'Courses', href: '/learning/courses', icon: '📚' },
  { name: 'Progress', href: '/learning/progress', icon: '📊' },
  { name: 'Achievements', href: '/learning/achievements', icon: '🏆' },
]

interface LearningLayoutProps {
  children: React.ReactNode
}

export default function LearningLayout({ children }: LearningLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-black/20 backdrop-blur-md border-r border-white/10">
        <div className="p-6">
          <Link href="/" className="flex items-center space-x-2 mb-8">
            <span className="text-2xl">📚</span>
            <span className="text-xl font-bold text-white">Learning</span>
          </Link>
          
          <nav className="space-y-2">
            {learningNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                  pathname === item.href
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
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
