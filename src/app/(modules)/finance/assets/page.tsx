'use client'

import { useState, useEffect, useCallback } from 'react'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import CacheStatus from '@/components/ui/CacheStatus'
import { useAuth } from '@/lib/auth'
import { useFinanceCache, useAssets, useAssetStats, useAssetOperations, useAccounts, useAssetTransactions, useUnlinkedAssetTransactions, type Asset } from '@/lib/financeCache'
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
  real_estate: { label: 'Immobili', icon: Home, color: 'text-blue-600 bg-blue-100' },
  vehicle: { label: 'Veicoli', icon: Car, color: 'text-red-600 bg-red-100' },
  investment: { label: 'Investimenti', icon: TrendingUp, color: 'text-green-600 bg-green-100' },
  crypto: { label: 'Criptovalute', icon: Coins, color: 'text-yellow-600 bg-yellow-100' },
  commodity: { label: 'Materie Prime', icon: Package, color: 'text-orange-600 bg-orange-100' },
  electronics: { label: 'Elettronica', icon: Smartphone, color: 'text-purple-600 bg-purple-100' },
  art: { label: 'Arte & Collezionismo', icon: Briefcase, color: 'text-pink-600 bg-pink-100' },
  other: { label: 'Altri', icon: DollarSign, color: 'text-gray-600 bg-gray-100' }
}

