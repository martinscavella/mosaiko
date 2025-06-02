'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'

const financeNavigation = [
  { name: 'Dashboard', href: '/finance/dashboard', icon: '📊' },
  { name: 'Accounts', href: '/finance/accounts', icon: '🏦' },
  { name: 'Transactions', href: '/finance/transactions', icon: '💳' },
  { name: 'Categories', href: '/finance/categories', icon: '📂' },
  { name: 'Goals', href: '/finance/goals', icon: '🎯' },
  { name: 'Reports', href: '/finance/reports', icon: '📈' },
  { name: 'Settings', href: '/finance/settings', icon: '⚙️' },
]

interface FinanceLayoutProps {
  children: React.ReactNode
}

export default function FinanceLayout({ children }: FinanceLayoutProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-black/20 backdrop-blur-md border-r border-white/10">
        <div className="p-6">
          <Link href="/" className="flex items-center space-x-2 mb-8">
            <span className="text-2xl">💰</span>
            <span className="text-xl font-bold text-white">Finance</span>
          </Link>
          
          <nav className="space-y-2">
            {financeNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                  pathname === item.href
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* User section */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="bg-white/10 rounded-lg p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{user?.email}</p>
                <p className="text-gray-400 text-sm">Finance Module</p>
              </div>
              <button
                onClick={handleSignOut}
                className="text-gray-400 hover:text-white transition-colors"
                title="Sign Out"
              >
                🚪
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
