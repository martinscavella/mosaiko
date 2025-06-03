'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useAccounts } from '@/lib/hooks/useAccounts'
import { useTransactions } from '@/lib/hooks/useTransactions'

interface SampleDataProps {
  onClose: () => void
}

export function SampleDataCreator({ onClose }: SampleDataProps) {
  const { user } = useAuth()
  const { createAccount } = useAccounts()
  const { createTransaction } = useTransactions()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const createSampleData = async () => {
    if (!user) return
    
    setLoading(true)
    setMessage('')
    
    try {
      // Create sample accounts
      const checking = await createAccount({
        name: 'Main Checking',
        type: 'checking',
        current_balance: 2500.00,
        currency: 'EUR',
        color: '#3B82F6'
      })

      const savings = await createAccount({
        name: 'Emergency Savings',
        type: 'savings',
        current_balance: 8750.00,
        currency: 'EUR',
        color: '#10B981'
      })

      const credit = await createAccount({
        name: 'Travel Credit Card',
        type: 'credit',
        current_balance: -450.00,
        currency: 'EUR',
        color: '#EF4444'
      })

      // Create sample transactions
      const currentDate = new Date()
      const transactions = [
        {
          transaction_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0],
          transaction_details: 'Salary Payment',
          current_amount: 3200.00,
          initial_amount: 3200.00,
          currency: 'EUR',
          transaction_type: 'income',
          account_id: checking.id
        },
        {
          transaction_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 5).toISOString().split('T')[0],
          transaction_details: 'Grocery Shopping',
          current_amount: -127.45,
          initial_amount: -127.45,
          currency: 'EUR',
          transaction_type: 'expense',
          account_id: checking.id
        },
        {
          transaction_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 8).toISOString().split('T')[0],
          transaction_details: 'Monthly Savings Transfer',
          current_amount: -500.00,
          initial_amount: -500.00,
          currency: 'EUR',
          transaction_type: 'transfer',
          account_id: checking.id
        },
        {
          transaction_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 8).toISOString().split('T')[0],
          transaction_details: 'Monthly Savings Transfer',
          current_amount: 500.00,
          initial_amount: 500.00,
          currency: 'EUR',
          transaction_type: 'transfer',
          account_id: savings.id
        },
        {
          transaction_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 12).toISOString().split('T')[0],
          transaction_details: 'Electric Bill',
          current_amount: -89.30,
          initial_amount: -89.30,
          currency: 'EUR',
          transaction_type: 'expense',
          account_id: checking.id
        },
        {
          transaction_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15).toISOString().split('T')[0],
          transaction_details: 'Restaurant Dinner',
          current_amount: -65.80,
          initial_amount: -65.80,
          currency: 'EUR',
          transaction_type: 'expense',
          account_id: credit.id
        },
        {
          transaction_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 18).toISOString().split('T')[0],
          transaction_details: 'Freelance Payment',
          current_amount: 450.00,
          initial_amount: 450.00,
          currency: 'EUR',
          transaction_type: 'income',
          account_id: checking.id
        },
        {
          transaction_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 20).toISOString().split('T')[0],
          transaction_details: 'Gas Station',
          current_amount: -45.20,
          initial_amount: -45.20,
          currency: 'EUR',
          transaction_type: 'expense',
          account_id: checking.id
        }
      ]

      for (const transaction of transactions) {
        await createTransaction(transaction)
      }

      setMessage('Sample data created successfully! You can now explore the app with real data.')
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Error creating sample data:', error)
      setMessage('Error creating sample data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div className="mt-2 px-7 py-3">
            <h3 className="text-lg font-medium text-gray-900 text-center">
              Create Sample Data
            </h3>
            <div className="mt-4 text-sm text-gray-500">
              <p className="mb-3">
                Would you like to create sample financial data to explore the app? This will add:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>3 sample accounts (checking, savings, credit)</li>
                <li>8 sample transactions from this month</li>
                <li>Realistic balances and spending patterns</li>
              </ul>
              {message && (
                <div className={`mt-3 p-2 rounded text-xs ${
                  message.includes('Error') 
                    ? 'bg-red-50 text-red-600' 
                    : 'bg-green-50 text-green-600'
                }`}>
                  {message}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={createSampleData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Sample Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
