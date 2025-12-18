'use client'

import { useTransactions, useAccounts } from '@/lib/financeCache'
import { ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react'
import { useState } from 'react';
import TransactionDetailsModal from './TransactionDetailsModal';
import { formatCurrency } from '@/lib/helpers/format'

interface RecentTransactionsProps {
  limit?: number;
  onTransactionClick?: (transaction: any) => void;
}

export default function RecentTransactions({ limit = 5, onTransactionClick }: RecentTransactionsProps) {
  const { transactions, loading, error } = useTransactions(limit);
  const { accounts } = useAccounts();
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (transaction: any) => {
    if (onTransactionClick) {
      onTransactionClick(transaction);
    } else {
      setSelectedTransaction(transaction);
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setSelectedTransaction(null);
    setIsModalOpen(false);
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: new Date(dateString).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });

  const formatAmount = (amount: number, currency?: string) => {
    const curr = currency || accounts?.[0]?.currency || 'EUR'
    return formatCurrency(Math.abs(amount), curr)
  }

  const renderTransaction = (transaction: any) => {
    const isIncome = transaction.transaction_type === 'income' || transaction.current_amount > 0;
    const amount = Math.abs(transaction.current_amount);

    return (
          <div
        key={transaction.id}
        className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg shadow-sm hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
        onClick={() => openModal(transaction)}
      >
        <div
          className={`p-2 rounded-lg ${isIncome ? 'bg-green-100' : 'bg-red-100'}`}
        >
          {isIncome ? (
            <ArrowUpRight className="h-5 w-5 text-green-600" />
          ) : (
            <ArrowDownLeft className="h-5 w-5 text-red-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {transaction.transaction_details || 'Transazione'}
          </p>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>{formatDate(transaction.transaction_date)}</span>
            {transaction.account_name && <span>• {transaction.account_name}</span>}
            {transaction.categories?.name && <span>• {transaction.categories.name}</span>}
            {transaction.asset_quantity && <span>• Qtà: {transaction.asset_quantity}</span>}
          </div>
        </div>
        <div
          className={`text-sm font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}
        >
          {isIncome ? '+' : '-'}{formatAmount(amount, (transaction as any).currency || accounts?.find(a => a.name === transaction.account_name)?.currency)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="relative bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-6 min-h-[300px] max-h-[400px]">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Transazioni Recenti</h3>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-3 rounded-xl bg-gradient-to-br from-gray-100/60 to-gray-200/40 animate-pulse">
              <div className="h-10 w-10 bg-gray-200 rounded-xl"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative bg-white/95 backdrop-blur-xl border border-red-200/50 shadow-2xl rounded-2xl p-6 min-h-[300px] max-h-[400px]">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Transazioni Recenti</h3>
        <div className="text-center py-8">
          <div className="mx-auto mb-4 h-12 w-12 text-red-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 text-sm font-medium">Errore nel caricamento: {error}</p>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="relative bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-6 min-h-[300px] max-h-[400px]">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Transazioni Recenti</h3>
        <div className="text-center py-12">
          <div className="mx-auto mb-4 h-16 w-16 text-gray-400">
            <Calendar className="h-full w-full" />
          </div>
          <p className="text-gray-500 text-sm font-medium">Nessuna transazione trovata</p>
          <p className="text-gray-400 text-xs mt-2">Le tue transazioni appariranno qui</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-6 min-h-[200px] w-full max-w-2xl mx-auto overflow-auto break-words">
      {/* Header coerente con gli altri widget */}
      <div className="flex items-center space-x-3 mb-2 pb-2">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
          <Calendar className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Transazioni Recenti</h3>
          <p className="text-sm text-gray-600 font-medium mt-1">Visualizza le ultime transazioni registrate sui tuoi account e asset.</p>
        </div>
      </div>
      <div className="space-y-3">
        {transactions.filter(transaction => transaction.current_amount !== 0).map((transaction: any) => {
          const isIncome = transaction.transaction_type === 'income' || transaction.current_amount > 0;
          const amount = Math.abs(transaction.current_amount);
          return (
            <div
              key={transaction.id}
              className={`flex items-center space-x-4 p-4 rounded-xl shadow-sm bg-gradient-to-br from-white/80 to-gray-100/60 border border-white/60 hover:from-blue-50/80 hover:to-purple-50/40 hover:border-blue-200/80 transition-all duration-300 cursor-pointer group`}
              onClick={() => openModal(transaction)}
            >
              <div
                className={`p-2 rounded-xl shadow transition-all duration-300 ${isIncome ? 'bg-gradient-to-br from-green-400 to-emerald-500' : 'bg-gradient-to-br from-red-400 to-pink-500'}`}
              >
                {isIncome ? (
                  <ArrowUpRight className="h-5 w-5 text-white" />
                ) : (
                  <ArrowDownLeft className="h-5 w-5 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                  {transaction.transaction_details || 'Transazione'}
                </p>
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-gray-500 mt-1">
                  <span>{formatDate(transaction.transaction_date)}</span>
                  {transaction.account_name && <span>• {transaction.account_name}</span>}
                  {transaction.categories?.name && <span>• {transaction.categories.name}</span>}
                  {transaction.asset_quantity && <span>• Qtà: {transaction.asset_quantity}</span>}
                </div>
              </div>
              <div
                className={`text-lg font-bold ${isIncome ? 'text-green-600' : 'text-red-600'} group-hover:scale-110 transition-transform`}
              >
                {isIncome ? '+' : '-'}{formatAmount(amount)}
              </div>
            </div>
          );
        })}
      </div>
      {!onTransactionClick && (
        <TransactionDetailsModal
          isOpen={isModalOpen}
          onClose={closeModal}
          transaction={selectedTransaction}
        />
      )}
    </div>
  );
}
