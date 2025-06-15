'use client'

import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import FinanceWidget from '@/components/ui/FinanceWidget'
import RecentTransactions from '@/components/ui/RecentTransactions'
import FinancialGoalsWidget from '@/components/ui/FinancialGoalsWidget'
import CacheStatus from '@/components/ui/CacheStatus'
import { useFinanceData, useFinanceCache } from '@/lib/financeCache'
import { useAuth } from '@/lib/auth'
import { RefreshCw, BarChart3 } from 'lucide-react'

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 custom-scrollbar">
          <ModuleHeader
            title="Dashboard Finanziaria"
            subtitle="Gestisci le tue finanze in tempo reale"
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
                label: 'Saldo Totale',
                value: formatCurrency(stats.totalBalance),
                color: 'blue'
              },
              {
                label: 'Tasso Risparmio',
                value: formatPercentage(stats.savingsRate),
                color: 'green'
              }
            ]}
            actions={[
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
    </>
  )
}
