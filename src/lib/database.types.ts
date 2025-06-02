export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
          created_at: string | null
          updated_at: string | null
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
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          type?: string
          initial_balance?: number
          current_balance?: number
          currency?: string
          color?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      assets: {
        Row: {
          id: string
          user_id: string | null
          name: string
          type: string
          amount: number
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
          amount: number
          value: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          type?: string
          amount?: number
          value?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      categories: {
        Row: {
          id: string
          user_id: string | null
          name: string
          total_amount: number
          transaction_count: number
          icon: string | null
          created_at: string | null
          updated_at: string | null
          monthly_budget: number | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          total_amount?: number
          transaction_count?: number
          icon?: string | null
          created_at?: string | null
          updated_at?: string | null
          monthly_budget?: number | null
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          total_amount?: number
          transaction_count?: number
          icon?: string | null
          created_at?: string | null
          updated_at?: string | null
          monthly_budget?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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
          created_at: string | null
          updated_at: string | null
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
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          current_amount?: number
          target_amount?: number
          currency?: string | null
          target_date?: string | null
          category?: string | null
          color?: string | null
          user_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      funds_transfer: {
        Row: {
          id: string
          funds_transfer_date: string | null
          funds_transfer_details: string | null
          funds_transfer_code: string | null
          account_id: string | null
          currency: string | null
          amount: number | null
          created_at: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          funds_transfer_date?: string | null
          funds_transfer_details?: string | null
          funds_transfer_code?: string | null
          account_id?: string | null
          currency?: string | null
          amount?: number | null
          created_at?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          funds_transfer_date?: string | null
          funds_transfer_details?: string | null
          funds_transfer_code?: string | null
          account_id?: string | null
          currency?: string | null
          amount?: number | null
          created_at?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funds_transfer_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funds_transfer_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          first_name: string
          last_name: string
          full_name: string | null
          avatar_url: string | null
          language: string | null
          app_theme: string | null
          notifications_enabled: boolean | null
          created_at: string | null
          updated_at: string | null
          subscription_type: string | null
        }
        Insert: {
          id: string
          first_name: string
          last_name: string
          avatar_url?: string | null
          language?: string | null
          app_theme?: string | null
          notifications_enabled?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          subscription_type?: string | null
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          avatar_url?: string | null
          language?: string | null
          app_theme?: string | null
          notifications_enabled?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          subscription_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      refunds: {
        Row: {
          id: string
          user_id: string | null
          refund_date: string
          refund_details: string | null
          account_id: string | null
          currency: string
          current_amount: number
          created_at: string | null
          updated_at: string | null
          refund_code: string | null
          initial_amount: number
        }
        Insert: {
          id?: string
          user_id?: string | null
          refund_date: string
          refund_details?: string | null
          account_id?: string | null
          currency?: string
          current_amount: number
          created_at?: string | null
          updated_at?: string | null
          refund_code?: string | null
          initial_amount?: number
        }
        Update: {
          id?: string
          user_id?: string | null
          refund_date?: string
          refund_details?: string | null
          account_id?: string | null
          currency?: string
          current_amount?: number
          created_at?: string | null
          updated_at?: string | null
          refund_code?: string | null
          initial_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "refunds_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      refund_transaction: {
        Row: {
          id: string
          refund_id: string
          transaction_id: string
          amount: number
          created_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          refund_id: string
          transaction_id: string
          amount: number
          created_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          refund_id?: string
          transaction_id?: string
          amount?: number
          created_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_transaction_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "refunds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_transaction_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_transaction_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      subcategories: {
        Row: {
          id: string
          user_id: string | null
          name: string
          total_amount: number
          transaction_count: number
          icon: string | null
          created_at: string | null
          updated_at: string | null
          category_id: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          total_amount?: number
          transaction_count?: number
          icon?: string | null
          created_at?: string | null
          updated_at?: string | null
          category_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          total_amount?: number
          transaction_count?: number
          icon?: string | null
          created_at?: string | null
          updated_at?: string | null
          category_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcategories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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
          created_at: string | null
          updated_at: string | null
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
          created_at?: string | null
          updated_at?: string | null
          current_amount: number
          subcategory_id?: string | null
          account_name?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
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
          created_at?: string | null
          updated_at?: string | null
          current_amount?: number
          subcategory_id?: string | null
          account_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}