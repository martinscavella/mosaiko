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
  Filter,
  X,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  TrendingDown,
  ChevronDown
} from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
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
  LineChart
} from 'recharts'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import CacheStatus from '@/components/ui/CacheStatus'
import FinanceWidget from '@/components/ui/FinanceWidget'
import BudgetCategoryWidget from '@/components/ui/BudgetCategoryWidget'
import BudgetAlertBanner from '@/components/ui/BudgetAlertBanner'
import { useAuth } from '@/lib/auth'
import { formatCurrency, formatPercentage } from '@/lib/helpers/format'
import { 
  useFinanceCache, 
  useFinanceData, 
  useAllFinancialOperations, 
  useAccounts, 
  useAssets,
  useFinancialGoals,
  useAssetStats,
  useCategories
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
  const { categories } = useCategories()
  
  const [activeTab, setActiveTab] = useState<ReportTab>('overview')
  
  // Filtri dinamici
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1), // Ultimi 3 mesi
    end: new Date()
  })
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | '3months' | 'year' | 'custom'>('3months')
  const [showExportModal, setShowExportModal] = useState(false)
  const [budgetMode, setBudgetMode] = useState<'fixed' | 'previous' | 'average'>('fixed')
  const [showCategoryToggle, setShowCategoryToggle] = useState(false)

  // Gestione quick periods
  const quickPeriods = [
    { id: 'month' as const, label: 'Questo mese', start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: new Date() },
    { id: '3months' as const, label: 'Ultimi 3 mesi', start: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1), end: new Date() },
    { id: 'year' as const, label: 'Anno corrente', start: new Date(new Date().getFullYear(), 0, 1), end: new Date() },
    { id: 'custom' as const, label: 'Personalizzato', start: null, end: null }
  ]

  // Aggiorna dateRange quando cambia selectedPeriod
  const handlePeriodChange = (period: 'month' | '3months' | 'year' | 'custom') => {
    setSelectedPeriod(period)
    if (period !== 'custom') {
      const selected = quickPeriods.find(p => p.id === period)
      if (selected) {
        setDateRange({ start: selected.start, end: selected.end })
      }
    }
  }

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

    // Budget tracking per categoria
    const budgetByCategory = {} as Record<string, {
      budget: number;
      spent: number;
      remaining: number;
      percentUsed: number;
      status: 'under' | 'warning' | 'over';
    }>;
    
    let totalBudget = 0;
    
    categories.forEach(category => {
      const budget = Number(category.monthly_budget) || 0;
      const spent = categoryStats[category.name]?.total || 0;
      const remaining = budget - spent;
      const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;
      
      let status: 'under' | 'warning' | 'over' = 'under';
      if (percentUsed >= 100) status = 'over';
      else if (percentUsed >= 80) status = 'warning';
      
      budgetByCategory[category.name] = {
        budget,
        spent,
        remaining,
        percentUsed: Math.round(percentUsed),
        status
      };
      
      totalBudget += budget;
    })
    
    // Trend mensile per categorie (ultimi 6 mesi)
    const categoryTrend = {} as Record<string, Array<{ month: string, amount: number }>>
    const monthTotals: Array<{ month: string; amount: number }> = []

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = targetDate.toLocaleDateString('it-IT', { month: 'short' })
      
      const monthTransactions = filteredTransactions.filter(t => {
        const transactionDate = new Date(t.transaction_date)
        return transactionDate.getMonth() === targetDate.getMonth() && 
               transactionDate.getFullYear() === targetDate.getFullYear()
      })
      
      // totale spese di quel mese (tutte le categorie)
      const totalForMonth = monthTransactions
        .filter(t => t.current_amount < 0 && !t.asset_id)
        .reduce((sum, t) => sum + Math.abs(t.current_amount), 0)
      monthTotals.push({ month: monthName, amount: totalForMonth })

      Object.keys(categoryStats).forEach(category => {
        if (!categoryTrend[category]) categoryTrend[category] = []
        
        const monthAmount = monthTransactions
          .filter(t => t.categories?.name === category && t.current_amount < 0 && !t.asset_id)
          .reduce((sum, t) => sum + Math.abs(t.current_amount), 0)
          
        categoryTrend[category].push({ month: monthName, amount: monthAmount })
      })
    }

    // Calcoli spesa mese precedente e media mesi passati per ogni categoria
    const prevMonthSpentByCategory: Record<string, number> = {}
    const avgSpentByCategory: Record<string, number> = {}

    Object.entries(categoryTrend).forEach(([category, trend]) => {
      // trend array contiene 6 mesi con ultimo elemento = mese corrente
      if (trend.length > 1) {
        prevMonthSpentByCategory[category] = trend[trend.length - 2].amount
      } else {
        prevMonthSpentByCategory[category] = 0
      }

      const prevMonths = trend.slice(0, -1) // escludi mese corrente
      const totalPrev = prevMonths.reduce((s, d) => s + d.amount, 0)
      avgSpentByCategory[category] = prevMonths.length > 0 ? totalPrev / prevMonths.length : 0
    })

    //Insights: anomalie e previsione totale
    const anomalyCategories: string[] = []
    Object.keys(categoryStats).forEach(category => {
      const current = categoryStats[category]?.total || 0
      const avg = avgSpentByCategory[category] || 0
      if (avg > 0 && current / avg > 1.5) {
        anomalyCategories.push(category)
      }
    })

    let predictedNextMonthExpenses = 0
    if (monthTotals.length >= 3) {
      const lastThree = monthTotals.slice(-3).map(m => m.amount)
      predictedNextMonthExpenses = lastThree.reduce((s, v) => s + v, 0) / lastThree.length
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
        : 0,
      budgetByCategory,
      totalBudget,
      prevMonthSpentByCategory,
      avgSpentByCategory,
      anomalyCategories,
      predictedNextMonthExpenses
    }
  }, [filteredTransactions, assets, categories])

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
      // Implementazione PDF con jsPDF e html2canvas
      const generatePDF = async () => {
        try {
          const pdf = new jsPDF('p', 'mm', 'a4')
          const pageWidth = pdf.internal.pageSize.getWidth()
          const pageHeight = pdf.internal.pageSize.getHeight()
          let yPosition = 20

          // Header
          pdf.setFontSize(20)
          pdf.setTextColor(40, 40, 40)
          pdf.text('Report Finanziario Mosaiko', pageWidth / 2, yPosition, { align: 'center' })
          yPosition += 15

          pdf.setFontSize(12)
          pdf.setTextColor(100, 100, 100)
          pdf.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, pageWidth / 2, yPosition, { align: 'center' })
          yPosition += 20

          // Periodo e filtri
          pdf.setFontSize(14)
          pdf.setTextColor(40, 40, 40)
          pdf.text('Periodo e Filtri', 20, yPosition)
          yPosition += 10

          pdf.setFontSize(10)
          pdf.setTextColor(80, 80, 80)
          const periodText = `Periodo: ${dateRange.start ? dateRange.start.toLocaleDateString('it-IT') : 'Inizio'} - ${dateRange.end ? dateRange.end.toLocaleDateString('it-IT') : 'Fine'}`
          pdf.text(periodText, 20, yPosition)
          yPosition += 8

          if (selectedAccounts.length > 0) {
            pdf.text(`Account selezionati: ${selectedAccounts.join(', ')}`, 20, yPosition)
            yPosition += 8
          }

          pdf.text(`${filteredTransactions.length} transazioni filtrate`, 20, yPosition)
          yPosition += 15

          // Riepilogo finanziario
          pdf.setFontSize(14)
          pdf.setTextColor(40, 40, 40)
          pdf.text('Riepilogo Finanziario', 20, yPosition)
          yPosition += 10

          pdf.setFontSize(10)
          const summaryData = [
            ['Totale Entrate:', formatCurrency(advancedStats.totalIncome)],
            ['Totale Uscite:', formatCurrency(advancedStats.totalExpenses)],
            ['Flusso Netto:', formatCurrency(advancedStats.netFlow)],
            ['Tasso Risparmio:', `${((advancedStats.totalIncome - advancedStats.totalExpenses) / Math.max(advancedStats.totalIncome, 1) * 100).toFixed(1)}%`]
          ]

          summaryData.forEach(([label, value]) => {
            pdf.setTextColor(80, 80, 80)
            pdf.text(label, 20, yPosition)
            pdf.setTextColor(40, 40, 40)
            pdf.text(value, 120, yPosition)
            yPosition += 8
          })

          yPosition += 10

          // Top categorie
          if (Object.keys(advancedStats.categoryStats).length > 0) {
            pdf.setFontSize(14)
            pdf.setTextColor(40, 40, 40)
            pdf.text('Top Categorie di Spesa', 20, yPosition)
            yPosition += 10

            pdf.setFontSize(10)
            const topCategories = Object.entries(advancedStats.categoryStats)
              .sort((a, b) => b[1].total - a[1].total)
              .slice(0, 5)

            topCategories.forEach(([category, stats], index) => {
              if (yPosition > pageHeight - 30) {
                pdf.addPage()
                yPosition = 20
              }

              pdf.setTextColor(80, 80, 80)
              pdf.text(`${index + 1}. ${category}`, 20, yPosition)
              pdf.setTextColor(40, 40, 40)
              pdf.text(formatCurrency(stats.total), 120, yPosition)
              pdf.setTextColor(100, 100, 100)
              pdf.text(`(${stats.count} trans.)`, 160, yPosition)
              yPosition += 8
            })

            yPosition += 10
          }

          // Cattura screenshot del grafico (se presente)
          const chartElement = document.querySelector('.recharts-wrapper')
          if (chartElement) {
            try {
              const canvas = await html2canvas(chartElement as HTMLElement, {
                scale: 2,
                useCORS: true,
                allowTaint: true
              })
              
              const imgData = canvas.toDataURL('image/png')
              const imgWidth = 170
              const imgHeight = (canvas.height * imgWidth) / canvas.width

              if (yPosition + imgHeight > pageHeight - 20) {
                pdf.addPage()
                yPosition = 20
              }

              pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight)
              yPosition += imgHeight + 10
            } catch (error) {
              console.warn('Impossibile catturare il grafico:', error)
            }
          }

          // Footer
          const footerY = pageHeight - 15
          pdf.setFontSize(8)
          pdf.setTextColor(120, 120, 120)
          pdf.text('Report generato automaticamente da Mosaiko', pageWidth / 2, footerY, { align: 'center' })

          // Salva il PDF
          pdf.save(`report-finanziario-${new Date().toISOString().split('T')[0]}.pdf`)
        } catch (error) {
          console.error('Errore nella generazione del PDF:', error)
          alert('Errore nella generazione del PDF. Riprova più tardi.')
        }
      }

      generatePDF()
    }
    
    setShowExportModal(false)
  }

  const tabs = [
    { id: 'overview' as ReportTab, label: 'Dashboard', icon: BarChart3 },
    { id: 'accounts' as ReportTab, label: 'Account', icon: CreditCard },
    { id: 'transactions' as ReportTab, label: 'Transazioni', icon: TrendingUp },
    { id: 'assets' as ReportTab, label: 'Asset', icon: Package },
    { id: 'goals' as ReportTab, label: 'Obiettivi', icon: Target }
  ]

  // Badge per le tab
  const tabBadges = useMemo(() => ({
    overview: {
      total: formatCurrency(advancedStats.totalIncome - advancedStats.totalExpenses),
      change: advancedStats.transactionGrowth !== 0 ? `${advancedStats.transactionGrowth > 0 ? '+' : ''}${formatPercentage(Math.abs(advancedStats.transactionGrowth))}` : null
    },
    accounts: {
      count: accountOptions.length,
      total: formatCurrency(advancedStats.totalIncome - advancedStats.totalExpenses)
    },
    transactions: {
      count: filteredTransactions.length,
      total: formatCurrency(filteredTransactions.reduce((sum, t) => sum + t.current_amount, 0))
    },
    assets: {
      count: assets.length,
      total: formatCurrency(assets.reduce((sum, a) => sum + a.value, 0))
    },
    goals: {
      count: goals.length,
      completed: goals.filter(g => g.current_amount >= g.target_amount).length
    }
  }), [advancedStats, accountOptions.length, filteredTransactions, assets, goals])

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

  const renderDashboardTab = () => {
    // Calcoli principali per la dashboard
    const totalPatrimonio = accounts.reduce((sum, acc) => sum + acc.current_balance, 0) + 
                          assets.reduce((sum, asset) => sum + asset.value, 0)
    
    const currentMonthIncome = transactions
      .filter(t => {
        const date = new Date(t.transaction_date)
        const now = new Date()
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() && t.current_amount > 0
      })
      .reduce((sum, t) => sum + t.current_amount, 0)
    
    const currentMonthExpenses = Math.abs(transactions
      .filter(t => {
        const date = new Date(t.transaction_date)
        const now = new Date()
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() && t.current_amount < 0 && !t.asset_id
      })
      .reduce((sum, t) => sum + t.current_amount, 0))
    
    const savingsRate = currentMonthIncome > 0 ? ((currentMonthIncome - currentMonthExpenses) / currentMonthIncome) * 100 : 0
    
    // Calcoli per medie mensili
    const avgMonthlyIncome = advancedStats.totalIncome / Math.max(1, Math.min(12, transactions.length > 0 ? 
      Math.ceil((new Date().getTime() - new Date(transactions[transactions.length - 1].transaction_date).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 1))
    const avgMonthlyExpenses = advancedStats.totalExpenses / Math.max(1, Math.min(12, transactions.length > 0 ? 
      Math.ceil((new Date().getTime() - new Date(transactions[transactions.length - 1].transaction_date).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 1))
    
    // Asset allocation data
    const assetAllocationData = assets.map(asset => ({
      name: asset.name,
      value: asset.value,
      percentage: totalPatrimonio > 0 ? (asset.value / totalPatrimonio) * 100 : 0,
      type: asset.type
    })).sort((a, b) => b.value - a.value)
    
    // Budget overview - categorie con budget attivo
    const budgetCategories = Object.entries(advancedStats.budgetByCategory)
      .filter(([name, data]) => data.budget > 0)
      .map(([name, data]) => ({
        name,
        ...data
      }))
    const overBudgetCategories = budgetCategories
      .filter(cat => cat.status === 'over')
      .map(cat => ({
        name: cat.name,
        budget: cat.budget,
        spent: cat.spent
      }))
    
    // Colors for charts
    const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316']
    
    return (
      <div className="space-y-10">
        {/* Header con controlli periodo */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">Panoramica Finanziaria</h2>
              <p className="text-lg text-gray-600">Vista completa e dettagliata della tua situazione finanziaria</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="text-sm text-gray-600 bg-white px-4 py-2 rounded-lg border border-gray-200">
                <span className="font-medium">Ultimo aggiornamento:</span><br />
                {new Date().toLocaleDateString('it-IT', {
                  day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Metriche Principali - Layout più arioso */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
            <h3 className="text-xl font-semibold text-gray-900">Situazione Finanziaria Attuale</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            <FinanceWidget
              title="Patrimonio Totale"
              value={formatCurrency(totalPatrimonio)}
              subtitle={`${accounts.length} account + ${assets.length} asset`}
              icon="balance"
              color="blue"
              loading={loading}
            />
            <FinanceWidget
              title="Entrate Mese"
              value={formatCurrency(currentMonthIncome)}
              subtitle={new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
              icon="income"
              color="green"
              trend={currentMonthIncome > 0 ? 'up' : 'neutral'}
              loading={loading}
            />
            <FinanceWidget
              title="Uscite Mese"
              value={formatCurrency(currentMonthExpenses)}
              subtitle={advancedStats.topCategory ? `Top: ${advancedStats.topCategory.name}` : 'Nessuna spesa'}
              icon="expenses"
              color="red"
              trend={currentMonthExpenses > 0 ? 'down' : 'neutral'}
              loading={loading}
            />
            <FinanceWidget
              title="Tasso Risparmio"
              value={`${savingsRate.toFixed(1)}%`}
              subtitle={savingsRate >= 20 ? 'Ottimo!' : savingsRate >= 10 ? 'Buono' : 'Da migliorare'}
              icon="savings"
              color="purple"
              trend={savingsRate >= 20 ? 'up' : savingsRate >= 10 ? 'neutral' : 'down'}
              loading={loading}
            />
          </div>
        </div>

        {/* Sezione Asset Allocation */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-green-500 rounded-full"></div>
            <h3 className="text-xl font-semibold text-gray-900">Allocazione Asset</h3>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-8">
              {assets.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-medium text-gray-900">Distribuzione</h4>
                      <span className="text-sm text-gray-500">{assets.length} asset totali</span>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={assetAllocationData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={120}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {assetAllocationData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => formatCurrency(value)}
                            labelFormatter={(label) => `${label}`}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-gray-900">Dettagli Asset</h4>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {assetAllocationData.slice(0, 8).map((asset, index) => (
                        <div key={asset.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center space-x-4">
                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 truncate">{asset.name}</p>
                              <p className="text-sm text-gray-600">{asset.type}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-gray-900">{formatCurrency(asset.value)}</p>
                            <p className="text-sm text-gray-600">{asset.percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PieChart className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Nessun asset registrato</h4>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Aggiungi i tuoi investimenti per vedere l'allocazione del patrimonio e monitorare le performance.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sezione Budget Tracking */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-orange-500 rounded-full"></div>
            <h3 className="text-xl font-semibold text-gray-900">Monitoraggio Budget</h3>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Target className="h-6 w-6 text-orange-600" />
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">Controllo Spese Mensili</h4>
                    <p className="text-sm text-gray-600">Monitora i tuoi budget per categoria</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">{budgetCategories.length} categorie con budget</span>
                  </div>
                  {overBudgetCategories.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-red-700 font-medium">
                        {overBudgetCategories.length} oltre budget
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {budgetCategories.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {budgetCategories.slice(0, 4).map((category) => (
                      <BudgetCategoryWidget
                        key={category.name}
                        categoryName={category.name}
                        budget={category.budget}
                        spent={category.spent}
                        remaining={category.remaining}
                        percentUsed={category.percentUsed}
                        status={category.status}
                        comparison={{
                          label: budgetMode === 'previous' ? 'Mese scorso' : budgetMode === 'average' ? 'Media' : 'Fisso',
                          value: budgetMode === 'previous'
                            ? (advancedStats.prevMonthSpentByCategory[category.name] || 0)
                            : budgetMode === 'average'
                            ? (advancedStats.avgSpentByCategory[category.name] || 0)
                            : category.spent,
                          percentDiff: budgetMode === 'previous'
                            ? ((category.spent - (advancedStats.prevMonthSpentByCategory[category.name] || 0)) / Math.max(1, advancedStats.prevMonthSpentByCategory[category.name] || 1)) * 100
                            : budgetMode === 'average'
                            ? ((category.spent - (advancedStats.avgSpentByCategory[category.name] || 0)) / Math.max(1, advancedStats.avgSpentByCategory[category.name] || 1)) * 100
                            : 0
                        }}
                      />
                    ))}
                  </div>

                  {budgetCategories.length > 4 && (
                    <div className="text-center pt-6 border-t border-gray-200">
                      <p className="text-sm text-gray-500">
                        + {budgetCategories.length - 4} altre categorie con budget attivo
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Nessun budget impostato</h4>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Imposta budget mensili per le tue categorie di spesa per monitorare e controllare le uscite.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Alert Budget */}
        {overBudgetCategories.length > 0 && (
          <BudgetAlertBanner 
            overBudgetCategories={overBudgetCategories}
          />
        )}

        {/* Insights e Raccomandazioni */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend Entrate/Uscite */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
              Trend Mensile
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm text-green-700">Entrate Medie</p>
                  <p className="text-2xl font-bold text-green-800">
                    {formatCurrency(avgMonthlyIncome)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm text-red-700">Uscite Medie</p>
                  <p className="text-2xl font-bold text-red-800">
                    {formatCurrency(avgMonthlyExpenses)}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
              <div className={`flex justify-between items-center p-4 rounded-lg ${
                advancedStats.netFlow >= 0 ? 'bg-blue-50' : 'bg-orange-50'
              }`}>
                <div>
                  <p className={`text-sm ${advancedStats.netFlow >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                    Saldo Netto Medio
                  </p>
                  <p className={`text-2xl font-bold ${advancedStats.netFlow >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                    {formatCurrency(advancedStats.netFlow)}
                  </p>
                </div>
                {advancedStats.netFlow >= 0 ? (
                  <ArrowUp className="h-8 w-8 text-blue-600" />
                ) : (
                  <ArrowDown className="h-8 w-8 text-orange-600" />
                )}
              </div>
            </div>
          </div>

          {/* Raccomandazioni Intelligenti */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Lightbulb className="h-5 w-5 text-yellow-600 mr-2" />
              Insights & Suggerimenti
            </h3>
            <div className="space-y-4">
              {/* Saldo del mese corrente */}
              <div className={`p-4 rounded-lg ${
                currentMonthIncome - currentMonthExpenses >= 0 ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <h4 className={`font-medium mb-2 ${
                  currentMonthIncome - currentMonthExpenses >= 0 ? 'text-green-900' : 'text-red-900'
                }`}>
                  {currentMonthIncome - currentMonthExpenses >= 0 ? '✅ Mese in Positivo' : '⚠️ Mese in Deficit'}
                </h4>
                <p className={`text-sm ${
                  currentMonthIncome - currentMonthExpenses >= 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  {currentMonthIncome - currentMonthExpenses >= 0
                    ? `Hai risparmiato ${formatCurrency(currentMonthIncome - currentMonthExpenses)} questo mese!`
                    : `Hai speso ${formatCurrency(Math.abs(currentMonthIncome - currentMonthExpenses))} più di quanto guadagnato.`
                  }
                </p>
              </div>

              {/* Suggerimento basato sui dati */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">💡 Suggerimento</h4>
                <p className="text-blue-700 text-sm">
                  {savingsRate < 10
                    ? 'Considera di ridurre le spese discrezionali per aumentare il tasso di risparmio.'
                    : savingsRate < 20
                    ? 'Buon lavoro! Continua a monitorare le spese per raggiungere il 20% di risparmio.'
                    : totalPatrimonio < currentMonthIncome * 6
                    ? 'Il tuo risparmio è eccellente! Valuta di investire parte del surplus.'
                    : 'Ottima gestione finanziaria! Mantieni questo livello di disciplina.'
                  }
                </p>
              </div>

              {/* Progress obiettivi */}
              {goals.length > 0 && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">🎯 Progress Obiettivi</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-700">Completamento medio</span>
                      <span className="font-medium text-purple-900">
                        {goals.length > 0 ? (goals.reduce((sum, g) => sum + (g.current_amount / g.target_amount) * 100, 0) / goals.length).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(goals.length > 0 ? goals.reduce((sum, g) => sum + (g.current_amount / g.target_amount) * 100, 0) / goals.length : 0, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-purple-600 mt-1">
                      {goals.filter(g => (g.current_amount / g.target_amount) * 100 >= 100).length} di {goals.length} obiettivi completati
                    </p>
                  </div>
                </div>
              )}
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

        {/* Quick insights */}
        <div className="space-y-4">
          {advancedStats.anomalyCategories.length > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p className="font-semibold text-yellow-800">Anomalie spesa</p>
              <p className="text-sm text-yellow-700">Categorie con spese oltre il 150% della media recente:</p>
              <ul className="list-disc ml-5 mt-1 text-yellow-800">
                {advancedStats.anomalyCategories.map(cat => (
                  <li key={cat}>{cat}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <p className="font-semibold text-blue-800">Previsione spese prossimo mese</p>
            <p className="text-sm text-blue-700">
              {formatCurrency(advancedStats.predictedNextMonthExpenses)} (media ultimi 3 mesi)
            </p>
          </div>
        </div>

        {/* Budget Tracking Section */}
        {Object.keys(advancedStats.budgetByCategory).length > 0 && (
          <div className="space-y-4">

            {/* Budget Categories Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Target className="h-5 w-5 text-blue-600 mr-2" />
                  Budget per Categoria
                </h3>
                <div className="flex items-center space-x-2 text-sm">
                  <label htmlFor="budgetMode" className="font-medium">Comparazione:</label>
                  <select
                    id="budgetMode"
                    value={budgetMode}
                    onChange={e => setBudgetMode(e.target.value as 'fixed' | 'previous' | 'average')}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="fixed">Budget fisso</option>
                    <option value="previous">Mese precedente</option>
                    <option value="average">Media ultimi mesi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(advancedStats.budgetByCategory)
                  .filter(([_, budget]) => budget.budget > 0) // Mostra solo categorie con budget
                  .sort((a, b) => b[1].percentUsed - a[1].percentUsed) // Ordina per percentUsed decrescente
                  .map(([categoryName, budget]) => {
                    // compute comparison value
                    let compValue = 0
                    let compLabel = ''
                    if (budgetMode === 'previous') {
                      compValue = advancedStats.prevMonthSpentByCategory[categoryName] || 0
                      compLabel = 'Spesa mese precedente'
                    } else if (budgetMode === 'average') {
                      compValue = advancedStats.avgSpentByCategory[categoryName] || 0
                      compLabel = 'Spesa media'
                    } else {
                      compValue = budget.budget
                      compLabel = 'Budget'
                    }
                    const percentDiff = compValue === 0 ? 0 : ((budget.spent - compValue) / (compValue || 1)) * 100

                    return (
                      <BudgetCategoryWidget
                        key={categoryName}
                        categoryName={categoryName}
                        budget={budget.budget}
                        spent={budget.spent}
                        remaining={budget.remaining}
                        percentUsed={budget.percentUsed}
                        status={budget.status}
                        comparison={{
                          label: compLabel,
                          value: compValue,
                          percentDiff
                        }}
                      />
                    )
                  })}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Grafico a Barre Orizzontali - Categorie */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="h-5 w-5 text-purple-600 mr-2" />
                Spese per Categoria
              </h3>
              <button
                onClick={() => setShowCategoryToggle(!showCategoryToggle)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {showCategoryToggle ? 'Nascondi' : 'Mostra'} dettagli
              </button>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(advancedStats.categoryStats)
                    .sort((a, b) => b[1].total - a[1].total)
                    .slice(0, 8)
                    .map(([name, stats]) => ({
                      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
                      fullName: name,
                      value: stats.total,
                      count: stats.count
                    }))}
                  layout="horizontal"
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    type="number"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `€${(value/1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      'Spesa Totale'
                    ]}
                    labelFormatter={(label) => {
                      const item = Object.entries(advancedStats.categoryStats)
                        .find(([name]) => name.length > 15 ? name.substring(0, 15) + '...' === label : name === label)
                      return item ? item[0] : label
                    }}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {showCategoryToggle && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {Object.entries(advancedStats.categoryStats)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([category, stats], index) => (
                      <div key={category} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="text-gray-700">{category}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-gray-900">{formatCurrency(stats.total)}</span>
                          <span className="text-gray-500 ml-2">({stats.count})</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Grafico a Linee Full-Width - Trend */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
                Trend Temporale delle Spese
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Periodo:</span>
                <span className="font-medium">
                  {dateRange.start && dateRange.end 
                    ? `${dateRange.start.toLocaleDateString('it-IT', { month: 'short' })} - ${dateRange.end.toLocaleDateString('it-IT', { month: 'short' })}`
                    : 'Ultimi 6 mesi'
                  }
                </span>
              </div>
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
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
                      <TrendingUp className="h-12 w-12 mx-auto mb-2 text-gray-300" />
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
          </div>
        </div>

        {/* Statistiche Spostate Sotto */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-700 text-sm font-medium">Transazioni Totali</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{filteredTransactions.length}</p>
                <p className="text-blue-600 text-xs mt-1">di {transactions.length} totali</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-700 text-sm font-medium">Totale Uscite</p>
                <p className="text-2xl font-bold text-red-900 mt-1">{formatCurrency(advancedStats.totalExpenses)}</p>
                <p className="text-red-600 text-xs mt-1">{Object.keys(advancedStats.categoryStats).length} categorie</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-700 text-sm font-medium">Totale Entrate</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{formatCurrency(advancedStats.totalIncome)}</p>
                <p className="text-green-600 text-xs mt-1">Bilancio: {advancedStats.netFlow >= 0 ? '+' : ''}{formatCurrency(advancedStats.netFlow)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-700 text-sm font-medium">Categoria Top</p>
                <p className="text-lg font-bold text-purple-900 mt-1">{advancedStats.topCategory?.name || 'N/A'}</p>
                <p className="text-purple-600 text-xs mt-1">
                  {advancedStats.topCategory ? formatCurrency(advancedStats.topCategory.amount) : '€0'}
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
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

  const renderGoalsTab = () => {
    // Calcoli per obiettivi con deadline e rischio
    const goalsWithDeadline = goals.map(goal => {
      const progress = (goal.current_amount / goal.target_amount) * 100
      const remaining = goal.target_amount - goal.current_amount
      
      // Calcola deadline (usa target_date se disponibile, altrimenti assumi 12 mesi)
      const deadline = goal.target_date ? new Date(goal.target_date) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      
      // Calcola progresso necessario al giorno
      const requiredProgressPerDay = remaining / Math.max(daysLeft, 1)
      
      // Determina livello di rischio
      let riskLevel: 'low' | 'medium' | 'high' = 'low'
      let riskBadge = '🟢 Sicuro'
      
      if (daysLeft < 30) {
        riskLevel = 'high'
        riskBadge = '🔴 Urgente'
      } else if (daysLeft < 90) {
        riskLevel = 'medium'
        riskBadge = '🟡 Attenzione'
      }
      
      if (progress < 20 && daysLeft < 180) {
        riskLevel = 'high'
        riskBadge = '🔴 Critico'
      }
      
      return {
        ...goal,
        progress,
        remaining,
        deadline,
        daysLeft,
        requiredProgressPerDay,
        riskLevel,
        riskBadge
      }
    })

    // Dati per grafico crescita obiettivi
    const growthData = goals.map(goal => ({
      name: goal.name.length > 20 ? goal.name.substring(0, 20) + '...' : goal.name,
      current: goal.current_amount,
      target: goal.target_amount,
      progress: (goal.current_amount / goal.target_amount) * 100,
      remaining: goal.target_amount - goal.current_amount
    })).sort((a, b) => b.progress - a.progress)

    return (
      <div className="space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-700 text-sm font-medium">Obiettivi Attivi</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{goals.length}</p>
                <p className="text-blue-600 text-xs mt-1">
                  {goals.filter(g => g.current_amount >= g.target_amount).length} completati
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-700 text-sm font-medium">Progresso Medio</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {goals.length > 0 ? (goals.reduce((sum, g) => sum + (g.current_amount / g.target_amount), 0) / goals.length * 100).toFixed(1) : 0}%
                </p>
                <p className="text-green-600 text-xs mt-1">Completamento</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-700 text-sm font-medium">Target Totale</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {formatCurrency(goals.reduce((sum, g) => sum + g.target_amount, 0))}
                </p>
                <p className="text-purple-600 text-xs mt-1">Importo obiettivi</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-700 text-sm font-medium">A Rischio</p>
                <p className="text-2xl font-bold text-orange-900 mt-1">
                  {goalsWithDeadline.filter(g => g.riskLevel === 'high').length}
                </p>
                <p className="text-orange-600 text-xs mt-1">Necessitano attenzione</p>
              </div>
              <Lightbulb className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Grafico Crescita Obiettivi */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
              Progresso Obiettivi
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Target vs Attuale</span>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={growthData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `€${(value/1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'current' ? 'Attuale' : name === 'remaining' ? 'Rimanente' : name
                  ]}
                  labelFormatter={(label) => {
                    const item = growthData.find(d => d.name === label)
                    return item ? item.name : label
                  }}
                />
                <Legend />
                <Bar dataKey="current" stackId="a" fill="#10b981" name="Attuale" />
                <Bar dataKey="remaining" stackId="a" fill="#e5e7eb" name="Rimanente" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lista Obiettivi con Deadline e Rischio */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Tracking Obiettivi</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Deadline e rischio</span>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {goalsWithDeadline.map((goal) => {
              const progress = goal.progress
              const isCompleted = progress >= 100
              
              return (
                <div key={goal.id} className="px-6 py-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{goal.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          goal.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                          goal.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {goal.riskBadge}
                        </span>
                        {isCompleted && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✅ Completato
                          </span>
                        )}
                      </div>
                      {goal.description && (
                        <p className="text-sm text-gray-600 mb-2">{goal.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Scadenza: {goal.deadline.toLocaleDateString('it-IT')}</span>
                        <span>{goal.daysLeft > 0 ? `${goal.daysLeft} giorni rimanenti` : 'Scaduto'}</span>
                        <span>Necessario: {formatCurrency(goal.requiredProgressPerDay)}/giorno</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-lg">
                        {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                      </p>
                      <p className="text-sm text-gray-600">{progress.toFixed(1)}% completato</p>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-gradient-to-r from-green-500 to-green-600' :
                        goal.riskLevel === 'high' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                        goal.riskLevel === 'medium' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                        'bg-gradient-to-r from-blue-500 to-blue-600'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Rimanente: {formatCurrency(goal.remaining)}</span>
                    <span>Target: {formatCurrency(goal.target_amount)}</span>
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
        return renderDashboardTab()
      case 'accounts':
        return renderAccountsTab()
      case 'transactions':
        return renderTransactionsTab()
      case 'assets':
        return renderAssetsTab()
      case 'goals':
        return renderGoalsTab()
      default:
        return renderDashboardTab()
    }
  }

  return (
      <ModuleLayout moduleId="finance">
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

          {/* Filtri Compatti */}
          <div className="mb-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" style={{ maxHeight: '80px' }}>
              <div className="px-6 py-3">
                <div className="flex items-center justify-between gap-4">
                  {/* Periodo */}
                  <div className="flex items-center gap-3">
                    <Filter className="h-4 w-4 text-blue-600" />
                    <div className="flex items-center gap-1">
                      {quickPeriods.map((period) => (
                        <button
                          key={period.id}
                          onClick={() => handlePeriodChange(period.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                            selectedPeriod === period.id
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {period.label}
                        </button>
                      ))}
                    </div>

                    {/* Date picker inline per personalizzato */}
                    {selectedPeriod === 'custom' && (
                      <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-200">
                        <input
                          type="date"
                          value={dateRange.start?.toISOString().split('T')[0] || ''}
                          onChange={(e) => setDateRange(prev => ({
                            ...prev,
                            start: e.target.value ? new Date(e.target.value) : null
                          }))}
                          className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-xs text-gray-500">a</span>
                        <input
                          type="date"
                          value={dateRange.end?.toISOString().split('T')[0] || ''}
                          onChange={(e) => setDateRange(prev => ({
                            ...prev,
                            end: e.target.value ? new Date(e.target.value) : null
                          }))}
                          className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Account Popover */}
                  <div className="flex items-center gap-3">
                    <Popover.Root>
                      <Popover.Trigger asChild>
                        <button className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                          <span>🏦 Account</span>
                          {selectedAccounts.length > 0 && (
                            <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-xs font-medium">
                              {selectedAccounts.length}
                            </span>
                          )}
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </Popover.Trigger>
                      <Popover.Portal>
                        <Popover.Content className="w-64 p-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50" sideOffset={4}>
                          <div className="p-3 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900">Seleziona account</span>
                              <span className="text-xs text-gray-500">{selectedAccounts.length} di {accountOptions.length}</span>
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            <div className="p-2 space-y-1">
                              <label className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedAccounts.length === 0}
                                  onChange={() => setSelectedAccounts([])}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-900 font-medium flex-1">Tutti gli account</span>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  {transactions.length}
                                </span>
                              </label>
                              <hr className="border-gray-200" />
                              {accountOptions.map(account => {
                                const accountTransactionCount = transactions.filter(t => t.account_name === account).length
                                return (
                                  <label key={account} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
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
                                    <span className="text-sm text-gray-900 flex-1">{account}</span>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                      {accountTransactionCount}
                                    </span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                          {selectedAccounts.length > 0 && (
                            <div className="p-3 border-t border-gray-100">
                              <button
                                onClick={() => setSelectedAccounts([])}
                                className="w-full text-xs text-red-600 hover:text-red-800 font-medium"
                              >
                                Rimuovi tutti
                              </button>
                            </div>
                          )}
                        </Popover.Content>
                      </Popover.Portal>
                    </Popover.Root>

                    {/* Counter transazioni */}
                    <div className="px-3 py-1 bg-gray-50 text-gray-700 text-xs rounded-lg border">
                      <span className="font-medium">{filteredTransactions.length}</span> di <span className="font-medium">{transactions.length}</span> transazioni
                    </div>

                    {/* Reset */}
                    {(dateRange.start || dateRange.end || selectedAccounts.length > 0) && (
                      <button
                        onClick={() => {
                          setDateRange({ start: null, end: null })
                          setSelectedAccounts([])
                          setSelectedPeriod('3months')
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100"
                      >
                        <X className="h-3 w-3" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
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

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">Errore nel caricamento dei dati: {error}</p>
            </div>
          )}

          {/* Tab Navigation Animata */}
          <div className="mb-8">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="relative">
                {/* Indicatore animato */}
                <div
                  className="absolute top-0 h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg transition-all duration-300 ease-in-out shadow-lg"
                  style={{
                    width: `${100 / tabs.length}%`,
                    left: `${tabs.findIndex(tab => tab.id === activeTab) * (100 / tabs.length)}%`,
                    transform: 'translateZ(0)' // Forza accelerazione hardware
                  }}
                />

                <nav className="relative flex" aria-label="Tabs">
                  {tabs.map((tab) => {
                    const Icon = tab.icon
                    const badge = tabBadges[tab.id as keyof typeof tabBadges]
                    const isActive = activeTab === tab.id

                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium text-sm transition-all duration-300 ${
                          isActive
                            ? 'text-white'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`h-4 w-4 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                        <span className="hidden sm:inline">{tab.label}</span>

                        {/* Badge */}
                        {badge && (
                          <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-all duration-200 ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {tab.id === 'overview' && 'change' in badge && badge.change && (
                              <span className={`flex items-center gap-0.5 ${badge.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                                {badge.change.startsWith('+') ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                {badge.change}
                              </span>
                            )}
                            {tab.id === 'accounts' && 'count' in badge && (
                              <span>{badge.count}</span>
                            )}
                            {tab.id === 'transactions' && 'count' in badge && (
                              <span>{badge.count}</span>
                            )}
                            {tab.id === 'assets' && 'count' in badge && (
                              <span>{badge.count}</span>
                            )}
                            {tab.id === 'goals' && 'completed' in badge && 'count' in badge && (
                              <span>{badge.completed}/{badge.count}</span>
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </nav>
              </div>
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
                              className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                                  <span className="text-red-600 font-semibold text-xs">PDF</span>
                                </div>
                                <div className="text-left">
                                  <p className="font-medium text-gray-900">PDF Report</p>
                                  <p className="text-sm text-gray-500">Report completo con grafici</p>
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
  )
}
