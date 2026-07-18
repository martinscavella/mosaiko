'use client'

import { HouseDataProvider } from './houseData'

// I dati House si caricano solo quando l'utente entra nel modulo (T6.3)
export default function HouseLayout({ children }: { children: React.ReactNode }) {
  return <HouseDataProvider>{children}</HouseDataProvider>
}
