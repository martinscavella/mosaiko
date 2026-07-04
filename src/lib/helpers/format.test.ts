import { describe, it, expect } from 'vitest'
import { formatCurrency, formatPercentage } from './format'

describe('formatCurrency', () => {
  it('formats positive amounts as EUR (it-IT)', () => {
    expect(formatCurrency(1234.5)).toBe('1.234,50 €')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('0,00 €')
  })

  it('formats negative amounts', () => {
    expect(formatCurrency(-42.1)).toBe('-42,10 €')
  })
})

describe('formatPercentage', () => {
  it('formats with one decimal', () => {
    expect(formatPercentage(12.345)).toBe('12.3%')
  })

  it('formats negative percentages', () => {
    expect(formatPercentage(-5)).toBe('-5.0%')
  })
})
