'use client'

import { modules } from '../app/modules'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface ModuleLayoutProps {
  children: React.ReactNode
  moduleId: string
}

export default function ModuleLayout({ children, moduleId }: ModuleLayoutProps) {
  const pathname = usePathname()
  const module = modules.find(m => m.id === moduleId)

  if (!module) return null
  
  const isActive = (path: string) => pathname === path

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Module Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <span className="text-2xl">{module.icon}</span>
              <h1 className="text-xl font-medium text-gray-900">
                {module.name}
              </h1>
            </div>
            <Link
              href="/"
              className="text-gray-500 hover:text-gray-700"
            >
              ← Home
            </Link>
          </div>
        </div>
      </header>

      {/* Module Content */}
      <main>
        {children}
      </main>
    </div>
  )
}
