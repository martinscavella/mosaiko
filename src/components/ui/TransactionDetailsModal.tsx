import { Calendar, FileText, Pencil, Trash2 } from 'lucide-react';
import Modal, { ModalButton } from './Modal';
import type { Transaction as FinanceTransaction } from '@/lib/financeCache';
import { formatCurrency } from '@/lib/helpers/format';

// Re-export per compatibilità con gli import esistenti (dashboard, pagine)
export type Transaction = FinanceTransaction;

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  /** Se presenti, il footer mostra anche Modifica/Elimina */
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Riga etichetta/valore del dettaglio */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-xs text-ink-muted whitespace-nowrap pt-0.5">{label}</span>
      <span className="text-sm text-ink font-medium text-right break-words min-w-0">{children}</span>
    </div>
  );
}

export default function TransactionDetailsModal({
  isOpen,
  onClose,
  transaction,
  onEdit,
  onDelete,
}: TransactionDetailsModalProps) {
  if (!isOpen || !transaction) return null;

  const hasRefundDelta =
    transaction.initial_amount != null &&
    transaction.initial_amount !== transaction.current_amount;

  const handleDownloadReceipt = async () => {
    const conferma = window.confirm('Vuoi scaricare la ricevuta in PDF di questa transazione?');
    if (!conferma) return;
    // Import dinamico: jspdf e' pesante e serve solo per questa azione rara
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Ricevuta Transazione', 14, 18);
    doc.setFontSize(12);
    const rows: [string, string][] = [
      ['Importo', `${transaction.current_amount}€`],
      ['Importo iniziale', transaction.initial_amount != null ? `${transaction.initial_amount}€` : 'N/A'],
      ['Tipo', transaction.transaction_type || 'N/A'],
      ['Data', transaction.transaction_date ? new Date(transaction.transaction_date).toLocaleDateString('it-IT') : 'N/A'],
      ['Account', transaction.account_name || 'N/A'],
      ['Descrizione', transaction.transaction_details || 'N/A'],
      ['Categoria', transaction.categories?.name || 'Nessuna'],
      ['Sottocategoria', transaction.subcategories?.name || 'Nessuna'],
      ['Codice', transaction.transaction_code || 'N/A'],
      ['Valuta', transaction.currency || 'EUR'],
      ['Note', transaction.transaction_note || '—'],
    ];
    rows.forEach(([label, value], i) => {
      doc.text(`${label}: ${value}`, 14, 32 + i * 8);
    });
    doc.save(`ricevuta-transazione-${transaction.id || ''}.pdf`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${transaction.current_amount > 0 ? 'Entrata' : 'Uscita'}: ${formatCurrency(transaction.current_amount)}`}
      subtitle={transaction.transaction_type || 'Dettagli transazione'}
      size="md"
      footer={
        <>
          <ModalButton variant="secondary" onClick={handleDownloadReceipt}>
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" /> Ricevuta
            </span>
          </ModalButton>
          {onDelete && (
            <ModalButton variant="danger" onClick={() => onDelete(transaction)}>
              <span className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Elimina
              </span>
            </ModalButton>
          )}
          {onEdit && (
            <ModalButton variant="primary" onClick={() => onEdit(transaction)}>
              <span className="flex items-center gap-2">
                <Pencil className="w-4 h-4" /> Modifica
              </span>
            </ModalButton>
          )}
        </>
      }
    >
      <div className="space-y-5">
        {/* Data e account */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-edge">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-ink-muted" />
            <span className="text-sm text-ink-secondary font-medium">
              {transaction.transaction_date && !isNaN(new Date(transaction.transaction_date).getTime())
                ? new Date(transaction.transaction_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-muted">Account:</span>
            <span className="text-sm text-ink font-semibold">{transaction.account_name || 'N/A'}</span>
          </div>
        </div>

        {/* Descrizione */}
        <div className="flex items-start gap-3">
          <span className="text-xs text-ink-muted pt-0.5 whitespace-nowrap">Descrizione:</span>
          <span className="text-sm text-ink font-medium break-words flex-1">
            {transaction.transaction_details || 'N/A'}
          </span>
        </div>

        {/* Categoria e sottocategoria */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-muted">Categoria:</span>
            {transaction.categories?.name ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary-subtle text-primary">
                {transaction.categories.name}
              </span>
            ) : (
              <span className="text-ink-muted text-xs">Nessuna categoria</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-muted">Sottocategoria:</span>
            {transaction.subcategories?.name ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-module-health-subtle text-module-health">
                {transaction.subcategories.name}
              </span>
            ) : (
              <span className="text-ink-muted text-xs">Nessuna sottocategoria</span>
            )}
          </div>
          {transaction.is_refunded && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-success-subtle text-success-strong">
              Rimborsato
            </span>
          )}
        </div>

        {/* Tutti gli altri campi */}
        <div className="bg-canvas rounded-lg px-4 py-2 divide-y divide-edge-subtle">
          <DetailRow label="Importo attuale">
            <span className="font-amount">{formatCurrency(transaction.current_amount)}</span>
          </DetailRow>
          {hasRefundDelta && (
            <>
              <DetailRow label="Importo iniziale">
                <span className="font-amount">{formatCurrency(transaction.initial_amount!)}</span>
              </DetailRow>
              <DetailRow label="Rimborsato finora">
                <span className="font-amount text-success-strong">
                  {formatCurrency(transaction.current_amount - transaction.initial_amount!)}
                </span>
              </DetailRow>
            </>
          )}
          <DetailRow label="Valuta">{transaction.currency || 'EUR'}</DetailRow>
          {transaction.transaction_code && (
            <DetailRow label="Codice">
              <span className="font-amount text-xs">{transaction.transaction_code}</span>
            </DetailRow>
          )}
          {transaction.transaction_note && (
            <DetailRow label="Note">{transaction.transaction_note}</DetailRow>
          )}
          {transaction.asset_id && (
            <DetailRow label="Asset collegato">
              {transaction.asset_quantity != null
                ? `Quantità: ${transaction.asset_quantity}`
                : 'Sì'}
            </DetailRow>
          )}
          {formatDateTime(transaction.created_at) && (
            <DetailRow label="Creata il">{formatDateTime(transaction.created_at)}</DetailRow>
          )}
          {formatDateTime(transaction.updated_at) &&
            transaction.updated_at !== transaction.created_at && (
            <DetailRow label="Ultima modifica">{formatDateTime(transaction.updated_at)}</DetailRow>
          )}
        </div>
      </div>
    </Modal>
  );
}
