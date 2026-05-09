'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/lib/auth'
import { useAllTransactions, useFinanceCache } from '@/lib/financeCache'
import { DollarSign, Calendar, FileText, Tag, CreditCard, TrendingUp, TrendingDown, ArrowRightLeft, Check, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import Modal, { ModalButton } from './Modal'

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
  transactions?: { count: number }[]
}

interface Subcategory {
  id: string
  name: string
  icon?: string
  category_id: string
}

interface NewTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  prefilledData?: {
    account_id?: string
    transaction_type?: string
    amount?: string
    transaction_details?: string
    transaction_date?: string
    category_id?: string
    subcategory_id?: string
    transaction_note?: string
    is_refunded?: boolean
  }
}

type TransactionType = 'Abbonamento' | 'Acquisto' | 'AZIONE' | 'Bonifico' | 'Buono fruttifero' | 'Cancellazione rimborso' | 'Commissione' | 'Competenze' | 'Delivery' | 'Eccesso Rimborso' | 'Entrata' | 'ETF' | 'Imposte' | 'Iscrizione' | 'Ordine' | 'Prelievo' | 'Quattordicesima' | 'Rata' | 'Refund' | 'Ricarica' | 'Spesa' | 'Stipendio' | 'TFR' | 'Tredicesima'

export default function NewTransactionModal({ isOpen, onClose, onSuccess, prefilledData }: NewTransactionModalProps) {
  const { user } = useAuth()
  const { refetch } = useAllTransactions()
  const { refetch: refetchFinanceCache } = useFinanceCache()
  const [loading, setLoading] = useState(false)
  const [refetchError, setRefetchError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  
  // Form state
  const [formData, setFormData] = useState({
    transaction_details: '',
    amount: '',
    account_id: '',
    category_id: '',
    subcategory_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_type: 'Spesa' as TransactionType,
    transaction_note: '',
    is_refunded: false
  })

  // Carica dati iniziali
  const loadInitialData = useCallback(async () => {
    if (!user) return

    try {
      const supabase = createClientComponentClient()
      
      // Carica accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, name, type, current_balance')
        .eq('user_id', user.id)
        .order('name')

      // Carica categorie ordinate per utilizzo (più utilizzate prima)
      const { data: categoriesData } = await supabase
        .from('categories')
        .select(`
          id, 
          name, 
          icon,
          transactions:transactions(count)
        `)
        .eq('user_id', user.id)

      // Carica sottocategorie
      const { data: subcategoriesData } = await supabase
        .from('subcategories')
        .select('id, name, icon, category_id')
        .eq('user_id', user.id)
        .order('name')

      setAccounts(accountsData?.filter(account => account.current_balance > 0).sort((a, b) => b.current_balance - a.current_balance) || [])
      
      // Ordina le categorie per numero di utilizzi (più utilizzate prima), poi per nome
      const sortedCategories = (categoriesData || []).sort((a, b) => {
        const aCount = a.transactions?.[0]?.count || 0
        const bCount = b.transactions?.[0]?.count || 0
        if (bCount !== aCount) {
          return bCount - aCount // Ordine decrescente per utilizzi
        }
        return a.name.localeCompare(b.name) // Ordine alfabetico per nome come fallback
      })
      
      setCategories(sortedCategories)
      setSubcategories(subcategoriesData || [])
    } catch (error) {
      console.error('Error loading initial data:', error)
    }
  }, [user])

  useEffect(() => {
    if (isOpen && user) {
      loadInitialData()
    }
  }, [isOpen, user, loadInitialData])

  // Account filtrati per saldo disponibile
  const filteredAccounts = useMemo(() => {
    return accounts
  }, [accounts])

  // Reset form quando si apre/chiude
  useEffect(() => {
    if (isOpen) {
      setRefetchError(null)
      setFormData({
        transaction_details: prefilledData?.transaction_details || '',
        amount: prefilledData?.amount || '',
        account_id: prefilledData?.account_id || (filteredAccounts.length > 0 ? filteredAccounts[0].id : ''),
        category_id: prefilledData?.category_id || '',
        subcategory_id: prefilledData?.subcategory_id || '',
        transaction_date: prefilledData?.transaction_date || new Date().toISOString().split('T')[0],
        transaction_type: (prefilledData?.transaction_type as TransactionType) || 'Spesa',
        transaction_note: prefilledData?.transaction_note || '',
        is_refunded: prefilledData?.is_refunded || false
      })
    }
  }, [isOpen, filteredAccounts, prefilledData])

  // Sottocategorie filtrate per categoria selezionata
  const filteredSubcategories = useMemo(() => {
    if (!formData.category_id) return []
    return subcategories.filter(sub => sub.category_id === formData.category_id)
  }, [subcategories, formData.category_id])

  // Reset sottocategoria quando cambia categoria
  useEffect(() => {
    if (formData.category_id && filteredSubcategories.length > 0 && 
        !filteredSubcategories.find(sub => sub.id === formData.subcategory_id)) {
      setFormData(prev => ({ ...prev, subcategory_id: '' }))
    }
  }, [formData.category_id, filteredSubcategories, formData.subcategory_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !formData.transaction_details || !formData.amount || !formData.account_id) {
      return
    }

    const amount = parseFloat(formData.amount)
    
    const positiveTypes = ['Entrata', 'Stipendio', 'Quattordicesima', 'Tredicesima', 'TFR', 'Ricarica', 'Refund', 'Eccesso Rimborso', 'Cancellazione rimborso']
    const isNegativeTransaction = !positiveTypes.includes(formData.transaction_type)
    const selectedAccount = accounts.find(acc => acc.id === formData.account_id)
    
    if (isNegativeTransaction && selectedAccount && Math.abs(amount) > selectedAccount.current_balance) {
      alert(`Saldo insufficiente! L'account ${selectedAccount.name} ha solo €${selectedAccount.current_balance.toFixed(2)} disponibili, ma stai cercando di spendere €${Math.abs(amount).toFixed(2)}.`)
      return
    }

    setLoading(true)
    setRefetchError(null)

    try {
      const supabase = createClientComponentClient()
      
      const finalAmount = positiveTypes.includes(formData.transaction_type) 
        ? Math.abs(amount) 
        : -Math.abs(amount)
      
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          transaction_details: formData.transaction_details,
          current_amount: finalAmount,
          initial_amount: finalAmount,
          account_id: formData.account_id,
          category_id: formData.category_id || null,
          subcategory_id: formData.subcategory_id || null,
          transaction_date: formData.transaction_date,
          transaction_type: formData.transaction_type,
          transaction_note: formData.transaction_note || null,
          is_refunded: formData.is_refunded,
          currency: 'EUR'
        })

      if (error) throw error

      // FIX: se il refetch fallisce, il modal NON si chiude e mostra un messaggio di errore.
      // La transazione è già stata salvata, ma l'utente viene informato che la cache
      // non si è aggiornata e può ricaricare manualmente.
      try {
        await Promise.all([
          refetch(),
          refetchFinanceCache()
        ])
        // Refetch riuscito: chiudi il modal
        onSuccess?.()
        onClose()
      } catch (refetchErr) {
        const message = refetchErr instanceof Error ? refetchErr.message : 'Errore sconosciuto'
        setRefetchError(
          `Transazione salvata con successo, ma l'aggiornamento della cache ha avuto un problema: ${message}. Ricarica la pagina per vedere i dati aggiornati.`
        )
        // Non chiudiamo il modal: l'utente vede il messaggio e può decidere cosa fare
      }
    } catch (error) {
      console.error('Error creating transaction:', error)
      alert('Errore durante la creazione della transazione')
    } finally {
      setLoading(false)
    }
  }

  const getTransactionTypeIcon = (type: string) => {
    const positiveTypes = ['Entrata', 'Stipendio', 'Quattordicesima', 'Tredicesima', 'TFR', 'Ricarica', 'Refund', 'Eccesso Rimborso', 'Cancellazione rimborso']
    const investmentTypes = ['AZIONE', 'ETF', 'Buono fruttifero']
    const transferTypes = ['Bonifico', 'Prelievo']
    
    if (positiveTypes.includes(type)) {
      return <TrendingUp className="w-5 h-5 text-green-600" />
    } else if (investmentTypes.includes(type)) {
      return <TrendingUp className="w-5 h-5 text-blue-600" />
    } else if (transferTypes.includes(type)) {
      return <ArrowRightLeft className="w-5 h-5 text-purple-600" />
    } else {
      return <TrendingDown className="w-5 h-5 text-red-600" />
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuova Transazione"
      subtitle="Aggiungi una nuova operazione finanziaria"
      size="lg"
      footer={
        <>
          <ModalButton
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Annulla
          </ModalButton>
          <button
            type="submit"
            form="new-transaction-form"
            disabled={loading || !formData.transaction_details || !formData.amount || !formData.account_id}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150 active:scale-95',
              loading || !formData.transaction_details || !formData.amount || !formData.account_id
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Caricamento...
              </span>
            ) : (
              'Crea Transazione'
            )}
          </button>
        </>
      }
    >
      <form id="new-transaction-form" onSubmit={handleSubmit} className="space-y-6">

        {/* Banner di errore refetch - visibile solo se il refetch fallisce dopo il salvataggio */}
        {refetchError && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">⚠️ Attenzione</p>
            <p>{refetchError}</p>
          </div>
        )}

            {/* Prima riga - 2 colonne su desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tipo di transazione */}
              <div className="space-y-3">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <div className="p-2 rounded-lg bg-blue-100 mr-3">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  Tipo di Transazione *
                </label>
                <div className="relative">
                  <select
                    value={formData.transaction_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, transaction_type: e.target.value as typeof formData.transaction_type }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white hover:bg-gray-50 text-gray-900 font-medium"
                    required
                  >
                    <option value="Abbonamento">🔄 Abbonamento</option>
                    <option value="Acquisto">🛒 Acquisto</option>
                    <option value="AZIONE">📈 AZIONE</option>
                    <option value="Bonifico">🏦 Bonifico</option>
                    <option value="Buono fruttifero">🏛️ Buono fruttifero</option>
                    <option value="Cancellazione rimborso">❌ Cancellazione rimborso</option>
                    <option value="Commissione">💳 Commissione</option>
                    <option value="Competenze">🎯 Competenze</option>
                    <option value="Delivery">🚚 Delivery</option>
                    <option value="Eccesso Rimborso">💰 Eccesso Rimborso</option>
                    <option value="Entrata">💸 Entrata</option>
                    <option value="ETF">📊 ETF</option>
                    <option value="Imposte">🏛️ Imposte</option>
                    <option value="Iscrizione">📝 Iscrizione</option>
                    <option value="Ordine">📋 Ordine</option>
                    <option value="Prelievo">🏧 Prelievo</option>
                    <option value="Quattordicesima">💰 Quattordicesima</option>
                    <option value="Rata">💳 Rata</option>
                    <option value="Refund">💰 Refund</option>
                    <option value="Ricarica">🔋 Ricarica</option>
                    <option value="Spesa">💸 Spesa</option>
                    <option value="Stipendio">💼 Stipendio</option>
                    <option value="TFR">💰 TFR</option>
                    <option value="Tredicesima">💰 Tredicesima</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <div className="flex items-center space-x-2">
                      {getTransactionTypeIcon(formData.transaction_type)}
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Importo */}
              <div className="space-y-3">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <div className="p-2 rounded-lg bg-yellow-100 mr-3">
                    <DollarSign className="w-4 h-4 text-yellow-600" />
                  </div>
                  Importo (€) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white hover:bg-gray-50 text-gray-900 placeholder-gray-400"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            {/* Descrizione */}
            <div className="space-y-3">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <div className="p-2 rounded-lg bg-green-100 mr-3">
                  <FileText className="w-4 h-4 text-green-600" />
                </div>
                Descrizione *
              </label>
              <input
                type="text"
                value={formData.transaction_details}
                onChange={(e) => setFormData(prev => ({ ...prev, transaction_details: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white hover:bg-gray-50 text-gray-900 placeholder-gray-400"
                placeholder="Descrivi la transazione..."
                required
              />
            </div>

            {/* Seconda riga */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Account */}
              <div className="space-y-3">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <div className="p-2 rounded-lg bg-indigo-100 mr-3">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                  </div>
                  Account *
                </label>
                <div className="relative">
                  <select
                    value={formData.account_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, account_id: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white hover:bg-gray-50 text-gray-900"
                    required
                  >
                    <option value="">Seleziona account</option>
                    {filteredAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} (€{account.current_balance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Data */}
              <div className="space-y-3">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <div className="p-2 rounded-lg bg-pink-100 mr-3">
                    <Calendar className="w-4 h-4 text-pink-600" />
                  </div>
                  Data *
                </label>
                <input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white hover:bg-gray-50 text-gray-900"
                  required
                />
              </div>
            </div>

            {/* Terza riga */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Categoria */}
              <div className="space-y-3">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <div className="p-2 rounded-lg bg-cyan-100 mr-3">
                    <Tag className="w-4 h-4 text-cyan-600" />
                  </div>
                  Categoria
                </label>
                <div className="relative">
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white hover:bg-gray-50 text-gray-900"
                  >
                    <option value="">Nessuna categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon ? `${category.icon} ` : ''}{category.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Sottocategoria */}
              {formData.category_id && filteredSubcategories.length > 0 ? (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <div className="p-2 rounded-lg bg-teal-100 mr-3">
                      <Tag className="w-4 h-4 text-teal-600" />
                    </div>
                    Sottocategoria
                  </label>
                  <div className="relative">
                    <select
                      value={formData.subcategory_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, subcategory_id: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white hover:bg-gray-50 text-gray-900"
                    >
                      <option value="">Seleziona sottocategoria</option>
                      {filteredSubcategories.map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.id}>
                          {subcategory.icon ? `${subcategory.icon} ` : ''}{subcategory.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              ) : (
                <div />
              )}
            </div>

            {/* È stato rimborsato? */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div 
                  className={`relative w-6 h-6 rounded-md cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105 ${
                    formData.is_refunded 
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 border-2 border-amber-400 shadow-lg shadow-amber-200' 
                      : 'bg-white border-2 border-amber-300 hover:border-amber-400'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, is_refunded: !prev.is_refunded }))}
                >
                  <input
                    type="checkbox"
                    id="is-refunded"
                    checked={formData.is_refunded}
                    onChange={() => {}}
                    className="sr-only"
                  />
                  <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                    formData.is_refunded ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                  }`}>
                    <Check className="w-4 h-4 text-white drop-shadow-sm" />
                  </div>
                </div>
                <label 
                  htmlFor="is-refunded" 
                  className="flex items-center text-sm font-medium text-amber-800 cursor-pointer"
                  onClick={() => setFormData(prev => ({ ...prev, is_refunded: !prev.is_refunded }))}
                >
                  È stato rimborsato?
                </label>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-3">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <div className="p-2 rounded-lg bg-gray-100 mr-3">
                  <FileText className="w-4 h-4 text-gray-600" />
                </div>
                Note aggiuntive
              </label>
              <textarea
                value={formData.transaction_note}
                onChange={(e) => setFormData(prev => ({ ...prev, transaction_note: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white hover:bg-gray-50 text-gray-900 placeholder-gray-400 resize-none"
                rows={3}
                placeholder="Note opzionali..."
              />
            </div>
        </form>
      </Modal>
    )
  }
