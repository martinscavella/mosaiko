'use client'

import ModuleLayout from '@/components/ModuleLayout'
import FinanceWidget from '@/components/ui/FinanceWidget'
import RecentTransactions from '@/components/ui/RecentTransactions'
import FinancialGoalsWidget from '@/components/ui/FinancialGoalsWidget'
import CacheStatus from '@/components/ui/CacheStatus'
import { useFinanceData, useFinanceCache } from '@/lib/financeCache'
import { useAuth } from '@/lib/auth'
import { RefreshCw } from 'lucide-react'

export default function FinanceDashboard() {
  const { stats, loading, error } = useFinanceData()
  const { refetch, isDataStale } = useFinanceCache()
  const { user, loading: authLoading } = useAuth()

  if (authLoading) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-500">Devi effettuare il login per visualizzare i dati finanziari</p>
          </div>
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

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  return (
    <ModuleLayout moduleId="finance">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 custom-scrollbar">
        {/* Header moderno con glassmorphism */}
        <div className="relative mb-8 group">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-green-500/10 rounded-2xl blur-xl transition-all duration-700 group-hover:from-blue-500/20 group-hover:via-purple-500/20 group-hover:to-green-500/20"></div>
          
          {/* Floating orbs effect */}
          <div className="absolute top-4 right-4 h-32 w-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-4 left-4 h-24 w-24 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          {/* Main header container */}
          <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 shadow-2xl rounded-2xl p-6 transition-all duration-300 hover:bg-white/95 hover:shadow-3xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              
              {/* Left side - Title and status */}
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="relative p-3 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl shadow-lg">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                      Dashboard Finanziaria
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                      Gestisci le tue finanze in tempo reale
                    </p>
                  </div>
                </div>
                
                {/* Status indicators */}
                <div className="flex flex-wrap items-center gap-3">
                  <CacheStatus />
                  
                  {isDataStale && (
                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-full animate-pulse">
                      <div className="h-2 w-2 bg-gradient-to-r from-orange-400 to-red-400 rounded-full animate-bounce"></div>
                      <span className="text-xs font-medium text-orange-700">
                        Aggiornamento consigliato
                      </span>
                    </div>
                  )}
                  
                  {!loading && !error && (
                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full">
                      <div className="h-2 w-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium text-green-700">
                        Tutti i sistemi operativi
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Right side - Actions */}
              <div className="flex items-center space-x-4">
                {/* Stats summary card */}
                <div className="hidden md:block">
                  <div className="flex items-center space-x-4 px-4 py-3 bg-gradient-to-br from-gray-50/90 to-gray-100/90 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="text-center">
                      <div className="text-xs font-medium text-gray-500 mb-1">Saldo Totale</div>
                      <div className="text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {formatCurrency(stats.totalBalance)}
                      </div>
                    </div>
                    <div className="h-10 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-gray-500 mb-1">Tasso Risparmio</div>
                      <div className="text-sm font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        {formatPercentage(stats.savingsRate)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Modern refresh button */}
                <div className="relative">
                  <button
                    onClick={() => refetch()}
                    disabled={loading}
                    className={`btn-refresh relative overflow-hidden px-6 py-3 rounded-xl font-medium transition-all duration-300 transform ${
                      loading 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed scale-95' 
                        : 'bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 text-white hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95'
                    }`}
                  >
                    {/* Shimmer effect - solo al hover del button */}
                    {!loading && (
                      <div className="shimmer-effect absolute inset-0 -top-2 -left-2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transform -translate-x-full transition-transform duration-700"></div>
                    )}
                    
                    {/* Button content */}
                    <div className="relative flex items-center space-x-2 z-10">
                      <RefreshCw className={`refresh-icon h-4 w-4 transition-all duration-300 ${
                        loading ? 'animate-spin' : ''
                      }`} />
                      <span className="hidden sm:inline transition-all duration-300">
                        {loading ? 'Sincronizzazione...' : 'Aggiorna Dati'}
                      </span>
                    </div>
                    
                    {/* Glow effect - solo al hover del button */}
                    {!loading && (
                      <div className="glow-effect absolute inset-0 -m-1 rounded-xl bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-indigo-600/50 opacity-0 transition-all duration-300 blur-sm"></div>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Animated loading progress bar */}
            {loading && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/50 rounded-b-2xl overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 animate-pulse relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">Errore nel caricamento dei dati: {error}</p>
          </div>
        )}

        {/* Widgets Principali */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <FinanceWidget
            title="Saldo Totale"
            value={formatCurrency(stats.totalBalance)}
            subtitle={`${stats.accountsCount} ${stats.accountsCount === 1 ? 'account' : 'accounts'}`}
            icon="balance"
            color="blue"
            loading={loading}
          />

          <FinanceWidget
            title="Entrate Mensili"
            value={formatCurrency(stats.monthlyIncome)}
            subtitle={stats.currentMonth}
            icon="income"
            color="green"
            trend={stats.monthlyIncome > 0 ? 'up' : 'neutral'}
            loading={loading}
          />

          <FinanceWidget
            title="Uscite Mensili"
            value={formatCurrency(stats.monthlyExpenses)}
            subtitle={stats.topCategory ? `${stats.currentMonth} - Top: ${stats.topCategory}` : stats.currentMonth}
            icon="expenses"
            color="red"
            trend={stats.monthlyExpenses > 0 ? 'down' : 'neutral'}
            loading={loading}
          />

          <FinanceWidget
            title="Tasso di Risparmio"
            value={formatPercentage(stats.savingsRate)}
            subtitle="Risparmio mensile"
            icon="savings"
            color="purple"
            trend={stats.savingsRate > 20 ? 'up' : stats.savingsRate > 10 ? 'neutral' : 'down'}
            loading={loading}
          />
        </div>

        {/* Widgets Secondari */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <FinanceWidget
            title="Account Attivi"
            value={stats.accountsCount}
            subtitle="Conti collegati"
            icon="accounts"
            color="orange"
            loading={loading}
          />

          <FinanceWidget
            title="Transazioni"
            value={stats.transactionsCount}
            subtitle="Totali registrate"
            icon="transactions"
            color="gray"
            loading={loading}
          />

          <FinanceWidget
            title="Obiettivi"
            value={formatPercentage(stats.goalProgress)}
            subtitle="Progresso medio"
            icon="goals"
            color="green"
            trend={stats.goalProgress > 50 ? 'up' : stats.goalProgress > 25 ? 'neutral' : 'down'}
            loading={loading}
          />
        </div>

        {/* Transazioni Recenti e Obiettivi */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentTransactions limit={6} />
          <FinancialGoalsWidget limit={4} />
        </div>
      </div>
    </ModuleLayout>
  )
}
