export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
        }
      }
      transactions: {
        Row: {
          id: string
          created_at: string
          user_id: string
          description: string
          amount: number
          category_id: string | null
          date: string
          type: 'income' | 'expense'
        }
      }
      categories: {
        Row: {
          id: string
          created_at: string
          user_id: string
          name: string
          icon: string
          color: string
        }
      }
    }
  }
}
