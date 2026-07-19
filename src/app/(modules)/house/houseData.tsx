'use client'

/**
 * Provider dati del modulo House — primo utilizzo del template T6.3
 * (docs/guides/MODULE_DATA_PROVIDER.md): scoped al modulo, fetch quando
 * l'utente entra, un solo oggetto tipizzato con i dati del modulo.
 */

import { createModuleDataProvider } from '@/lib/moduleData'

export interface HouseProperty {
  id: string
  name: string
  address: string | null
  type: 'casa' | 'appartamento' | 'box' | 'terreno' | 'altro'
  is_primary: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface HouseBill {
  id: string
  property_id: string
  utility_type: 'luce' | 'gas' | 'acqua' | 'internet' | 'telefono' | 'rifiuti' | 'condominio' | 'altro'
  provider_name: string | null
  amount: number
  consumption: number | null
  consumption_unit: string | null
  period_start: string | null
  period_end: string | null
  due_date: string | null
  status: 'da_pagare' | 'pagata'
  attachment_path: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface HouseMaintenance {
  id: string
  property_id: string
  title: string
  kind: 'periodica' | 'straordinaria'
  interval_months: number | null
  last_done_date: string | null
  next_due_date: string | null
  cost: number | null
  contact_id: string | null
  attachment_path: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface HouseContact {
  id: string
  name: string
  role: string | null
  phone: string | null
  email: string | null
  notes: string | null
}

export interface HouseHousing {
  id: string
  property_id: string
  kind: 'affitto' | 'mutuo'
  monthly_amount: number
  due_day: number | null
  start_date: string | null
  end_date: string | null
  notes: string | null
}

export interface HouseInventoryItem {
  id: string
  property_id: string
  name: string
  category: string | null
  purchase_date: string | null
  warranty_until: string | null
  value: number | null
  attachment_path: string | null
  notes: string | null
}

export interface BillPayment {
  id: string
  bill_id: string
  transaction_id: string
  amount: number | null
  created_at: string
}

export interface HouseData {
  properties: HouseProperty[]
  bills: HouseBill[]
  billPayments: BillPayment[]
  maintenances: HouseMaintenance[]
  contacts: HouseContact[]
  housing: HouseHousing[]
  inventory: HouseInventoryItem[]
}

export const { Provider: HouseDataProvider, useModuleData: useHouseData } =
  createModuleDataProvider<HouseData>({
    moduleId: 'house',
    fetchData: async (supabase, userId) => {
      const [properties, bills, billPayments, maintenances, contacts, housing, inventory] = await Promise.all([
        supabase.from('house_properties').select('*').eq('user_id', userId).order('is_primary', { ascending: false }).order('name'),
        supabase.from('house_bills').select('*').eq('user_id', userId).order('due_date', { ascending: false }),
        supabase.from('bill_payments').select('*').eq('user_id', userId),
        supabase.from('house_maintenances').select('*').eq('user_id', userId).order('next_due_date', { ascending: true }),
        supabase.from('house_contacts').select('*').eq('user_id', userId).order('name'),
        supabase.from('house_housing').select('*').eq('user_id', userId),
        supabase.from('house_inventory_items').select('*').eq('user_id', userId).order('name'),
      ])

      const firstError = [properties, bills, billPayments, maintenances, contacts, housing, inventory]
        .map(r => r.error).find(Boolean)
      if (firstError) throw firstError

      return {
        properties: (properties.data ?? []) as HouseProperty[],
        bills: (bills.data ?? []) as HouseBill[],
        billPayments: (billPayments.data ?? []) as BillPayment[],
        maintenances: (maintenances.data ?? []) as HouseMaintenance[],
        contacts: (contacts.data ?? []) as HouseContact[],
        housing: (housing.data ?? []) as HouseHousing[],
        inventory: (inventory.data ?? []) as HouseInventoryItem[],
      }
    },
  })
