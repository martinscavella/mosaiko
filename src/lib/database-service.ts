import { createServerClient } from './supabase'
import { Database } from './database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

// Server-side database operations
export class DatabaseService {
  private supabase

  constructor() {
    this.supabase = createServerClient()
  }

  // Profile operations
  async createProfile(profileData: ProfileInsert): Promise<{ data: Profile | null; error: string | null }> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (err) {
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'An error occurred' 
      }
    }
  }

  async getProfile(userId: string): Promise<{ data: Profile | null; error: string | null }> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (err) {
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'An error occurred' 
      }
    }
  }

  // Account statistics
  async getAccountsSummary(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('accounts')
        .select('type, current_balance, currency')
        .eq('user_id', userId)

      if (error) throw error

      const summary = data?.reduce((acc, account) => {
        const type = account.type
        if (!acc[type]) {
          acc[type] = { count: 0, totalBalance: 0 }
        }
        acc[type].count += 1
        acc[type].totalBalance += Number(account.current_balance)
        return acc
      }, {} as Record<string, { count: number; totalBalance: number }>)

      return { data: summary, error: null }
    } catch (err) {
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'An error occurred' 
      }
    }
  }

  // Transaction statistics
  async getTransactionsSummary(userId: string, startDate?: string, endDate?: string) {
    try {
      let query = this.supabase
        .from('transactions')
        .select('current_amount, transaction_date, transaction_type')
        .eq('user_id', userId)

      if (startDate) {
        query = query.gte('transaction_date', startDate)
      }
      if (endDate) {
        query = query.lte('transaction_date', endDate)
      }

      const { data, error } = await query

      if (error) throw error

      const summary = data?.reduce((acc, transaction) => {
        const amount = Number(transaction.current_amount)
        if (amount > 0) {
          acc.totalIncome += amount
          acc.incomeCount += 1
        } else {
          acc.totalExpenses += Math.abs(amount)
          acc.expenseCount += 1
        }
        return acc
      }, {
        totalIncome: 0,
        totalExpenses: 0,
        incomeCount: 0,
        expenseCount: 0,
        netAmount: 0
      })

      if (summary) {
        summary.netAmount = summary.totalIncome - summary.totalExpenses
      }

      return { data: summary, error: null }
    } catch (err) {
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'An error occurred' 
      }
    }
  }

  // Category spending analysis
  async getCategorySpending(userId: string, startDate?: string, endDate?: string) {
    try {
      let query = this.supabase
        .from('transactions')
        .select(`
          current_amount,
          categories (name, icon)
        `)
        .eq('user_id', userId)
        .not('categories', 'is', null)

      if (startDate) {
        query = query.gte('transaction_date', startDate)
      }
      if (endDate) {
        query = query.lte('transaction_date', endDate)
      }

      const { data, error } = await query

      if (error) throw error

    const categorySpending = data?.reduce((acc, transaction) => {
    const categoryName = (transaction.categories as { name?: string })?.name || 'Uncategorized'
    const amount = Math.abs(Number(transaction.current_amount))
    
    if (!acc[categoryName]) {
      acc[categoryName] = {
        total: 0,
        count: 0,
        icon: (transaction.categories as { icon?: string })?.icon
      }
    }
        
        acc[categoryName].total += amount
        acc[categoryName].count += 1
        
        return acc
      }, {} as Record<string, { total: number; count: number; icon?: string }>)

      return { data: categorySpending, error: null }
    } catch (err) {
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'An error occurred' 
      }
    }
  }

  // Financial goals progress
  async getGoalsProgress(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', userId)
        .order('target_date', { ascending: true })

      if (error) throw error

      const goalsWithProgress = data?.map(goal => ({
        ...goal,
        progress: Number(goal.current_amount) / Number(goal.target_amount) * 100,
        remaining: Number(goal.target_amount) - Number(goal.current_amount)
      }))

      return { data: goalsWithProgress, error: null }
    } catch (err) {
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'An error occurred' 
      }
    }
  }
}
