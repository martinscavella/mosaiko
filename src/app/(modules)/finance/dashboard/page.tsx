'use client'

import { useFinancialSummary } from '@/lib/hooks/useFinancialSummary'
import { useTransactions } from '@/lib/hooks/useTransactions'

export default function FinanceDashboard() {
  const { summary, loading: summaryLoading } = useFinancialSummary()
  const { transactions } = useTransactions()
  
  // Get recent transactions (last 5)
  const recentTransactions = transactions.slice(0, 5)
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Finance Dashboard</h1>
          <p className="text-gray-600">Overview of your financial status</p>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Balance</h3>
            <p className="text-3xl font-bold text-green-600">
              {summaryLoading ? '...' : `€${summary.totalBalance.toFixed(2)}`}
            </p>
            <p className="text-gray-500 text-sm mt-2">All accounts combined</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Monthly Income</h3>
            <p className="text-3xl font-bold text-blue-600">
              {summaryLoading ? '...' : `€${summary.monthlyIncome.toFixed(2)}`}
            </p>
            <p className="text-gray-500 text-sm mt-2">This month's income</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Monthly Expenses</h3>
            <p className="text-3xl font-bold text-red-600">
              {summaryLoading ? '...' : `€${summary.monthlyExpenses.toFixed(2)}`}
            </p>
            <p className="text-gray-500 text-sm mt-2">This month's spending</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Savings Rate</h3>
            <p className="text-3xl font-bold text-purple-600">
              {summaryLoading ? '...' : `${summary.savingsRate.toFixed(1)}%`}
            </p>
            <p className="text-gray-500 text-sm mt-2">Income vs expenses</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-gray-500">No transactions yet</span>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        {transaction.transaction_details || 'Transaction'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.transaction_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        transaction.current_amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.current_amount >= 0 ? '+' : ''}€{Math.abs(transaction.current_amount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Goals</h3>
            <div className="text-center py-8">
              <span className="text-gray-500">No goals set yet</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
