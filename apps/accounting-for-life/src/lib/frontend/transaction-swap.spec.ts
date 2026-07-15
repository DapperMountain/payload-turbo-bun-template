import { describe, expect, it } from 'bun:test'

import type { Account } from '@/types'

import {
  entriesPreferSwapView,
  entriesToSwapLegs,
  isSwapFormBalanced,
  resolveTypeFromSwapLegs,
  swapLegsToEntries,
} from './transaction-swap'

function account(
  id: string,
  unit: string,
  classification: Account['classification'] = 'asset',
): Account {
  return {
    id,
    name: id,
    classification,
    subtype: 'checking',
    unit,
    visibility: 'all_members',
    budget: 'budget-1',
    updatedAt: '',
    createdAt: '',
  }
}

const usdReporting = 'unit-usd'
const accounts: Account[] = [
  account('btc', 'unit-btc'),
  account('usd', 'unit-usd'),
  account('fee', 'unit-usd', 'expense'),
  account('eur', 'unit-eur'),
]

describe('transaction-swap', () => {
  it('builds a mixed-currency sell + fee journal', () => {
    const legs = [
      { key: '1', account: 'btc', amount: '-0.01', fxRate: '50000', category: '' },
      { key: '2', account: 'usd', amount: '495', fxRate: '', category: '' },
      { key: '3', account: 'fee', amount: '5', fxRate: '', category: '' },
    ]

    expect(isSwapFormBalanced(legs, accounts, usdReporting)).toBe(true)
    expect(resolveTypeFromSwapLegs(legs, accounts)).toBe('transaction')
    expect(swapLegsToEntries(legs, accounts, usdReporting)).toEqual([
      { account: 'btc', amount: -0.01, category: undefined, sortOrder: 0, fxRate: 50000 },
      { account: 'usd', amount: 495, category: undefined, sortOrder: 1 },
      { account: 'fee', amount: 5, category: undefined, sortOrder: 2 },
    ])
  })

  it('requires fxRate when the account unit differs from reporting', () => {
    const legs = [
      { key: '1', account: 'eur', amount: '-10', fxRate: '', category: '' },
      { key: '2', account: 'usd', amount: '11', fxRate: '', category: '' },
    ]
    expect(isSwapFormBalanced(legs, accounts, usdReporting)).toBe(false)

    const withRate = [
      { key: '1', account: 'eur', amount: '-10', fxRate: '1.1', category: '' },
      { key: '2', account: 'usd', amount: '11', fxRate: '', category: '' },
    ]
    expect(isSwapFormBalanced(withRate, accounts, usdReporting)).toBe(true)
    expect(resolveTypeFromSwapLegs(withRate, accounts)).toBe('transfer')
  })

  it('round-trips entries to swap legs', () => {
    const entries = [
      { account: 'btc', amount: -0.01, fxRate: 50000, category: null },
      { account: 'usd', amount: 495, fxRate: 1, category: null },
      { account: 'fee', amount: 5, fxRate: 1, category: null },
    ]
    const legs = entriesToSwapLegs(entries)
    expect(legs).toHaveLength(3)
    expect(legs[0]?.fxRate).toBe('50000')
    expect(legs[1]?.fxRate).toBe('')
    expect(entriesPreferSwapView(entries, accounts, usdReporting)).toBe(true)
  })
})
