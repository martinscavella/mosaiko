import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isInDateRange } from './dateRange'

describe('isInDateRange', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-04T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('"all" always returns true regardless of date', () => {
    expect(isInDateRange('2000-01-01', 'all')).toBe(true)
  })

  it('"today" excludes yesterday', () => {
    expect(isInDateRange('2026-07-03T23:59:59', 'today')).toBe(false)
  })

  it('"today" includes today', () => {
    expect(isInDateRange('2026-07-04T01:00:00', 'today')).toBe(true)
  })

  it('"week" excludes a date 8 days ago', () => {
    expect(isInDateRange('2026-06-26T00:00:00', 'week')).toBe(false)
  })

  it('"week" includes a date 3 days ago', () => {
    expect(isInDateRange('2026-07-01T00:00:00', 'week')).toBe(true)
  })

  it('"year" excludes a date more than a year ago', () => {
    expect(isInDateRange('2025-07-03T00:00:00', 'year')).toBe(false)
  })

  it('"year" includes a date less than a year ago', () => {
    expect(isInDateRange('2025-08-01T00:00:00', 'year')).toBe(true)
  })
})
