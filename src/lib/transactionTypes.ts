/**
 * Tassonomia unica dei tipi di transazione (T3.6).
 *
 * Fonte di verità per: valori ammessi (allineati al CHECK
 * transactions_transaction_type_check in DB, migration
 * 20260718_transaction_type_taxonomy), famiglia semantica e segno
 * dell'importo applicato alla creazione.
 *
 * I valori canonici sono le etichette italiane storiche (sono anche i valori
 * salvati in DB). I vecchi valori inglesi introdotti dall'import
 * ('expense', 'income', …) si convertono con normalizeTransactionType().
 */

/** Famiglia semantica: guida segno, icone e filtri. */
export type TransactionTypeKind = 'income' | 'expense' | 'investment' | 'transfer'

export const TRANSACTION_TYPES = [
  { value: 'Abbonamento', kind: 'expense' },
  { value: 'Acquisto', kind: 'expense' },
  { value: 'AZIONE', kind: 'investment' },
  { value: 'Bonifico', kind: 'transfer' },
  { value: 'Buono fruttifero', kind: 'investment' },
  { value: 'Cancellazione rimborso', kind: 'income' },
  { value: 'Commissione', kind: 'expense' },
  { value: 'Competenze', kind: 'expense' },
  { value: 'Delivery', kind: 'expense' },
  { value: 'Eccesso Rimborso', kind: 'income' },
  { value: 'Entrata', kind: 'income' },
  { value: 'ETF', kind: 'investment' },
  { value: 'Imposte', kind: 'expense' },
  { value: 'Iscrizione', kind: 'expense' },
  { value: 'Ordine', kind: 'expense' },
  { value: 'Ordine cloud', kind: 'income' },
  { value: 'Prelievo', kind: 'transfer' },
  { value: 'Quattordicesima', kind: 'income' },
  { value: 'Rata', kind: 'expense' },
  { value: 'Refund', kind: 'income' },
  { value: 'Ricarica', kind: 'income' },
  { value: 'Spesa', kind: 'expense' },
  { value: 'Stipendio', kind: 'income' },
  { value: 'TFR', kind: 'income' },
  { value: 'Tredicesima', kind: 'income' },
] as const satisfies ReadonlyArray<{ value: string; kind: TransactionTypeKind }>

export type TransactionType = (typeof TRANSACTION_TYPES)[number]['value']

export const TRANSACTION_TYPE_VALUES: readonly TransactionType[] =
  TRANSACTION_TYPES.map(t => t.value)

export const DEFAULT_TRANSACTION_TYPE: TransactionType = 'Spesa'

/** Tipi che rappresentano l'acquisto di un asset (collegabili in Assets). */
export const ASSET_TRANSACTION_TYPES: readonly TransactionType[] =
  TRANSACTION_TYPES.filter(t => t.kind === 'investment').map(t => t.value)

const KIND_BY_VALUE = new Map<string, TransactionTypeKind>(
  TRANSACTION_TYPES.map(t => [t.value, t.kind])
)

export function isTransactionType(value: string | null | undefined): value is TransactionType {
  return value != null && KIND_BY_VALUE.has(value)
}

/** Famiglia del tipo; i tipi sconosciuti sono trattati come spesa. */
export function transactionTypeKind(value: string | null | undefined): TransactionTypeKind {
  return (value != null && KIND_BY_VALUE.get(value)) || 'expense'
}

/** Segno dell'importo imposto alla creazione: +1 solo per le entrate. */
export function transactionTypeSign(value: string | null | undefined): 1 | -1 {
  return transactionTypeKind(value) === 'income' ? 1 : -1
}

export function isPositiveTransactionType(value: string | null | undefined): boolean {
  return transactionTypeSign(value) === 1
}

/** Valori legacy (import pre-T3.6 e alias italiani) → tipo canonico. */
const LEGACY_TRANSACTION_TYPES: Record<string, TransactionType> = {
  expense: 'Spesa',
  income: 'Entrata',
  refund: 'Refund',
  transfer: 'Bonifico',
  rimborso: 'Refund',
  trasferimento: 'Bonifico',
}

/**
 * Converte un valore arbitrario nel tipo canonico: valori canonici passano
 * invariati, il resto viene risolto case-insensitive (es. 'SPESA', 'expense',
 * 'Eccesso rimborso') e in ultima istanza cade su DEFAULT_TRANSACTION_TYPE.
 */
export function normalizeTransactionType(raw: string | null | undefined): TransactionType {
  if (!raw) return DEFAULT_TRANSACTION_TYPE
  const value = raw.trim()
  if (isTransactionType(value)) return value
  const lower = value.toLowerCase()
  const canonical = TRANSACTION_TYPE_VALUES.find(v => v.toLowerCase() === lower)
  if (canonical) return canonical
  return LEGACY_TRANSACTION_TYPES[lower] ?? DEFAULT_TRANSACTION_TYPE
}
