import { describe, expect, it } from 'bun:test'

import {
  attachNewestFirstRunningBalances,
  runningBalancesOldestFirst,
  sumSignedAmounts,
} from '@/lib/ledger/account-balance'

describe('account-balance', () => {
  it('sums signed amounts', () => {
    expect(sumSignedAmounts([100, -40, 25])).toBe(85)
    expect(sumSignedAmounts([])).toBe(0)
  })

  it('builds chronological running balances oldest-first', () => {
    expect(runningBalancesOldestFirst([100, -30, 10])).toEqual([100, 70, 80])
  })

  it('attaches newest-first running balances from an ending total', () => {
    // Chronology: +100 → 100, -30 → 70, +10 → 80 (ending)
    const rows = [
      { amount: 10, status: 'posted' },
      { amount: -30, status: 'posted' },
      { amount: 100, status: 'posted' },
    ]

    expect(attachNewestFirstRunningBalances(rows, 80)).toEqual([
      { amount: 10, status: 'posted', runningBalance: 80 },
      { amount: -30, status: 'posted', runningBalance: 70 },
      { amount: 100, status: 'posted', runningBalance: 100 },
    ])
  })

  it('skips pending rows when walking the running balance', () => {
    const rows = [
      { amount: 5, status: 'pending' },
      { amount: 10, status: 'posted' },
      { amount: 100, status: 'posted' },
    ]

    expect(attachNewestFirstRunningBalances(rows, 110)).toEqual([
      { amount: 5, status: 'pending', runningBalance: undefined },
      { amount: 10, status: 'posted', runningBalance: 110 },
      { amount: 100, status: 'posted', runningBalance: 100 },
    ])
  })
})
