export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          first_name: string
          last_name: string
          birth_date: string | null
          phone_number: string | null
          address: string | null
          bio: string | null
          full_name: string | null
          avatar_url: string | null
          language: string | null
          app_theme: string | null
          notifications_enabled: boolean | null
          created_at: string
          updated_at: string
          subscription_type: string | null
        }
        Insert: {
          id: string
          first_name: string
          last_name: string
          birth_date?: string | null
          phone_number?: string | null
          address?: string | null
          bio?: string | null
          avatar_url?: string | null
          language?: string | null
          app_theme?: string | null
          notifications_enabled?: boolean | null
          subscription_type?: string | null
        }
        Update: {
          first_name?: string
          last_name?: string
          birth_date?: string | null
          phone_number?: string | null
          address?: string | null
          bio?: string | null
          avatar_url?: string | null
          language?: string | null
          app_theme?: string | null
          notifications_enabled?: boolean | null
          subscription_type?: string | null
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string | null
          transaction_date: string
          transaction_type: string | null
          transaction_details: string | null
          transaction_code: string | null
          account_id: string | null
          category_id: string | null
          currency: string
          initial_amount: number
          is_refunded: boolean
          transaction_note: string | null
          created_at: string
          updated_at: string
          current_amount: number
          subcategory_id: string | null
          account_name: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          transaction_date: string
          transaction_type?: string | null
          transaction_details?: string | null
          transaction_code?: string | null
          account_id?: string | null
          category_id?: string | null
          currency?: string
          initial_amount: number
          is_refunded?: boolean
          transaction_note?: string | null
          current_amount: number
          subcategory_id?: string | null
          account_name?: string | null
        }
        Update: {
          transaction_date?: string
          transaction_type?: string | null
          transaction_details?: string | null
          transaction_code?: string | null
          account_id?: string | null
          category_id?: string | null
          currency?: string
          initial_amount?: number
          is_refunded?: boolean
          transaction_note?: string | null
          current_amount?: number
          subcategory_id?: string | null
          account_name?: string | null
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string | null
          name: string
          total_amount: number
          transaction_count: number
          icon: string | null
          created_at: string
          updated_at: string
          monthly_budget: number | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          total_amount?: number
          transaction_count?: number
          icon?: string | null
          monthly_budget?: number | null
        }
        Update: {
          name?: string
          total_amount?: number
          transaction_count?: number
          icon?: string | null
          monthly_budget?: number | null
          updated_at?: string
        }
      }
      accounts: {
        Row: {
          id: string
          user_id: string | null
          name: string
          type: string
          initial_balance: number
          current_balance: number
          currency: string
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          type: string
          initial_balance?: number
          current_balance: number
          currency?: string
          color: string
        }
        Update: {
          name?: string
          type?: string
          initial_balance?: number
          current_balance?: number
          currency?: string
          color?: string
          updated_at?: string
        }
      }
      financial_goals: {
        Row: {
          id: string
          name: string
          description: string | null
          current_amount: number
          target_amount: number
          currency: string | null
          target_date: string | null
          category: string | null
          color: string | null
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          current_amount?: number
          target_amount: number
          currency?: string | null
          target_date?: string | null
          category?: string | null
          color?: string | null
          user_id?: string | null
        }
        Update: {
          name?: string
          description?: string | null
          current_amount?: number
          target_amount?: number
          currency?: string | null
          target_date?: string | null
          category?: string | null
          color?: string | null
          updated_at?: string
        }
      }
      assets: {
        Row: {
          id: string
          user_id: string | null
          name: string
          type: string
          quantity: number
          value: number
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          type: string
          quantity: number
          value: number
          currency?: string
        }
        Update: {
          name?: string
          type?: string
          quantity?: number
          value?: number
          currency?: string
          updated_at?: string
        }
      }
    }
  }
}
