'use client'

import { GroceryDataProvider } from './groceryData'

// I dati Grocery si caricano solo quando l'utente entra nel modulo (T6.3)
export default function GroceryLayout({ children }: { children: React.ReactNode }) {
  return <GroceryDataProvider>{children}</GroceryDataProvider>
}
