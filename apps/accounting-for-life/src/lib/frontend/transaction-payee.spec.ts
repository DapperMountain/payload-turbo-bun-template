import { describe, expect, it } from 'bun:test'

import {
  defaultCategoryIdForPayee,
  isTransferFromPayee,
  resolveTransactionTypeFromPayee,
  resolveTransferPair,
  toPayeeTransferId,
  transferPayeePresentation,
} from '@/lib/frontend/transaction-payee'
import type { Account, Category } from '@/types'

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

const checking: Account = {
  id: 'checking',
  name: 'Checking',
  classification: 'asset',
  subtype: 'checking',
  unit: 'usd',
  budget: 'budget-a',
  updatedAt: '',
  createdAt: '',
}

const savings: Account = {
  id: 'savings',
  name: 'Savings',
  classification: 'asset',
  subtype: 'savings',
  unit: 'usd',
  budget: 'budget-a',
  updatedAt: '',
  createdAt: '',
}

const visa: Account = {
  id: 'visa',
  name: 'Visa',
  classification: 'liability',
  subtype: 'credit_card',
  unit: 'usd',
  budget: 'budget-a',
  updatedAt: '',
  createdAt: '',
}

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

  it('presents outbound/inbound/pair transfer labels from the viewing account', () => {
    const pair = resolveTransferPair([checking, savings], {
      payeeValue: toPayeeTransferId('savings'),
      paymentAccountId: 'checking',
    })

    expect(pair).toEqual({ source: checking, destination: savings })
    expect(transferPayeePresentation(pair!, 'checking').mode).toBe('outbound')
    expect(transferPayeePresentation(pair!, 'savings').mode).toBe('inbound')
    expect(transferPayeePresentation(pair!).mode).toBe('pair')
  })

  it('flips arrow direction when the payment amount is an inflow', () => {
    const pair = resolveTransferPair([checking, savings], {
      payeeValue: toPayeeTransferId('savings'),
      paymentAccountId: 'checking',
    })

    const inflow = transferPayeePresentation(pair!, 'checking', 'inflow')
    expect(inflow.mode).toBe('inbound')
    expect(inflow.source.id).toBe('savings')
    expect(inflow.destination.id).toBe('checking')
  })

  it('marks credit-card destinations as payments', () => {
    const pair = resolveTransferPair([checking, visa], {
      payeeValue: toPayeeTransferId('visa'),
      paymentAccountId: 'checking',
    })

    expect(transferPayeePresentation(pair!, 'checking').isPayment).toBe(true)
  })
})
