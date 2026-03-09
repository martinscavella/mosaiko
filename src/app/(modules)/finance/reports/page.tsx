'use client' 

import { useState, useMemo } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  CreditCard,
  Target,
  Package,
  RefreshCw,
  Download,
  Eye,
  Filter,
  X
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Pie,
  Cell, 
  Line, 
  Area, 
  AreaChart,
  LineChart
} from 'recharts'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import CacheStatus from '@/components/ui/CacheStatus'
import FinanceWidget from '@/components/ui/FinanceWidget'
import { useAuth } from '@/lib/auth'
import { formatCurrency, formatPercentage } from '@/lib/helpers/format'
import { 
  useFinanceCache, 
  useFinanceData, 
  useAllFinancialOperations, 
  useAccounts, 
  useAssets,
  useFinancialGoals,
  useAssetStats
} from '@/lib/financeCache'

type ReportTab = 'overview' | 'accounts' | 'transactions' | 'assets' | 'goals'

interface DateRange {
  start: Date | null
  end: Date | null
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth()
  const { stats, loading, error } = useFinanceData()
  const { operations: allOperations, transactions } = useAllFinancialOperations()
  const { accounts } = useAccounts()
  const { assets } = useAssets()
  const { goals } = useFinancialGoals()
  const { refetch, isDataStale } = useFinanceCache()
  const assetStats = useAssetStats()
  
  const [activeTab, setActiveTab] = useState<ReportTab>('overview')
  
