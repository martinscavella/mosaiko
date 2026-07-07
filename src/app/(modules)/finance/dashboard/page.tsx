// Indica che questo file è un componente client-side di Next.js
"use client";

// Import dei componenti principali della dashboard finanziaria
import ModuleLayout from "@/components/ModuleLayout"; // Layout di base per il modulo finanza
import ModuleHeader from "@/components/ui/ModuleHeader"; // Header della dashboard
import FinanceWidget from "@/components/ui/FinanceWidget"; // Widget per mostrare dati finanziari
import RecentTransactions from "@/components/ui/RecentTransactions"; // Lista delle transazioni recenti
import CategorySpendingWidget from "@/components/ui/CategorySpendingWidget"; // Spese per categoria del mese
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
import TransactionDetailsModal, { Transaction } from '@/components/ui/TransactionDetailsModal';

// Componente principale della dashboard finanziaria

export default function FinanceDashboard() {
  const router = useRouter();
  // Recupera dati finanziari (statistiche, stato di caricamento, errori)
  const { stats, loading, error } = useFinanceData();
  // Gestisce la cache e il refetch dei dati
  const { refetch, isDataStale, data } = useFinanceCache();
  // Recupera info utente e stato autenticazione
  const { user, loading: authLoading } = useAuth();

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (transaction: Transaction) => {
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

  // Aggregati del mese precedente per i delta reali dei KPI
  // (stessa logica delle stats: entrate = importi positivi, uscite senza acquisti asset)
  const prevMonth = (() => {
    if (!data?.transactions || !stats.monthYear) return null;
    const [year, month] = stats.monthYear.split("-").map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    let income = 0;
    let expenses = 0;
    let hasData = false;
    data.transactions.forEach((t) => {
      if (t.transaction_date.slice(0, 7) !== prevKey) return;
      hasData = true;
      const amount = Number(t.current_amount || 0);
      if (amount > 0) income += amount;
      else if (!t.asset_id) expenses += Math.abs(amount);
    });
    if (!hasData) return null;

    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    const label = prevDate.toLocaleDateString("it-IT", { month: "long" });
    return { income, expenses, savingsRate: Math.max(0, Math.min(100, savingsRate)), label };
  })();

  // Delta percentuale vs mese precedente, con sentiment corretto per ciascun KPI
  const pctDelta = (current: number, previous: number) =>
    previous !== 0 ? ((current - previous) / previous) * 100 : null;

  const incomeDelta = (() => {
    if (!prevMonth) return undefined;
    const pct = pctDelta(stats.monthlyIncome, prevMonth.income);
    if (pct === null) return undefined;
    return {
      label: `${Math.abs(pct).toFixed(0)}% vs ${prevMonth.label}`,
      direction: pct >= 0 ? ("up" as const) : ("down" as const),
      sentiment: pct >= 0 ? ("good" as const) : ("bad" as const),
    };
  })();

  const expensesDelta = (() => {
    if (!prevMonth) return undefined;
    const pct = pctDelta(stats.monthlyExpenses, prevMonth.expenses);
    if (pct === null) return undefined;
    return {
      label: `${Math.abs(pct).toFixed(0)}% vs ${prevMonth.label}`,
      direction: pct >= 0 ? ("up" as const) : ("down" as const),
      // Per le uscite un aumento è negativo
      sentiment: pct <= 0 ? ("good" as const) : ("bad" as const),
    };
  })();

  const savingsDelta = (() => {
    if (!prevMonth) return undefined;
    const diff = stats.savingsRate - prevMonth.savingsRate;
    return {
      label: `${Math.abs(diff).toFixed(1)} p.p. vs ${prevMonth.label}`,
      direction: diff >= 0 ? ("up" as const) : ("down" as const),
      sentiment: diff >= 0 ? ("good" as const) : ("bad" as const),
    };
  })();

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
        <div className="flex items-center justify-center min-h-[60vh]">
          <AuthRequiredMessage />
        </div>
      </ModuleLayout>
    );
  }

  // Render principale della dashboard
  return (
    <>
      {/* Layout principale della dashboard finanza */}
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
          {/* Header fisso e fluttante - solo il box stondato */}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 3xl:gap-6 mb-2"> {/* gap e mb uniformati a 4 */}
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

          {/* Seconda riga: KPI mensili con delta reale vs mese precedente */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-3 gap-4 3xl:gap-6 mb-4">
            <FinanceWidget
              title="Entrate Mensili"
              value={formatCurrency(stats.monthlyIncome)}
              subtitle={stats.currentMonth}
              icon="income"
              color="green"
              delta={incomeDelta}
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
              delta={expensesDelta}
              loading={loading}
              onClick={() => router.push('/finance/transactions')}
            />
            <FinanceWidget
              title="Risparmio Mensile"
              value={formatPercentage(stats.savingsRate)}
              subtitle={stats.currentMonth}
              icon="badge-percent"
              color="blue"
              delta={savingsDelta}
              loading={loading}
            />
          </div>

          {/* Terza riga: spese per categoria del mese */}
          <div className="mb-4">
            <CategorySpendingWidget />
          </div>

          {/* Transazioni recenti a tutta larghezza */}
          <div className="mb-4">
            <RecentTransactions limit={8} onTransactionClick={openModal} />
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
