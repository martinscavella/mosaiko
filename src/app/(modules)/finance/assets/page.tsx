'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import CacheStatus from '@/components/ui/CacheStatus'
import { useAuth } from '@/lib/auth'
import { useFinanceCache, useAssets, useAssetStats, useAssetOperations, useAccounts, useAssetTransactions, useUnlinkedAssetTransactions, type Asset, type Account } from '@/lib/financeCache'
import { aggregateAssetPurchaseData, normalizeAssetTransaction, EMPTY_PURCHASE_DATA, type AssetPurchaseData, type NormalizedAssetTransaction } from '@/lib/helpers/assetPurchaseData'
import AssetPerformanceChart from '@/components/ui/AssetPerformanceChart'
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  MoreVertical, 
  RefreshCw,
  Edit2, 
  Trash2, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  DollarSign,
  Coins,
  Building2,
  Smartphone,
  Car,
  Home,
  Briefcase, 
  Package,
  X,
  FileText,
  BarChart3
} from 'lucide-react'
import type { HeaderAction, HeaderStat } from '@/components/ui/ModuleHeader'

const ASSET_TYPES: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  real_estate: { label: 'Immobili', icon: Home, color: 'text-primary bg-primary-subtle' },
  vehicle: { label: 'Veicoli', icon: Car, color: 'text-danger bg-danger-subtle' },
  investment: { label: 'Investimenti', icon: TrendingUp, color: 'text-success-strong bg-success-subtle' },
  crypto: { label: 'Criptovalute', icon: Coins, color: 'text-warning bg-warning-subtle' },
  commodity: { label: 'Materie Prime', icon: Package, color: 'text-warning bg-warning-subtle' },
  electronics: { label: 'Elettronica', icon: Smartphone, color: 'text-module-health bg-module-health-subtle' },
  art: { label: 'Arte & Collezionismo', icon: Briefcase, color: 'text-module-tasks bg-module-tasks-subtle' },
  other: { label: 'Altri', icon: DollarSign, color: 'text-ink-secondary bg-inset' }
}

interface AssetTransactionsContentProps {
  assetId: string
  formatCurrency: (amount: number) => string
  onDataChanged: () => Promise<void>
}