export default function AssetsPage() {
  const { user, loading: authLoading } = useAuth()
  const { data: financeData, loading, error, refetch, isDataStale } = useFinanceCache()
  const { assets } = useAssets()
  const { accounts } = useAccounts()
  const { totalValue, totalPerformance } = useAssetStats()
  const { createAsset, updateAsset, deleteAsset, updateAssetMarketValue } = useAssetOperations()
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null)
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null)
  const [showChartModal, setShowChartModal] = useState(false)
  const [selectedChartAsset, setSelectedChartAsset] = useState<Asset | null>(null)
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [showTransactionsModal, setShowTransactionsModal] = useState(false)
  const [selectedAssetForTransactions, setSelectedAssetForTransactions] = useState<Asset | null>(null)
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    type: 'other' as Asset['type'],
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

  // Debug: log dei dati per capire cosa sta succedendo
  useEffect(() => {
    if (financeData) {
      console.log('📊 Finance data loaded:', {
        assets: financeData.assets?.length || 0,
        transactions: financeData.transactions?.length || 0,
        transactionsWithAssetId: financeData.transactions?.filter(t => t.asset_id)?.length || 0
      })
      
      // Mostra tutti gli asset_id presenti nelle transazioni
      const assetIds = [...new Set(financeData.transactions?.filter(t => t.asset_id).map(t => t.asset_id) || [])]
      console.log('🔗 Asset IDs found in transactions:', assetIds)
      
      // Mostra tutti gli asset disponibili
      console.log('💎 Available assets:', assets.map(a => ({ id: a.id, name: a.name })))
    }
  }, [financeData, assets])

  // Helper function to get purchase data from transactions
  // NOTE: deve restare prima dei return condizionali sotto (authLoading/!user):
  // gli hook non possono essere chiamati dopo un return anticipato (Rules of Hooks).
  const getAssetPurchaseData = useCallback((assetId: string) => {
    const assetTransactions = financeData?.transactions?.filter(t => t.asset_id === assetId) || []

    if (assetTransactions.length === 0) {
      return {
        totalCost: 0,
        totalQuantity: 0,
        avgPurchasePrice: 0,
        firstPurchaseDate: null,
        hasTransactions: false
      }
    }

    // Replica la stessa logica di AssetPerformanceChart per calcolare i totali
    let totalQuantity = 0
    let totalCostSpent = 0
    let totalQuantityBought = 0
    let firstPurchaseDate: string | null = null

    // Simula la struttura dell'API /api/transactions
    const formattedTransactions = assetTransactions
      .filter(t => t.asset_quantity !== null && t.asset_quantity !== undefined)
      .map(t => {
        const isAcquisition = (t.asset_quantity || 0) > 0
        return {
          transaction_type: isAcquisition ? 'buy' : 'sell' as 'buy' | 'sell',
          quantity: Math.abs(t.asset_quantity || 0),
          unit_price: Math.abs(t.current_amount || 0) / Math.abs(t.asset_quantity || 1),
          transaction_date: t.transaction_date
        }
      })
      .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime())

    formattedTransactions.forEach(t => {
      if (t.transaction_type === 'buy') {
        totalQuantity += t.quantity
        totalCostSpent += t.quantity * t.unit_price
        totalQuantityBought += t.quantity
        if (!firstPurchaseDate) {
          firstPurchaseDate = t.transaction_date
        }
      } else if (t.transaction_type === 'sell') {
        totalQuantity -= t.quantity
      }
    })

    const avgPurchasePrice = totalQuantityBought > 0 ? totalCostSpent / totalQuantityBought : 0
    const currentCost = totalQuantity * avgPurchasePrice

    return {
      totalCost: Math.max(0, currentCost),
      totalQuantity: Math.max(0, totalQuantity),
      avgPurchasePrice: avgPurchasePrice,
      firstPurchaseDate: firstPurchaseDate,
      hasTransactions: formattedTransactions.length > 0
    }
  }, [financeData])

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
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
      console.log('🔄 Aggiornamento valori di tutti gli asset...')
      
      // Recupera tutti gli asset che hanno un simbolo
      const assetsWithSymbol = assets.filter(asset => asset.symbol)
      
      if (assetsWithSymbol.length === 0) {
        console.log('⚠️ Nessun asset con simbolo trovato')
        return
      }
      
      // Aggiorna ogni asset senza ricaricare la cache a ogni iterazione:
      // un solo refetch() finale invece di uno per ogni asset (N+1 di rete).
      for (const asset of assetsWithSymbol) {
        try {
          await updateAssetMarketValue(asset.id, { skipRefetch: true })
          console.log(`✅ Aggiornato ${asset.name}`)
        } catch (error) {
          console.error(`❌ Errore aggiornamento ${asset.name}:`, error)
        }
      }

      await refetch()
      console.log('✅ Aggiornamento completato')
      
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

    try {      const assetData = {
        name: formData.name,
        type: formData.type,
        quantity: parseFloat(formData.quantity),
        value: parseFloat(formData.value),
        currency: 'EUR',
        symbol: formData.symbol || null,
        account_id: formData.accountId || null
      }

      if (assetToEdit) {
        await updateAsset(assetToEdit.id, assetData)
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
  // Componente helper per visualizzare le transazioni dell'asset
  const AssetTransactionsContent = ({ assetId, formatCurrency }: { assetId: string, formatCurrency: (amount: number) => string }) => {
    const { assetTransactions, totalSpentOnAsset, totalReceivedFromAsset, transactionCount, loading, refetch: refetchAssetTransactions } = useAssetTransactions(assetId)
    const { linkAssetToTransaction, unlinkAssetFromTransaction } = useAssetOperations()
    const { unlinkedTransactions, refetch: refetchUnlinkedTransactions } = useUnlinkedAssetTransactions() // Usa il nuovo hook per transazioni senza limiti
    const [showLinkForm, setShowLinkForm] = useState(false)
    const [selectedTransactionId, setSelectedTransactionId] = useState('')
    const [linkingTransaction, setLinkingTransaction] = useState(false)
    const [unlinkingTransaction, setUnlinkingTransaction] = useState<string | null>(null)

    const handleLinkTransaction = async () => {
      if (!selectedTransactionId) return
      
      setLinkingTransaction(true)
      try {
        await linkAssetToTransaction(assetId, selectedTransactionId)
        setShowLinkForm(false)
        setSelectedTransactionId('')
        await refetchAssetTransactions() // Refresh asset transactions
        await refetchUnlinkedTransactions() // Refresh unlinked transactions
        await refetch() // Refresh general data
      } catch (error) {
        console.error('Errore nel collegare la transazione:', error)
      } finally {
        setLinkingTransaction(false)
      }
    }

    const handleUnlinkTransaction = async (transactionId: string) => {
      setUnlinkingTransaction(transactionId)
      try {
        await unlinkAssetFromTransaction(transactionId)
        await refetchAssetTransactions() // Refresh asset transactions
        await refetchUnlinkedTransactions() // Refresh unlinked transactions
        await refetch() // Refresh general data
      } catch (error) {
        console.error('Errore nello scollegare la transazione:', error)
      } finally {
        setUnlinkingTransaction(null)
      }
    }

    if (loading) {
      return <div className="text-center py-8">Caricamento transazioni...</div>
    }

    if (transactionCount === 0) {
      return (
        <div className="space-y-6">
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna transazione collegata</h3>
            <p className="text-gray-500 mb-4">
              Non ci sono transazioni collegate a questo asset.
            </p>            <button
              onClick={() => setShowLinkForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Collega transazione esistente
            </button>
          </div>          {/* Form per collegare transazione esistente */}
          {showLinkForm && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Collega transazione esistente</h4>
              {unlinkedTransactions.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">
                    Non ci sono transazioni disponibili per il collegamento.
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Le transazioni devono avere categoria "ASSET & INVESTIMENTI" e non essere già collegate ad altri asset.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-medium text-gray-700">Seleziona</th>
                          <th className="text-left p-3 font-medium text-gray-700">Data</th>
                          <th className="text-left p-3 font-medium text-gray-700">Descrizione</th>
                          <th className="text-right p-3 font-medium text-gray-700">Importo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unlinkedTransactions.map((transaction) => (
                          <tr 
                            key={transaction.id}
                            className={`border-t border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors ${
                              selectedTransactionId === transaction.id ? 'bg-blue-100' : ''
                            }`}
                            onClick={() => setSelectedTransactionId(
                              selectedTransactionId === transaction.id ? '' : transaction.id
                            )}
                          >
                            <td className="p-3">
                              <input
                                type="radio"
                                name="selectedTransaction"
                                checked={selectedTransactionId === transaction.id}
                                onChange={() => setSelectedTransactionId(transaction.id)}
                                className="text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="p-3 text-gray-700">
                              {new Date(transaction.transaction_date).toLocaleDateString('it-IT')}
                            </td>
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-gray-900 truncate">
                                  {transaction.transaction_details}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {transaction.transaction_type}
                                </p>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <span className={`font-semibold ${
                                transaction.current_amount >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {transaction.current_amount >= 0 ? '+' : ''}{formatCurrency(transaction.current_amount)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowLinkForm(false)
                        setSelectedTransactionId('')
                      }}
                      className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={handleLinkTransaction}
                      disabled={!selectedTransactionId || linkingTransaction}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {linkingTransaction ? 'Collegando...' : 'Collega Transazione Selezionata'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-red-600">Totale Speso</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(totalSpentOnAsset)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-green-600">Totale Ricevuto</p>
            <p className="text-xl font-bold text-green-700">{formatCurrency(totalReceivedFromAsset)}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-600">N° Transazioni</p>
            <p className="text-xl font-bold text-blue-700">{transactionCount}</p>
          </div>
        </div>

        {/* Lista Transazioni */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Transazioni Correlate</h4>            <button
              onClick={() => setShowLinkForm(true)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              + Collega altra transazione
            </button>
          </div>
          <div className="space-y-2">
            {assetTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{transaction.transaction_details}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(transaction.transaction_date).toLocaleDateString('it-IT')}
                    {transaction.categories?.name && ` • ${transaction.categories.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`font-semibold ${transaction.current_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.current_amount >= 0 ? '+' : ''}{formatCurrency(transaction.current_amount)}
                    </p>
                    <p className="text-xs text-gray-500">{transaction.transaction_type}</p>
                  </div>
                  <button
                    onClick={() => handleUnlinkTransaction(transaction.id)}
                    disabled={unlinkingTransaction === transaction.id}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
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
          </div>          {/* Form per collegare transazione esistente */}
          {showLinkForm && (
            <div className="border border-gray-200 rounded-lg p-4 mt-4">
              <h4 className="font-medium text-gray-900 mb-3">Collega transazione esistente</h4>
              {unlinkedTransactions.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">
                    Non ci sono transazioni disponibili per il collegamento.
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Le transazioni devono avere categoria "ASSET & INVESTIMENTI" e non essere già collegate ad altri asset.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-medium text-gray-700">Seleziona</th>
                          <th className="text-left p-3 font-medium text-gray-700">Data</th>
                          <th className="text-left p-3 font-medium text-gray-700">Descrizione</th>
                          <th className="text-right p-3 font-medium text-gray-700">Importo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unlinkedTransactions.map((transaction) => (
                          <tr 
                            key={transaction.id}
                            className={`border-t border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors ${
                              selectedTransactionId === transaction.id ? 'bg-blue-100' : ''
                            }`}
                            onClick={() => setSelectedTransactionId(
                              selectedTransactionId === transaction.id ? '' : transaction.id
                            )}
                          >
                            <td className="p-3">
                              <input
                                type="radio"
                                name="selectedTransaction"
                                checked={selectedTransactionId === transaction.id}
                                onChange={() => setSelectedTransactionId(transaction.id)}
                                className="text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="p-3 text-gray-700">
                              {new Date(transaction.transaction_date).toLocaleDateString('it-IT')}
                            </td>
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-gray-900 truncate">
                                  {transaction.transaction_details}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {transaction.transaction_type}
                                </p>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <span className={`font-semibold ${
                                transaction.current_amount >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {transaction.current_amount >= 0 ? '+' : ''}{formatCurrency(transaction.current_amount)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowLinkForm(false)
                        setSelectedTransactionId('')
                      }}
                      className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={handleLinkTransaction}
                      disabled={!selectedTransactionId || linkingTransaction}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {linkingTransaction ? 'Collegando...' : 'Collega Transazione Selezionata'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cerca asset..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtro per tipo */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={selectedAssetType}
                onChange={(e) => setSelectedAssetType(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[150px]"
              >
                <option value="all">Tutti i tipi</option>
                {Object.entries(ASSET_TYPES).map(([key, type]) => (
                  <option key={key} value={key}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Filtro per account */}
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[150px]"
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
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
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
              sortField === 'name' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            Nome {getSortIcon('name')}
          </button>
          <button
            onClick={() => handleSort('type')}
            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
              sortField === 'type' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            Tipo {getSortIcon('type')}
          </button>
          <button
            onClick={() => handleSort('value')}
            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
              sortField === 'value' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            Valore {getSortIcon('value')}
          </button>
          <button
            onClick={() => handleSort('performance')}
            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
              sortField === 'performance' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            Performance {getSortIcon('performance')}
          </button>
        </div>

        {/* Lista Asset */}
        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedAssets.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun asset trovato</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || selectedAssetType !== 'all' || selectedAccountId !== 'all'
                  ? 'Prova a modificare i filtri di ricerca'
                  : 'Inizia aggiungendo il tuo primo asset'}
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Aggiungi Asset
              </button>
            </div>
          ) : (            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedAssets.map((asset) => {
                const AssetIcon = ASSET_TYPES[asset.type]?.icon || ASSET_TYPES.other.icon
                const purchaseData = getAssetPurchaseData(asset.id)
                const performance = calculatePerformance(asset.value, purchaseData.totalCost)
                
                return (
                  <div key={asset.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="p-6">
                      {/* Header della card - Struttura ben definita */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${ASSET_TYPES[asset.type]?.color || ASSET_TYPES.other.color}`}>
                            <AssetIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900 text-base leading-tight truncate">{asset.name}</h3>
                              {purchaseData.hasTransactions && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex-shrink-0">
                                  <FileText className="w-3 h-3" />
                                  <span>Tracked</span>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mb-2">{ASSET_TYPES[asset.type]?.label || 'Altri'}</p>
                            {asset.account_id && (
                              <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block truncate max-w-full">
                                {accounts.find(acc => acc.id === asset.account_id)?.name || 'Account sconosciuto'}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="relative flex-shrink-0 ml-2">
                          <button 
                            onClick={() => setSelectedAsset(selectedAsset?.id === asset.id ? null : asset)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                          </button>
                          
                          {/* Dropdown Menu */}
                          {selectedAsset?.id === asset.id && (
                            <div className="absolute right-0 top-8 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    handleShowChart(asset)
                                    setSelectedAsset(null)
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <BarChart3 className="w-4 h-4" />
                                  Grafico Performance
                                </button>                                <button
                                  onClick={() => {
                                    handleShowTransactions(asset)
                                    setSelectedAsset(null)
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <FileText className="w-4 h-4" />
                                  Transazioni Correlate
                                </button>
                                <button
                                  onClick={() => {
                                    handleEditAsset(asset)
                                    setSelectedAsset(null)
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Modifica
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteAsset(asset)
                                    setSelectedAsset(null)
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Elimina
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Contenuto principale - Griglia strutturata */}
                      <div className="space-y-4">
                        {/* Prima sezione: Metriche principali */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Valore Attuale</span>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatCurrency(asset.value)}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Quantità</span>
                            <p className="text-lg font-semibold text-gray-900">
                              {asset.quantity}
                            </p>
                          </div>
                        </div>

                        {/* Seconda sezione: Metriche di performance (sempre mostrate per uniformità) */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Capitale Investito</span>
                            <p className="text-sm font-medium text-gray-700">
                              {purchaseData.hasTransactions ? formatCurrency(purchaseData.totalCost) : '—'}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Prezzo Medio</span>
                            <p className="text-sm font-medium text-gray-700">
                              {purchaseData.hasTransactions ? formatCurrency(purchaseData.avgPurchasePrice) : '—'}
                            </p>
                          </div>
                        </div>

                        {/* Terza sezione: Performance */}
                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Performance</span>
                            <div className="flex items-center gap-2">
                              {purchaseData.hasTransactions ? (
                                <>
                                  {performance >= 0 ? (
                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <TrendingDown className="w-4 h-4 text-red-600" />
                                  )}
                                  <span className={`text-sm font-semibold ${performance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {performance >= 0 ? '+' : ''}{performance.toFixed(2)}%
                                  </span>
                                </>
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer della card - Informazioni aggiuntive */}
                      <div className="mt-6 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-400 line-clamp-1">
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

        {/* Modal per Aggiungere Asset */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Aggiungi Nuovo Asset</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); saveAsset(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Asset *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Es. Appartamento Milano"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo Asset *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as Asset['type']})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {Object.entries(ASSET_TYPES).map(([key, type]) => (
                      <option key={key} value={key}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Associato
                  </label>
                  <select
                    value={formData.accountId}
                    onChange={(e) => setFormData({...formData, accountId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Nessun account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.type})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Associa questo asset a un account specifico (opzionale)
                  </p>
                </div>                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantità *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1.00"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Quantità di asset posseduti (es. 1 per immobile, 100 per azioni)
                  </p>                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Simbolo/Ticker
                  </label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Es. AAPL, BTC, IWDA.MI"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Simbolo di trading per recuperare quotazioni automatiche (opzionale)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valore Attuale (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({...formData, value: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Valore attuale dell'asset. Per dati di acquisto, crea una transazione collegata.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Aggiungi Asset
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal per Modificare Asset */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Modifica Asset</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); saveAsset(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Asset *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Es. Appartamento Milano"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo Asset *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as Asset['type']})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {Object.entries(ASSET_TYPES).map(([key, type]) => (
                      <option key={key} value={key}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Associato
                  </label>
                  <select
                    value={formData.accountId}
                    onChange={(e) => setFormData({...formData, accountId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Nessun account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.type})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Associa questo asset a un account specifico (opzionale)
                  </p>
                </div>                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantità *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1.00"
                    required
                  />                  <p className="text-xs text-gray-500 mt-1">
                    Quantità di asset posseduti (es. 1 per immobile, 100 per azioni)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Simbolo/Ticker
                  </label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Es. AAPL, BTC, IWDA.MI"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Simbolo di trading per recuperare quotazioni automatiche (opzionale)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valore Attuale (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({...formData, value: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Valore attuale dell'asset. Per dati di acquisto, modifica le transazioni collegate.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Salva Modifiche
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal per Conferma Eliminazione */}
        {showDeleteModal && assetToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-red-600">Elimina Asset</h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 mb-2">
                  Sei sicuro di voler eliminare questo asset?
                </p>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium">{assetToDelete.name}</p>
                  <p className="text-sm text-gray-600">{ASSET_TYPES[assetToDelete.type]?.label || 'Altri'}</p>
                  <p className="text-sm text-gray-600">
                    Valore: {formatCurrency(assetToDelete.value)}
                  </p>
                </div>
                <p className="text-sm text-red-600 mt-2">
                  Questa azione non può essere annullata.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">
                  Performance - {selectedChartAsset.name}
                </h3>
                <button
                  onClick={() => {
                    setShowChartModal(false)
                    setSelectedChartAsset(null)
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
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
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">
                  Transazioni - {selectedAssetForTransactions.name}
                </h3>
                <button
                  onClick={() => {
                    setShowTransactionsModal(false)
                    setSelectedAssetForTransactions(null)
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <AssetTransactionsContent assetId={selectedAssetForTransactions.id} formatCurrency={formatCurrency} />
            </div>
          </div>
        )}

        {/* Modal per Debug Info */}
        {showDebugInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Debug Info</h3>
                <button
                  onClick={() => setShowDebugInfo(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <pre className="text-xs text-gray-500 whitespace-pre-wrap">
                {JSON.stringify(financeData, null, 2)}
              </pre>            </div>
          </div>
        )}
      </div>
    </ModuleLayout>
  )
}
