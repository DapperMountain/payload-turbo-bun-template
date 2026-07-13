import { describe, expect, it } from 'bun:test'

import {
  defaultCategoryIdForPayee,
  isTransferFromPayee,
  resolveTransactionTypeFromPayee,
  toPayeeTransferId,
} from '@/lib/frontend/transaction-payee'
import type { Category } from '@/types'

const categories: Category[] = [
  {
    id: 'income-cat',
    name: 'Paycheck',
    purpose: 'income',
    categoryGroup: 'g1',
    budget: 'budget-a',
    workspace: 'ws',
    updatedAt: '',
    createdAt: '',
  },
  {
    id: 'groceries',
    name: 'Groceries',
    purpose: 'spending',
    categoryGroup: 'g2',
    budget: 'budget-a',
    workspace: 'ws',
    updatedAt: '',
    createdAt: '',
  },
]

describe('transaction payee helpers', () => {
  it('detects transfers from payee id or transfer splits only', () => {
    expect(isTransferFromPayee(toPayeeTransferId('savings'), [])).toBe(true)
    expect(isTransferFromPayee('Walmart', [])).toBe(false)
    expect(
      isTransferFromPayee('Walmart', [{ payee: toPayeeTransferId('savings') }]),
    ).toBe(true)
  })

  it('resolves transaction type from current payee state', () => {
    expect(resolveTransactionTypeFromPayee('Target', [])).toBe('transaction')
    expect(resolveTransactionTypeFromPayee(toPayeeTransferId('cash'), [])).toBe('transfer')
  })

  it('defaults to the first spending category in the budget', () => {
    expect(defaultCategoryIdForPayee(categories, 'budget-a')).toBe('groceries')
    expect(defaultCategoryIdForPayee(categories, 'other-budget')).toBe('')
  })
})
