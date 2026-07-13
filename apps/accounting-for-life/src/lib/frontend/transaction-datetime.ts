/** Default time for legacy date-only values (stable midday ordering). */
export const LEGACY_DEFAULT_TIME = '12:00'

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

export function isDateOnlyValue(value: string): boolean {
  return DATE_ONLY_RE.test(value)
}

export function transactionDatePart(value: string | null | undefined): string {
  if (!value) return ''
  if (isDateOnlyValue(value)) return value

  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return value.slice(0, 10)

  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function transactionTimePart(value: string | null | undefined): string {
  if (!value) return LEGACY_DEFAULT_TIME
  if (isDateOnlyValue(value)) return LEGACY_DEFAULT_TIME

  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return LEGACY_DEFAULT_TIME

  const hh = String(dt.getHours()).padStart(2, '0')
  const mm = String(dt.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export function combineTransactionDateTime(datePart: string, timePart: string): string {
  if (!datePart) return ''

  const [y, m, d] = datePart.split('-').map(Number)
  const [hh, mm] = (timePart || LEGACY_DEFAULT_TIME).split(':').map(Number)
  const local = new Date(y, m - 1, d, hh, mm ?? 0, 0, 0)
  return local.toISOString()
}

export function normalizeTransactionDateTime(value: string | null | undefined): string {
  if (!value) return ''
  if (isDateOnlyValue(value)) {
    return combineTransactionDateTime(value, LEGACY_DEFAULT_TIME)
  }

  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return value
  return dt.toISOString()
}

export function nowTransactionDateTime(): string {
  return new Date().toISOString()
}

export function sortTransactionDateTime(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  return normalizeTransactionDateTime(a ?? '').localeCompare(normalizeTransactionDateTime(b ?? ''))
}

export function transactionDateTimeEquals(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return normalizeTransactionDateTime(a ?? '') === normalizeTransactionDateTime(b ?? '')
}

export function hasExplicitTime(value: string | null | undefined): boolean {
  if (!value || isDateOnlyValue(value)) return false
  return transactionTimePart(value) !== LEGACY_DEFAULT_TIME
}

export function formatTransactionDateTimeDisplay(
  value: string | null | undefined,
  locale?: string,
): string {
  const normalized = normalizeTransactionDateTime(value)
  if (!normalized) return ''

  const dt = new Date(normalized)
  return dt.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatTransactionTimeDisplay(
  value: string | null | undefined,
  locale?: string,
): string {
  const normalized = normalizeTransactionDateTime(value)
  if (!normalized) return ''

  const dt = new Date(normalized)
  return dt.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
}

export function dateRangeStartBound(datePart: string): string {
  return combineTransactionDateTime(datePart, '00:00')
}

export function dateRangeEndBound(datePart: string): string {
  const [y, m, d] = datePart.split('-').map(Number)
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString()
}

/** Expand YYYY-MM-DD filter values to full-day bounds when querying datetime fields. */
export function dateQueryBound(value: string, edge: 'start' | 'end'): string {
  if (isDateOnlyValue(value)) {
    return edge === 'start' ? dateRangeStartBound(value) : dateRangeEndBound(value)
  }
  return value
}
