/**
 * Utility per filtrare transazioni in base a intervalli di data
 * Supporta: all, today, week, month, quarter, year
 */

export type DateRangeType = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year';

/**
 * Verifica se una data rientra nell'intervallo temporale specificato
 * @param transactionDate - Data della transazione in formato ISO string
 * @param range - Intervallo temporale (all, today, week, month, quarter, year)
 * @returns true se la data è dentro l'intervallo
 */
export const isInDateRange = (transactionDate: string, range: DateRangeType): boolean => {
  if (range === 'all') return true;

  const date = new Date(transactionDate);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case 'today':
      return date >= startOfToday;
    case 'week':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return date >= weekAgo;
    case 'month':
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      return date >= monthAgo;
    case 'quarter':
      const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      return date >= quarterAgo;
    case 'year':
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      return date >= yearAgo;
    default:
      return true;
  }
};
