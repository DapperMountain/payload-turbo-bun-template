import { describe, expect, it } from 'bun:test'

import {
  groupTransactionsByDate,
  isMultiAccountJournal,
  registerPayeeLabel,
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
    type: 'transfer',
    status: 'posted',
    source: 'manual',
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
  it('shows a transfer as one register row (not one row per leg)', () => {
    const rows = registerRowsFromTransaction(transferTransaction(), {
      accounts: { checking: 'Checking', savings: 'Savings' },
      categories: {},
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.transactionId).toBe('tx-transfer')
    expect(rows[0]?.entryCount).toBe(2)
    expect(rows[0]?.primaryAccountId).toBe('checking')
    expect(rows[0]?.amount).toBe(-100)
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

  it('groups a transfer under one date row', () => {
    const groups = groupTransactionsByDate([transferTransaction()], {
      accounts: { checking: 'Checking', savings: 'Savings' },
      categories: {},
    })

    expect(groups).toHaveLength(1)
    expect(groups[0]?.rows).toHaveLength(1)
    expect(groups[0]?.total).toBe(-100)
  })

  it('dedupes transaction ids from expanded register row keys', () => {
    const keys = ['tx-transfer#0', 'tx-transfer#1', 'other-tx#0']
    expect(uniqueTransactionIdsFromRegisterRowKeys(keys).sort()).toEqual(['other-tx', 'tx-transfer'])
    expect(transactionIdFromRegisterRowKey('legacy-id')).toBe('legacy-id')
  })

  it('detects multi-account journals vs same-account allocate splits', () => {
    expect(
      isMultiAccountJournal([
        { account: 'checking' },
        { account: 'checking' },
        { account: 'checking' },
      ]),
    ).toBe(false)
    expect(
      isMultiAccountJournal([
        { account: 'xrp' },
        { account: 'xlm' },
        { account: 'checking' },
        { account: 'checking' },
      ]),
    ).toBe(true)
  })

  it('derives register payee from entry merchants', () => {
    const atm: Transaction = {
      id: 'tx-atm',
      budget: 'budget-a',
      date: '2026-08-01T16:00:00.000Z',
      type: 'transaction',
      status: 'posted',
      source: 'manual',
      entries: [
        { id: 'e1', account: 'checking', amount: -105, sortOrder: 0 },
        { id: 'e2', account: 'cash', amount: 100, sortOrder: 1 },
        {
          id: 'e3',
          account: 'budget-expenses',
          amount: 5,
          category: 'financial-fees',
          payee: 'ATM Co',
          sortOrder: 2,
        },
      ],
      updatedAt: '',
      createdAt: '',
    }

    expect(registerPayeeLabel(atm)).toBe('ATM Co')
    expect(registerRowsFromTransaction(atm)[0]?.payee).toBe('ATM Co')

    const multi: Transaction = {
      ...atm,
      id: 'tx-multi',
      entries: [
        { id: 'e1', account: 'checking', amount: -100, sortOrder: 0 },
        {
          id: 'e2',
          account: 'budget-expenses',
          amount: 40,
          category: 'groceries',
          payee: 'Store A',
          sortOrder: 1,
        },
        {
          id: 'e3',
          account: 'budget-expenses',
          amount: 60,
          category: 'dining',
          payee: 'Store B',
          sortOrder: 2,
        },
      ],
    }
    expect(registerPayeeLabel(multi)).toBe('Store A · Store B')

    const noMerchant: Transaction = {
      ...atm,
      id: 'tx-no-merchant',
      entries: [
        { id: 'e1', account: 'xrp', amount: -100, sortOrder: 0 },
        { id: 'e2', account: 'xlm', amount: 200, sortOrder: 1 },
      ],
    }
    expect(registerPayeeLabel(noMerchant)).toBeNull()
  })

  it('shows the exchange header on multi-account swap+fee journals', () => {
    const kraken: Transaction = {
      id: 'tx-kraken',
      budget: 'budget-a',
      date: '2026-07-09T20:00:00.000Z',
      type: 'transaction',
      status: 'posted',
      source: 'manual',
      entries: [
        { id: 'e1', account: 'xrp', amount: -100, fxRate: 0.5, sortOrder: 0 },
        { id: 'e2', account: 'xlm', amount: 200, fxRate: 0.25, sortOrder: 1 },
        { id: 'e3', account: 'checking', amount: -5, fxRate: 1, sortOrder: 2 },
        {
          id: 'e4',
          account: 'budget-expenses',
          amount: 5,
          category: 'financial-fees',
          payee: 'Kraken',
          fxRate: 1,
          sortOrder: 3,
        },
      ],
      updatedAt: '',
      createdAt: '',
    }

    const rows = registerRowsFromTransaction(kraken, {
      accounts: { xrp: 'XRP', xlm: 'XLM', checking: 'Checking' },
      categories: { 'financial-fees': 'Financial Fees' },
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.categoryLabel).toBeNull()
    expect(rows[0]?.entryCount).toBe(4)
    expect(registerPayeeLabel(kraken)).toBe('Kraken')
    expect(rows[0]?.payee).toBe('Kraken')
  })

  it('shows income as a positive payment-leg amount in the register', () => {
    const income: Transaction = {
      id: 'tx-income',
      budget: 'budget-a',
      date: '2026-07-12T20:00:00.000Z',
      type: 'transaction',
      status: 'posted',
      source: 'manual',
      entries: [
        { id: 'e1', account: 'checking', amount: 25, sortOrder: 0 },
        {
          id: 'e2',
          account: 'budget-income',
          amount: -25,
          category: 'other-income',
          sortOrder: 1,
        },
      ],
      updatedAt: '',
      createdAt: '',
    }

    const rows = registerRowsFromTransaction(income, {
      accounts: { checking: 'Checking', 'budget-income': 'Budget income' },
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
      type: 'transaction',
      status: 'posted',
      source: 'manual',
      entries: [
        {
          id: 'e1',
          account: 'budget-income',
          amount: -25,
          category: 'other-income',
          sortOrder: 0,
        },
        {
          id: 'e2',
          account: 'checking',
          amount: 25,
          notes: 'Gift',
          sortOrder: 1,
        },
      ],
      updatedAt: '',
      createdAt: '',
    }

    const rows = registerRowsFromTransaction(
      income,
      {
        accounts: { checking: 'Checking', 'budget-income': 'Budget income' },
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
