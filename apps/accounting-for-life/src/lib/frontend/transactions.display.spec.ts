import { describe, expect, it } from 'bun:test'

import {
  groupTransactionsByDate,
  registerRowsFromTransaction,
  transactionIdFromRegisterRowKey,
  uniqueTransactionIdsFromRegisterRowKeys,
  updatePrimaryAmountInLines,
} from '@/lib/frontend/transactions.display'
import type { Transaction } from '@/types'

function transferTransaction(): Transaction {
  return {
    id: 'tx-transfer',
    budget: 'budget-a',
    date: '2026-07-12T20:00:00.000Z',
    payee: null,
    type: 'transfer',
    status: 'posted',
    entries: [
      {
        id: 'e1',
        account: 'checking',
        amount: -100,
        sortOrder: 0,
      },
      {
        id: 'e2',
        account: 'savings',
        amount: 100,
        sortOrder: 1,
      },
    ],
    updatedAt: '',
    createdAt: '',
  }
}

describe('register rows from transactions', () => {
  it('expands transfers into one row per leg in the all-transactions view', () => {
    const rows = registerRowsFromTransaction(transferTransaction(), {
      accounts: { checking: 'Checking', savings: 'Savings' },
      categories: {},
    })

    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.primaryAccountId).sort()).toEqual(['checking', 'savings'])
    expect(rows.map((row) => row.amount).sort((a, b) => a - b)).toEqual([-100, 100])
    expect(rows[0]?.transactionId).toBe('tx-transfer')
    expect(rows[0]?.id).not.toBe(rows[1]?.id)
  })

  it('scopes transfer rows to the filtered account', () => {
    const rows = registerRowsFromTransaction(
      transferTransaction(),
      { accounts: { checking: 'Checking', savings: 'Savings' }, categories: {} },
      { accountId: 'checking' },
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]?.primaryAccountId).toBe('checking')
    expect(rows[0]?.amount).toBe(-100)
  })

  it('groups expanded transfer legs under the same date', () => {
    const groups = groupTransactionsByDate([transferTransaction()], {
      accounts: { checking: 'Checking', savings: 'Savings' },
      categories: {},
    })

    expect(groups).toHaveLength(1)
    expect(groups[0]?.rows).toHaveLength(2)
    expect(groups[0]?.total).toBe(0)
  })

  it('dedupes transaction ids from expanded register row keys', () => {
    const keys = ['tx-transfer#0', 'tx-transfer#1', 'other-tx#0']
    expect(uniqueTransactionIdsFromRegisterRowKeys(keys).sort()).toEqual(['other-tx', 'tx-transfer'])
    expect(transactionIdFromRegisterRowKey('legacy-id')).toBe('legacy-id')
  })

  it('shows income as a positive payment-leg amount in the register', () => {
    const income: Transaction = {
      id: 'tx-income',
      budget: 'budget-a',
      date: '2026-07-12T20:00:00.000Z',
      payee: 'Arlo Jack',
      type: 'transaction',
      status: 'posted',
      entries: [
        { id: 'e1', account: 'checking', amount: 25, sortOrder: 0 },
        { id: 'e2', account: 'checking', amount: -25, category: 'other-income', sortOrder: 1 },
      ],
      updatedAt: '',
      createdAt: '',
    }

    const rows = registerRowsFromTransaction(income, {
      accounts: { checking: 'Checking' },
      categories: { 'other-income': '💰 Other Income' },
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.amount).toBe(25)
    expect(rows[0]?.primaryAccountId).toBe('checking')
    expect(rows[0]?.categoryLabel).toContain('Other Income')
  })

  it('prefers the cash leg when the same account appears twice under account scope', () => {
    const income: Transaction = {
      id: 'tx-income-scoped',
      budget: 'budget-a',
      date: '2026-07-12T20:00:00.000Z',
      payee: 'Arlo Jack',
      notes: 'Gift',
      type: 'transaction',
      status: 'posted',
      entries: [
        { id: 'e1', account: 'checking', amount: -25, category: 'other-income', sortOrder: 0 },
        { id: 'e2', account: 'checking', amount: 25, sortOrder: 1 },
      ],
      updatedAt: '',
      createdAt: '',
    }

    const rows = registerRowsFromTransaction(
      income,
      {
        accounts: { checking: 'Checking' },
        categories: { 'other-income': '💰 Other Income' },
      },
      { accountId: 'checking' },
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]?.amount).toBe(25)
    expect(rows[0]?.notes).toBe('Gift')
  })

  it('balances the other leg when editing one transfer leg amount', () => {
    const lines = [
      { account: 'checking', amount: -200, sortOrder: 0 },
      { account: 'savings', amount: 200, sortOrder: 1 },
    ]

    expect(updatePrimaryAmountInLines(lines, 1, 300)).toEqual([
      { account: 'checking', amount: -300, sortOrder: 0 },
      { account: 'savings', amount: 300, sortOrder: 1 },
    ])

    expect(updatePrimaryAmountInLines(lines, 0, -150)).toEqual([
      { account: 'checking', amount: -150, sortOrder: 0 },
      { account: 'savings', amount: 150, sortOrder: 1 },
    ])
  })
})
