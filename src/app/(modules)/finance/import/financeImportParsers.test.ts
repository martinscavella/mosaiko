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

  it('subtracts the Fee from Amount to store the net value on an expense', () => {
    const headers = ['Type', 'Product', 'Started Date', 'Description', 'Amount', 'Fee', 'Currency', 'State']
    const values = ['CARD_PAYMENT', 'Current', '2025-01-01', 'Prelievo ATM', '-100.00', '1.99', 'EUR', 'COMPLETED']
    const row = revolut.parseRow(headers, values)
    expect(row.amount).toBe('-101.99')
    expect(row.note).toBe('Commissione: €1.99')
  })

  it('subtracts the Fee from Amount on a topup (positive amount)', () => {
    const headers = ['Type', 'Product', 'Started Date', 'Description', 'Amount', 'Fee', 'Currency', 'State']
    const values = ['TOPUP', 'Current', '2025-01-01', 'Ricarica carta', '100.00', '1.99', 'EUR', 'COMPLETED']
    const row = revolut.parseRow(headers, values)
    expect(row.amount).toBe('98.01')
  })

  it('rounds the net amount to 2 decimals to avoid floating point residue', () => {
    const headers = ['Type', 'Product', 'Started Date', 'Description', 'Amount', 'Fee', 'Currency', 'State']
    // 4.32 - 0.001 = 4.319000000000001 in IEEE 754 float arithmetic
    const values = ['INTEREST', 'Deposit', '2025-01-01', 'Interessi', '4.32', '0.001', 'EUR', 'COMPLETED']
    const row = revolut.parseRow(headers, values)
    expect(row.amount).toBe('4.32')
  })

  it('leaves amount and note untouched when Fee is absent or zero', () => {
    const headers = ['Type', 'Product', 'Started Date', 'Description', 'Amount', 'Fee', 'Currency', 'State']
    const values = ['CARD_PAYMENT', 'Current', '2025-01-01', 'Supermercato', '-25.50', '0', 'EUR', 'COMPLETED']
    const row = revolut.parseRow(headers, values)
    expect(row.amount).toBe('-25.5')
    expect(row.note).toBeUndefined()
  })

  it('categorizes deposit interest income as INCOME & SALARY / Interessi maturati', () => {
    const headers = ['Type', 'Product', 'Started Date', 'Description', 'Amount', 'Currency', 'State']
    const values = ['INTEREST', 'Deposit', '2025-01-01', "Net Interest Paid to 'Conto deposito senza vincoli' for December", '4.32', 'EUR', 'COMPLETED']
    const row = revolut.parseRow(headers, values)
    expect(row.category).toBe('INCOME & SALARY')
    expect(row.subcategory).toBe('Interessi maturati')
    expect(row.description).toBe('Revolut Deposit: Pagamento degli interessi')
  })

  it('does not auto-categorize deposit interest when a CSV category override is present', () => {
    const headers = ['Type', 'Product', 'Started Date', 'Description', 'Amount', 'Currency', 'State', 'categoria']
    const values = ['INTEREST', 'Deposit', '2025-01-01', "Net Interest Paid to 'Conto deposito senza vincoli' for December", '4.32', 'EUR', 'COMPLETED', 'ALTRO']
    const row = revolut.parseRow(headers, values)
    expect(row.category).toBe('ALTRO')
    expect(row.description).toBe("Net Interest Paid to 'Conto deposito senza vincoli' for December")
  })

  it('does not auto-categorize interest on other products (e.g. Savings)', () => {
    const headers = ['Type', 'Product', 'Started Date', 'Description', 'Amount', 'Currency', 'State']
    const values = ['INTEREST', 'Savings', '2025-01-01', "Net Interest Paid to 'Conto deposito senza vincoli' for December", '4.32', 'EUR', 'COMPLETED']
    const row = revolut.parseRow(headers, values)
    expect(row.category).toBeUndefined()
  })
})
