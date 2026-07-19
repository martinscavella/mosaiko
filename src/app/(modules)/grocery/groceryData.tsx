'use client'

/**
 * Provider dati del modulo Grocery (template T6.3): scoped al modulo, fetch
 * al primo ingresso, un solo oggetto tipizzato.
 */

import { createModuleDataProvider } from '@/lib/moduleData'

export type GroceryUnit = 'pezzo' | 'kg' | 'g' | 'litro' | 'ml' | 'confezione'

export const GROCERY_UNITS: GroceryUnit[] = ['pezzo', 'kg', 'g', 'litro', 'ml', 'confezione']

export interface GroceryItem {
  id: string
  name: string
  unit: GroceryUnit
  category: string | null
  current_quantity: number
  min_quantity: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ShoppingListEntry {
  id: string
  item_id: string | null
  name: string
  quantity: number | null
  unit: string | null
  is_checked: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ReceiptLine {
  id: string
  transaction_id: string
  item_id: string
  quantity: number
  unit_price: number
  created_at: string
}

export interface GroceryData {
  items: GroceryItem[]
  shoppingList: ShoppingListEntry[]
  receiptLines: ReceiptLine[]
}

export const { Provider: GroceryDataProvider, useModuleData: useGroceryData } =
  createModuleDataProvider<GroceryData>({
    moduleId: 'grocery',
    fetchData: async (supabase, userId) => {
      const [items, shoppingList, receiptLines] = await Promise.all([
        supabase.from('grocery_items').select('*').eq('user_id', userId).order('name'),
        supabase.from('grocery_shopping_list').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('grocery_receipt_lines').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ])

      const firstError = [items, shoppingList, receiptLines].map(r => r.error).find(Boolean)
      if (firstError) throw firstError

      return {
        items: (items.data ?? []) as GroceryItem[],
        shoppingList: (shoppingList.data ?? []) as ShoppingListEntry[],
        receiptLines: (receiptLines.data ?? []) as ReceiptLine[],
      }
    },
  })
