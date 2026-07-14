import { describe, expect, it } from 'bun:test'

import { resolveEntryFx } from './fx'

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

  it('multiplies by rate for cross-currency legs', () => {
    expect(
      resolveEntryFx({ amount: -100, unitId: 'eur', reportingUnitId: 'usd', fxRate: 2 }),
    ).toEqual({
      reportingAmount: -200,
      fxRate: 2,
    })
  })

  it('requires a finite non-zero rate when units differ', () => {
    expect(() =>
      resolveEntryFx({ amount: 1, unitId: 'eur', reportingUnitId: 'usd' }),
    ).toThrow(/fxRate is required/)
    expect(() =>
      resolveEntryFx({ amount: 1, unitId: 'eur', reportingUnitId: 'usd', fxRate: 0 }),
    ).toThrow(/fxRate is required/)
  })
})
