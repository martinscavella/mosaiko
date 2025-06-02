'use client'

import { useAccounts } from '@/lib/hooks/useAccounts'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function AccountsPage() {
  const { accounts, loading } = useAccounts()

  return (
    <ProtectedRoute>
    <div className="min-h-screen">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Accounts</h1>
            <p className="text-gray-300">Manage your bank accounts and cards</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
            Add Account
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="text-gray-300 mt-4">Loading accounts...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-300 text-lg mb-4">No accounts found</p>
                <p className="text-gray-400">Add your first account to get started</p>
              </div>
            ) : (
              accounts.map((account) => (
                <div key={account.id} className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{account.name}</h3>
                    <span className="text-sm text-gray-300 capitalize">{account.type}</span>
                  </div>
                  <p className="text-2xl font-bold text-white mb-2">
                    €{Number(account.current_balance).toFixed(2)}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">{account.currency}</span>
                    <button className="text-blue-400 hover:text-blue-300 text-sm">
                      View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
    </ProtectedRoute>
  )
}
