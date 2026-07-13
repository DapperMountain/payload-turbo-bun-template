import { describe, expect, it } from 'bun:test'

import {
  combineTransactionDateTime,
  dateQueryBound,
  dateRangeEndBound,
  dateRangeStartBound,
  hasExplicitTime,
  isDateOnlyValue,
  normalizeTransactionDateTime,
  sortTransactionDateTime,
  transactionDatePart,
  transactionDateTimeEquals,
  transactionTimePart,
} from '@/lib/frontend/transaction-datetime'

describe('transaction-datetime', () => {
  it('parses legacy date-only values with default noon time', () => {
    expect(isDateOnlyValue('2026-07-13')).toBe(true)
    expect(transactionDatePart('2026-07-13')).toBe('2026-07-13')
    expect(transactionTimePart('2026-07-13')).toBe('12:00')
    expect(hasExplicitTime('2026-07-13')).toBe(false)
  })

  it('combines local date and time into ISO', () => {
    const iso = combineTransactionDateTime('2026-07-13', '14:30')
    expect(transactionDatePart(iso)).toBe('2026-07-13')
    expect(transactionTimePart(iso)).toBe('14:30')
    expect(hasExplicitTime(iso)).toBe(true)
  })

  it('sorts same-day transactions by time', () => {
    const morning = combineTransactionDateTime('2026-07-13', '09:00')
    const evening = combineTransactionDateTime('2026-07-13', '21:00')
    expect(sortTransactionDateTime(morning, evening)).toBeLessThan(0)
    expect(sortTransactionDateTime(evening, morning)).toBeGreaterThan(0)
  })

  it('normalizes date-only and ISO values for equality checks', () => {
    const iso = combineTransactionDateTime('2026-07-13', '12:00')
    expect(transactionDateTimeEquals('2026-07-13', iso)).toBe(true)
    expect(normalizeTransactionDateTime('2026-07-13')).toBe(normalizeTransactionDateTime(iso))
  })

  it('expands date-only query bounds to full day', () => {
    expect(dateRangeStartBound('2026-07-13')).toBe(
      combineTransactionDateTime('2026-07-13', '00:00'),
    )
    expect(dateRangeEndBound('2026-07-13')).toBe(
      new Date(2026, 6, 13, 23, 59, 59, 999).toISOString(),
    )
    expect(dateQueryBound('2026-07-13', 'end')).toBe(dateRangeEndBound('2026-07-13'))
  })
})
