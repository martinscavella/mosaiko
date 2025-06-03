'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { useAccounts } from './useAccounts'
import { useTransactions } from './useTransactions'

interface FinancialSummary {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  savingsRate: number
  accountsCount: number
  transactionsCount: number
  topSpendingCategories: Array<{
    category: string
    amount: number
    percentage: number
  }>
}

export function useFinancialSummary() {
  const { user } = useAuth()
  const { accounts } = useAccounts()
  const { transactions } = useTransactions()
  const [summary, setSummary] = useState<FinancialSummary>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    savingsRate: 0,
    accountsCount: 0,
    transactionsCount: 0,
    topSpendingCategories: []
  })
  const [loading, setLoading] = useState(true)

  const calculateSummary = useCallback(() => {
    if (!user || !accounts.length) {
      setLoading(false)
      return
    }

    try {
      // Calculate total balance
      const totalBalance = accounts.reduce((sum, account) => 
        sum + (account.current_balance || 0), 0
      )

      // Get current month's transactions
      const currentDate = new Date()
      const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const currentMonthTransactions = transactions.filter(transaction => 
        new Date(transaction.transaction_date) >= currentMonthStart
      )

      // Calculate monthly income and expenses
      const monthlyIncome = currentMonthTransactions
        .filter(t => t.current_amount > 0)
        .reduce((sum, t) => sum + t.current_amount, 0)

      const monthlyExpenses = Math.abs(currentMonthTransactions
        .filter(t => t.current_amount < 0)
        .reduce((sum, t) => sum + t.current_amount, 0))

      // Calculate savings rate
      const savingsRate = monthlyIncome > 0 
        ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 
        : 0

      // Group transactions by category (placeholder - would need category data)
      const categorySpending: Record<string, number> = {}
      currentMonthTransactions
        .filter(t => t.current_amount < 0)
        .forEach(t => {
          const category = 'General' // Placeholder - would use actual category
          categorySpending[category] = (categorySpending[category] || 0) + Math.abs(t.current_amount)
        })

      const topSpendingCategories = Object.entries(categorySpending)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: monthlyExpenses > 0 ? (amount / monthlyExpenses) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

      setSummary({
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        savingsRate: Math.round(savingsRate * 100) / 100,
        accountsCount: accounts.length,
        transactionsCount: transactions.length,
        topSpendingCategories
      })
    } catch (error) {
      console.error('Error calculating financial summary:', error)
    } finally {
      setLoading(false)
    }
  }, [user, accounts, transactions])

  useEffect(() => {
    calculateSummary()
  }, [calculateSummary])

  return {
    summary,
    loading,
    refresh: calculateSummary
  }
}
