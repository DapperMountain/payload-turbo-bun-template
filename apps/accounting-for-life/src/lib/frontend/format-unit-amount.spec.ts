import { describe, expect, it } from 'bun:test'

import type { Account, Unit } from '@/types'

import {
  formatUnitAmount,
  formatUnitAmountMagnitudeForEdit,
  isIntlCurrencyCode,
  resolveUnitForAccount,
} from './format-unit-amount'

describe('formatUnitAmount', () => {
  it('formats fiat ISO codes with currency style', () => {
    expect(formatUnitAmount(200, { code: 'USD', decimalPlaces: 2, kind: 'fiat' })).toMatch(/\$200/)
  })

  it('formats custom/crypto units with symbol or code suffix (never currency style)', () => {
    expect(
      formatUnitAmount(200, {
        code: 'SEASHELLS',
        symbol: 'sh',
        decimalPlaces: 0,
        kind: 'custom',
      }),
    ).toBe('200 sh')

    expect(
      formatUnitAmount(0.5, {
        code: 'XRP',
        symbol: 'XRP',
        decimalPlaces: 6,
        kind: 'crypto',
      }),
    ).toBe('0.5 XRP')
  })

  it('falls back to plain number when unit is missing', () => {
    expect(formatUnitAmount(12.5, null)).toBe('12.5')
  })
})

describe('isIntlCurrencyCode', () => {
  it('accepts USD and rejects long custom codes', () => {
    expect(isIntlCurrencyCode('USD')).toBe(true)
    expect(isIntlCurrencyCode('SEASHELLS')).toBe(false)
  })
})

describe('resolveUnitForAccount', () => {
  it('reads populated unit docs and id lookup', () => {
    const unit: Unit = {
      id: 'u1',
      code: 'SEASHELLS',
      name: 'Seashells',
      kind: 'custom',
      decimalPlaces: 0,
      symbol: 'sh',
      updatedAt: '',
      createdAt: '',
    }
    const account: Account = {
      id: 'a1',
      name: 'Jar',
      classification: 'asset',
      subtype: 'holding',
      unit,
      visibility: 'all_members',
      budget: 'b1',
      updatedAt: '',
      createdAt: '',
    }

    expect(resolveUnitForAccount(account)?.code).toBe('SEASHELLS')
    expect(
      resolveUnitForAccount(
        { ...account, unit: 'u1' },
        { u1: { code: 'SEASHELLS', decimalPlaces: 0, kind: 'custom', symbol: 'sh' } },
      )?.symbol,
    ).toBe('sh')
  })
})

describe('formatUnitAmountMagnitudeForEdit', () => {
  it('uses unit decimal places', () => {
    expect(
      formatUnitAmountMagnitudeForEdit(1.234567, {
        code: 'BTC',
        decimalPlaces: 8,
        kind: 'crypto',
      }),
    ).toBe('1.23456700')
  })
})
