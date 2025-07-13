import { useEffect, useState } from 'react';
import { CreditCard, Calendar, FileText } from 'lucide-react';

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
}

export default function TransactionDetailsModal({ isOpen, onClose, transaction }: TransactionDetailsModalProps) {
  console.log('TransactionDetailsModal montato. Props ricevute:', { isOpen, transaction });

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="rounded-lg shadow-lg w-full max-w-md p-6 relative"
        style={{ border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(10px)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-2"
        >
          <span className="sr-only">Chiudi</span>
          &times;
        </button>

        {/* Sezione superiore con importo e stato */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <CreditCard className="w-10 h-10 text-white" />
          </div>
          <p className="text-4xl font-bold text-white">{transaction.current_amount}€</p>
          <p className="text-sm text-gray-300">{transaction.transaction_type || 'N/A'}</p>
        </div>

        {/* Dettagli transazione */}
        <div className="space-y-4 border-t border-gray-500 pt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-300">Da:</p>
            <p className="text-sm text-white font-medium">{transaction.account_name || 'N/A'}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-300">Ricevuto il:</p>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-300" />
              <p className="text-sm text-white font-medium">{transaction.transaction_date || 'N/A'}</p>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-300">Numero transazione:</p>
            <p className="text-sm text-white font-medium">{transaction.transaction_id || 'N/A'}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-300">Riferimento:</p>
            <p className="text-sm text-white font-medium">{transaction.reference || 'N/A'}</p>
          </div>
        </div>

        {/* Azioni */}
        <div className="mt-6 border-t border-gray-500 pt-4">
          <button className="text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center w-full py-2 rounded-lg">
            <FileText className="w-4 h-4 mr-2" /> Ottieni ricevuta
          </button>
        </div>
      </div>
    </div>
  );
}
