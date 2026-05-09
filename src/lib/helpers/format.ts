/**
 * Helpers di formattazione condivisi tra tutti i componenti.
 * Consolidati qui per evitare duplicazioni tra reports/page.tsx,
 * AssetPerformanceChart.tsx e altri consumer.
 */

/**
 * Formatta un numero come valuta italiana (EUR).
 * @example formatCurrency(1234.5) // "€1.234,50"
 */
export function formatCurrency(
  value: number,
  currency = 'EUR',
  locale = 'it-IT'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Formatta un numero come percentuale.
 * @example formatPercentage(12.345) // "12,35%"
 */
export function formatPercentage(
  value: number,
  decimals = 2,
  locale = 'it-IT'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100)
}

/**
 * Formatta una data come stringa localizzata italiana.
 * @example formatDate('2025-01-15') // "15 gen 2025"
 */
export function formatDate(
  dateString: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('it-IT', options ?? {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