// Componente per visualizzare/collegare le transazioni di un asset.
// Era definito dentro AssetsPage: React lo trattava come un tipo di
// componente nuovo ad ogni render del genitore, perdendo lo stato interno
// (es. il form "Collega transazione" aperto) se AssetsPage si
// re-renderizzava mentre il modal era aperto (es. refetch della cache).
function AssetTransactionsContent({ assetId, formatCurrency, onDataChanged }: AssetTransactionsContentProps) {
  const { assetTransactions, totalSpentOnAsset, totalReceivedFromAsset, transactionCount, loading, refetch: refetchAssetTransactions } = useAssetTransactions(assetId)
  const { linkAssetToTransaction, unlinkAssetFromTransaction } = useAssetOperations()
  const { unlinkedTransactions, refetch: refetchUnlinkedTransactions } = useUnlinkedAssetTransactions()
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [linkingTransactionId, setLinkingTransactionId] = useState<string | null>(null)
  const [unlinkingTransaction, setUnlinkingTransaction] = useState<string | null>(null)

  // Un click sulla riga collega direttamente: niente più selezione + bottone
  // di conferma separati, un solo passaggio.
  const handleLinkTransaction = async (transactionId: string) => {
    setLinkingTransactionId(transactionId)
    try {
      await linkAssetToTransaction(assetId, transactionId)
      setShowLinkForm(false)
      setSearchQuery('')
      await refetchAssetTransactions()
      await refetchUnlinkedTransactions()
      await onDataChanged()
    } catch (error) {
      console.error('Errore nel collegare la transazione:', error)
    } finally {
      setLinkingTransactionId(null)
    }
  }

  const handleUnlinkTransaction = async (transactionId: string) => {
    setUnlinkingTransaction(transactionId)
    try {
      await unlinkAssetFromTransaction(assetId, transactionId)
      await refetchAssetTransactions()
      await refetchUnlinkedTransactions()
      await onDataChanged()
    } catch (error) {
      console.error('Errore nello scollegare la transazione:', error)
    } finally {
      setUnlinkingTransaction(null)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Caricamento transazioni...</div>
  }

  const filteredUnlinked = unlinkedTransactions.filter((transaction) =>
    transaction.transaction_details.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Estratto una volta sola: prima era duplicato identico sia per lo stato
  // "nessuna transazione" che per quello con transazioni gia' collegate.
  const linkForm = showLinkForm && (
    <div className="border border-edge rounded-lg p-4 mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-ink">Collega transazione esistente</h4>
        <button
          onClick={() => { setShowLinkForm(false); setSearchQuery('') }}
          className="p-1 hover:bg-inset rounded"
        >
          <X className="w-4 h-4 text-ink-muted" />
        </button>
      </div>
      {unlinkedTransactions.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-ink-muted">
            Non ci sono transazioni disponibili per il collegamento.
          </p>
          <p className="text-sm text-ink-muted mt-1">
            Le transazioni devono avere categoria "ASSET & INVESTIMENTI" e non essere già collegate ad altri asset.
          </p>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted w-4 h-4" />
            <input
              type="text"
              placeholder="Cerca per descrizione..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-3 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1.5">
            {filteredUnlinked.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-4">Nessun risultato per &quot;{searchQuery}&quot;</p>
            ) : (
              filteredUnlinked.map((transaction) => (
                <button
                  key={transaction.id}
                  type="button"
                  onClick={() => handleLinkTransaction(transaction.id)}
                  disabled={linkingTransactionId !== null}
                  className="w-full flex items-center justify-between gap-3 p-3 bg-canvas hover:bg-primary-subtle rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink truncate">{transaction.transaction_details}</p>
                    <p className="text-xs text-ink-muted">
                      {new Date(transaction.transaction_date).toLocaleDateString('it-IT')} • {transaction.transaction_type}
                    </p>
                  </div>
                  <span className={`font-semibold flex-shrink-0 ${
                    transaction.current_amount >= 0 ? 'text-success-strong' : 'text-danger'
                  }`}>
                    {transaction.current_amount >= 0 ? '+' : ''}{formatCurrency(transaction.current_amount)}
                  </span>
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-primary-subtle text-primary">
                    {linkingTransactionId === transaction.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )

  if (transactionCount === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-ink-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-ink mb-2">Nessuna transazione collegata</h3>
          <p className="text-ink-muted mb-4">
            Non ci sono transazioni collegate a questo asset.
          </p>
          <button
            onClick={() => setShowLinkForm(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            Collega transazione esistente
          </button>
        </div>
        {linkForm}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-danger-subtle p-4 rounded-lg">
          <p className="text-sm font-medium text-danger">Totale Speso</p>
          <p className="text-xl font-bold text-danger">{formatCurrency(totalSpentOnAsset)}</p>
        </div>
        <div className="bg-success-subtle p-4 rounded-lg">
          <p className="text-sm font-medium text-success-strong">Totale Ricevuto</p>
          <p className="text-xl font-bold text-success-strong">{formatCurrency(totalReceivedFromAsset)}</p>
        </div>
        <div className="bg-primary-subtle p-4 rounded-lg">
          <p className="text-sm font-medium text-primary">N° Transazioni</p>
          <p className="text-xl font-bold text-primary-hover">{transactionCount}</p>
        </div>
      </div>

      {/* Lista Transazioni */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-ink">Transazioni Correlate</h4>
          <button
            onClick={() => setShowLinkForm(true)}
            className="px-3 py-1 text-sm bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
          >
            + Collega altra transazione
          </button>
        </div>
        <div className="space-y-2">
          {assetTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-4 bg-canvas rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-ink">{transaction.transaction_details}</p>
                <p className="text-sm text-ink-muted">
                  {new Date(transaction.transaction_date).toLocaleDateString('it-IT')}
                  {transaction.categories?.name && ` • ${transaction.categories.name}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`font-semibold ${transaction.current_amount >= 0 ? 'text-success-strong' : 'text-danger'}`}>
                    {transaction.current_amount >= 0 ? '+' : ''}{formatCurrency(transaction.current_amount)}
                  </p>
                  <p className="text-xs text-ink-muted">{transaction.transaction_type}</p>
                </div>
                <button
                  onClick={() => handleUnlinkTransaction(transaction.id)}
                  disabled={unlinkingTransaction === transaction.id}
                  className="p-1 text-danger hover:bg-danger-subtle rounded transition-colors disabled:opacity-50"
                  title="Scollega transazione"
                >
                  {unlinkingTransaction === transaction.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
        {linkForm}
      </div>
    </div>
  )
}

interface AssetFormData {
  name: string
  type: Asset['type']
  quantity: string
  value: string
  symbol: string
  accountId: string
}

interface AssetFormModalProps {
  mode: 'add' | 'edit'
  formData: AssetFormData
  onFormDataChange: (data: AssetFormData) => void
  accounts: Account[]
  onSubmit: () => void
  onClose: () => void
  purchaseData?: AssetPurchaseData
}

// Modal condiviso per Aggiungi/Modifica Asset: prima erano due blocchi JSX
// quasi identici (~130 righe ciascuno), che sarebbero divergiuti nel tempo
// ad ogni piccola modifica fatta in uno solo dei due.
function AssetFormModal({ mode, formData, onFormDataChange, accounts, onSubmit, onClose, purchaseData }: AssetFormModalProps) {
  const isEdit = mode === 'edit'
  const isQuantityLocked = isEdit && !!purchaseData?.hasTransactions

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">{isEdit ? 'Modifica Asset' : 'Aggiungi Nuovo Asset'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-inset rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1">
              Nome Asset *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Es. Appartamento Milano"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1">
              Tipo Asset *
            </label>
            <select
              value={formData.type}
              onChange={(e) => onFormDataChange({ ...formData, type: e.target.value as Asset['type'] })}
              className="w-full px-3 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              {Object.entries(ASSET_TYPES).map(([key, type]) => (
                <option key={key} value={key}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1">
              Account Associato
            </label>
            <select
              value={formData.accountId}
              onChange={(e) => onFormDataChange({ ...formData, accountId: e.target.value })}
              className="w-full px-3 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Nessun account</option>
              {/* Account disattivati esclusi, tranne quello già associato all'asset in modifica */}
              {accounts.filter((account) => account.is_active || account.id === formData.accountId).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.type})
                </option>
              ))}
            </select>
            <p className="text-xs text-ink-muted mt-1">
              Associa questo asset a un account specifico (opzionale)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1">
              Quantità *
            </label>
            <input
              type="number"
              step="0.01"
              value={isQuantityLocked ? purchaseData!.totalQuantity : formData.quantity}
              onChange={(e) => onFormDataChange({ ...formData, quantity: e.target.value })}
              className="w-full px-3 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-inset disabled:text-ink-muted disabled:cursor-not-allowed"
              placeholder="1.00"
              required
              disabled={isQuantityLocked}
            />
            <p className="text-xs text-ink-muted mt-1">
              {isQuantityLocked
                ? 'Calcolata automaticamente dalle transazioni collegate — modifica dal pannello "Transazioni Correlate".'
                : 'Quantità di asset posseduti (es. 1 per immobile, 100 per azioni)'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1">
              Simbolo/Ticker
            </label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => onFormDataChange({ ...formData, symbol: e.target.value })}
              className="w-full px-3 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Es. AAPL, BTC, IWDA.MI"
            />
            <p className="text-xs text-ink-muted mt-1">
              Simbolo di trading per recuperare quotazioni automatiche (opzionale)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1">
              Valore Attuale (€) *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.value}
              onChange={(e) => onFormDataChange({ ...formData, value: e.target.value })}
              className="w-full px-3 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="0.00"
              required
            />
            <p className="text-xs text-ink-muted mt-1">
              Valore attuale dell&apos;asset. Per dati di acquisto, {isEdit ? 'modifica le transazioni collegate' : 'crea una transazione collegata'}.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-edge text-ink-secondary rounded-lg hover:bg-canvas transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              {isEdit ? 'Salva Modifiche' : 'Aggiungi Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AssetsPage() {
  const { user, loading: authLoading } = useAuth()
  const { data: financeData, loading, error, refetch, isDataStale } = useFinanceCache()
  const { assets } = useAssets()
  const { accounts } = useAccounts()
  const { totalValue, totalPerformance } = useAssetStats()
  const { createAsset, updateAsset, deleteAsset, updateAssetMarketValue, recalcAssetQuantity } = useAssetOperations()
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null)
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null)
  const [showChartModal, setShowChartModal] = useState(false)
  const [selectedChartAsset, setSelectedChartAsset] = useState<Asset | null>(null)
  const [showTransactionsModal, setShowTransactionsModal] = useState(false)
  const [selectedAssetForTransactions, setSelectedAssetForTransactions] = useState<Asset | null>(null)
  // Form states
  const [formData, setFormData] = useState<AssetFormData>({
    name: '',
    type: 'other',
    quantity: '',
    value: '',
    symbol: '',
    accountId: ''
  })
  
  // Filtri e sorting
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAssetType, setSelectedAssetType] = useState<string>('all')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')
  const [sortField, setSortField] = useState<'name' | 'type' | 'value' | 'performance'>('value')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  // Stati per l'aggiornamento dei valori degli asset
  const [isUpdatingValues, setIsUpdatingValues] = useState(false)

  // Listener per il FAB della navbar mobile
  useEffect(() => {
    const handleOpenModal = () => {
      setShowAddModal(true);
    };
    
    window.addEventListener('openNewItemModal', handleOpenModal);
    return () => window.removeEventListener('openNewItemModal', handleOpenModal);
  }, []);


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  // Evita numeri con troppi decimali (es. quantità ricalcolate da transazioni)
  // che sforerebbero lo spazio disponibile nella card.
  const formatQuantity = (quantity: number) => {
    return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 4 }).format(quantity)
  }

  // Costo/quantità/performance per asset, calcolati UNA SOLA VOLTA per ogni
  // cambio di financeData invece che ad ogni render per ogni asset visibile
  // e ad ogni confronto durante l'ordinamento per "Performance" (prima erano
  // O(assets × transazioni), ora un solo raggruppamento O(transazioni)).
  // IMPORTANTE: deve stare prima di qualsiasi return condizionale (Rules of Hooks)
  const assetPurchaseDataMap = useMemo(() => {
    const map = new Map<string, AssetPurchaseData>()
    const transactionsByAsset = new Map<string, NormalizedAssetTransaction[]>()

    for (const transaction of financeData?.transactions ?? []) {
      if (!transaction.asset_id) continue
      const normalized = normalizeAssetTransaction(transaction)
      if (!normalized) continue

      const list = transactionsByAsset.get(transaction.asset_id) ?? []
      list.push(normalized)
      transactionsByAsset.set(transaction.asset_id, list)
    }

    transactionsByAsset.forEach((normalizedTransactions, assetId) => {
      map.set(assetId, aggregateAssetPurchaseData(normalizedTransactions))
    })

    return map
  }, [financeData])

  const getAssetPurchaseData = useCallback((assetId: string): AssetPurchaseData => {
    return assetPurchaseDataMap.get(assetId) ?? EMPTY_PURCHASE_DATA
  }, [assetPurchaseDataMap])

  // Loading states
  if (authLoading) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
          <div className="animate-pulse">
            {/* ...existing loading skeleton... */}
          </div>
        </div>
      </ModuleLayout>
    )
  }

  if (!user) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
          {/* ...existing user check JSX... */}
        </div>
      </ModuleLayout>
    )
  }

  const calculatePerformance = (currentValue: number, totalCost: number) => {
    if (totalCost === 0) return 0
    return ((currentValue - totalCost) / totalCost) * 100
  }
  const filteredAndSortedAssets = assets
    .filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = selectedAssetType === 'all' || asset.type === selectedAssetType
      const matchesAccount = selectedAccountId === 'all' || 
                           (selectedAccountId === 'none' && !asset.account_id) ||
                           asset.account_id === selectedAccountId
      return matchesSearch && matchesType && matchesAccount
    })
    .sort((a, b) => {
      let valueA: string | number, valueB: string | number
      
      switch (sortField) {
        case 'name':
          valueA = a.name.toLowerCase()
          valueB = b.name.toLowerCase()
          break
        case 'type':
          valueA = ASSET_TYPES[a.type]?.label || 'Altri'
          valueB = ASSET_TYPES[b.type]?.label || 'Altri'
          break
        case 'value':
          valueA = a.value
          valueB = b.value
          break
        case 'performance':          const purchaseDataA = getAssetPurchaseData(a.id)
          const purchaseDataB = getAssetPurchaseData(b.id)
          valueA = calculatePerformance(a.value, purchaseDataA.totalCost)
          valueB = calculatePerformance(b.value, purchaseDataB.totalCost)
          break
        default:
          return 0
      }
      
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }
  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
  }

  const handleAddAsset = () => {
    setFormData({
      name: '',
      type: 'other',
      quantity: '1',
      value: '',
      symbol: '',      accountId: ''
    })
    setAssetToEdit(null)
    setShowAddModal(true)
  }

  const handleEditAsset = (asset: Asset) => {
    setFormData({
      name: asset.name,
      type: asset.type,
      quantity: asset.quantity.toString(),
      value: asset.value.toString(),
      symbol: asset.symbol || '',
      accountId: asset.account_id || ''
    })
    setAssetToEdit(asset)
    setShowEditModal(true)
  }

  const handleDeleteAsset = (asset: Asset) => {
    setAssetToDelete(asset)
    setShowDeleteModal(true)
  }

  const handleShowChart = (asset: Asset) => {
    setSelectedChartAsset(asset)
    setShowChartModal(true)
  }

  const handleShowTransactions = (asset: Asset) => {
    setSelectedAssetForTransactions(asset)
    setShowTransactionsModal(true)
  }
  // Funzione per aggiornare tutti gli asset con i valori di mercato
  const handleUpdateAllAssetsValues = async () => {
    setIsUpdatingValues(true)
    
    try {
      // Recupera tutti gli asset che hanno un simbolo
      const assetsWithSymbol = assets.filter(asset => asset.symbol)

      if (assetsWithSymbol.length === 0) {
        return
      }

      // Aggiorna ogni asset
      for (const asset of assetsWithSymbol) {
        try {
          await updateAssetMarketValue(asset.id)
        } catch (error) {
          console.error(`Errore aggiornamento ${asset.name}:`, error)
        }
      }

      // Refresh una sola volta al fondo per evitare N re-render
      await refetch()
    } catch (error) {
      console.error('❌ Errore durante l\'aggiornamento:', error)
    } finally {
      setIsUpdatingValues(false)
    }
  }
  const confirmDelete = async () => {
    if (assetToDelete) {
      try {
        await deleteAsset(assetToDelete.id)
        setShowDeleteModal(false)
        setAssetToDelete(null)
      } catch (error) {
        console.error('Errore nell\'eliminare l\'asset:', error)
      }
    }
  }
  const saveAsset = async () => {
    if (!formData.name || !formData.value || !formData.quantity) {
      return
    }

    try {
      const assetData = {
        name: formData.name,
        type: formData.type,
        quantity: parseFloat(formData.quantity),
        value: parseFloat(formData.value),
        currency: 'EUR',
        symbol: formData.symbol || null,
        account_id: formData.accountId || null
      }

      if (assetToEdit) {
        const isQuantityLocked = getAssetPurchaseData(assetToEdit.id).hasTransactions
        // Quantità derivata da transazioni collegate: non sovrascriverla con il
        // form (che la mostra sola lettura), lascia il valore già persistito.
        const updatePayload = isQuantityLocked
          ? {
              name: assetData.name,
              type: assetData.type,
              value: assetData.value,
              currency: assetData.currency,
              symbol: assetData.symbol,
              account_id: assetData.account_id
            }
          : assetData
        await updateAsset(assetToEdit.id, updatePayload)
        // Rete di sicurezza: ricalcola dal DB fresco per evitare disallineamenti
        // con altre tab che potrebbero aver collegato/scollegato transazioni.
        // updateAsset ha già fatto il suo refetch interno PRIMA di questa
        // scrittura: serve un refetch esplicito per riflettere il ricalcolo.
        await recalcAssetQuantity(assetToEdit.id)
        await refetch()
      } else {
        await createAsset(assetData)
      }

      setShowAddModal(false)
      setShowEditModal(false)
      setAssetToEdit(null)
    } catch (error) {
      console.error('Errore nel salvare l\'asset:', error)
    }
  }  // Header stats
  const headerStats: HeaderStat[] = [
    {
      label: 'Valore Totale',
      value: formatCurrency(totalValue),
      color: 'blue'
    },
    {
      label: 'Performance',
      value: `${totalPerformance.toFixed(2)}%`,
      color: totalPerformance >= 0 ? 'green' : 'orange'
    }  ]
  // Header actions
  const headerActions: HeaderAction[] = [
    {
      label: 'Aggiungi',
      onClick: handleAddAsset,
      icon: <Plus className="w-4 h-4" />,
      color: 'green',
      hideTextOnMobile: true
    },    {
      label: 'Aggiorna',
      onClick: handleUpdateAllAssetsValues,
      icon: <RefreshCw className="w-4 h-4" />,
      color: 'blue',
      disabled: isUpdatingValues,
      loading: isUpdatingValues,
      hideTextOnMobile: true
    }
  ]
  return (
    <ModuleLayout moduleId="finance">
      <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
        <ModuleHeader 
          title="Asset"
          subtitle="Gestisci i tuoi beni e investimenti"
          icon={<Package className="h-6 w-6 text-white" />}
          customContent={<CacheStatus />}
          statusIndicators={[
            {
              type: 'warning',
              label: 'Aggiornamento consigliato',
              show: isDataStale
            },
            {
              type: 'success',
              label: 'Tutti i sistemi operativi',
              show: !loading && !error && assets.length > 0
            }
          ]}
          stats={headerStats}          actions={headerActions}
        />

        {/* Controlli */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Barra di ricerca */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-muted w-4 h-4" />
              <input
                type="text"
                placeholder="Cerca asset..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Filtro per tipo */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-muted w-4 h-4" />
              <select
                value={selectedAssetType}
                onChange={(e) => setSelectedAssetType(e.target.value)}
                className="pl-10 pr-8 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-surface min-w-[150px]"
              >
                <option value="all">Tutti i tipi</option>
                {Object.entries(ASSET_TYPES).map(([key, type]) => (
                  <option key={key} value={key}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Filtro per account */}
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-muted w-4 h-4" />
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="pl-10 pr-8 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-surface min-w-[150px]"
              >
                <option value="all">Tutti gli account</option>
                <option value="none">Nessun account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedAssetType('all')
                setSelectedAccountId('all')
              }}
              className="px-3 py-2 border border-edge rounded-lg hover:bg-canvas transition-colors text-sm"
            >
              Pulisci
            </button>
          </div>
        </div>

        {/* Controlli di ordinamento */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => handleSort('name')}
            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
              sortField === 'name' ? 'bg-primary-subtle border-primary-subtle text-primary-hover' : 'border-edge hover:bg-canvas'
            }`}
          >
            Nome {getSortIcon('name')}
          </button>
          <button
            onClick={() => handleSort('type')}
            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
              sortField === 'type' ? 'bg-primary-subtle border-primary-subtle text-primary-hover' : 'border-edge hover:bg-canvas'
            }`}
          >
            Tipo {getSortIcon('type')}
          </button>
          <button
            onClick={() => handleSort('value')}
            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
              sortField === 'value' ? 'bg-primary-subtle border-primary-subtle text-primary-hover' : 'border-edge hover:bg-canvas'
            }`}
          >
            Valore {getSortIcon('value')}
          </button>
          <button
            onClick={() => handleSort('performance')}
            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
              sortField === 'performance' ? 'bg-primary-subtle border-primary-subtle text-primary-hover' : 'border-edge hover:bg-canvas'
            }`}
          >
            Performance {getSortIcon('performance')}
          </button>
        </div>

        {/* Lista Asset */}
        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-surface rounded-lg border border-edge p-6 animate-pulse">
                  <div className="h-4 bg-inset rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-inset rounded w-1/2 mb-4"></div>
                  <div className="h-6 bg-inset rounded w-2/3 mb-2"></div>
                  <div className="h-4 bg-inset rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedAssets.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-ink-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-ink mb-2">Nessun asset trovato</h3>
              <p className="text-ink-muted mb-6">
                {searchTerm || selectedAssetType !== 'all' || selectedAccountId !== 'all'
                  ? 'Prova a modificare i filtri di ricerca'
                  : 'Inizia aggiungendo il tuo primo asset'}
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              >
                <Plus className="w-4 h-4" />
                Aggiungi Asset
              </button>
            </div>
          ) : (            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedAssets.map((asset) => {
                const AssetIcon = ASSET_TYPES[asset.type]?.icon || ASSET_TYPES.other.icon
                const purchaseData = getAssetPurchaseData(asset.id)
                const performance = calculatePerformance(asset.value, purchaseData.totalCost)
                
                return (
                  <div key={asset.id} className="bg-surface rounded-lg border border-edge hover:shadow-elevated transition-shadow">
                    <div className="p-6">
                      {/* Header della card - Struttura ben definita */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${ASSET_TYPES[asset.type]?.color || ASSET_TYPES.other.color}`}>
                            <AssetIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-ink text-base leading-tight truncate">{asset.name}</h3>
                              {purchaseData.hasTransactions && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-success-subtle text-success-strong text-xs rounded-full flex-shrink-0">
                                  <FileText className="w-3 h-3" />
                                  <span>Tracked</span>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-ink-muted mb-2">{ASSET_TYPES[asset.type]?.label || 'Altri'}</p>
                            {asset.account_id && (
                              <p className="text-xs text-primary bg-primary-subtle px-2 py-1 rounded-full inline-block truncate max-w-full">
                                {accounts.find(acc => acc.id === asset.account_id)?.name || 'Account sconosciuto'}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="relative flex-shrink-0 ml-2">
                          <button 
                            onClick={() => setSelectedAsset(selectedAsset?.id === asset.id ? null : asset)}
                            className="p-1 hover:bg-inset rounded"
                          >
                            <MoreVertical className="w-4 h-4 text-ink-muted" />
                          </button>
                          
                          {/* Dropdown Menu */}
                          {selectedAsset?.id === asset.id && (
                            <div className="absolute right-0 top-8 mt-1 w-48 bg-surface rounded-lg shadow-elevated border border-edge z-10">
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    handleShowChart(asset)
                                    setSelectedAsset(null)
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-ink-secondary hover:bg-inset"
                                >
                                  <BarChart3 className="w-4 h-4" />
                                  Grafico Performance
                                </button>                                <button
                                  onClick={() => {
                                    handleShowTransactions(asset)
                                    setSelectedAsset(null)
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-ink-secondary hover:bg-inset"
                                >
                                  <FileText className="w-4 h-4" />
                                  Transazioni Correlate
                                </button>
                                <button
                                  onClick={() => {
                                    handleEditAsset(asset)
                                    setSelectedAsset(null)
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-ink-secondary hover:bg-inset"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Modifica
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteAsset(asset)
                                    setSelectedAsset(null)
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-danger hover:bg-danger-subtle"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Elimina
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Valore e performance, impilati per non stringere lo spazio orizzontale */}
                      <div className="space-y-1.5">
                        <span className="text-xs text-ink-muted uppercase tracking-wide">Valore Attuale</span>
                        <p className="text-2xl font-semibold font-amount text-ink">
                          {formatCurrency(asset.value)}
                        </p>
                        {purchaseData.hasTransactions && (
                          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold ${
                            performance >= 0 ? 'bg-success-subtle text-success-strong' : 'bg-danger-subtle text-danger'
                          }`}>
                            {performance >= 0 ? (
                              <TrendingUp className="w-3.5 h-3.5" />
                            ) : (
                              <TrendingDown className="w-3.5 h-3.5" />
                            )}
                            {performance >= 0 ? '+' : ''}{performance.toFixed(2)}%
                          </div>
                        )}
                      </div>

                      {/* Metriche secondarie: righe etichetta/valore, spazio pieno per i numeri */}
                      <div className="mt-4 space-y-2 pt-3 border-t border-edge-subtle">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-ink-muted">Quantità</span>
                          <span className="text-sm font-medium text-ink font-amount">{formatQuantity(asset.quantity)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-ink-muted">Capitale Investito</span>
                          <span className="text-sm font-medium text-ink-secondary font-amount">
                            {purchaseData.hasTransactions ? formatCurrency(purchaseData.totalCost) : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-ink-muted">Prezzo Medio</span>
                          <span className="text-sm font-medium text-ink-secondary font-amount">
                            {purchaseData.hasTransactions ? formatCurrency(purchaseData.avgPurchasePrice) : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Footer della card - Informazioni aggiuntive */}
                      <div className="mt-4 pt-3 border-t border-edge-subtle">
                        <p className="text-xs text-ink-muted line-clamp-1">
                          {purchaseData.firstPurchaseDate && `Acquistato il ${new Date(purchaseData.firstPurchaseDate).toLocaleDateString('it-IT')} • `}
                          Aggiornato il {new Date(asset.updated_at).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal per Aggiungere/Modificare Asset (componente condiviso) */}
        {showAddModal && (
          <AssetFormModal
            mode="add"
            formData={formData}
            onFormDataChange={setFormData}
            accounts={accounts}
            onSubmit={saveAsset}
            onClose={() => setShowAddModal(false)}
          />
        )}

        {showEditModal && assetToEdit && (
          <AssetFormModal
            mode="edit"
            formData={formData}
            onFormDataChange={setFormData}
            accounts={accounts}
            onSubmit={saveAsset}
            onClose={() => setShowEditModal(false)}
            purchaseData={getAssetPurchaseData(assetToEdit.id)}
          />
        )}


        {/* Modal per Conferma Eliminazione */}
        {showDeleteModal && assetToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-surface rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-danger">Elimina Asset</h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="p-1 hover:bg-inset rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-ink-secondary mb-2">
                  Sei sicuro di voler eliminare questo asset?
                </p>
                <div className="bg-canvas p-3 rounded-lg">
                  <p className="font-medium">{assetToDelete.name}</p>
                  <p className="text-sm text-ink-secondary">{ASSET_TYPES[assetToDelete.type]?.label || 'Altri'}</p>
                  <p className="text-sm text-ink-secondary">
                    Valore: {formatCurrency(assetToDelete.value)}
                  </p>
                </div>
                <p className="text-sm text-danger mt-2">
                  Questa azione non può essere annullata.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-edge text-ink-secondary rounded-lg hover:bg-canvas transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-danger text-white rounded-lg hover:bg-danger transition-colors"
                >
                  Elimina
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal per Grafico Performance */}
        {showChartModal && selectedChartAsset && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-surface rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">
                  Performance - {selectedChartAsset.name}
                </h3>
                <button
                  onClick={() => {
                    setShowChartModal(false)
                    setSelectedChartAsset(null)
                  }}
                  className="p-1 hover:bg-inset rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Il grafico AssetPerformanceChart include già tutte le statistiche necessarie */}
              <div className="min-h-[600px]">
                <AssetPerformanceChart
                  asset={selectedChartAsset}
                />
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowChartModal(false)
                    setSelectedChartAsset(null)
                  }}
                  className="px-4 py-2 bg-ink-secondary text-white rounded-lg hover:bg-ink-secondary transition-colors"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal per Transazioni Correlate */}
        {showTransactionsModal && selectedAssetForTransactions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-surface rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">
                  Transazioni - {selectedAssetForTransactions.name}
                </h3>
                <button
                  onClick={() => {
                    setShowTransactionsModal(false)
                    setSelectedAssetForTransactions(null)
                  }}
                  className="p-1 hover:bg-inset rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <AssetTransactionsContent
                assetId={selectedAssetForTransactions.id}
                formatCurrency={formatCurrency}
                onDataChanged={refetch}
              />
            </div>
          </div>
        )}

      </div>
    </ModuleLayout>
  )
}
