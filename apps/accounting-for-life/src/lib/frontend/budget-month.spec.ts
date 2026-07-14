import { describe, expect, it } from 'bun:test'

import { applyCategoryToEntries } from '@/collections/Transactions/lib/entries'
import { displayCategoryActivity, readyToAssignAmount } from '@/lib/frontend/budget-month.types'

describe('budget ready-to-assign signing', () => {
  it('shows income credits as positive ready-to-assign activity', () => {
    // Correct income post: payment +25, income category -25
    expect(displayCategoryActivity('income', -25)).toBe(25)
    expect(readyToAssignAmount(25, 0)).toBe(25)
  })

  it('inverts when income is incorrectly posted as a debit on the category', () => {
    // Buggy outflow tagged as income: category +25 → Ready to assign -$25
    expect(displayCategoryActivity('income', 25)).toBe(-25)
    expect(readyToAssignAmount(-25, 0)).toBe(-25)
  })

  it('treats liability category credits as positive spending activity', () => {
    // Credit-card purchase offset leg is negative; Available must still decrease.
    expect(displayCategoryActivity('spending', -40)).toBe(40)
    expect(displayCategoryActivity('spending', 40)).toBe(40)
  })
})

describe('applyCategoryToEntries', () => {
  it('puts the category on the offset leg, not the payment leg', () => {
    const lines = applyCategoryToEntries(
      [
        { account: 'checking', amount: 35, sortOrder: 0 },
        { account: 'checking', amount: -35, sortOrder: 1 },
      ],
      'transaction',
      'other-income',
    )

    expect(lines).toEqual([
      { account: 'checking', amount: 35, sortOrder: 0 },
      { account: 'checking', amount: -35, category: 'other-income', sortOrder: 1 },
    ])
  })
})
