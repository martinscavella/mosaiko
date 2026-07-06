'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useAccounts } from '@/lib/financeCache'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import NewTransactionModal from './NewTransactionModal'
import { Wallet, Dumbbell, Trophy, Coins, LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'

interface Account {
  id: string
  name: string
  type: string
  current_balance: number
}

interface Category {
  id: string
  name: string
  icon?: string
}

interface Subcategory {
  id: string
  name: string
  category_id: string
}

interface QuickAction {
  id: string
  label: string
  description?: string
  icon: LucideIcon
  transaction_type: string
  typical_amount?: number
  category: string
  subcategory?: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'padel',
    label: 'Padel',
    description: 'Padel: ',
    icon: Dumbbell,
    transaction_type: 'Spesa',
    typical_amount: -10,
    category: 'Sport',
    subcategory: 'Padel'
  },
  {
    id: 'calcio',
    label: 'Calcio',
    description: 'Calcio: ',
    icon: Trophy,
    transaction_type: 'Spesa',
    typical_amount: -5,
    category: 'Sport',
    subcategory: 'Calcio'
  },
  {
    id: 'other',
    label: 'Altro',
    description: '',
    icon: Coins,
    transaction_type: 'Spesa',
    category: ''
  }
]

export default function CashQuickActions() {
  const { user } = useAuth()
  const { accounts } = useAccounts()
  const [cashAccount, setCashAccount] = useState<Account | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false)
  interface PrefilledData {
    account_id: string
    transaction_type: string
    amount: string
    transaction_details: string
    transaction_date: string
    category_id: string
    subcategory_id: string
  }

  const [prefilledData, setPrefilledData] = useState<PrefilledData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Trova l'account contanti con logica migliorata
    if (accounts.length > 0) {
      let cash = accounts.find((account: Account) => account.type === 'cash')
      
      if (!cash) {
        // Se non trova account di tipo 'cash', cerca per nome
        cash = accounts.find((account: Account) => 
          account.name.toLowerCase().includes('contanti') ||
          account.name.toLowerCase().includes('cash') ||
          account.name.toLowerCase().includes('contante')
        )
      }
      
      if (!cash) {
        // Come fallback, prende il primo account disponibile
        cash = accounts[0]
      }
      
      setCashAccount(cash || null)
    }
  }, [accounts])

  // Carica le categorie e sottocategorie quando il componente viene montato
  useEffect(() => {
    const loadCategoriesAndSubcategories = async () => {
      if (!user) return

      try {
        // Carica le categorie
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('id, name, icon')
          .eq('user_id', user.id)
          .order('name')

        setCategories(categoriesData || [])

        // Carica le sottocategorie
        const { data: subcategoriesData } = await supabase
          .from('subcategories')
          .select('id, name, category_id')
          .eq('user_id', user.id)
          .order('name')

        setSubcategories(subcategoriesData || [])
      } catch (error) {
        console.error('Error loading categories and subcategories:', error)
      }
    }

    loadCategoriesAndSubcategories()
  }, [user, supabase])

  const findCategoryId = (categoryName: string): string => {
    if (!categoryName) return ''
    
    // Cerca match esatto
    let category = categories.find(cat => 
      cat.name.toLowerCase() === categoryName.toLowerCase()
    )
    
    // Se non trova match esatto, cerca match parziale
    if (!category) {
      category = categories.find(cat => 
        cat.name.toLowerCase().includes(categoryName.toLowerCase()) ||
        categoryName.toLowerCase().includes(cat.name.toLowerCase())
      )
    }
    
    return category?.id || ''
  }

  const findSubcategoryId = (subcategoryName: string, categoryId: string): string => {
    if (!subcategoryName || !categoryId) return ''
    
    // Cerca prima nella categoria specifica
    let subcategory = subcategories.find(sub => 
      sub.category_id === categoryId && 
      sub.name.toLowerCase() === subcategoryName.toLowerCase()
    )
    
    // Se non trova match esatto, cerca match parziale nella categoria
    if (!subcategory) {
      subcategory = subcategories.find(sub => 
        sub.category_id === categoryId && (
          sub.name.toLowerCase().includes(subcategoryName.toLowerCase()) ||
          subcategoryName.toLowerCase().includes(sub.name.toLowerCase())
        )
      )
    }
    
    return subcategory?.id || ''
  }

  const handleQuickAction = async (action: QuickAction) => {
    if (!cashAccount) {
      alert('Nessun account contanti trovato. Crea prima un account di tipo "Contanti".')
      return
    }

    if (isLoading) return

    setIsLoading(true)

    try {
      // Trova la categoria
      const categoryId = findCategoryId(action.category)
      
      // Trova la sottocategoria se specificata
      let subcategoryId = ''
      if (action.subcategory && categoryId) {
        subcategoryId = findSubcategoryId(action.subcategory, categoryId)
      }

      // Pre-compila i dati per il modal
      setPrefilledData({
        account_id: cashAccount.id,
        transaction_type: action.transaction_type,
        amount: action.typical_amount?.toString() || '',
        transaction_details: action.description || '',
        transaction_date: new Date().toISOString().split('T')[0],
        category_id: categoryId,
        subcategory_id: subcategoryId
      })
      
      setShowNewTransactionModal(true)
    } catch (error) {
      console.error('Error in handleQuickAction:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleModalClose = () => {
    setShowNewTransactionModal(false)
    setPrefilledData(null)
  }

  if (!user) {
    return null
  }

  // Account non trovato
  if (!cashAccount) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-amber-900">Account Contanti Non Trovato</h3>
            <p className="text-sm text-amber-700">Crea un account di tipo "Contanti"</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-green-100 text-green-600">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Quick Actions</h3>
              <p className="text-sm text-gray-500">Registra spese contanti</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Saldo</p>
            <p className={clsx(
              'text-lg font-semibold tabular-nums',
              cashAccount.current_balance >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              €{cashAccount.current_balance.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Quick actions grid */}
        <div className="grid grid-cols-3 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              disabled={isLoading}
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-all duration-150 disabled:opacity-50 active:scale-95"
            >
              <action.icon className="w-6 h-6 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">{action.label}</span>
              {action.typical_amount && (
                <span className="text-xs text-gray-500">{action.typical_amount}€</span>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>{cashAccount.name}</span>
          </div>
          <span>{isLoading ? 'Caricamento...' : 'Tap per registrare'}</span>
        </div>
      </div>

      <NewTransactionModal
        isOpen={showNewTransactionModal}
        onClose={handleModalClose}
        onSuccess={handleModalClose}
        prefilledData={prefilledData || {}}
      />
    </>
  )
}
