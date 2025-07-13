import { useMemo } from 'react';
import jsPDF from 'jspdf';
import { CreditCard, Calendar, FileText } from 'lucide-react';
import { useAccounts } from '@/lib/financeCache';


interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
}

export default function TransactionDetailsModal({ isOpen, onClose, transaction }: TransactionDetailsModalProps) {
  const { accounts } = useAccounts();
  // Cerca il colore dell'account associato alla transazione
  const accountColor = useMemo(() => {
    if (!transaction || !accounts) return '#2563eb';
    let acc = null;
    if (transaction.account_id) {
      acc = accounts.find((a: any) => a.id === transaction.account_id);
    }
    // Fallback: match per nome account se id non disponibile
    if (!acc && transaction.account_name) {
      acc = accounts.find((a: any) => a.name === transaction.account_name);
    }
    // Debug
    console.log('Accounts disponibili:', accounts);
    console.log('Account id:', transaction.account_id, 'Account name:', transaction.account_name, 'Account trovato:', acc);
    return acc?.color || '#2563eb';
  }, [transaction, accounts]);

  if (!isOpen || !transaction) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl shadow-2xl p-0 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, #18181b 60%, #23272f 100%)`,
          border: `2px solid ${accountColor}55`,
          boxShadow: `0 8px 32px 0 ${accountColor}22`,
        }}
      >
        {/* HEADER */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b backdrop-blur-md"
          style={{
            borderColor: accountColor,
            background: `linear-gradient(90deg, ${accountColor}22 0%, ${accountColor}66 100%)`,
            boxShadow: `0 2px 12px 0 ${accountColor}22`,
          }}
        >
          <div className="flex items-center gap-4">
            <CreditCard className="w-10 h-10" style={{ color: accountColor }} />
            <div>
              <div className="text-3xl font-bold leading-tight flex items-center gap-3">
                <span
                  style={{
                    color: transaction.current_amount > 0 ? '#22c55e' : '#fff',
                    textShadow: transaction.current_amount > 0 ? '0 1px 8px #22c55e44' : '0 1px 8px #0008',
                  }}
                >
                  {transaction.current_amount}€
                </span>
                {transaction.current_amount > 0 ? (
                  <span className="ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 shadow">Entrata</span>
                ) : (
                  <span className="ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 shadow">Uscita</span>
                )}
              </div>
              <div className="text-xs text-white/80 font-medium uppercase tracking-wide mt-1">
                {transaction.transaction_type || 'N/A'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-full p-2 transition"
          >
            <span className="sr-only">Chiudi</span>
            &times;
          </button>
        </div>

        {/* BODY */}
        <div className="px-6 py-6 space-y-6">
          {/* Data e account */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-base text-gray-100 font-semibold">
                {transaction.transaction_date && !isNaN(new Date(transaction.transaction_date).getTime())
                  ? new Date(transaction.transaction_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Da:</span>
            <span className="text-base text-white font-bold tracking-wide">{transaction.account_name || 'N/A'}</span>
            </div>
          </div>

          {/* Descrizione */}
          <div className="flex items-start gap-3 mt-4">
            <span className="text-xs text-gray-400 pt-1">Descrizione:</span>
            <span className="text-base text-white font-medium break-words max-w-[70%]" title={transaction.description || 'N/A'}>
              {transaction.transaction_details || 'N/A'}
            </span>
          </div>

          {/* Categoria e sottocategoria */}
          <div className="flex flex-wrap gap-4 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Categoria:</span>
              {transaction.categories?.name ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 shadow">
                  {transaction.categories.name}
                </span>
              ) : (
                <span className="text-gray-400 text-xs">Nessuna categoria</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Sottocategoria:</span>
              {transaction.subcategories?.name ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 shadow">
                  {transaction.subcategories.name}
                </span>
              ) : (
                <span className="text-gray-400 text-xs">Nessuna sottocategoria</span>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER / Azioni */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/90">
          <button
            className="text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center w-full py-3 rounded-xl font-semibold shadow-lg transition"
            onClick={async () => {
              const conferma = window.confirm('Vuoi scaricare la ricevuta in PDF di questa transazione?');
              if (!conferma) return;
              const doc = new jsPDF();
              doc.setFontSize(18);
              doc.text('Ricevuta Transazione', 14, 18);
              doc.setFontSize(12);
              doc.text(`Importo: ${transaction.current_amount}€`, 14, 32);
              doc.text(`Tipo: ${transaction.transaction_type || 'N/A'}`, 14, 40);
              doc.text(`Data: ${transaction.transaction_date ? new Date(transaction.transaction_date).toLocaleDateString('it-IT') : 'N/A'}`, 14, 48);
              doc.text(`Da: ${transaction.account_name || 'N/A'}`, 14, 56);
              doc.text(`Descrizione: ${transaction.transaction_details || 'N/A'}`, 14, 64);
              doc.text(`Categoria: ${transaction.categories?.name || 'Nessuna'}`, 14, 72);
              doc.text(`Sottocategoria: ${transaction.subcategories?.name || 'Nessuna'}`, 14, 80);
              doc.save(`ricevuta-transazione-${transaction.id || ''}.pdf`);
            }}
          >
            <FileText className="w-4 h-4 mr-2" /> Ottieni ricevuta
          </button>
        </div>
      </div>
    </div>
  );
}
