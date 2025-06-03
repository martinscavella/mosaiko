'use client'

import { useAccounts } from '@/lib/hooks/useAccounts'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function AccountsPage() {
  const { accounts, loading } = useAccounts()

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Accounts</h1>
              <p className="text-gray-600">Manage your bank accounts and cards</p>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
              Add Account
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-4">Loading accounts...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-600 text-lg mb-4">No accounts found</p>
                  <p className="text-gray-500">Add your first account to get started</p>
                </div>
              ) : (
                accounts.map((account) => (
                  <div key={account.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: account.color || '#6B7280' }}
                        ></div>
                        <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                      </div>
                      <span className="text-sm text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded">{account.type}</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mb-4">
                      €{Number(account.current_balance).toFixed(2)}
                    </p>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-500 block">{account.currency}</span>
                        <span className="text-xs text-gray-400">
                          Created {new Date(account.created_at || '').toLocaleDateString()}
                        </span>
                      </div>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
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
