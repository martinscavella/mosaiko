// Restituisce una stringa tipo "Ultimo aggiornamento il 10 luglio" oppure "Ultimo aggiornamento il 10 luglio 2024" se l'anno è diverso
export function formatLastTransactionDate(dateString?: string | null): string {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  const mesi = [
    'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
  ];
  const oggi = new Date();
  const giorno = d.getDate();
  // Mese con maiuscola
  const mese = mesi[d.getMonth()];
  const meseCap = mese.charAt(0).toUpperCase() + mese.slice(1);
  const anno = d.getFullYear();
  const annoCorrente = oggi.getFullYear();
  // Giorni che richiedono l'apostrofo (iniziano per vocale): 1, 8, 11
  const giorniApostrofo = [1, 8, 11];
  const articolo = giorniApostrofo.includes(giorno) ? `l'` : 'il ';
  const giornoStr = `${giorno}`;
  const dataStr = anno === annoCorrente
    ? `${articolo}${giornoStr} ${meseCap}`
    : `${articolo}${giornoStr} ${meseCap} ${anno}`;
  return `Ultimo aggiornamento ${dataStr}`;
}
// helpers/format.ts
// Funzioni di utilità per la formattazione di valori numerici e percentuali

/**
 * Formatta un numero come valuta in euro (EUR, it-IT)
 */
export function formatCurrency(amount: number | null | undefined, currency: string = 'EUR', locale: string = 'it-IT'): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(Number(amount));
}

/**
 * Formatta un numero come percentuale con una cifra decimale
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}
