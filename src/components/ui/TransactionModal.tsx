'use client'

import { useState, useEffect } from 'react'
import { useAccounts } from '@/lib/hooks/useAccounts'
import { useCategories } from '@/lib/hooks/useCategories'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { Database } from '@/lib/database.types'

type Transaction = Database['public']['Tables']['transactions']['Row']

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  transaction?: Transaction | null // For editing existing transactions
}

export function TransactionModal({ isOpen, onClose, onSuccess, transaction }: TransactionModalProps) {
  const { accounts } = useAccounts()
  const { categories } = useCategories()
  const { createTransaction, updateTransaction } = useTransactions()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    transaction_details: '',
    amount: '',
    account_id: '',
    category_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_type: 'expense'
  })

  const isEditing = !!transaction

  useEffect(() => {
    if (isOpen) {
      if (transaction) {
        // Populate form with existing transaction data for editing
        const amount = Math.abs(transaction.current_amount).toString()
        const type = transaction.current_amount >= 0 ? 'income' : 'expense'
        
        setFormData({
          transaction_details: transaction.transaction_details || '',
          amount: amount,
          account_id: transaction.account_id || '',
          category_id: transaction.category_id || '',
          transaction_date: transaction.transaction_date,
          transaction_type: type
        })
      } else {
        // Reset form for new transaction
        setFormData({
          transaction_details: '',
          amount: '',
          account_id: accounts.length > 0 ? accounts[0].id : '',
          category_id: '',
          transaction_date: new Date().toISOString().split('T')[0],
          transaction_type: 'expense'
        })
      }
    }
  }, [isOpen, accounts, transaction])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.transaction_details || !formData.amount || !formData.account_id) {
      return
    }

    setLoading(true)
    try {
      const amount = parseFloat(formData.amount)
      const finalAmount = formData.transaction_type === 'expense' ? -Math.abs(amount) : Math.abs(amount)
      
      if (isEditing && transaction) {
        // Update existing transaction
        await updateTransaction(transaction.id, {
          transaction_details: formData.transaction_details,
          current_amount: finalAmount,
          initial_amount: finalAmount,
          account_id: formData.account_id,
          category_id: formData.category_id || null,
          transaction_date: formData.transaction_date,
          transaction_type: formData.transaction_type,
          updated_at: new Date().toISOString()
        })
      } else {
        // Create new transaction
        await createTransaction({
          transaction_details: formData.transaction_details,
          current_amount: finalAmount,
          initial_amount: finalAmount,
          account_id: formData.account_id,
          category_id: formData.category_id || null,
          transaction_date: formData.transaction_date,
          transaction_type: formData.transaction_type,
          currency: 'EUR'
        })
      }

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error saving transaction:', error)
      alert(`Failed to ${isEditing ? 'update' : 'create'} transaction`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 text-center mb-6">
            {isEditing ? 'Edit Transaction' : 'Add Transaction'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={formData.transaction_details}
                onChange={(e) => setFormData(prev => ({ ...prev, transaction_details: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter transaction description"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={formData.transaction_type}
                onChange={(e) => setFormData(prev => ({ ...prev, transaction_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account
              </label>
              <select
                value={formData.account_id}
                onChange={(e) => setFormData(prev => ({ ...prev, account_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category (Optional)
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon ? `${category.icon} ` : ''}{category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.transaction_details || !formData.amount || !formData.account_id}
                className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Transaction' : 'Add Transaction')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
