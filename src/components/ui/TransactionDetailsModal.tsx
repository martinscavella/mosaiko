import { Calendar, FileText } from 'lucide-react';
import Modal, { ModalButton } from './Modal';

export interface Transaction {
  id?: string;
  current_amount: number;
  transaction_type?: string;
  transaction_date?: string;
  account_id?: string;
  account_name?: string;
  transaction_details?: string;
  categories?: { name: string } | null;
  subcategories?: { name: string } | null;
}

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export default function TransactionDetailsModal({ isOpen, onClose, transaction }: TransactionDetailsModalProps) {
  if (!isOpen || !transaction) return null;
  const handleDownloadReceipt = async () => {
    const conferma = window.confirm('Vuoi scaricare la ricevuta in PDF di questa transazione?');
    if (!conferma) return;
    // Import dinamico: jspdf e' pesante e serve solo per questa azione rara
    const { default: jsPDF } = await import('jspdf');
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
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${transaction.current_amount > 0 ? 'Entrata' : 'Uscita'}: ${transaction.current_amount}€`}
      subtitle={transaction.transaction_type || 'Dettagli transazione'}
      size="md"
      footer={
        <ModalButton
          variant="primary"
          onClick={handleDownloadReceipt}
        >
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Ottieni ricevuta
          </span>
        </ModalButton>
      }
    >
      <div className="space-y-6">
          {/* Data e account */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700 font-medium">
                {transaction.transaction_date && !isNaN(new Date(transaction.transaction_date).getTime())
                  ? new Date(transaction.transaction_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Da:</span>
              <span className="text-sm text-gray-900 font-semibold">{transaction.account_name || 'N/A'}</span>
            </div>
          </div>

          {/* Descrizione */}
          <div className="flex items-start gap-3">
            <span className="text-xs text-gray-500 pt-0.5 whitespace-nowrap">Descrizione:</span>
            <span className="text-sm text-gray-900 font-medium break-words flex-1" title={transaction.transaction_details || 'N/A'}>
              {transaction.transaction_details || 'N/A'}
            </span>
          </div>

          {/* Categoria e sottocategoria */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Categoria:</span>
              {transaction.categories?.name ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  {transaction.categories.name}
                </span>
              ) : (
                <span className="text-gray-400 text-xs">Nessuna categoria</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Sottocategoria:</span>
              {transaction.subcategories?.name ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                  {transaction.subcategories.name}
                </span>
              ) : (
                <span className="text-gray-400 text-xs">Nessuna sottocategoria</span>
              )}
            </div>
          </div>
        </div>
      </Modal>
    );
  }
