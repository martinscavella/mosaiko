'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/lib/auth'
import { useAllTransactions, useFinanceCache, useAssets, useAssetOperations, type Transaction } from '@/lib/financeCache'
import { DollarSign, Calendar, FileText, Tag, CreditCard, TrendingUp, TrendingDown, ArrowRightLeft, Check, ChevronDown, Hash, Package } from 'lucide-react'
import clsx from 'clsx'
import Modal, { ModalButton } from './Modal'
import {
  TRANSACTION_TYPE_VALUES,
  ASSET_TRANSACTION_TYPES,
  DEFAULT_TRANSACTION_TYPE,
  isPositiveTransactionType,
  transactionTypeKind,
  type TransactionType,
} from '@/lib/transactionTypes'

interface Account {
  id: string
  name: string
  type: string
  current_balance: number
  is_active: boolean
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
  /** Se presente, il modale lavora in modalità modifica su questa transazione */
  editTransaction?: Transaction | null
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

export default function NewTransactionModal({ isOpen, onClose, onSuccess, editTransaction, prefilledData }: NewTransactionModalProps) {
  const { user } = useAuth()
  const { refetch } = useAllTransactions()
  const { refetch: refetchFinanceCache } = useFinanceCache()
  const { assets } = useAssets()
  const { recalcAssetQuantity } = useAssetOperations()
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])

  const isEditMode = !!editTransaction

  // Form state
  const [formData, setFormData] = useState({
    transaction_details: '',
    amount: '',
    account_id: '',
    category_id: '',
    subcategory_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_type: DEFAULT_TRANSACTION_TYPE as TransactionType,
    transaction_note: '',
    transaction_code: '',
    currency: 'EUR',
    asset_quantity: '',
    asset_id: '',
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
        .select('id, name, type, current_balance, is_active')
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

      // In modifica servono tutti gli account attivi + quello già assegnato alla
      // transazione (può avere saldo 0 o essere nel frattempo stato disattivato).
      // In creazione, gli account disattivati non sono selezionabili.
      const usableAccounts = isEditMode
        ? (accountsData || []).filter(account => account.is_active || account.id === editTransaction?.account_id)
        : (accountsData || []).filter(account => account.is_active && account.current_balance > 0)
      setAccounts(usableAccounts.sort((a, b) => b.current_balance - a.current_balance))
      
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

      // Nota: l'account di default verrà impostato dal useEffect che dipende da filteredAccounts
    } catch (error) {
      console.error('Error loading initial data:', error)
    }
  }, [user, isEditMode, editTransaction?.account_id])

  useEffect(() => {
    if (isOpen && user) {
      loadInitialData()
    }
  }, [isOpen, user, loadInitialData])

  // Account filtrati per saldo disponibile (solo quelli con saldo > 0, ordinati per saldo decrescente)
  const filteredAccounts = useMemo(() => {
    return accounts
  }, [accounts])

  // Reset form quando si apre/chiude (in modifica precompila dalla transazione)
  useEffect(() => {
    if (!isOpen) return

    if (editTransaction) {
      setFormData({
        transaction_details: editTransaction.transaction_details || '',
        amount: Math.abs(editTransaction.initial_amount ?? editTransaction.current_amount).toString(),
        account_id: editTransaction.account_id || '',
        category_id: editTransaction.category_id || '',
        subcategory_id: editTransaction.subcategory_id || '',
        transaction_date: editTransaction.transaction_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        transaction_type: (editTransaction.transaction_type as TransactionType) || DEFAULT_TRANSACTION_TYPE,
        transaction_note: editTransaction.transaction_note || '',
        transaction_code: editTransaction.transaction_code || '',
        currency: editTransaction.currency || 'EUR',
        // Passa da Number() prima di stringificare: se asset_quantity arriva dal
        // DB come stringa non nel formato atteso da <input type="number"> (es.
        // virgola decimale, spazi), il browser scarta silenziosamente il value
        // e mostra il placeholder invece del dato. Number() normalizza sempre
        // al formato con punto decimale che l'input accetta.
        asset_quantity: editTransaction.asset_quantity != null && !Number.isNaN(Number(editTransaction.asset_quantity))
          ? String(Number(editTransaction.asset_quantity))
          : '',
        asset_id: editTransaction.asset_id || '',
        is_refunded: editTransaction.is_refunded || false
      })
      return
    }

    setFormData({
      transaction_details: prefilledData?.transaction_details || '',
      amount: prefilledData?.amount || '',
      account_id: prefilledData?.account_id || (filteredAccounts.length > 0 ? filteredAccounts[0].id : ''),
      category_id: prefilledData?.category_id || '',
      subcategory_id: prefilledData?.subcategory_id || '',
      transaction_date: prefilledData?.transaction_date || new Date().toISOString().split('T')[0],
      transaction_type: (prefilledData?.transaction_type as TransactionType) || DEFAULT_TRANSACTION_TYPE,
      transaction_note: prefilledData?.transaction_note || '',
      transaction_code: '',
      currency: 'EUR',
      asset_quantity: '',
      asset_id: '',
      is_refunded: prefilledData?.is_refunded || false
    })
  }, [isOpen, filteredAccounts, prefilledData, editTransaction])

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

  // Un asset collegato senza quantità non produce nessun dato da sommare: il
  // ricalcolo automatico della quantità dell'asset lo salterebbe silenziosamente.
  const isAssetLinkMissingQuantity = !!formData.asset_id && formData.asset_quantity === ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !formData.transaction_details || !formData.amount || !formData.account_id || isAssetLinkMissingQuantity) {
      return
    }

    const amount = parseFloat(formData.amount)

    // Controlla se l'account selezionato ha saldo sufficiente per transazioni negative
    const isNegativeTransaction = !isPositiveTransactionType(formData.transaction_type)
    const selectedAccount = accounts.find(acc => acc.id === formData.account_id)

    // Il controllo saldo vale solo in creazione: in modifica l'importo era già contabilizzato
    if (!isEditMode && isNegativeTransaction && selectedAccount && Math.abs(amount) > selectedAccount.current_balance) {
      alert(`Saldo insufficiente! L'account ${selectedAccount.name} ha solo €${selectedAccount.current_balance.toFixed(2)} disponibili, ma stai cercando di spendere €${Math.abs(amount).toFixed(2)}.`)
      return
    }

    setLoading(true)
    try {
      const supabase = createClientComponentClient()

      // Determina se l'importo è positivo o negativo in base al tipo di transazione
      const finalAmount = isPositiveTransactionType(formData.transaction_type)
        ? Math.abs(amount)
        : -Math.abs(amount)

      if (isEditMode && editTransaction) {
        // L'importo modificato aggiorna initial_amount; l'eventuale delta rimborsi
        // (current - initial) viene preservato sul nuovo importo
        const refundDelta = (editTransaction.current_amount ?? 0) - (editTransaction.initial_amount ?? editTransaction.current_amount ?? 0)

        const { error } = await supabase
          .from('transactions')
          .update({
            transaction_details: formData.transaction_details,
            current_amount: finalAmount + refundDelta,
            initial_amount: finalAmount,
            account_id: formData.account_id,
            category_id: formData.category_id || null,
            subcategory_id: formData.subcategory_id || null,
            transaction_date: formData.transaction_date,
            transaction_type: formData.transaction_type,
            transaction_note: formData.transaction_note || null,
            transaction_code: formData.transaction_code || null,
            is_refunded: formData.is_refunded,
            currency: formData.currency || 'EUR',
            asset_id: formData.asset_id || null,
            asset_quantity: formData.asset_quantity !== '' ? parseFloat(formData.asset_quantity) : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editTransaction.id)

        if (error) throw error

        // Il trigger DB non gestisce il cambio account: ricalcola i saldi
        // dal DB (fonte canonica) per gli account coinvolti
        const affectedAccounts = new Set([editTransaction.account_id, formData.account_id].filter(Boolean))
        for (const accountId of affectedAccounts) {
          const { error: recalcError } = await supabase.rpc('recalculate_current_balance_by_id', {
            account_id_param: accountId
          })
          if (recalcError) {
            console.error('Errore ricalcolo saldo account:', recalcError)
          }
        }
      } else {
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
            transaction_code: formData.transaction_code || null,
            is_refunded: formData.is_refunded,
            currency: formData.currency || 'EUR',
            asset_id: formData.asset_id || null,
            asset_quantity: formData.asset_quantity !== '' ? parseFloat(formData.asset_quantity) : null
          })

        if (error) throw error
      }

      // Ricalcola la quantità degli asset coinvolti: quello appena collegato
      // (se presente) e quello eventualmente scollegato in una modifica.
      const previousAssetId = editTransaction?.asset_id || null
      const currentAssetId = formData.asset_id || null
      const assetIdsToRecalc = new Set([currentAssetId, previousAssetId].filter((id): id is string => !!id))
      for (const assetId of assetIdsToRecalc) {
        await recalcAssetQuantity(assetId)
      }

      // Aggiorna cache e ricarica dati
      try {
        await Promise.all([
          refetch(),
          refetchFinanceCache()
        ])
      } catch (refetchError) {
        console.error('Errore durante l\'aggiornamento della cache:', refetchError)
        // Continua comunque - la transazione è stata salvata, anche se la cache non è aggiornata
      }

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error saving transaction:', error)
      alert(isEditMode ? 'Errore durante il salvataggio delle modifiche' : 'Errore durante la creazione della transazione')
    } finally {
      setLoading(false)
    }
  }

  const getTransactionTypeIcon = (type: string) => {
    switch (transactionTypeKind(type)) {
      case 'income':
        return <TrendingUp className="w-5 h-5 text-success-strong" />
      case 'investment':
        return <TrendingUp className="w-5 h-5 text-primary" />
      case 'transfer':
        return <ArrowRightLeft className="w-5 h-5 text-module-health" />
      default:
        return <TrendingDown className="w-5 h-5 text-danger" />
    }
  }



  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Modifica Transazione' : 'Nuova Transazione'}
      subtitle={isEditMode ? 'Aggiorna i dati della transazione' : 'Aggiungi una nuova operazione finanziaria'}
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
            disabled={loading || !formData.transaction_details || !formData.amount || !formData.account_id || isAssetLinkMissingQuantity}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150 active:scale-95',
              loading || !formData.transaction_details || !formData.amount || !formData.account_id || isAssetLinkMissingQuantity
                ? 'bg-inset text-ink-muted cursor-not-allowed'
                : 'bg-primary hover:bg-primary-hover text-white'
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
              isEditMode ? 'Salva Modifiche' : 'Crea Transazione'
            )}
          </button>
        </>
      }
    >
      <form id="new-transaction-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Prima riga - 2 colonne su desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tipo di transazione */}
              <div className="space-y-3">
                <label className="flex items-center text-sm font-medium text-ink-secondary">
                  <div className="p-2 rounded-lg bg-primary-subtle mr-3">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  Tipo di Transazione *
                </label>
                <div className="relative">
                  <select
                    value={formData.transaction_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, transaction_type: e.target.value as typeof formData.transaction_type }))}
                    className="w-full px-4 py-3 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all appearance-none bg-surface hover:bg-canvas text-ink font-medium"
                    required
                  >
                    {TRANSACTION_TYPE_VALUES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <div className="flex items-center space-x-2">
                      {getTransactionTypeIcon(formData.transaction_type)}
                      <ChevronDown className="w-4 h-4 text-ink-muted" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Importo */}
              <div className="space-y-3">
                <label className="flex items-center text-sm font-medium text-ink-secondary">
                  <div className="p-2 rounded-lg bg-primary-subtle mr-3">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  Importo (€) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-4 py-3 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface hover:bg-canvas text-ink placeholder-ink-muted"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            {/* Descrizione - sempre full width */}
            <div className="space-y-3">
              <label className="flex items-center text-sm font-medium text-ink-secondary">
                <div className="p-2 rounded-lg bg-inset mr-3">
                  <FileText className="w-4 h-4 text-ink-secondary" />
                </div>
                Descrizione *
              </label>
              <input
                type="text"
                value={formData.transaction_details}
                onChange={(e) => setFormData(prev => ({ ...prev, transaction_details: e.target.value }))}
                className="w-full px-4 py-3 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface hover:bg-canvas text-ink placeholder-ink-muted"
                placeholder="Descrivi la transazione..."
                required
              />
            </div>

            {/* Seconda riga - 2 colonne su desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Account */}
              <div className="space-y-3">
                <label className="flex items-center text-sm font-medium text-ink-secondary">
                  <div className="p-2 rounded-lg bg-inset mr-3">
                    <CreditCard className="w-4 h-4 text-ink-secondary" />
                  </div>
                  Account *
                </label>
                <div className="relative">
                  <select
                    value={formData.account_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, account_id: e.target.value }))}
                    className="w-full px-4 py-3 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all appearance-none bg-surface hover:bg-canvas text-ink"
                    required
                  >
                    <option value="">Seleziona account</option>
                    {filteredAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} (€{account.current_balance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                </div>
              </div>

              {/* Data */}
              <div className="space-y-3">
                <label className="flex items-center text-sm font-medium text-ink-secondary">
                  <div className="p-2 rounded-lg bg-inset mr-3">
                    <Calendar className="w-4 h-4 text-ink-secondary" />
                  </div>
                  Data *
                </label>
                <input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                  className="w-full px-4 py-3 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface hover:bg-canvas text-ink"
                  required
                />
              </div>
            </div>

            {/* Terza riga - 2 colonne su desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Categoria */}
              <div className="space-y-3">
                <label className="flex items-center text-sm font-medium text-ink-secondary">
                  <div className="p-2 rounded-lg bg-inset mr-3">
                    <Tag className="w-4 h-4 text-ink-secondary" />
                  </div>
                  Categoria
                </label>
                <div className="relative">
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                    className="w-full px-4 py-3 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all appearance-none bg-surface hover:bg-canvas text-ink"
                  >
                    <option value="">Nessuna categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon ? `${category.icon} ` : ''}{category.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                </div>
              </div>

              {/* Sottocategoria - sempre visibile se ci sono sottocategorie */}
              {formData.category_id && filteredSubcategories.length > 0 ? (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                  <label className="flex items-center text-sm font-medium text-ink-secondary">
                    <div className="p-2 rounded-lg bg-inset mr-3">
                      <Tag className="w-4 h-4 text-ink-secondary" />
                    </div>
                    Sottocategoria
                  </label>
                  <div className="relative">
                    <select
                      value={formData.subcategory_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, subcategory_id: e.target.value }))}
                      className="w-full px-4 py-3 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all appearance-none bg-surface hover:bg-canvas text-ink"
                    >
                      <option value="">Seleziona sottocategoria</option>
                      {filteredSubcategories.map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.id}>
                          {subcategory.icon ? `${subcategory.icon} ` : ''}{subcategory.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                  </div>
                </div>
              ) : (
                <div></div> // Spazio vuoto per mantenere l'allineamento
              )}
            </div>

            {/* È stato rimborsato? */}
            <div className="bg-warning-subtle border border-warning-subtle rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`relative w-6 h-6 rounded-md cursor-pointer transition-colors ${
                    formData.is_refunded
                      ? 'bg-warning border-2 border-warning'
                      : 'bg-surface border-2 border-warning-subtle hover:border-warning'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, is_refunded: !prev.is_refunded }))}
                >
                  <input
                    type="checkbox"
                    id="is-refunded"
                    checked={formData.is_refunded}
                    onChange={() => {}} // Gestito dal div onClick
                    className="sr-only" // Nascosto ma accessibile
                  />
                  <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                    formData.is_refunded ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                  }`}>
                    <Check className="w-4 h-4 text-white drop-shadow-sm" />
                  </div>
                </div>
                <label 
                  htmlFor="is-refunded" 
                  className="flex items-center text-sm font-medium text-warning cursor-pointer"
                  onClick={() => setFormData(prev => ({ ...prev, is_refunded: !prev.is_refunded }))}
                >
                  È stato rimborsato?
                </label>
              </div>
            </div>

            {/* Codice e valuta */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="flex items-center text-sm font-medium text-ink-secondary">
                  <div className="p-2 rounded-lg bg-inset mr-3">
                    <Hash className="w-4 h-4 text-ink-secondary" />
                  </div>
                  Codice transazione
                </label>
                <input
                  type="text"
                  value={formData.transaction_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, transaction_code: e.target.value }))}
                  className="w-full px-4 py-3 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface hover:bg-canvas text-ink placeholder-ink-muted"
                  placeholder="Es. riferimento estratto conto (opzionale)"
                />
              </div>
              <div className="space-y-3">
                <label className="flex items-center text-sm font-medium text-ink-secondary">
                  <div className="p-2 rounded-lg bg-inset mr-3">
                    <DollarSign className="w-4 h-4 text-ink-secondary" />
                  </div>
                  Valuta
                </label>
                <div className="relative">
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full px-4 py-3 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all appearance-none bg-surface hover:bg-canvas text-ink"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CHF">CHF</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Collega ad Asset + Quantità - per transazioni investment (AZIONE, ETF, Buono fruttifero) */}
            {ASSET_TRANSACTION_TYPES.includes(formData.transaction_type) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="flex items-center text-sm font-medium text-ink-secondary">
                    <div className="p-2 rounded-lg bg-warning-subtle mr-3">
                      <Package className="w-4 h-4 text-warning" />
                    </div>
                    Collega ad Asset
                  </label>
                  <div className="relative">
                    <select
                      value={formData.asset_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, asset_id: e.target.value }))}
                      className="w-full px-4 py-3 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all appearance-none bg-surface hover:bg-canvas text-ink"
                    >
                      <option value="">Nessun asset (opzionale)</option>
                      {assets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center text-sm font-medium text-ink-secondary">
                    <div className="p-2 rounded-lg bg-warning-subtle mr-3">
                      <Package className="w-4 h-4 text-warning" />
                    </div>
                    Quantità asset
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.asset_quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, asset_quantity: e.target.value }))}
                    className={clsx(
                      'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface hover:bg-canvas text-ink placeholder-ink-muted',
                      isAssetLinkMissingQuantity ? 'border-danger' : 'border-edge'
                    )}
                    placeholder="Quantità (es. 10.5)"
                    required={!!formData.asset_id}
                  />
                  <p className={clsx('text-xs', isAssetLinkMissingQuantity ? 'text-danger' : 'text-ink-muted')}>
                    {isAssetLinkMissingQuantity
                      ? 'Obbligatoria per collegare la transazione: senza quantità l\'asset non può essere aggiornato.'
                      : formData.asset_id
                        ? 'La quantità totale dell\'asset collegato verrà ricalcolata automaticamente.'
                        : 'Specifica la quantità se questa transazione crea o aggiorna un asset nel tuo portafoglio.'}
                  </p>
                </div>
              </div>
            )}

            {/* Note */}
            <div className="space-y-3">
              <label className="flex items-center text-sm font-medium text-ink-secondary">
                <div className="p-2 rounded-lg bg-inset mr-3">
                  <FileText className="w-4 h-4 text-ink-secondary" />
                </div>
                Note aggiuntive
              </label>
              <textarea
                value={formData.transaction_note}
                onChange={(e) => setFormData(prev => ({ ...prev, transaction_note: e.target.value }))}
                className="w-full px-4 py-3 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface hover:bg-canvas text-ink placeholder-ink-muted resize-none"
                rows={3}
                placeholder="Note opzionali..."
              />
            </div>
        </form>
      </Modal>
    )
  }
