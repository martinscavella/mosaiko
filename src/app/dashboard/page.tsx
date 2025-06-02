'use client'

import ProtectedRoute from '@/components/ProtectedRoute'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
    <div className="min-h-screen">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-300">Overview of your financial status</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Stats Cards Placeholder */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Total Balance</h3>
            <p className="text-2xl font-bold text-white">€0.00</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Monthly Income</h3>
            <p className="text-2xl font-bold text-green-400">€0.00</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Monthly Expenses</h3>
            <p className="text-2xl font-bold text-red-400">€0.00</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Active Goals</h3>
            <p className="text-2xl font-bold text-blue-400">0</p>
          </div>
        </div>

        {/* Content placeholders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">Recent Transactions</h2>
            <p className="text-gray-300">Recent transactions will appear here...</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">Financial Goals Progress</h2>
            <p className="text-gray-300">Goals progress will appear here...</p>
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  )
}
