import { describe, expect, it } from 'bun:test'

import { effectiveQuoteUnitId, quoteAmountForEntry, resolveEntryFx } from './fx'

describe('resolveEntryFx', () => {
  it('uses identity FX when units match or reporting is unset', () => {
    expect(resolveEntryFx({ amount: -10, unitId: 'usd', reportingUnitId: 'usd' })).toEqual({
      reportingAmount: -10,
      fxRate: 1,
    })
    expect(resolveEntryFx({ amount: 5, unitId: 'eur', reportingUnitId: null })).toEqual({
      reportingAmount: 5,
      fxRate: 1,
    })
  })

  it('treats fxRate as quote per 1 native when quote equals reporting', () => {
    expect(
      resolveEntryFx({ amount: -100, unitId: 'eur', reportingUnitId: 'usd', fxRate: 2 }),
    ).toEqual({
      reportingAmount: -200,
      fxRate: 2,
    })
  })

  it('requires a finite non-zero rate when unit differs from quote', () => {
    expect(() =>
      resolveEntryFx({ amount: 1, unitId: 'eur', reportingUnitId: 'usd' }),
    ).toThrow(/fxRate is required/)
    expect(() =>
      resolveEntryFx({ amount: 1, unitId: 'eur', reportingUnitId: 'usd', fxRate: 0 }),
    ).toThrow(/fxRate is required/)
  })

  it('chains quote→reporting when quote differs from reporting', () => {
    // 10 EUR at quote EUR; reporting USD at 1.1 USD/EUR
    expect(
      resolveEntryFx({
        amount: -10,
        unitId: 'eur',
        quoteUnitId: 'eur',
        reportingUnitId: 'usd',
        quoteToReportingRate: 1.1,
      }),
    ).toEqual({
      reportingAmount: -11,
      fxRate: 1,
    })

    // 12 USD into EUR quote at 10/12 EUR per USD; then × 1.1 to reporting
    expect(
      resolveEntryFx({
        amount: 12,
        unitId: 'usd',
        quoteUnitId: 'eur',
        reportingUnitId: 'usd',
        fxRate: 10 / 12,
        quoteToReportingRate: 1.1,
      }),
    ).toEqual({
      reportingAmount: 11,
      fxRate: 10 / 12,
    })
  })

  it('defers reportingAmount when quote ≠ reporting and quote→reporting is omitted', () => {
    expect(
      resolveEntryFx({
        amount: -10,
        unitId: 'eur',
        quoteUnitId: 'eur',
        reportingUnitId: 'usd',
      }),
    ).toEqual({
      reportingAmount: null,
      fxRate: 1,
    })
  })
})

describe('effectiveQuoteUnitId', () => {
  it('falls back to reporting currency', () => {
    expect(effectiveQuoteUnitId({ quoteUnitId: null, reportingUnitId: 'usd' })).toBe('usd')
    expect(effectiveQuoteUnitId({ quoteUnitId: 'eur', reportingUnitId: 'usd' })).toBe('eur')
  })
})

describe('quoteAmountForEntry', () => {
  it('returns native amount when unit matches quote', () => {
    expect(quoteAmountForEntry({ amount: -10, unitId: 'eur', quoteUnitId: 'eur' })).toBe(-10)
  })

  it('multiplies by rate to quote', () => {
    expect(
      quoteAmountForEntry({ amount: 12, unitId: 'usd', quoteUnitId: 'eur', fxRate: 0.5 }),
    ).toBe(6)
  })
})
