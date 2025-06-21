'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useAccounts } from '@/lib/financeCache'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import NewTransactionModal from './NewTransactionModal'
import { Wallet } from 'lucide-react'

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
  emoji: string
  transaction_type: string
  typical_amount?: number
  category: string
  subcategory?: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'padel',
    label: 'Padel',
    emoji: '🎾',
    transaction_type: 'Spesa',
    typical_amount: -10,
    category: 'Sport',
    subcategory: 'Padel'
  },
  {
    id: 'calcio',
    label: 'Calcio',
    emoji: '⚽️',
    transaction_type: 'Spesa',
    typical_amount: -5,
    category: 'Sport',
    subcategory: 'Calcio'
  },
/*   {
    id: 'food',
    label: 'Pranzo',
    emoji: '🍽️',
    transaction_type: 'Spesa',
    typical_amount: -15,
    category: 'Cibo & Bevande',
    subcategory: 'Ristorante'
  }, */
  {
    id: 'other',
    label: 'Altro',
    emoji: '💰',
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
  const [prefilledData, setPrefilledData] = useState<any>(null)
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
        transaction_details: action.label + ": ",
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

  if (!cashAccount) {
    return (
      <div className="bg-amber-50/95 backdrop-blur-xl border border-amber-200/50 shadow-xl rounded-2xl p-6 mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-900 tracking-tight">
              Account Contanti Non Trovato
            </h3>
            <p className="text-sm text-amber-700 font-medium">
              Crea un account di tipo "Contanti" per utilizzare le quick actions
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                Quick Actions Contanti
              </h3>
              <p className="text-sm text-gray-600 font-medium">
                Registra velocemente le tue spese in contanti
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Saldo</p>
            <p className={`text-lg font-bold ${cashAccount.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              €{cashAccount.current_balance.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              disabled={isLoading}
              className="group relative overflow-hidden bg-gradient-to-br from-gray-50/80 to-white/40 hover:from-blue-50/80 hover:to-purple-50/40 border border-gray-200/60 hover:border-blue-200/80 rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Background decoration */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-purple-50/0 group-hover:from-blue-50/20 group-hover:to-purple-50/20 transition-all duration-300 rounded-xl"></div>
              
              <div className="relative flex flex-col items-center space-y-2">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-blue-100 group-hover:to-purple-100 rounded-xl transition-all duration-300 group-hover:scale-110">
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span className="text-lg group-hover:scale-110 transition-transform duration-300">
                      {action.emoji}
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                    {action.label}
                  </p>
                  {action.typical_amount && (
                    <p className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                      ~ {action.typical_amount} €
                    </p>
                  )}
                </div>
              </div>
              
              {/* Subtle animation overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-all duration-700 ease-out"></div>
            </button>
          ))}
        </div>

        {/* Indicatore account */}
        <div className="mt-4 pt-4 border-t border-gray-200/60">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600 font-medium">
                Account collegato: <span className="text-gray-900 font-semibold">{cashAccount.name}</span>
              </span>
            </div>
            <div className="text-gray-500 text-xs">
              {isLoading ? 'Caricamento...' : 'Tap per registrare velocemente'}
            </div>
          </div>
        </div>
      </div>

      {/* Modal per nuova transazione con dati precompilati */}
      <NewTransactionModal
        isOpen={showNewTransactionModal}
        onClose={handleModalClose}
        onSuccess={handleModalClose}
        prefilledData={prefilledData}
      />
    </>
  )
}