  // Filtri dinamici
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1), // Ultimi 3 mesi
    end: new Date()
  })
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)

  // Funzione per filtrare le operazioni finanziarie (transactions + refunds + transfers)
  const filteredOperations = useMemo(() => {
    const filtered = allOperations.filter(operation => {
      const operationDate = new Date(operation.date)
      
      // Filtro per data
      if (dateRange.start && operationDate < dateRange.start) return false
      if (dateRange.end && operationDate > dateRange.end) return false
      
      // Filtro per account - se nessun account è selezionato, mostra tutti
      if (selectedAccounts.length > 0 && operation.accountName && 
          !selectedAccounts.includes(operation.accountName)) return false
      
      return true
    })
    
    // Debug per vedere se i filtri funzionano
    console.log('🔍 Filtri Debug:', {
      totalOperations: allOperations.length,
      filteredOperations: filtered.length,
      dateRange,
      selectedAccounts: selectedAccounts.length,
      accountsList: selectedAccounts
    })
    
    return filtered
  }, [allOperations, dateRange, selectedAccounts])

  // Manteniamo anche il filtro solo per transazioni per compatibilità con il resto del codice
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.transaction_date)
      
      // Filtro per data
      if (dateRange.start && transactionDate < dateRange.start) return false
      if (dateRange.end && transactionDate > dateRange.end) return false
      
      // Filtro per account - se nessun account è selezionato, mostra tutti
      if (selectedAccounts.length > 0 && transaction.account_name && 
          !selectedAccounts.includes(transaction.account_name)) return false
      
      return true
    })
  }, [transactions, dateRange, selectedAccounts])

  // Lista degli account per il filtro (da tutte le operazioni)
  const accountOptions = useMemo(() => {
    const uniqueAccounts = Array.from(new Set(allOperations
      .map(op => op.accountName)
      .filter((name): name is string => !!name) // Type guard per escludere undefined
    ))
    return uniqueAccounts.sort()
  }, [allOperations])

  // Calcoli per statistiche avanzate (usando transazioni filtrate)
  const advancedStats = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    // Transazioni del mese corrente (filtrate)
    const currentMonthTransactions = filteredTransactions.filter(t => {
      const transactionDate = new Date(t.transaction_date)
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear
    })
    
    // Transazioni del mese precedente per confronto (filtrate)
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const lastMonthTransactions = filteredTransactions.filter(t => {
      const transactionDate = new Date(t.transaction_date)
      return transactionDate.getMonth() === lastMonth && 
             transactionDate.getFullYear() === lastMonthYear
    })
    
    // Calcoli per categorie (escludendo transazioni con assetId)
    const categoryStats = filteredTransactions.reduce((acc, transaction) => {
      if (transaction.current_amount < 0 && transaction.categories?.name && !transaction.asset_id) {
        const category = transaction.categories.name
        
        if (!acc[category]) {
          acc[category] = { total: 0, count: 0 }
        }
        
        acc[category].total += Math.abs(transaction.current_amount)
        acc[category].count += 1
      }
      return acc
    }, {} as Record<string, { total: number, count: number }>)
    
    // Trend mensile per categorie (ultimi 6 mesi)
    const categoryTrend = {} as Record<string, Array<{ month: string, amount: number }>>
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = targetDate.toLocaleDateString('it-IT', { month: 'short' })
      
      const monthTransactions = filteredTransactions.filter(t => {
        const transactionDate = new Date(t.transaction_date)
        return transactionDate.getMonth() === targetDate.getMonth() && 
               transactionDate.getFullYear() === targetDate.getFullYear()
      })
      
      Object.keys(categoryStats).forEach(category => {
        if (!categoryTrend[category]) categoryTrend[category] = []
        
        const monthAmount = monthTransactions
          .filter(t => t.categories?.name === category && t.current_amount < 0 && !t.asset_id)
          .reduce((sum, t) => sum + Math.abs(t.current_amount), 0)
          
        categoryTrend[category].push({ month: monthName, amount: monthAmount })
      })
    }
    
    const topCategory = Object.entries(categoryStats).sort((a, b) => b[1].total - a[1].total)[0]
    
    // Calcoli per account più attivi
    const accountActivity = currentMonthTransactions.reduce((acc, transaction) => {
      if (transaction.account_name) {
        acc[transaction.account_name] = (acc[transaction.account_name] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)
    
    const mostActiveAccount = Object.entries(accountActivity).sort((a, b) => b[1] - a[1])[0]
    
    // Transazioni rimborsate
    const refundedTransactions = filteredTransactions.filter(t => t.is_refunded)
    const totalRefunded = refundedTransactions.reduce((sum, t) => sum + Math.abs(t.current_amount), 0)
    
    // Asset performance
    const totalAssetValue = assets.reduce((sum, asset) => sum + asset.value, 0)
    
    // Calcoli per entrate e uscite
    const totalIncome = filteredTransactions
      .filter(t => t.current_amount > 0)
      .reduce((sum, t) => sum + t.current_amount, 0)
    
    const totalExpenses = filteredTransactions
      .filter(t => t.current_amount < 0 && !t.asset_id)
      .reduce((sum, t) => sum + Math.abs(t.current_amount), 0)
    
    return {
      currentMonthTransactions: currentMonthTransactions.length,
      lastMonthTransactions: lastMonthTransactions.length,
      transactionGrowth: lastMonthTransactions.length > 0 
        ? ((currentMonthTransactions.length - lastMonthTransactions.length) / lastMonthTransactions.length) * 100 
        : 0,
      topCategory: topCategory ? { 
        name: topCategory[0], 
        amount: topCategory[1].total,
        count: topCategory[1].count
      } : null,
      categoryStats,
      categoryTrend,
      mostActiveAccount: mostActiveAccount ? { name: mostActiveAccount[0], count: mostActiveAccount[1] } : null,
      totalRefunded,
      refundedCount: refundedTransactions.length,
      totalAssetValue,
      totalIncome,
      totalExpenses,
      netFlow: totalIncome - totalExpenses,
      avgTransactionAmount: currentMonthTransactions.length > 0 
        ? currentMonthTransactions.reduce((sum, t) => sum + Math.abs(t.current_amount), 0) / currentMonthTransactions.length 
        : 0
    }
  }, [filteredTransactions, assets])

  // Funzione di export
  const handleExport = (format: 'csv' | 'pdf' | 'json') => {
    const exportData = {
      period: {
        start: dateRange.start?.toISOString(),
        end: dateRange.end?.toISOString(),
        selectedAccounts
      },
      summary: {
        totalOperations: filteredOperations.length,
        totalTransactions: filteredTransactions.length,
        totalRefunds: filteredOperations.filter(op => op.type === 'refund').length,
        totalFundsTransfer: filteredOperations.filter(op => op.type === 'fund_transfer').length,
        totalIncome: advancedStats.totalIncome,
        totalExpenses: advancedStats.totalExpenses,
        netFlow: advancedStats.netFlow,
        categoryStats: advancedStats.categoryStats
      },
      operations: filteredOperations.map(op => ({
        data: op.date,
        operazione: op.operationType || 'N/A',
        dettagli: op.details || '',
        contabilizzazione: op.isRefunded ? 'CONTABILIZZATO' : 'NON CONTABILIZZATO',
        contoOCarta: op.accountName || '',
        categoria: op.categories?.name || '',
        valuta: 'EUR',
        importo: op.amount,
        tipoOperazione: op.type // transaction, refund, fund_transfer
      }))
    }

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `finance-report-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } else if (format === 'csv') {
      const csvContent = [
        'Data,Operazione,Dettagli,Contabilizzazione,Conto o carta,Categoria,Valuta,Importo,Tipo Operazione',
        ...filteredOperations.map(op => 
          `${op.date},"${op.operationType || 'N/A'}","${(op.details || '').replace(/"/g, '""')}","${op.isRefunded ? 'CONTABILIZZATO' : 'NON CONTABILIZZATO'}","${op.accountName || ''}","${(op.categories?.name || '').replace(/"/g, '""')}","EUR",${op.amount},"${op.type}"`
        )
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `finance-report-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else if (format === 'pdf') {
      // Per il PDF potremmo usare una libreria come jsPDF
      console.log('PDF export would be implemented here')
      alert('Export PDF sarà disponibile prossimamente!')
    }
    
    setShowExportModal(false)
  }

  const tabs = [
    { id: 'overview' as ReportTab, label: 'Panoramica', icon: BarChart3 },
    { id: 'accounts' as ReportTab, label: 'Account', icon: CreditCard },
    { id: 'transactions' as ReportTab, label: 'Transazioni', icon: TrendingUp },
    { id: 'assets' as ReportTab, label: 'Asset', icon: Package },
    { id: 'goals' as ReportTab, label: 'Obiettivi', icon: Target }
  ]

  if (authLoading) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </ModuleLayout>
    )
  }

  if (!user) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
          <div className="text-center">
            <p className="text-gray-500">Devi effettuare il login per visualizzare i report finanziari</p>
          </div>
        </div>
      </ModuleLayout>
    )
  }

  const renderOverviewTab = () => {
    // Calcoli dinamici basati sui dati filtrati
    const filteredIncome = filteredTransactions
      .filter(t => t.current_amount > 0)
      .reduce((sum, t) => sum + t.current_amount, 0)
    
    const filteredExpenses = filteredTransactions
      .filter(t => t.current_amount < 0 && !t.asset_id)
      .reduce((sum, t) => sum + Math.abs(t.current_amount), 0)
    
    const filteredSavingsRate = filteredIncome > 0 ? ((filteredIncome - filteredExpenses) / filteredIncome) * 100 : 0
    
    // Account attivi nel periodo filtrato
    const filteredActiveAccounts = Array.from(new Set(
      filteredTransactions.map(t => t.account_name).filter(Boolean)
    )).length
    
    // Asset del periodo (se filtrati per account/periodo)
    const filteredAssets = selectedAccounts.length > 0 
      ? assets.filter(asset => 
          filteredTransactions.some(t => t.asset_id === asset.id)
        )
      : assets
    
    const filteredAssetValue = filteredAssets.reduce((sum, asset) => sum + asset.value, 0)

    // Dati per grafico trend transazioni (periodo filtrato invece di fisso 6 mesi)
    const monthlyTransactionData = (() => {
      if (!dateRange.start || !dateRange.end) {
        // Se non c'è range, usa ultimi 6 mesi come default
        return Array.from({ length: 6 }, (_, i) => {
          const date = new Date()
          date.setMonth(date.getMonth() - (5 - i))
          const month = date.getMonth()
          const year = date.getFullYear()
          
          const monthTransactions = filteredTransactions.filter(t => {
            const tDate = new Date(t.transaction_date)
            return tDate.getMonth() === month && tDate.getFullYear() === year
          })
          
          const income = monthTransactions
            .filter(t => t.current_amount > 0)
            .reduce((sum, t) => sum + t.current_amount, 0)
          
          const expenses = Math.abs(monthTransactions
            .filter(t => t.current_amount < 0 && !t.asset_id)
            .reduce((sum, t) => sum + t.current_amount, 0))

          return {
            month: date.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
            entrate: income,
            uscite: expenses,
            netto: income - expenses
          }
        })
      }
      
      // Se c'è un range di date, crea dati per quel periodo
      const startDate = new Date(dateRange.start)
      const endDate = new Date(dateRange.end)
      const monthsInRange = []
      
      const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      while (current <= endDate) {
        const monthTransactions = filteredTransactions.filter(t => {
          const tDate = new Date(t.transaction_date)
          return tDate.getMonth() === current.getMonth() && tDate.getFullYear() === current.getFullYear()
        })
        
        const income = monthTransactions
          .filter(t => t.current_amount > 0)
          .reduce((sum, t) => sum + t.current_amount, 0)
        
        const expenses = Math.abs(monthTransactions
          .filter(t => t.current_amount < 0 && !t.asset_id)
          .reduce((sum, t) => sum + t.current_amount, 0))

        monthsInRange.push({
          month: current.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
          entrate: income,
          uscite: expenses,
          netto: income - expenses
        })
        
        current.setMonth(current.getMonth() + 1)
      }
      
      return monthsInRange
    })()

    return (
      <div className="space-y-8">
        {/* Statistiche Principali */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FinanceWidget
            title="Patrimonio"
            value={formatCurrency(
              selectedAccounts.length > 0 
                ? accounts.filter(acc => selectedAccounts.includes(acc.name))
                    .reduce((sum, acc) => sum + acc.current_balance, 0)
                : stats.totalBalance
            )}
            subtitle={selectedAccounts.length > 0 
              ? `${selectedAccounts.length} account selezionati`
              : `${accounts.length} account attivi`
            }
            icon="balance"
            color="blue"
            loading={loading}
          />
          <FinanceWidget
            title="Entrate Periodo"
            value={formatCurrency(filteredIncome)}
            subtitle={dateRange.start && dateRange.end 
              ? `${dateRange.start.toLocaleDateString('it-IT')} - ${dateRange.end.toLocaleDateString('it-IT')}`
              : stats.currentMonth
            }
            icon="income"
            color="green"
            trend={filteredIncome > 0 ? 'up' : 'neutral'}
            loading={loading}
          />
          <FinanceWidget
            title="Uscite Periodo"
            value={formatCurrency(filteredExpenses)}
            subtitle={advancedStats.topCategory ? `Top: ${advancedStats.topCategory.name}` : `${filteredTransactions.filter(t => t.current_amount < 0).length} transazioni`}
            icon="expenses"
            color="red"
            trend={filteredExpenses > 0 ? 'down' : 'neutral'}
            loading={loading}
          />
          <FinanceWidget
            title="Tasso Risparmio"
            value={`${filteredSavingsRate.toFixed(1)}%`}
            subtitle={filteredIncome > 0 ? "Periodo filtrato" : "Nessuna entrata"}
            icon="savings"
            color="purple"
            trend={filteredSavingsRate > 20 ? 'up' : filteredSavingsRate > 10 ? 'neutral' : 'down'}
            loading={loading}
          />
        </div>

        {/* Statistiche Secondarie */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FinanceWidget
            title="Transazioni Filtrate"
            value={filteredTransactions.length}
            subtitle={`${formatPercentage((filteredTransactions.length / transactions.length) * 100 - 100)} vs totale`}
            icon="transactions"
            color="purple"
            trend={filteredTransactions.length === transactions.length ? 'neutral' : 'down'}
            loading={loading}
          />
          <FinanceWidget
            title="Asset Filtrati"
            value={filteredAssets.length}
            subtitle={formatCurrency(filteredAssetValue)}
            icon="accounts"
            color="blue"
            loading={loading}
          />
          <FinanceWidget
            title="Rimborsi Periodo"
            value={formatCurrency(advancedStats.totalRefunded)}
            subtitle={`${advancedStats.refundedCount} transazioni`}
            icon="goals"
            color="green"
            loading={loading}
          />
          <FinanceWidget
            title="Account Attivi"
            value={filteredActiveAccounts}
            subtitle={selectedAccounts.length > 0 ? "Account filtrati" : "Tutti gli account"}
            icon="balance"
            color="blue"
            loading={loading}
          />
        </div>

        {/* Grafico Trend + Insights + Comparazione */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Trend Entrate/Uscite */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                Trend Entrate/Uscite 
                {dateRange.start && dateRange.end ? (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    ({monthlyTransactionData.length} {monthlyTransactionData.length === 1 ? 'mese' : 'mesi'})
                  </span>
                ) : (
                  <span className="text-sm font-normal text-gray-600 ml-2">(6 mesi)</span>
                )}
              </h3>
              <div className="flex items-center space-x-2 text-sm">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Entrate</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-600">Uscite</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Netto</span>
                </div>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTransactionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `€${(value).toFixed()}`}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        entrate: 'Entrate',
                        uscite: 'Uscite',
                        netto: 'Saldo Netto'
                      }
                      return [`€${value.toLocaleString()}`, labels[name] || name]
                    }}
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="entrate" 
                    stackId="1" 
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="uscite" 
                    stackId="2" 
                    stroke="#ef4444" 
                    fill="#ef4444" 
                    fillOpacity={0.6}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="netto" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Mini statistiche sotto il grafico */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-500">Media Entrate</p>
                  <p className="font-semibold text-green-600">
                    {formatCurrency(monthlyTransactionData.reduce((sum, d) => sum + d.entrate, 0) / monthlyTransactionData.length)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Media Uscite</p>
                  <p className="font-semibold text-red-600">
                    {formatCurrency(monthlyTransactionData.reduce((sum, d) => sum + d.uscite, 0) / monthlyTransactionData.length)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Saldo Medio</p>
                  <p className={`font-semibold ${ 
                    monthlyTransactionData.reduce((sum, d) => sum + d.netto, 0) / monthlyTransactionData.length >= 0 
                      ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(monthlyTransactionData.reduce((sum, d) => sum + d.netto, 0) / monthlyTransactionData.length)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Insights Avanzati */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Eye className="h-5 w-5 text-blue-600 mr-2" />
              Insights Intelligenti
            </h3>
            <div className="space-y-4">
              {/* Performance del periodo */}
              <div className={`rounded-lg p-4 ${advancedStats.netFlow >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <h4 className={`font-medium mb-1 ${advancedStats.netFlow >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  Bilancio del Periodo
                </h4>
                <p className={`text-sm ${advancedStats.netFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {advancedStats.netFlow >= 0 
                    ? `Hai risparmiato ${formatCurrency(advancedStats.netFlow)} nel periodo selezionato!`
                    : `Hai speso ${formatCurrency(Math.abs(advancedStats.netFlow))} più di quanto guadagnato.`
                  }
                </p>
                <div className="mt-2 text-xs text-gray-600">
                  Entrate: {formatCurrency(advancedStats.totalIncome)} | 
                  Uscite: {formatCurrency(advancedStats.totalExpenses)}
                </div>
              </div>

              {/* Account più attivo */}
              {advancedStats.mostActiveAccount && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-1">Account più Attivo</h4>
                  <p className="text-blue-700 text-sm">
                    <strong>{advancedStats.mostActiveAccount.name}</strong> con {advancedStats.mostActiveAccount.count} transazioni
                  </p>
                  <div className="mt-2 text-xs text-blue-600">
                    {((advancedStats.mostActiveAccount.count / advancedStats.currentMonthTransactions) * 100).toFixed(0)}% 
                    delle tue transazioni mensili
                  </div>
                </div>
              )}

              {/* Top categoria */}
              {advancedStats.topCategory && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <h4 className="font-medium text-orange-900 mb-1">Categoria Top Spesa</h4>
                  <p className="text-orange-700 text-sm">
                    <strong>{advancedStats.topCategory.name}</strong>: {formatCurrency(advancedStats.topCategory.amount)}
                  </p>
                  <div className="mt-2 text-xs text-orange-600">
                    {advancedStats.topCategory.count} transazioni • 
                    {advancedStats.totalExpenses > 0 
                      ? ((advancedStats.topCategory.amount / advancedStats.totalExpenses) * 100).toFixed(0)
                      : '0'
                    }% del totale uscite
                  </div>
                </div>
              )}

              {/* Obiettivi */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-1">Progress Obiettivi</h4>
                <p className="text-purple-700 text-sm">
                  {stats.goalProgress.toFixed(1)}% completamento medio su {goals.length} obiettivi
                </p>
                <div className="mt-2 w-full bg-purple-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(stats.goalProgress, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Raccomandazione intelligente */}
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                <h4 className="font-medium text-gray-900 mb-1">💡 Raccomandazione</h4>
                <p className="text-gray-700 text-sm">
                  {advancedStats.netFlow < 0 
                    ? `Considera di ridurre le spese in "${advancedStats.topCategory?.name || 'categorie principali'}" per migliorare il bilancio.`
                    : advancedStats.totalAssetValue < advancedStats.totalIncome * 3
                      ? 'Il tuo risparmio è buono! Considera di investire parte delle entrate in asset per far crescere il patrimonio.'
                      : 'Ottima gestione finanziaria! Mantieni questo trend per raggiungere i tuoi obiettivi.'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sezione Comparazione Periodi */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
            Analisi Comparativa
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Crescita Transazioni */}
            <div className="bg-white rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold ${advancedStats.transactionGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(advancedStats.transactionGrowth)}
              </div>
              <p className="text-sm text-gray-600 mt-1">Crescita Transazioni</p>
              <p className="text-xs text-gray-500 mt-1">vs Mese Precedente</p>
            </div>

            {/* Efficienza di Spesa */}
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {advancedStats.totalIncome > 0 
                  ? ((advancedStats.totalExpenses / advancedStats.totalIncome) * 100).toFixed(0)
                  : '0'
                }%
              </div>
              <p className="text-sm text-gray-600 mt-1">Efficienza Spesa</p>
              <p className="text-xs text-gray-500 mt-1">Uscite/Entrate Ratio</p>
            </div>

            {/* Diversificazione Account */}
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {accountOptions.length}
              </div>
              <p className="text-sm text-gray-600 mt-1">Account Utilizzati</p>
              <p className="text-xs text-gray-500 mt-1">nel periodo filtrato</p>
            </div>

            {/* Score Finanziario */}
            <div className="bg-white rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold ${
                advancedStats.netFlow >= 0 && stats.goalProgress > 50 
                  ? 'text-green-600' 
                  : advancedStats.netFlow >= 0 || stats.goalProgress > 30
                    ? 'text-yellow-600'
                    : 'text-red-600'
              }`}>
                {advancedStats.netFlow >= 0 && stats.goalProgress > 50 
                  ? 'A' 
                  : advancedStats.netFlow >= 0 || stats.goalProgress > 30
                    ? 'B'
                    : 'C'
                }
              </div>
              <p className="text-sm text-gray-600 mt-1">Score Finanziario</p>
              <p className="text-xs text-gray-500 mt-1">Bilancio + Obiettivi</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderAccountsTab = () => {
    // Filtra gli account in base al filtro selezionato
    const filteredAccountsData = selectedAccounts.length > 0 
      ? accounts.filter(acc => selectedAccounts.includes(acc.name))
      : accounts
    
    // Statistiche degli account filtrati
    const filteredAccountsBalance = filteredAccountsData.reduce((sum, acc) => sum + acc.current_balance, 0)
    const activeFilteredAccounts = filteredAccountsData.filter(acc => acc.current_balance > 0).length

    // Dati per grafico account balance (solo account filtrati)
    const accountBalanceData = filteredAccountsData
      .sort((a, b) => b.current_balance - a.current_balance)
      .slice(0, 8)
      .map(account => ({
        name: account.name.length > 12 ? account.name.substring(0, 12) + '...' : account.name,
        saldo: account.current_balance,
        tipo: account.type,
        color: account.color
      }))

    // Transazioni per account nel periodo filtrato
    const accountTransactionsInPeriod = filteredAccountsData.map(account => {
      const accountFilteredTransactions = filteredTransactions.filter(t => t.account_name === account.name)
      return {
        ...account,
        transactionsCount: accountFilteredTransactions.length,
        totalMovements: accountFilteredTransactions.reduce((sum, t) => sum + Math.abs(t.current_amount), 0)
      }
    })

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FinanceWidget
            title={selectedAccounts.length > 0 ? "Account Selezionati" : "Account Totali"}
            value={filteredAccountsData.length}
            subtitle={selectedAccounts.length > 0 ? "Account filtrati" : "Conti collegati"}
            icon="accounts"
            color="blue"
            loading={loading}
          />
          <FinanceWidget
            title="Saldo Filtrato"
            value={formatCurrency(filteredAccountsBalance)}
            subtitle={filteredAccountsData.length > 0 
              ? `Media: ${formatCurrency(filteredAccountsBalance / filteredAccountsData.length)}`
              : "Nessun account"
            }
            icon="balance"
            color="green"
            loading={loading}
          />
          <FinanceWidget
            title="Account Attivi"
            value={activeFilteredAccounts}
            subtitle={selectedAccounts.length > 0 
              ? "Con saldo positivo (filtrati)"
              : "Con saldo positivo"
            }
            icon="accounts"
            color="purple"
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Grafico Saldi Account */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
              Saldi Account 
              {selectedAccounts.length > 0 && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  ({selectedAccounts.length} filtrati)
                </span>
              )}
            </h3>
            {accountBalanceData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={accountBalanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `€${(value).toFixed(0)}`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`€${value.toLocaleString()}`, 'Saldo']}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                    />
                    <Bar 
                      dataKey="saldo" 
                      fill="#3b82f6" 
                      radius={[4, 4, 0, 0]}
                      name="Saldo"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Nessun account da visualizzare</p>
                  <p className="text-sm">Modifica i filtri per vedere i dati</p>
                </div>
              </div>
            )}
          </div>

          {/* Lista Account */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Dettaglio Account
                {selectedAccounts.length > 0 && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    (filtrati per periodo)
                  </span>
                )}
              </h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
              {accountTransactionsInPeriod.length > 0 ? (
                accountTransactionsInPeriod.map((account) => (
                  <div key={account.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: account.color }}></div>
                      <div>
                        <h4 className="font-medium text-gray-900">{account.name}</h4>
                        <p className="text-sm text-gray-500">
                          {account.type} • {account.transactionsCount} transazioni nel periodo
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${account.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(account.current_balance)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Movimenti: {formatCurrency(account.totalMovements)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  <p>Nessun account corrisponde ai filtri selezionati</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderTransactionsTab = () => {
    // Dati per grafico spese per categoria (usando transazioni filtrate)
    const categoryChartData = Object.entries(advancedStats.categoryStats)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 8) // Top 8 categorie
      .map(([name, stats]) => ({
        name,
        value: stats.total,
        count: stats.count,
        percentage: advancedStats.totalExpenses > 0 ? ((stats.total / advancedStats.totalExpenses) * 100).toFixed(1) : '0'
      }))

    const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316']

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <FinanceWidget
            title="Transazioni Filtrate"
            value={filteredTransactions.length}
            subtitle={`${transactions.length} totali`}
            icon="transactions"
            color="blue"
            loading={loading}
          />
          <FinanceWidget
            title="Periodo Attuale"
            value={filteredTransactions.filter(t => t.current_amount < 0 && !t.asset_id).length}
            subtitle="Uscite nel periodo"
            icon="transactions"
            color="red"
            loading={loading}
          />
          <FinanceWidget
            title="Categorie Attive"
            value={Object.keys(advancedStats.categoryStats).length}
            subtitle="Con spese nel periodo"
            icon="transactions"
            color="purple"
            loading={loading}
          />
          <FinanceWidget
            title="Spesa Media"
            value={formatCurrency(Object.keys(advancedStats.categoryStats).length > 0 ? 
              Object.values(advancedStats.categoryStats).reduce((sum, cat) => sum + cat.total, 0) / Object.keys(advancedStats.categoryStats).length : 0)}
            subtitle="Per categoria"
            icon="balance"
            color="purple"
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Grafico Spese per Categoria */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <PieChart className="h-5 w-5 text-purple-600 mr-2" />
              Distribuzione Spese per Categoria
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie 
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    label={({name, percentage}) => `${name}: ${percentage}%`}
                    labelLine={false}
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`€${value.toLocaleString()}`, 'Spesa']}
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trend Categorie - COMPLETAMENTE DINAMICO */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
              Trend Spese per Categoria
              {dateRange.start && dateRange.end ? (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  (Periodo Filtrato)
                </span>
              ) : (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  (6 mesi)
                </span>
              )}
            </h3>
            
            {/* Lista delle top categorie */}
            <div className="mb-4 flex flex-wrap gap-2">
              {Object.entries(advancedStats.categoryStats)
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 4)
                .map(([category], index) => (
                  <div key={category} className="flex items-center space-x-1 text-xs">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="text-gray-600">{category}</span>
                  </div>
                ))}
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {Object.keys(advancedStats.categoryTrend).length > 0 ? (
                  (() => {
                    // Dati dinamici per il trend basati sui filtri
                    const trendData = (() => {
                      if (!dateRange.start || !dateRange.end) {
                        // Default: ultimi 6 mesi
                        return Array.from({ length: 6 }, (_, i) => {
                          const date = new Date()
                          date.setMonth(date.getMonth() - (5 - i))
                          const monthName = date.toLocaleDateString('it-IT', { month: 'short' })
                          
                          const monthTransactions = filteredTransactions.filter(t => {
                            const tDate = new Date(t.transaction_date)
                            return tDate.getMonth() === date.getMonth() && 
                                   tDate.getFullYear() === date.getFullYear()
                          })
                          
                          const result: { [key: string]: string | number } = { month: monthName }
                          Object.keys(advancedStats.categoryStats).slice(0, 4).forEach(category => {
                            const categoryAmount = monthTransactions
                              .filter(t => t.categories?.name === category && t.current_amount < 0 && !t.asset_id)
                              .reduce((sum, t) => sum + Math.abs(t.current_amount), 0)
                            result[category] = categoryAmount
                          })
                          
                          return result
                        })
                      } else {
                        // Periodo filtrato: dividi in mesi
                        const data = []
                        const current = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), 1)
                        const end = new Date(dateRange.end)
                        
                        while (current <= end) {
                          const monthName = current.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
                          const monthTransactions = filteredTransactions.filter(t => {
                            const tDate = new Date(t.transaction_date)
                            return tDate.getMonth() === current.getMonth() && 
                                   tDate.getFullYear() === current.getFullYear()
                          })
                          
                          const result: { [key: string]: string | number } = { month: monthName }
                          Object.keys(advancedStats.categoryStats).slice(0, 4).forEach(category => {
                            const categoryAmount = monthTransactions
                              .filter(t => t.categories?.name === category && t.current_amount < 0 && !t.asset_id)
                              .reduce((sum, t) => sum + Math.abs(t.current_amount), 0)
                            result[category] = categoryAmount
                          })
                          
                          data.push(result)
                          current.setMonth(current.getMonth() + 1)
                        }
                        
                        return data
                      }
                    })()

                    return (
                      <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `€${(value).toFixed(0)}`}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => [`€${value.toLocaleString()}`, name]}
                          labelStyle={{ color: '#374151' }}
                          contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                        />
                        <Legend />
                        {Object.keys(advancedStats.categoryStats).slice(0, 4).map((category, index) => (
                          <Line
                            key={category}
                            type="monotone"
                            dataKey={category}
                            stroke={COLORS[index % COLORS.length]}
                            strokeWidth={2}
                            dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 2, r: 4 }}
                            name={category}
                          />
                        ))}
                      </LineChart>
                    )
                  })()
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <PieChart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>Nessun dato di trend disponibile</p>
                      <p className="text-sm">
                        {filteredTransactions.length === 0 
                          ? 'Nessuna transazione nel periodo filtrato'
                          : 'Seleziona un periodo con più transazioni categorizzate'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </ResponsiveContainer>
            </div>

            {/* Statistiche sotto il grafico */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-500">Categorie Attive</p>
                  <p className="font-semibold text-blue-600">{Object.keys(advancedStats.categoryStats).length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Spesa Media</p>
                  <p className="font-semibold text-purple-600">
                    {formatCurrency(Object.keys(advancedStats.categoryStats).length > 0 
                      ? advancedStats.totalExpenses / Object.keys(advancedStats.categoryStats).length 
                      : 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Categoria Top</p>
                  <p className="font-semibold text-orange-600 text-xs">
                    {advancedStats.topCategory?.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">% Top Categoria</p>
                  <p className="font-semibold text-red-600">
                    {advancedStats.topCategory && advancedStats.totalExpenses > 0 
                      ? ((advancedStats.topCategory.amount / advancedStats.totalExpenses) * 100).toFixed(0)
                      : '0'
                    }%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analisi dettagliata per categoria */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Classifica Categorie */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Classifica Spese per Categoria</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {Object.entries(advancedStats.categoryStats)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([category, stats], index) => {
                  const percentage = advancedStats.totalExpenses > 0 ? (stats.total / advancedStats.totalExpenses) * 100 : 0
                  return (
                    <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <div>
                          <h4 className="font-medium text-gray-900">{category}</h4>
                          <p className="text-sm text-gray-500">{stats.count} transazioni</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(stats.total)}</p>
                        <p className="text-sm text-gray-500">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Statistiche per Periodo */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiche del Periodo</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900">Periodo Selezionato</h4>
                    <p className="text-blue-700 text-sm">
                      {dateRange.start ? dateRange.start.toLocaleDateString('it-IT') : 'Inizio'} - {' '}
                      {dateRange.end ? dateRange.end.toLocaleDateString('it-IT') : 'Fine'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-blue-900">{filteredTransactions.length}</p>
                    <p className="text-blue-700 text-sm">Transazioni</p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-red-900">Totale Uscite</h4>
                    <p className="text-red-700 text-sm">{Object.keys(advancedStats.categoryStats).length} categorie</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-900">{formatCurrency(advancedStats.totalExpenses)}</p>
                    <p className="text-red-700 text-sm">
                      Avg: {formatCurrency(Object.keys(advancedStats.categoryStats).length > 0 ? 
                        advancedStats.totalExpenses / Object.keys(advancedStats.categoryStats).length : 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-green-900">Entrate del Periodo</h4>
                    <p className="text-green-700 text-sm">Bilancio netto</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-900">{formatCurrency(advancedStats.totalIncome)}</p>
                    <p className={`text-sm ${advancedStats.netFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {advancedStats.netFlow >= 0 ? '+' : ''}{formatCurrency(advancedStats.netFlow)}
                    </p>
                  </div>
                </div>
              </div>

              {selectedAccounts.length > 0 && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-purple-900">Account Filtrati</h4>
                      <p className="text-purple-700 text-sm">{selectedAccounts.length} selezionati</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-purple-700">
                        {selectedAccounts.slice(0, 2).join(', ')}
                        {selectedAccounts.length > 2 && ` +${selectedAccounts.length - 2}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderAssetsTab = () => {
    // Asset filtrati in base al periodo e agli account
    const filteredAssets = (() => {
      if (selectedAccounts.length === 0 && !dateRange.start && !dateRange.end) {
        return assets // Nessun filtro = tutti gli asset
      }
      
      // Filtra asset che hanno transazioni nel periodo/account filtrati
      return assets.filter(asset => {
        // Se ci sono filtri account, controlla se l'asset ha transazioni in quegli account
        if (selectedAccounts.length > 0) {
          const hasTransactionInSelectedAccounts = filteredTransactions.some(t => 
            t.asset_id === asset.id && t.account_name && selectedAccounts.includes(t.account_name)
          )
          if (!hasTransactionInSelectedAccounts) return false
        }
        
        // Se c'è filtro periodo, controlla se l'asset ha transazioni nel periodo
        if (dateRange.start || dateRange.end) {
          const hasTransactionInPeriod = filteredTransactions.some(t => t.asset_id === asset.id)
          if (!hasTransactionInPeriod) return false
        }
        
        return true
      })
    })()

    // Statistiche degli asset filtrati
    const filteredAssetStats = {
      totalValue: filteredAssets.reduce((sum, asset) => sum + asset.value, 0),
      assetsByType: filteredAssets.reduce((acc, asset) => {
        if (!acc[asset.type]) {
          acc[asset.type] = { totalValue: 0, count: 0 }
        }
        acc[asset.type].totalValue += asset.value
        acc[asset.type].count += 1
        return acc
      }, {} as Record<string, { totalValue: number, count: number }>)
    }

    // Dati per grafico asset allocation (solo asset filtrati)
    const assetAllocationData = Object.entries(filteredAssetStats.assetsByType)
      .map(([name, data]) => ({
        name,
        value: data.totalValue,
        count: data.count
      }))
      .sort((a, b) => b.value - a.value)

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <FinanceWidget
            title={selectedAccounts.length > 0 || dateRange.start || dateRange.end ? "Asset Filtrati" : "Asset Totali"}
            value={filteredAssets.length}
            subtitle={
              selectedAccounts.length > 0 || dateRange.start || dateRange.end 
                ? `${assets.length - filteredAssets.length} nascosti dai filtri`
                : "Investimenti attivi"
            }
            icon="accounts"
            color="blue"
            loading={loading}
          />
          <FinanceWidget
            title="Valore Filtrato"
            value={formatCurrency(filteredAssetStats.totalValue)}
            subtitle={
              filteredAssets.length !== assets.length
                ? `${((filteredAssetStats.totalValue / assetStats.totalValue) * 100).toFixed(1)}% del totale`
                : "Portafoglio asset"
            }
            icon="balance"
            color="green"
            loading={loading}
          />
          <FinanceWidget
            title="Tipi Asset"
            value={Object.keys(filteredAssetStats.assetsByType).length}
            subtitle={
              selectedAccounts.length > 0 || dateRange.start || dateRange.end
                ? "Nel periodo filtrato"
                : "Diversificazione"
            }
            icon="accounts"
            color="purple"
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Grafico Asset Allocation */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="h-5 w-5 text-orange-600 mr-2" />
              Asset Allocation
              {(selectedAccounts.length > 0 || dateRange.start || dateRange.end) && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  (Filtrata)
                </span>
              )}
            </h3>
            {assetAllocationData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={assetAllocationData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `€${(value).toFixed(0)}`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`€${value.toLocaleString()}`, 'Valore']}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                    />
                    <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Nessun asset da visualizzare</p>
                  <p className="text-sm">
                    {selectedAccounts.length > 0 || dateRange.start || dateRange.end
                      ? 'Nessun asset trovato con i filtri attuali'
                      : 'Nessun asset configurato'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Asset per Tipo - Tabella */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Asset per Tipologia
              {(selectedAccounts.length > 0 || dateRange.start || dateRange.end) && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  (Filtrata)
                </span>
              )}
            </h3>
            {Object.keys(filteredAssetStats.assetsByType).length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(filteredAssetStats.assetsByType).map(([type, data]) => {
                  const percentage = filteredAssetStats.totalValue > 0 ? (data.totalValue / filteredAssetStats.totalValue) * 100 : 0
                  return (
                    <div key={type} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{type}</h4>
                        <span className="text-sm text-gray-500">{data.count} asset</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-semibold text-gray-900">
                          {formatCurrency(data.totalValue)}
                        </span>
                        <span className="text-sm text-gray-600">{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>Nessuna tipologia di asset da visualizzare</p>
                <p className="text-sm">
                  {selectedAccounts.length > 0 || dateRange.start || dateRange.end
                    ? 'Modifica i filtri per vedere i dati'
                    : 'Aggiungi asset per vedere la distribuzione'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderGoalsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FinanceWidget
          title="Obiettivi Attivi"
          value={goals.length}
          subtitle="Obiettivi configurati"
          icon="goals"
          color="blue"
          loading={loading}
        />
        <FinanceWidget
          title="Progress Medio"
          value={`${stats.goalProgress.toFixed(1)}%`}
          subtitle="Completamento"
          icon="goals"
          color="green"
          trend={stats.goalProgress > 50 ? 'up' : 'neutral'}
          loading={loading}
        />
        <FinanceWidget
          title="Target Totale"
          value={formatCurrency(goals.reduce((sum, goal) => sum + goal.target_amount, 0))}
          subtitle="Importo obiettivi"
          icon="balance"
          color="purple"
          loading={loading}
        />
      </div>

      {/* Lista Obiettivi */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Dettaglio Obiettivi</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {goals.map((goal) => {
            const progress = (goal.current_amount / goal.target_amount) * 100
            return (
              <div key={goal.id} className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{goal.name}</h4>
                    {goal.description && (
                      <p className="text-sm text-gray-500">{goal.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                    </p>
                    <p className="text-sm text-gray-500">{progress.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  ></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab()
      case 'accounts':
        return renderAccountsTab()
      case 'transactions':
        return renderTransactionsTab()
      case 'assets':
        return renderAssetsTab()
      case 'goals':
        return renderGoalsTab()
      default:
        return renderOverviewTab()
    }
  }

  return (
    <>
      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #CBD5E0 #EDF2F7;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #EDF2F7;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #CBD5E0, #A0AEC0);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #A0AEC0, #718096);
        }
      `}</style>
      
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8 custom-scrollbar">
          <ModuleHeader
            title="Report Finanziari"
            subtitle="Analisi dettagliate e statistiche avanzate delle tue finanze" 
            icon={<BarChart3 className="h-6 w-6 text-white" />}
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
                show: !loading && !error
              }
            ]}
            stats={[
              {
                label: 'Patrimonio Totale',
                value: formatCurrency(stats.totalBalance),
                color: 'blue'
              },
              {
                label: 'Crescita Mensile',
                value: formatPercentage(advancedStats.transactionGrowth),
                color: advancedStats.transactionGrowth >= 0 ? 'green' : 'orange'
              }
            ]}
            actions={[
              {
                label: 'Esporta',
                onClick: () => setShowExportModal(true),
                icon: <Download className="w-4 h-4" />,
                color: 'gray',
                hideTextOnMobile: true
              },
              {
                label: 'Aggiorna',
                onClick: () => refetch(),
                icon: <RefreshCw className="w-4 h-4" />,
                color: 'blue',
                disabled: loading,
                loading: loading,
                hideTextOnMobile: true
              }
            ]}
          />

          {/* Filtri Dinamici */}
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filtri</span>
                  {(dateRange.start || dateRange.end || selectedAccounts.length > 0) && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {[
                        dateRange.start && 'Data inizio',
                        dateRange.end && 'Data fine', 
                        selectedAccounts.length > 0 && `${selectedAccounts.length} account`
                      ].filter(Boolean).length} attivi
                    </span>
                  )}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`text-sm font-medium transition-colors ${
                      showFilters 
                        ? 'text-blue-800 hover:text-blue-900' 
                        : 'text-blue-600 hover:text-blue-800'
                    }`}
                  >
                    {showFilters ? '🔽 Nascondi' : '🔽 Mostra'}
                  </button>
                </div>
                
                {/* Quick Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Contatore transazioni */}
                  <div className="px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded border">
                    <span className="font-medium">{filteredTransactions.length}</span> di <span className="font-medium">{transactions.length}</span> transazioni
                  </div>
                  
                  {/* Reset generale */}
                  {(dateRange.start || dateRange.end || selectedAccounts.length > 0) && (
                    <button
                      onClick={() => {
                        setDateRange({ start: null, end: null })
                        setSelectedAccounts([])
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100"
                    >
                      <X className="h-3 w-3" />
                      Reset
                    </button>
                  )}
                  
                  <button
                    onClick={() => setDateRange({
                      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                      end: new Date()
                    })}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                  >
                    Questo mese
                  </button>
                  <button
                    onClick={() => setDateRange({
                      start: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1),
                      end: new Date()
                    })}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    Ultimi 3 mesi
                  </button>
                  <button
                    onClick={() => setDateRange({
                      start: new Date(new Date().getFullYear(), 0, 1),
                      end: new Date()
                    })}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    Anno corrente
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Filtro Date Range */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📅 Periodo personalizzato
                      </label>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Data inizio</label>
                          <input
                            type="date"
                            value={dateRange.start?.toISOString().split('T')[0] || ''}
                            onChange={(e) => setDateRange(prev => ({
                              ...prev,
                              start: e.target.value ? new Date(e.target.value) : null
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Data fine</label>
                          <input
                            type="date"
                            value={dateRange.end?.toISOString().split('T')[0] || ''}
                            onChange={(e) => setDateRange(prev => ({
                              ...prev,
                              end: e.target.value ? new Date(e.target.value) : null
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      {dateRange.start && dateRange.end && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-md">
                          <p className="text-xs text-blue-700">
                            📊 Periodo: {Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))} giorni
                            <br />
                            Dal {dateRange.start.toLocaleDateString('it-IT')} al {dateRange.end.toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Filtro Account */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account {selectedAccounts.length > 0 ? `(${selectedAccounts.length} selezionati)` : '(tutti)'}
                      </label>
                      <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md bg-gray-50">
                        <div className="p-2">
                          <label className="flex items-center space-x-2 p-1 hover:bg-white rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedAccounts.length === 0}
                              onChange={() => setSelectedAccounts([])}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 font-medium">🏦 Tutti gli account</span>
                            <span className="text-xs text-gray-500 ml-auto">{transactions.length}</span>
                          </label>
                          <hr className="my-1 border-gray-200" />
                          {accountOptions.map(account => {
                            const accountTransactionCount = transactions.filter(t => t.account_name === account).length
                            return (
                              <label key={account} className="flex items-center space-x-2 p-1 hover:bg-white rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedAccounts.includes(account)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedAccounts(prev => [...prev, account])
                                    } else {
                                      setSelectedAccounts(prev => prev.filter(a => a !== account))
                                    }
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 flex-1">{account}</span>
                                <span className="text-xs text-gray-500">{accountTransactionCount}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                      {selectedAccounts.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Mostrando solo transazioni da: {selectedAccounts.slice(0, 2).join(', ')}
                          {selectedAccounts.length > 2 && ` e altri ${selectedAccounts.length - 2}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Filtri attivi */}
                  {(selectedAccounts.length > 0 || dateRange.start || dateRange.end) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          {dateRange.start && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              Da: {dateRange.start.toLocaleDateString('it-IT')}
                              <button
                                onClick={() => setDateRange(prev => ({ ...prev, start: null }))}
                                className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          )}
                          {dateRange.end && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              A: {dateRange.end.toLocaleDateString('it-IT')}
                              <button
                                onClick={() => setDateRange(prev => ({ ...prev, end: null }))}
                                className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          )}
                          {selectedAccounts.map(account => (
                            <span key={account} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              {account}
                              <button
                                onClick={() => setSelectedAccounts(prev => prev.filter(a => a !== account))}
                                className="ml-1 hover:bg-green-200 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={() => {
                            setDateRange({ start: null, end: null })
                            setSelectedAccounts([])
                          }}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Rimuovi tutti
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">Errore nel caricamento dei dati: {error}</p>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-2">
              <nav className="flex space-x-2" aria-label="Tabs">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="transition-all duration-300">
            {renderTabContent()}
          </div>

          {/* Modal Export */}
          {showExportModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowExportModal(false)}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                        <Download className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                          Esporta Report Finanziario
                        </h3>
                        <div className="mt-4">
                          <p className="text-sm text-gray-500 mb-4">
                            Seleziona il formato di esportazione per i tuoi dati finanziari filtrati.
                          </p>
                          
                          {/* Riassunto dei dati */}
                          <div className="bg-gray-50 rounded-lg p-3 mb-4">
                            <h4 className="font-medium text-gray-900 mb-2">Dati da esportare:</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                              <li>• {filteredTransactions.length} transazioni</li>
                              <li>• {Object.keys(advancedStats.categoryStats).length} categorie</li>
                              <li>• Periodo: {dateRange.start?.toLocaleDateString('it-IT')} - {dateRange.end?.toLocaleDateString('it-IT')}</li>
                              {selectedAccounts.length > 0 && (
                                <li>• Account: {selectedAccounts.length} selezionati</li>
                              )}
                            </ul>
                          </div>

                          {/* Opzioni di formato */}
                          <div className="space-y-3">
                            <button
                              onClick={() => handleExport('csv')}
                              className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                                  <span className="text-green-600 font-semibold text-xs">CSV</span>
                                </div>
                                <div className="text-left">
                                  <p className="font-medium text-gray-900">CSV (Excel)</p>
                                  <p className="text-sm text-gray-500">Compatibile con Excel e fogli di calcolo</p>
                                </div>
                              </div>
                              <Download className="h-4 w-4 text-gray-400" />
                            </button>

                            <button
                              onClick={() => handleExport('json')}
                              className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                  <span className="text-blue-600 font-semibold text-xs">JSON</span>
                                </div>
                                <div className="text-left">
                                  <p className="font-medium text-gray-900">JSON (Dati Completi)</p>
                                  <p className="text-sm text-gray-500">Include statistiche e metadati</p>
                                </div>
                              </div>
                              <Download className="h-4 w-4 text-gray-400" />
                            </button>

                            <button
                              onClick={() => handleExport('pdf')}
                              className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors opacity-50 cursor-not-allowed"
                            >
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                                  <span className="text-red-600 font-semibold text-xs">PDF</span>
                                </div>
                                <div className="text-left">
                                  <p className="font-medium text-gray-900">PDF Report</p>
                                  <p className="text-sm text-gray-500">Prossimamente disponibile</p>
                                </div>
                              </div>
                              <Download className="h-4 w-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={() => setShowExportModal(false)}
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ModuleLayout>
    </>
  )
}
