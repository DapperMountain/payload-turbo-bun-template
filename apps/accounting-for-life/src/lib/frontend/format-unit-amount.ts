import type { Account, Unit } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

export type UnitFormatInput = Pick<Unit, 'code' | 'decimalPlaces'> & {
  symbol?: string | null
  kind?: Unit['kind'] | null
}

const isoCurrencyCache = new Map<string, boolean>()

/** Whether `code` is accepted by `Intl` as an ISO 4217 currency. */
export function isIntlCurrencyCode(code: string): boolean {
  const normalized = code.trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(normalized)) return false

  const cached = isoCurrencyCache.get(normalized)
  if (cached != null) return cached

  try {
    new Intl.NumberFormat('en', { style: 'currency', currency: normalized }).format(0)
    isoCurrencyCache.set(normalized, true)
    return true
  } catch {
    isoCurrencyCache.set(normalized, false)
    return false
  }
}

export function unitFormatFromDoc(unit: Unit | null | undefined): UnitFormatInput | null {
  if (!unit) return null
  return {
    code: unit.code,
    symbol: unit.symbol,
    decimalPlaces: unit.decimalPlaces,
    kind: unit.kind,
  }
}

export function resolveUnitForAccount(
  account: Account | undefined,
  unitsById?: Record<string, UnitFormatInput>,
): UnitFormatInput | null {
  if (!account) return null

  if (typeof account.unit === 'object' && account.unit) {
    return unitFormatFromDoc(account.unit)
  }

  const unitId = getCollectionId(account.unit)
  if (!unitId) return null
  return unitsById?.[unitId] ?? null
}

/**
 * Format an amount in a ledger unit.
 *
 * Fiat ISO codes use `Intl` currency style. Crypto/custom (and non-ISO codes) use
 * decimalPlaces with a trailing symbol or code (e.g. `200 sh`, `0.5 XRP`).
 */
export function formatUnitAmount(
  amount: number,
  unit: UnitFormatInput | null | undefined,
  options?: { locale?: string; absolute?: boolean },
): string {
  const value = options?.absolute ? Math.abs(Number(amount) || 0) : Number(amount) || 0
  const locale = options?.locale
  const decimals = unit?.decimalPlaces ?? 2
  const code = unit?.code?.trim().toUpperCase() ?? ''

  // Crypto/custom always use code/symbol suffixes — even when Intl knows the ticker (e.g. XRP).
  const useIntlCurrency =
    Boolean(code) && unit?.kind !== 'crypto' && unit?.kind !== 'custom' && isIntlCurrencyCode(code)

  if (useIntlCurrency) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: Math.min(decimals, 2),
      maximumFractionDigits: decimals,
    }).format(value)
  }

  const numberText = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value)

  const suffix = (unit?.symbol?.trim() || code || '').trim()
  return suffix ? `${numberText} ${suffix}` : numberText
}

/** Absolute amount for inline edit inputs — respects unit decimal places. */
export function formatUnitAmountMagnitudeForEdit(
  amount: number,
  unit: UnitFormatInput | null | undefined,
): string {
  const decimals = unit?.decimalPlaces ?? 2
  return Math.abs(Number(amount) || 0).toFixed(decimals)
}

export function unitsByIdFromDocs(units: Unit[]): Record<string, UnitFormatInput> {
  return Object.fromEntries(
    units.map((unit) => [unit.id, unitFormatFromDoc(unit)!] as const),
  )
}
