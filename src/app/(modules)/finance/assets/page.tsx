'use client'

import { useState, useEffect } from 'react'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import CacheStatus from '@/components/ui/CacheStatus'
import { useAuth } from '@/lib/auth'
import { useFinanceCache, useAssets, useAssetStats, useAssetOperations, useAccounts, useAssetTransactions, type Asset } from '@/lib/financeCache'
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
  const { totalValue, totalCost, totalPerformance } = useAssetStats()
  const { createAsset, updateAsset, deleteAsset } = useAssetOperations()
  
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
    value: '',
    purchaseDate: '',
    purchasePrice: '',
    description: '',
    automaticValuation: false,
    externalId: '',
    accountId: ''
  })
  
  // Filtri e sorting
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAssetType, setSelectedAssetType] = useState<string>('all')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')
  const [sortField, setSortField] = useState<'name' | 'type' | 'value' | 'performance'>('value')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')



  // Effect per chiudere il dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectedAsset && !(event.target as Element).closest('.relative')) {
        setSelectedAsset(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedAsset])

  // Loading states
  if (authLoading) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

  const calculatePerformance = (currentValue: number, purchasePrice: number) => {
    return ((currentValue - purchasePrice) / purchasePrice) * 100
  }

  const filteredAndSortedAssets = assets
    .filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           asset.description?.toLowerCase().includes(searchTerm.toLowerCase())
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
        case 'performance':
          valueA = calculatePerformance(a.value, a.purchase_price)
          valueB = calculatePerformance(b.value, b.purchase_price)
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
      value: '',
      purchaseDate: '',
      purchasePrice: '',
      description: '',
      automaticValuation: false,
      externalId: '',
      accountId: ''
    })
    setAssetToEdit(null)
    setShowAddModal(true)
  }

  const handleEditAsset = (asset: Asset) => {
    setFormData({
      name: asset.name,
      type: asset.type,
      value: asset.value.toString(),
      purchaseDate: asset.purchase_date || asset.created_at.split('T')[0],
      purchasePrice: asset.purchase_price.toString(),
      description: asset.description || '',
      automaticValuation: asset.automatic_valuation || false,
      externalId: asset.external_id || '',
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
    if (!formData.name || !formData.value || !formData.purchaseDate || !formData.purchasePrice) {
      return
    }

    try {
      const assetData = {
        name: formData.name,
        type: formData.type,
        value: parseFloat(formData.value),
        purchase_date: formData.purchaseDate,
        purchase_price: parseFloat(formData.purchasePrice),
        description: formData.description,
        currency: 'EUR',
        automatic_valuation: formData.automaticValuation,
        external_id: formData.externalId || null,
        account_id: formData.accountId || null,
        last_valuation_date: new Date().toISOString()
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
  }

  // Header stats
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
    },
    {
      label: 'Acquisti Tracking',
      value: `${assets.filter(a => a.transaction_id).length}/${assets.length}`,
      color: 'purple'
    }
  ]

  // Header actions
  const headerActions: HeaderAction[] = [
    {
      label: 'Aggiungi',
      onClick: handleAddAsset,
      icon: <Plus className="w-4 h-4" />,
      color: 'green',
      hideTextOnMobile: true
    },
    {
      label: 'Aggiorna',
      onClick: refetch,
      icon: <RefreshCw className="w-4 h-4" />,
      color: 'blue',
      disabled: loading,
      loading: loading,
      hideTextOnMobile: true
    }  ]
  
  // Componente helper per visualizzare le transazioni dell'asset
  const AssetTransactionsContent = ({ assetId, formatCurrency }: { assetId: string, formatCurrency: (amount: number) => string }) => {
    const { assetTransactions, totalSpentOnAsset, totalReceivedFromAsset, transactionCount, loading, refetch: refetchAssetTransactions } = useAssetTransactions(assetId)
    const { linkAssetToTransaction, unlinkAssetFromTransaction } = useAssetOperations()
    const [showLinkForm, setShowLinkForm] = useState(false)
    const [selectedTransactionId, setSelectedTransactionId] = useState('')
    const [linkingTransaction, setLinkingTransaction] = useState(false)
    const [unlinkingTransaction, setUnlinkingTransaction] = useState<string | null>(null)    // Get all transactions that are not yet linked to any asset
    const unlinkedTransactions = financeData?.transactions?.filter(t => !t.asset_id) || []

    const handleLinkTransaction = async () => {
      if (!selectedTransactionId) return
      
      setLinkingTransaction(true)
      try {
        await linkAssetToTransaction(assetId, selectedTransactionId)
        setShowLinkForm(false)
        setSelectedTransactionId('')
        await refetchAssetTransactions() // Refresh asset transactions
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
            </p>
            {unlinkedTransactions.length > 0 && (
              <button
                onClick={() => setShowLinkForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Collega transazione esistente
              </button>
            )}
          </div>

          {/* Form per collegare transazione esistente */}
          {showLinkForm && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Collega transazione esistente</h4>
              <div className="space-y-3">
                <select
                  value={selectedTransactionId}
                  onChange={(e) => setSelectedTransactionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleziona una transazione</option>
                  {unlinkedTransactions.map((transaction) => (
                    <option key={transaction.id} value={transaction.id}>
                      {transaction.transaction_details} - {formatCurrency(transaction.current_amount)} ({new Date(transaction.transaction_date).toLocaleDateString('it-IT')})
                    </option>
                  ))}
                </select>
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
                    {linkingTransaction ? 'Collegando...' : 'Collega'}
                  </button>
                </div>
              </div>
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
            <h4 className="font-medium text-gray-900">Transazioni Correlate</h4>
            {unlinkedTransactions.length > 0 && (
              <button
                onClick={() => setShowLinkForm(true)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                + Collega altra transazione
              </button>
            )}
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
          </div>

          {/* Form per collegare transazione esistente */}
          {showLinkForm && (
            <div className="border border-gray-200 rounded-lg p-4 mt-4">
              <h4 className="font-medium text-gray-900 mb-3">Collega transazione esistente</h4>
              <div className="space-y-3">
                <select
                  value={selectedTransactionId}
                  onChange={(e) => setSelectedTransactionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleziona una transazione</option>
                  {unlinkedTransactions.map((transaction) => (
                    <option key={transaction.id} value={transaction.id}>
                      {transaction.transaction_details} - {formatCurrency(transaction.current_amount)} ({new Date(transaction.transaction_date).toLocaleDateString('it-IT')})
                    </option>
                  ))}
                </select>
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
                    {linkingTransaction ? 'Collegando...' : 'Collega'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <ModuleLayout moduleId="finance">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          stats={headerStats}
          actions={headerActions}
        />


        {/* Statistiche Riassuntive - Solo costo totale rimane qui */}
        <div className="mt-8 grid grid-cols-1 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Costo Totale</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalCost)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedAssets.map((asset) => {
                const AssetIcon = ASSET_TYPES[asset.type]?.icon || ASSET_TYPES.other.icon
                const performance = calculatePerformance(asset.value, asset.purchase_price)
                
                return (
                  <div key={asset.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${ASSET_TYPES[asset.type]?.color || ASSET_TYPES.other.color}`}>
                            <AssetIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{asset.name}</h3>
                              {asset.transaction_id && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                  <FileText className="w-3 h-3" />
                                  <span>Tracked</span>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{ASSET_TYPES[asset.type]?.label || 'Altri'}</p>
                            {asset.account_id && (
                              <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block mt-1">
                                {accounts.find(acc => acc.id === asset.account_id)?.name || 'Account sconosciuto'}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="relative">
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
                                </button>
                                <button
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

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Valore Attuale</span>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(asset.value)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Costo di Acquisto</span>
                          <span className="text-sm text-gray-500">
                            {formatCurrency(asset.purchase_price)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Performance</span>
                          <div className="flex items-center gap-1">
                            {performance >= 0 ? (
                              <TrendingUp className="w-4 h-4 text-green-600" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            )}
                            <span className={`text-sm font-medium ${performance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {`${performance.toFixed(2)}%`}
                            </span>
                          </div>
                        </div>

                        {asset.description && (
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-sm text-gray-600">{asset.description}</p>
                          </div>
                        )}

                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-400">
                            Acquistato il {new Date(asset.purchase_date || asset.created_at).toLocaleDateString('it-IT')} • 
                            Aggiornato il {new Date(asset.last_valuation_date || asset.updated_at).toLocaleDateString('it-IT')}
                          </p>
                        </div>
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data di Acquisto *
                  </label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prezzo di Acquisto (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrizione
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descrizione opzionale..."
                    rows={3}
                  />
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data di Acquisto *
                  </label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prezzo di Acquisto (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrizione
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descrizione opzionale..."
                    rows={3}
                  />
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
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
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

              <div className="mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Valore Attuale</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(selectedChartAsset.value)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Costo Acquisto</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(selectedChartAsset.purchase_price)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Performance</p>
                    <p className={`text-lg font-semibold ${
                      calculatePerformance(selectedChartAsset.value, selectedChartAsset.purchase_price) >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {calculatePerformance(selectedChartAsset.value, selectedChartAsset.purchase_price).toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-96">
                <AssetPerformanceChart
                  assetId={selectedChartAsset.id}
                  assetName={selectedChartAsset.name}
                  currentValue={selectedChartAsset.value}
                  purchasePrice={selectedChartAsset.purchase_price}
                  purchaseDate={selectedChartAsset.purchase_date || selectedChartAsset.created_at}
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
              </pre>
            </div>
          </div>
        )}
      </div>
    </ModuleLayout>
  )
}
