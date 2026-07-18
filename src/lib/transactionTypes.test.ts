import { describe, it, expect } from 'vitest'
import {
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_VALUES,
  ASSET_TRANSACTION_TYPES,
  DEFAULT_TRANSACTION_TYPE,
  isTransactionType,
  isPositiveTransactionType,
  transactionTypeSign,
  transactionTypeKind,
  normalizeTransactionType,
} from './transactionTypes'

describe('tassonomia transaction_type (T3.6)', () => {
  it('non contiene duplicati e include il default', () => {
    expect(new Set(TRANSACTION_TYPE_VALUES).size).toBe(TRANSACTION_TYPES.length)
    expect(isTransactionType(DEFAULT_TRANSACTION_TYPE)).toBe(true)
  })

  it('il segno segue la famiglia: +1 solo per le entrate', () => {
    for (const { value, kind } of TRANSACTION_TYPES) {
      expect(transactionTypeSign(value)).toBe(kind === 'income' ? 1 : -1)
    }
  })

  it('i tipi positivi sono esattamente quelli storici del modale + Ordine cloud', () => {
    const positives = TRANSACTION_TYPE_VALUES.filter(isPositiveTransactionType)
    expect(positives.sort()).toEqual(
      [
        'Cancellazione rimborso',
        'Eccesso Rimborso',
        'Entrata',
        'Ordine cloud',
        'Quattordicesima',
        'Refund',
        'Ricarica',
        'Stipendio',
        'TFR',
        'Tredicesima',
      ].sort()
    )
  })

  it('i tipi asset sono le tre forme di investimento', () => {
    expect([...ASSET_TRANSACTION_TYPES].sort()).toEqual(['AZIONE', 'Buono fruttifero', 'ETF'].sort())
    for (const t of ASSET_TRANSACTION_TYPES) {
      expect(transactionTypeKind(t)).toBe('investment')
    }
  })

  it('i tipi sconosciuti sono trattati come spesa (segno negativo)', () => {
    expect(transactionTypeSign('qualcosa di ignoto')).toBe(-1)
    expect(transactionTypeSign(null)).toBe(-1)
    expect(transactionTypeKind(undefined)).toBe('expense')
  })

  it('normalizza i valori legacy inglesi degli import', () => {
    expect(normalizeTransactionType('expense')).toBe('Spesa')
    expect(normalizeTransactionType('income')).toBe('Entrata')
    expect(normalizeTransactionType('refund')).toBe('Refund')
    expect(normalizeTransactionType('transfer')).toBe('Bonifico')
  })

  it('normalizza alias italiani e differenze di maiuscole', () => {
    expect(normalizeTransactionType('SPESA')).toBe('Spesa')
    expect(normalizeTransactionType('Eccesso rimborso')).toBe('Eccesso Rimborso')
    expect(normalizeTransactionType('Rimborso')).toBe('Refund')
    expect(normalizeTransactionType('Trasferimento')).toBe('Bonifico')
  })

  it('valori canonici passano invariati, vuoti/ignoti cadono sul default', () => {
    for (const v of TRANSACTION_TYPE_VALUES) {
      expect(normalizeTransactionType(v)).toBe(v)
    }
    expect(normalizeTransactionType(null)).toBe(DEFAULT_TRANSACTION_TYPE)
    expect(normalizeTransactionType('')).toBe(DEFAULT_TRANSACTION_TYPE)
    expect(normalizeTransactionType('boh')).toBe(DEFAULT_TRANSACTION_TYPE)
  })
})
