import { describe, it, expect } from 'vitest'
import { parseLocaleAmount, determineTargetTable, findValue, BANK_PARSERS } from './financeImportParsers'

describe('parseLocaleAmount', () => {
  it('parses plain international amounts', () => {
    expect(parseLocaleAmount('1234.56')).toBe(1234.56)
    expect(parseLocaleAmount('-45.5')).toBe(-45.5)
  })

  it('parses Italian amounts with thousands separator (dot) and decimal comma', () => {
    // Regression: un semplice replace(',', '.') tronca questi importi
    // (es. "2.500,00" -> 2.5 invece di 2500)
    expect(parseLocaleAmount('2.500,00')).toBe(2500)
    expect(parseLocaleAmount('1.234,56')).toBe(1234.56)
    expect(parseLocaleAmount('-1.234,56')).toBe(-1234.56)
  })

  it('parses Italian amounts without thousands separator', () => {
    expect(parseLocaleAmount('50,00')).toBe(50)
    expect(parseLocaleAmount('45,5')).toBe(45.5)
  })

  it('parses US-style amounts with comma thousands separator', () => {
    expect(parseLocaleAmount('1,234.56')).toBe(1234.56)
  })

  it('parses comma-only values with more than 2 fractional digits as thousands separator', () => {
    expect(parseLocaleAmount('1,234')).toBe(1234)
  })

  it('returns NaN for empty or missing input', () => {
    expect(Number.isNaN(parseLocaleAmount(''))).toBe(true)
    expect(Number.isNaN(parseLocaleAmount(undefined))).toBe(true)
    expect(Number.isNaN(parseLocaleAmount(null))).toBe(true)
  })
})

describe('determineTargetTable', () => {
  it('routes refund-like descriptions to refunds', () => {
    expect(determineTargetTable('Rimborso acquisto', 'Entrata', 10)).toBe('refunds')
  })

  it('routes transfer-like descriptions to funds_transfer', () => {
    expect(determineTargetTable('Bonifico in uscita', 'Spesa', -10, 'giroconto')).toBe('funds_transfer')
  })

  it('defaults to transactions', () => {
    expect(determineTargetTable('Spesa supermercato', 'Spesa', -10)).toBe('transactions')
  })
})

describe('findValue', () => {
  it('matches headers case-insensitively and ignoring spaces', () => {
    const headers = ['Data Operazione', 'Importo (Euro)']
    const values = ['2025-01-01', '1.234,56']
    expect(findValue(headers, values, ['data operazione'])).toBe('2025-01-01')
    expect(findValue(headers, values, ['importo (euro)'])).toBe('1.234,56')
  })
})

describe('Revolut parser transactionType', () => {
  const revolut = BANK_PARSERS.find((p) => p.identifier === 'revolut')!

  it('uses the Italian label (not the English DB value) for transactionType', () => {
    const headers = ['Type', 'Product', 'Started Date', 'Description', 'Amount', 'Currency', 'State']
    const values = ['CARD_PAYMENT', 'Current', '2025-01-01', 'Supermercato', '-25.50', 'EUR', 'COMPLETED']
    const row = revolut.parseRow(headers, values)
    // Regression: prima del fix, transactionType valeva 'expense' (inglese),
    // un valore assente dalla picklist italiana usata per la validazione e
    // dal TransactionTypeCombobox, causando l'errore "Tipo transazione non
    // valido" su ogni riga CARD_PAYMENT importata.
    expect(row.transactionType).toBe('Spesa')
    expect(row.transactionType).toBe(row.type)
  })

  it('skips REVERTED rows', () => {
    const headers = ['Type', 'Product', 'Started Date', 'Description', 'Amount', 'Currency', 'State']
    const values = ['CARD_PAYMENT', 'Current', '2025-01-01', 'Supermercato', '-25.50', 'EUR', 'REVERTED']
    const row = revolut.parseRow(headers, values)
    expect(row).toEqual({})
  })
})
