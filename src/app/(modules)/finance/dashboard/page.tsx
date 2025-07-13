// Indica che questo file è un componente client-side di Next.js
"use client";

// Import dei componenti principali della dashboard finanziaria
import ModuleLayout from "@/components/ModuleLayout"; // Layout di base per il modulo finanza
import ModuleHeader from "@/components/ui/ModuleHeader"; // Header della dashboard
import FinanceWidget from "@/components/ui/FinanceWidget"; // Widget per mostrare dati finanziari
import RecentTransactions from "@/components/ui/RecentTransactions"; // Lista delle transazioni recenti
import FinancialGoalsWidget from "@/components/ui/FinancialGoalsWidget"; // Widget per obiettivi finanziari
import CacheStatus from "@/components/ui/CacheStatus"; // Stato della cache dei dati
import CashQuickActions from "@/components/ui/CashQuickActions"; // Azioni rapide sui contanti
import LoadingSpinner from "@/components/ui/LoadingSpinner"; // Spinner di caricamento uniforme
import AuthRequiredMessage from "@/components/ui/AuthRequiredMessage"; // Messaggio di login/registrazione
import { useFinanceData, useFinanceCache } from "@/lib/financeCache"; // Hook per dati e cache finanza
import { useAuth } from "@/lib/auth"; // Hook per autenticazione utente

import {
  formatCurrency,
  formatPercentage,
} from "@/lib/helpers/format";
import TotalBalanceChart from "@/components/ui/TotalBalanceChart";
import { useRouter } from "next/navigation";
import { RefreshCw, BarChart3 } from "lucide-react";
import { useState } from "react";
import TransactionDetailsModal from '@/components/ui/TransactionDetailsModal';

// Componente principale della dashboard finanziaria

export default function FinanceDashboard() {
  const router = useRouter();
  // Recupera dati finanziari (statistiche, stato di caricamento, errori)
  const { stats, loading, error } = useFinanceData();
  // Gestisce la cache e il refetch dei dati
  const { refetch, isDataStale, data } = useFinanceCache();
  // Recupera info utente e stato autenticazione
  const { user, loading: authLoading } = useAuth();

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedTransaction(null);
    setIsModalOpen(false);
  };

  // Calcolo tasso di risparmio totale su tutte le transazioni
  let totalIncome = 0;
  let totalExpenses = 0;
  if (data?.transactions) {
    data.transactions.forEach((t) => {
      const amount = Number(t.current_amount || 0);
      if (amount > 0) totalIncome += amount;
      else totalExpenses += Math.abs(amount);
    });
  }
  const totalSavingsRate =
    totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // Se l'autenticazione è in caricamento, mostra uno spinner uniforme
  if (authLoading) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="flex items-center justify-center min-h-[300px]">
          <LoadingSpinner size={48} />
        </div>
      </ModuleLayout>
    );
  }

  // Se l'utente non è autenticato, mostra un messaggio con pulsanti per login/registrazione
  if (!user) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 backdrop-blur-xl overflow-hidden">
          {/* Animated background elements come nella login */}
          <div className="absolute inset-0 pointer-events-none select-none">
            <div className="absolute top-20 left-20 w-72 h-72 bg-white bg-opacity-10 rounded-full filter blur-xl animate-pulse" />
            <div
              className="absolute bottom-20 right-20 w-96 h-96 bg-white bg-opacity-5 rounded-full filter blur-2xl animate-pulse"
              style={{ animationDelay: "1s" }}
            />
            <div
              className="absolute top-1/2 left-1/4 w-48 h-48 bg-purple-300 bg-opacity-20 rounded-full filter blur-xl animate-bounce"
              style={{ animationDuration: "3s" }}
            />
          </div>
          <div className="relative z-10 w-full flex items-center justify-center">
            <AuthRequiredMessage />
          </div>
        </div>
      </ModuleLayout>
    );
  }

  // Render principale della dashboard
  return (
    <>
      {/* Layout principale della dashboard finanza */}
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 custom-scrollbar">
          {/* Header della dashboard con titolo, sottotitolo, icona, stato cache e azioni */}
          <ModuleHeader
            title="Dashboard Finanziaria"
            subtitle="Gestisci le tue finanze in tempo reale"
            icon={<BarChart3 className="h-6 w-6 text-white" />}
            customContent={<CacheStatus />}
            statusIndicators={[
              {
                type: "warning",
                label: "Aggiornamento consigliato",
                show: isDataStale,
              },
              {
                type: "success",
                label: "Tutti i sistemi operativi",
                show: !loading && !error,
              },
            ]}
            stats={[
              {
                label: "Saldo Totale",
                value: formatCurrency(stats.totalBalance),
                color: "blue",
              },
              {
                label: "Risparmio Totale",
                value:
                  totalIncome > 0 ? formatPercentage(totalSavingsRate) : "—",
                color: "green",
              },
            ]}
            actions={[
              {
                label: "Aggiorna",
                onClick: () => refetch(),
                icon: <RefreshCw className="w-4 h-4" />,
                color: "blue",
                disabled: loading,
                loading: loading,
                hideTextOnMobile: true,
              },
            ]}
          />

          {/* Griglia principale: CashQuickActions a sinistra, saldo e obiettivi a destra */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-2"> {/* gap e mb uniformati a 4 */}
            {/* Sinistra: CashQuickActions (occupa metà schermo su desktop) */}
            <div className="w-full h-full flex flex-col">
              <CashQuickActions />
            </div>
            {/* Destra: grafico saldo totale */}
            <div className="flex flex-col h-full">
              <TotalBalanceChart 
                data={data ? {
                  transactions: data.transactions,
                  accounts: data.accounts,
                  assets: data.assets
                } : null} 
              />
            </div>
          </div>

          {/* Seconda riga: statistiche mensili, responsive */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4"> {/* gap e mb uniformati a 4 */}
            <FinanceWidget
              title="Entrate Mensili"
              value={formatCurrency(stats.monthlyIncome)}
              subtitle={stats.currentMonth}
              icon="income"
              color="green"
              trend={stats.monthlyIncome > 0 ? "up" : "neutral"}
              loading={loading}
              onClick={() => router.push('/finance/transactions')}
            />
            <FinanceWidget
              title="Uscite Mensili"
              value={formatCurrency(stats.monthlyExpenses)}
              subtitle={
                stats.topCategory
                  ? `${stats.currentMonth} - Top: ${stats.topCategory}`
                  : stats.currentMonth
              }
              icon="expenses"
              color="red"
              trend={stats.monthlyExpenses > 0 ? "down" : "neutral"}
              loading={loading}
              onClick={() => router.push('/finance/transactions')}
            />
            <FinanceWidget
              title="Risparmio Mensile"
              value={formatPercentage(stats.savingsRate)}
              subtitle="Risparmio mensile"
              icon="savings"
              color="purple"
              trend={
                stats.savingsRate > 20
                  ? "up"
                  : stats.savingsRate > 10
                  ? "neutral"
                  : "down"
              }
              loading={loading}
            />
          </div>

          {/* Transazioni Recenti e Obiettivi */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4"> {/* gap e mb uniformati a 4 */}
            <RecentTransactions limit={5} onTransactionClick={openModal} />
            <FinancialGoalsWidget limit={4} />
          </div>
        </div>
      </ModuleLayout>
      <TransactionDetailsModal
        isOpen={isModalOpen}
        onClose={closeModal}
        transaction={selectedTransaction}
      />
    </>
  );
}
