'use client' 

import { useState, useMemo, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  CreditCard,
  Package,
  RefreshCw,
  Download,
  Eye,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Building2
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
import { formatCurrency } from '@/lib/helpers/format'
import {
  chartColors,
  chartCategorical,
  chartTooltipStyle,
  chartTooltipLabelStyle,
  chartAxisTick,
} from '@/lib/chartTheme'
import {
  useFinanceCache,
  useFinanceData,
  useAllFinancialOperations,
  useAccounts,
  useAssets
} from '@/lib/financeCache'

type ReportTab = 'overview' | 'categories' | 'patrimonio'

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
  const { refetch, isDataStale, data: cacheData, hasFullTransactionHistory, loadFullTransactionHistory } = useFinanceCache()

  const [activeTab, setActiveTab] = useState<ReportTab>('overview')

  // Filtri dinamici — default: ultimi 12 mesi
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1),
    end: new Date()
  })

  // T4.1: la cache parte con una finestra di 24 mesi; se il filtro chiede un
  // periodo che inizia prima (o nessun limite), scarica lo storico completo
  useEffect(() => {
    if (hasFullTransactionHistory) return
    const since = cacheData?.transactionsSince
    if (!since) return
    if (!dateRange.start || dateRange.start < new Date(since)) {
      loadFullTransactionHistory()
    }
  }, [dateRange.start, hasFullTransactionHistory, cacheData?.transactionsSince, loadFullTransactionHistory])
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
  // TODO: Spezzare questo useMemo in 5-6 useMemo più piccoli e focalizzati:
  // 1. currentMonthTransactions + lastMonthTransactions
  // 2. categoryStats
  // 3. categoryTrend
  // 4. accountActivity
  // 5. refundedTransactions + totalAssetValue
  // 6. Income/Expenses + netFlow (Questo ridurrà re-computation non necessaria)
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
    
    // Calcoli per account più attivi (sul periodo filtrato, coerente col resto del report)
    const accountActivity = filteredTransactions.reduce((acc, transaction) => {
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
    { id: 'categories' as ReportTab, label: 'Categorie', icon: PieChart },
    { id: 'patrimonio' as ReportTab, label: 'Patrimonio', icon: CreditCard }
  ]

  if (authLoading) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-inset rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-32 bg-inset rounded-lg"></div>
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
            <p className="text-ink-muted">Devi effettuare il login per visualizzare i report finanziari</p>
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
              ? `Valore attuale · ${selectedAccounts.length} account selezionati`
              : `Valore attuale · ${accounts.length} account`
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

        {/* Grafico Trend + Insights */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Trend Entrate/Uscite */}
          <div className="xl:col-span-2 bg-surface rounded-lg border border-edge p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ink flex items-center">
                <TrendingUp className="h-5 w-5 text-success-strong mr-2" />
                Trend Entrate/Uscite 
                {dateRange.start && dateRange.end ? (
                  <span className="text-sm font-normal text-ink-secondary ml-2">
                    ({monthlyTransactionData.length} {monthlyTransactionData.length === 1 ? 'mese' : 'mesi'})
                  </span>
                ) : (
                  <span className="text-sm font-normal text-ink-secondary ml-2">(6 mesi)</span>
                )}
              </h3>
              <div className="flex items-center space-x-2 text-sm">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-success rounded-full"></div>
                  <span className="text-ink-secondary">Entrate</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-danger rounded-full"></div>
                  <span className="text-ink-secondary">Uscite</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span className="text-ink-secondary">Netto</span>
                </div>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTransactionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="month" tick={chartAxisTick} />
                  <YAxis 
                    tick={chartAxisTick}
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
                    labelStyle={chartTooltipLabelStyle}
                    contentStyle={chartTooltipStyle}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="entrate" 
                    stackId="1" 
                    stroke={chartColors.success} 
                    fill={chartColors.success} 
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="uscite" 
                    stackId="2" 
                    stroke={chartColors.danger} 
                    fill={chartColors.danger} 
                    fillOpacity={0.6}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="netto" 
                    stroke={chartColors.primary} 
                    strokeWidth={3}
                    dot={{ fill: "var(--color-primary)", strokeWidth: 2, r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Mini statistiche sotto il grafico */}
            <div className="mt-4 pt-4 border-t border-edge">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-ink-muted">Media Entrate</p>
                  <p className="font-semibold text-success-strong">
                    {formatCurrency(monthlyTransactionData.reduce((sum, d) => sum + d.entrate, 0) / monthlyTransactionData.length)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-ink-muted">Media Uscite</p>
                  <p className="font-semibold text-danger">
                    {formatCurrency(monthlyTransactionData.reduce((sum, d) => sum + d.uscite, 0) / monthlyTransactionData.length)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-ink-muted">Saldo Medio</p>
                  <p className={`font-semibold ${ 
                    monthlyTransactionData.reduce((sum, d) => sum + d.netto, 0) / monthlyTransactionData.length >= 0 
                      ? 'text-success-strong' : 'text-danger'
                  }`}>
                    {formatCurrency(monthlyTransactionData.reduce((sum, d) => sum + d.netto, 0) / monthlyTransactionData.length)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Insights Avanzati */}
          <div className="bg-surface rounded-lg border border-edge p-6">
            <h3 className="text-lg font-semibold text-ink mb-4 flex items-center">
              <Eye className="h-5 w-5 text-primary mr-2" />
              Insights Intelligenti
            </h3>
            <div className="space-y-4">
              {/* Performance del periodo */}
              <div className={`rounded-lg p-4 ${advancedStats.netFlow >= 0 ? 'bg-success-subtle' : 'bg-danger-subtle'}`}>
                <h4 className={`font-medium mb-1 ${advancedStats.netFlow >= 0 ? 'text-success-strong' : 'text-danger'}`}>
                  Bilancio del Periodo
                </h4>
                <p className={`text-sm ${advancedStats.netFlow >= 0 ? 'text-success-strong' : 'text-danger'}`}>
                  {advancedStats.netFlow >= 0 
                    ? `Hai risparmiato ${formatCurrency(advancedStats.netFlow)} nel periodo selezionato!`
                    : `Hai speso ${formatCurrency(Math.abs(advancedStats.netFlow))} più di quanto guadagnato.`
                  }
                </p>
                <div className="mt-2 text-xs text-ink-secondary">
                  Entrate: {formatCurrency(advancedStats.totalIncome)} | 
                  Uscite: {formatCurrency(advancedStats.totalExpenses)}
                </div>
              </div>

              {/* Account più attivo */}
              {advancedStats.mostActiveAccount && filteredTransactions.length > 0 && (
                <div className="bg-primary-subtle rounded-lg p-4">
                  <h4 className="font-medium text-primary mb-1">Account più Attivo</h4>
                  <p className="text-primary-hover text-sm">
                    <strong>{advancedStats.mostActiveAccount.name}</strong> con {advancedStats.mostActiveAccount.count} transazioni
                  </p>
                  <div className="mt-2 text-xs text-primary">
                    {((advancedStats.mostActiveAccount.count / filteredTransactions.length) * 100).toFixed(0)}%
                    delle transazioni del periodo
                  </div>
                </div>
              )}

              {/* Top categoria */}
              {advancedStats.topCategory && (
                <div className="bg-warning-subtle rounded-lg p-4">
                  <h4 className="font-medium text-warning mb-1">Categoria Top Spesa</h4>
                  <p className="text-warning text-sm">
                    <strong>{advancedStats.topCategory.name}</strong>: {formatCurrency(advancedStats.topCategory.amount)}
                  </p>
                  <div className="mt-2 text-xs text-warning">
                    {advancedStats.topCategory.count} transazioni • 
                    {advancedStats.totalExpenses > 0 
                      ? ((advancedStats.topCategory.amount / advancedStats.totalExpenses) * 100).toFixed(0)
                      : '0'
                    }% del totale uscite
                  </div>
                </div>
              )}

              {/* Rimborsi del periodo */}
              {advancedStats.refundedCount > 0 && (
                <div className="bg-success-subtle rounded-lg p-4">
                  <h4 className="font-medium text-success-strong mb-1">Rimborsi nel Periodo</h4>
                  <p className="text-success-strong text-sm">
                    <strong>{formatCurrency(advancedStats.totalRefunded)}</strong> su {advancedStats.refundedCount} transazioni rimborsate
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderPatrimonioTab = () => {
    // Conti: rispettano il filtro account; i saldi sono sempre valori attuali
    const filteredAccountsData = selectedAccounts.length > 0
      ? accounts.filter(acc => selectedAccounts.includes(acc.name))
      : accounts

    const filteredAccountsBalance = filteredAccountsData.reduce((sum, acc) => sum + acc.current_balance, 0)

    // Asset: sempre tutti, a valore attuale (le partecipazioni non sono "del periodo")
    const totalAssetValue = assets.reduce((sum, asset) => sum + asset.value, 0)
    const assetsByType = assets.reduce((acc, asset) => {
      if (!acc[asset.type]) {
        acc[asset.type] = { totalValue: 0, count: 0 }
      }
      acc[asset.type].totalValue += asset.value
      acc[asset.type].count += 1
      return acc
    }, {} as Record<string, { totalValue: number, count: number }>)

    const assetAllocationData = Object.entries(assetsByType)
      .map(([name, data]) => ({ name, value: data.totalValue, count: data.count }))
      .sort((a, b) => b.value - a.value)

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

    // Transazioni per account nel periodo filtrato (match per id, T3.8)
    const accountTransactionsInPeriod = filteredAccountsData.map(account => {
      const accountFilteredTransactions = filteredTransactions.filter(t => t.account_id === account.id)
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
            title="Saldo Conti"
            value={formatCurrency(filteredAccountsBalance)}
            subtitle={`Valore attuale · ${filteredAccountsData.length} ${filteredAccountsData.length === 1 ? 'conto' : 'conti'}`}
            icon="accounts"
            color="blue"
            loading={loading}
          />
          <FinanceWidget
            title="Valore Asset"
            value={formatCurrency(totalAssetValue)}
            subtitle={`${assets.length} asset in portafoglio`}
            icon="balance"
            color="purple"
            loading={loading}
          />
          <FinanceWidget
            title="Patrimonio Complessivo"
            value={formatCurrency(filteredAccountsBalance + totalAssetValue)}
            subtitle="Conti + asset, valore attuale"
            icon="balance"
            color="green"
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Grafico Saldi Account */}
          <div className="bg-surface rounded-lg border border-edge p-6">
            <h3 className="text-lg font-semibold text-ink mb-4 flex items-center">
              <CreditCard className="h-5 w-5 text-primary mr-2" />
              Saldi Account 
              {selectedAccounts.length > 0 && (
                <span className="text-sm font-normal text-ink-secondary ml-2">
                  ({selectedAccounts.length} filtrati)
                </span>
              )}
            </h3>
            {accountBalanceData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={accountBalanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis 
                      dataKey="name" 
                      tick={chartAxisTick}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={chartAxisTick}
                      tickFormatter={(value) => `€${(value).toFixed(0)}`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`€${value.toLocaleString()}`, 'Saldo']}
                      labelStyle={chartTooltipLabelStyle}
                      contentStyle={chartTooltipStyle}
                    />
                    <Bar 
                      dataKey="saldo" 
                      fill={chartColors.primary} 
                      radius={[4, 4, 0, 0]}
                      name="Saldo"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center text-ink-muted">
                  <CreditCard className="h-12 w-12 mx-auto mb-2 text-ink-muted" />
                  <p>Nessun account da visualizzare</p>
                  <p className="text-sm">Modifica i filtri per vedere i dati</p>
                </div>
              </div>
            )}
          </div>

          {/* Lista Account */}
          <div className="bg-surface rounded-lg border border-edge overflow-hidden">
            <div className="px-6 py-4 border-b border-edge">
              <h3 className="text-lg font-semibold text-ink">
                Dettaglio Account
                {selectedAccounts.length > 0 && (
                  <span className="text-sm font-normal text-ink-secondary ml-2">
                    (filtrati per periodo)
                  </span>
                )}
              </h3>
            </div>
            <div className="divide-y divide-edge max-h-80 overflow-y-auto">
              {accountTransactionsInPeriod.length > 0 ? (
                accountTransactionsInPeriod.map((account) => (
                  <div key={account.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: account.color }}></div>
                      <div>
                        <h4 className="font-medium text-ink">{account.name}</h4>
                        <p className="text-sm text-ink-muted">
                          {account.type} • {account.transactionsCount} transazioni nel periodo
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${account.current_balance >= 0 ? 'text-success-strong' : 'text-danger'}`}>
                        {formatCurrency(account.current_balance)}
                      </p>
                      <p className="text-sm text-ink-muted">
                        Movimenti: {formatCurrency(account.totalMovements)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-ink-muted">
                  <p>Nessun account corrisponde ai filtri selezionati</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Asset: allocazione e dettaglio per tipologia (valore attuale) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Grafico Asset Allocation */}
          <div className="bg-surface rounded-lg border border-edge p-6">
            <h3 className="text-lg font-semibold text-ink mb-4 flex items-center">
              <Package className="h-5 w-5 text-warning mr-2" />
              Asset Allocation
            </h3>
            {assetAllocationData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={assetAllocationData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis
                      dataKey="name"
                      tick={chartAxisTick}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      tick={chartAxisTick}
                      tickFormatter={(value) => `€${(value).toFixed(0)}`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`€${value.toLocaleString()}`, 'Valore']}
                      labelStyle={chartTooltipLabelStyle}
                      contentStyle={chartTooltipStyle}
                    />
                    <Bar dataKey="value" fill={chartColors.warning} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center text-ink-muted">
                  <Package className="h-12 w-12 mx-auto mb-2 text-ink-muted" />
                  <p>Nessun asset da visualizzare</p>
                  <p className="text-sm">Aggiungi asset per vedere la distribuzione</p>
                </div>
              </div>
            )}
          </div>

          {/* Asset per Tipo */}
          <div className="bg-surface rounded-lg border border-edge p-6">
            <h3 className="text-lg font-semibold text-ink mb-4">Asset per Tipologia</h3>
            {Object.keys(assetsByType).length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(assetsByType).map(([type, data]) => {
                  const percentage = totalAssetValue > 0 ? (data.totalValue / totalAssetValue) * 100 : 0
                  return (
                    <div key={type} className="bg-canvas rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-ink">{type}</h4>
                        <span className="text-sm text-ink-muted">{data.count} asset</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-semibold font-amount text-ink">
                          {formatCurrency(data.totalValue)}
                        </span>
                        <span className="text-sm text-ink-secondary">{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-inset rounded-full h-2">
                        <div
                          className="bg-warning h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center text-ink-muted py-8">
                <p>Nessuna tipologia di asset da visualizzare</p>
                <p className="text-sm">Aggiungi asset per vedere la distribuzione</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderCategoriesTab = () => {
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

    // Palette categorica validata dai token (ordine fisso, mai ciclare oltre 8)
    const COLORS = chartCategorical

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Grafico Spese per Categoria */}
          <div className="bg-surface rounded-lg border border-edge p-6">
            <h3 className="text-lg font-semibold text-ink mb-4 flex items-center">
              <PieChart className="h-5 w-5 text-module-health mr-2" />
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
                    labelStyle={chartTooltipLabelStyle}
                    contentStyle={chartTooltipStyle}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trend Categorie - COMPLETAMENTE DINAMICO */}
          <div className="xl:col-span-2 bg-surface rounded-lg border border-edge p-6">
            <h3 className="text-lg font-semibold text-ink mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 text-primary mr-2" />
              Trend Spese per Categoria
              {dateRange.start && dateRange.end ? (
                <span className="text-sm font-normal text-ink-secondary ml-2">
                  (Periodo Filtrato)
                </span>
              ) : (
                <span className="text-sm font-normal text-ink-secondary ml-2">
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
                    <span className="text-ink-secondary">{category}</span>
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
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                        <XAxis dataKey="month" tick={chartAxisTick} />
                        <YAxis 
                          tick={chartAxisTick}
                          tickFormatter={(value) => `€${(value).toFixed(0)}`}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => [`€${value.toLocaleString()}`, name]}
                          labelStyle={chartTooltipLabelStyle}
                          contentStyle={chartTooltipStyle}
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
                    <div className="text-center text-ink-muted">
                      <PieChart className="h-12 w-12 mx-auto mb-2 text-ink-muted" />
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
            <div className="mt-4 pt-4 border-t border-edge">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-sm text-ink-muted">Categorie Attive</p>
                  <p className="font-semibold text-primary">{Object.keys(advancedStats.categoryStats).length}</p>
                </div>
                <div>
                  <p className="text-sm text-ink-muted">Spesa Media</p>
                  <p className="font-semibold text-module-health">
                    {formatCurrency(Object.keys(advancedStats.categoryStats).length > 0 
                      ? advancedStats.totalExpenses / Object.keys(advancedStats.categoryStats).length 
                      : 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-ink-muted">Categoria Top</p>
                  <p className="font-semibold text-warning text-xs">
                    {advancedStats.topCategory?.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-ink-muted">% Top Categoria</p>
                  <p className="font-semibold text-danger">
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

        {/* Classifica Categorie */}
        <div className="bg-surface rounded-lg border border-edge p-6">
            <h3 className="text-lg font-semibold text-ink mb-4">Classifica Spese per Categoria</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {Object.entries(advancedStats.categoryStats)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([category, stats], index) => {
                  const percentage = advancedStats.totalExpenses > 0 ? (stats.total / advancedStats.totalExpenses) * 100 : 0
                  return (
                    <div key={category} className="flex items-center justify-between p-3 bg-canvas rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <div>
                          <h4 className="font-medium text-ink">{category}</h4>
                          <p className="text-sm text-ink-muted">{stats.count} transazioni</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-ink">{formatCurrency(stats.total)}</p>
                        <p className="text-sm text-ink-muted">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab()
      case 'categories':
        return renderCategoriesTab()
      case 'patrimonio':
        return renderPatrimonioTab()
      default:
        return renderOverviewTab()
    }
  }

  return (
    <>
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
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
                label: 'Netto Periodo',
                value: formatCurrency(advancedStats.netFlow),
                color: advancedStats.netFlow >= 0 ? 'green' : 'orange'
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
          <div className="mb-6 bg-surface rounded-lg shadow-card border border-edge">
            <div className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-ink-muted" />
                  <span className="text-sm font-medium text-ink-secondary">Filtri</span>
                  {(dateRange.start || dateRange.end || selectedAccounts.length > 0) && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-subtle text-primary">
                      {[
                        dateRange.start && 'Data inizio',
                        dateRange.end && 'Data fine', 
                        selectedAccounts.length > 0 && `${selectedAccounts.length} account`
                      ].filter(Boolean).length} attivi
                    </span>
                  )}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                      showFilters
                        ? 'text-primary hover:text-primary'
                        : 'text-primary hover:text-primary'
                    }`}
                  >
                    {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showFilters ? 'Nascondi' : 'Mostra'}
                  </button>
                </div>
                
                {/* Quick Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Contatore transazioni */}
                  <div className="px-2 py-1 bg-canvas text-ink-secondary text-xs rounded border">
                    <span className="font-medium">{filteredTransactions.length}</span> di <span className="font-medium">{transactions.length}</span> transazioni
                  </div>
                  
                  {/* Reset generale */}
                  {(dateRange.start || dateRange.end || selectedAccounts.length > 0) && (
                    <button
                      onClick={() => {
                        setDateRange({ start: null, end: null })
                        setSelectedAccounts([])
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-danger-subtle text-danger rounded hover:bg-danger-subtle"
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
                    className="px-3 py-1 text-xs bg-primary-subtle text-primary rounded-full hover:opacity-70 transition-colors"
                  >
                    Questo mese
                  </button>
                  <button
                    onClick={() => setDateRange({
                      start: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1),
                      end: new Date()
                    })}
                    className="px-3 py-1 text-xs bg-inset text-ink rounded-full hover:bg-inset transition-colors"
                  >
                    Ultimi 3 mesi
                  </button>
                  <button
                    onClick={() => setDateRange({
                      start: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1),
                      end: new Date()
                    })}
                    className="px-3 py-1 text-xs bg-inset text-ink rounded-full hover:bg-inset transition-colors"
                  >
                    Ultimi 12 mesi
                  </button>
                  <button
                    onClick={() => setDateRange({
                      start: new Date(new Date().getFullYear(), 0, 1),
                      end: new Date()
                    })}
                    className="px-3 py-1 text-xs bg-inset text-ink rounded-full hover:bg-inset transition-colors"
                  >
                    Anno corrente
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className="mt-4 pt-4 border-t border-edge">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Filtro Date Range */}
                    <div>
                      <label className="block text-sm font-medium text-ink-secondary mb-2">
                        Periodo personalizzato
                      </label>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-ink-muted mb-1">Data inizio</label>
                          <input
                            type="date"
                            value={dateRange.start?.toISOString().split('T')[0] || ''}
                            onChange={(e) => setDateRange(prev => ({
                              ...prev,
                              start: e.target.value ? new Date(e.target.value) : null
                            }))}
                            className="w-full px-3 py-2 border border-edge rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-ink-muted mb-1">Data fine</label>
                          <input
                            type="date"
                            value={dateRange.end?.toISOString().split('T')[0] || ''}
                            onChange={(e) => setDateRange(prev => ({
                              ...prev,
                              end: e.target.value ? new Date(e.target.value) : null
                            }))}
                            className="w-full px-3 py-2 border border-edge rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                          />
                        </div>
                      </div>
                      {dateRange.start && dateRange.end && (
                        <div className="mt-2 p-2 bg-primary-subtle rounded-md">
                          <p className="text-xs text-primary-hover">
                            Periodo: {Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))} giorni
                            <br />
                            Dal {dateRange.start.toLocaleDateString('it-IT')} al {dateRange.end.toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Filtro Account */}
                    <div>
                      <label className="block text-sm font-medium text-ink-secondary mb-2">
                        Account {selectedAccounts.length > 0 ? `(${selectedAccounts.length} selezionati)` : '(tutti)'}
                      </label>
                      <div className="max-h-32 overflow-y-auto border border-edge rounded-md bg-canvas">
                        <div className="p-2">
                          <label className="flex items-center space-x-2 p-1 hover:bg-surface rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedAccounts.length === 0}
                              onChange={() => setSelectedAccounts([])}
                              className="rounded border-edge text-primary focus:ring-primary"
                            />
                            <span className="flex items-center gap-1.5 text-sm text-ink-secondary font-medium">
                              <Building2 className="w-4 h-4 text-ink-muted" />
                              Tutti gli account
                            </span>
                            <span className="text-xs text-ink-muted ml-auto">{transactions.length}</span>
                          </label>
                          <hr className="my-1 border-edge" />
                          {accountOptions.map(account => {
                            const accountTransactionCount = transactions.filter(t => t.account_name === account).length
                            return (
                              <label key={account} className="flex items-center space-x-2 p-1 hover:bg-surface rounded cursor-pointer">
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
                                  className="rounded border-edge text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-ink-secondary flex-1">{account}</span>
                                <span className="text-xs text-ink-muted">{accountTransactionCount}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                      {selectedAccounts.length > 0 && (
                        <p className="text-xs text-ink-muted mt-1">
                          Mostrando solo transazioni da: {selectedAccounts.slice(0, 2).join(', ')}
                          {selectedAccounts.length > 2 && ` e altri ${selectedAccounts.length - 2}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Filtri attivi */}
                  {(selectedAccounts.length > 0 || dateRange.start || dateRange.end) && (
                    <div className="mt-4 pt-4 border-t border-edge">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          {dateRange.start && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-subtle text-primary text-xs rounded-full">
                              Da: {dateRange.start.toLocaleDateString('it-IT')}
                              <button
                                onClick={() => setDateRange(prev => ({ ...prev, start: null }))}
                                className="ml-1 hover:opacity-70 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          )}
                          {dateRange.end && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-subtle text-primary text-xs rounded-full">
                              A: {dateRange.end.toLocaleDateString('it-IT')}
                              <button
                                onClick={() => setDateRange(prev => ({ ...prev, end: null }))}
                                className="ml-1 hover:opacity-70 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          )}
                          {selectedAccounts.map(account => (
                            <span key={account} className="inline-flex items-center gap-1 px-2 py-1 bg-success-subtle text-success-strong text-xs rounded-full">
                              {account}
                              <button
                                onClick={() => setSelectedAccounts(prev => prev.filter(a => a !== account))}
                                className="ml-1 hover:opacity-70 rounded-full p-0.5"
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
                          className="text-sm text-ink-muted hover:text-ink-secondary"
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
            <div className="mb-6 p-4 bg-danger-subtle border border-danger-subtle rounded-lg">
              <p className="text-danger text-sm">Errore nel caricamento dei dati: {error}</p>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="bg-surface rounded-lg border border-edge p-2">
              <nav className="flex space-x-2" aria-label="Tabs">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary text-white'
                          : 'text-ink-secondary hover:text-ink hover:bg-canvas'
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
                <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" onClick={() => setShowExportModal(false)}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-surface rounded-lg text-left overflow-hidden shadow-elevated transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="bg-surface px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-primary-subtle sm:mx-0 sm:h-10 sm:w-10">
                        <Download className="h-6 w-6 text-primary" />
                      </div>
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                        <h3 className="text-lg leading-6 font-medium text-ink" id="modal-title">
                          Esporta Report Finanziario
                        </h3>
                        <div className="mt-4">
                          <p className="text-sm text-ink-muted mb-4">
                            Seleziona il formato di esportazione per i tuoi dati finanziari filtrati.
                          </p>
                          
                          {/* Riassunto dei dati */}
                          <div className="bg-canvas rounded-lg p-3 mb-4">
                            <h4 className="font-medium text-ink mb-2">Dati da esportare:</h4>
                            <ul className="text-sm text-ink-secondary space-y-1">
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
                              className="w-full flex items-center justify-between p-3 border border-edge rounded-lg hover:bg-canvas transition-colors"
                            >
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-success-subtle rounded-lg flex items-center justify-center mr-3">
                                  <span className="text-success-strong font-semibold text-xs">CSV</span>
                                </div>
                                <div className="text-left">
                                  <p className="font-medium text-ink">CSV (Excel)</p>
                                  <p className="text-sm text-ink-muted">Compatibile con Excel e fogli di calcolo</p>
                                </div>
                              </div>
                              <Download className="h-4 w-4 text-ink-muted" />
                            </button>

                            <button
                              onClick={() => handleExport('json')}
                              className="w-full flex items-center justify-between p-3 border border-edge rounded-lg hover:bg-canvas transition-colors"
                            >
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-primary-subtle rounded-lg flex items-center justify-center mr-3">
                                  <span className="text-primary font-semibold text-xs">JSON</span>
                                </div>
                                <div className="text-left">
                                  <p className="font-medium text-ink">JSON (Dati Completi)</p>
                                  <p className="text-sm text-ink-muted">Include statistiche e metadati</p>
                                </div>
                              </div>
                              <Download className="h-4 w-4 text-ink-muted" />
                            </button>

                            <button
                              onClick={() => handleExport('pdf')}
                              className="w-full flex items-center justify-between p-3 border border-edge rounded-lg hover:bg-canvas transition-colors opacity-50 cursor-not-allowed"
                            >
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-danger-subtle rounded-lg flex items-center justify-center mr-3">
                                  <span className="text-danger font-semibold text-xs">PDF</span>
                                </div>
                                <div className="text-left">
                                  <p className="font-medium text-ink">PDF Report</p>
                                  <p className="text-sm text-ink-muted">Prossimamente disponibile</p>
                                </div>
                              </div>
                              <Download className="h-4 w-4 text-ink-muted" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-canvas px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-edge shadow-card px-4 py-2 bg-surface text-base font-medium text-ink-secondary hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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
