import { describe, expect, it } from 'bun:test'

import type { Account } from '@/types'

import {
  buildExchangeFormPosting,
  journalLegsToSplitState,
  resolveEditorLayout,
  resolveExchangeTransactionType,
  seedJournalLegsFromSimpleForm,
  shouldExpandTransactionLines,
  splitStateToJournalLegs,
} from './transaction-assistance'
import { newTransferSplitDraft, type TransactionSplitFormState } from './transaction-splits'
import { isExchangeEntries, newSwapLegDraft, resolveTypeFromSwapLegs } from './transaction-swap'

function account(
  id: string,
  unit: string,
  classification: Account['classification'] = 'asset',
  subtype: Account['subtype'] = 'checking',
): Account {
  return {
    id,
    name: id,
    classification,
    subtype,
    unit,
    visibility: 'all_members',
    budget: 'budget-1',
    updatedAt: '',
    createdAt: '',
  }
}

function systemAccount(
  id: string,
  unit: string,
  classification: 'income' | 'expense',
): Account {
  return {
    ...account(id, unit, classification, 'other'),
    isSystemDefault: true,
    name: classification === 'expense' ? 'Budget expenses' : 'Budget income',
  }
}

const accounts: Account[] = [
  account('checking', 'unit-usd'),
  account('savings', 'unit-usd'),
  account('btc', 'unit-btc', 'asset', 'holding'),
  account('xrp', 'unit-xrp', 'asset', 'holding'),
  account('xlm', 'unit-xlm', 'asset', 'holding'),
  account('fee', 'unit-usd', 'expense'),
  systemAccount('budget-expenses', 'unit-usd', 'expense'),
  systemAccount('budget-income', 'unit-usd', 'income'),
]

describe('transaction-assistance', () => {
  it('round-trips a transfer through journal legs ↔ allocate projection', () => {
    const splitState: TransactionSplitFormState = {
      paymentAccount: 'checking',
      totalAmount: '-100',
      splits: [newTransferSplitDraft('savings', '100')],
    }

    const legs = splitStateToJournalLegs({
      splitState,
      isTransfer: true,
      payeeValue: '',
    })

    expect(legs).toHaveLength(2)
    expect(legs.map((leg) => ({ account: leg.account, amount: leg.amount }))).toEqual([
      { account: 'checking', amount: '-100' },
      { account: 'savings', amount: '100' },
    ])

    const back = journalLegsToSplitState(legs, accounts, 'unit-usd')
    expect(back.ok).toBe(true)
    if (!back.ok) return
    expect(back.splitState.paymentAccount).toBe('checking')
    expect(back.splitState.splits).toHaveLength(1)
  })

  it('uses journal layout for multi-leg / fee books', () => {
    expect(
      resolveEditorLayout({
        entries: [
          { account: 'btc', amount: -0.01, category: null, fxRate: 50000 },
          { account: 'checking', amount: 495, category: null, fxRate: null },
          { account: 'fee', amount: 5, category: null, fxRate: null },
        ],
        accounts,
        reportingCurrencyId: 'unit-usd',
      }),
    ).toBe('journal')
  })

  it('keeps allocate splits on the payment body (per-line payees)', () => {
    expect(
      resolveEditorLayout({
        entries: [
          { account: 'checking', amount: -105, category: null, fxRate: null },
          { account: 'cash', amount: 100, category: null, fxRate: null },
          {
            account: 'budget-expenses',
            amount: 5,
            category: 'financial-fees',
            fxRate: null,
          },
        ],
        accounts: [
          ...accounts,
          account('cash', 'unit-usd'),
          account('budget-expenses', 'unit-usd', 'expense', 'other'),
        ],
        reportingCurrencyId: 'unit-usd',
      }),
    ).toBe('payment')
  })

  it('uses payment layout for clean two-leg books even with legacy preferred=swap', () => {
    expect(
      resolveEditorLayout({
        entries: [
          { account: 'xrp', amount: -100, category: null, fxRate: 0.5 },
          { account: 'xlm', amount: 200, category: null, fxRate: 0.25 },
        ],
        accounts,
        reportingCurrencyId: 'unit-usd',
        preferred: 'swap',
      }),
    ).toBe('payment')
  })

  it('honors legacy preferred split/swap only when layout would be payment', () => {
    expect(
      resolveEditorLayout({
        entries: [],
        accounts,
        reportingCurrencyId: 'unit-usd',
        preferred: 'swap',
      }),
    ).toBe('journal')
  })

  it('seeds journal legs when expanding from the simple form', () => {
    const splitState: TransactionSplitFormState = {
      paymentAccount: 'checking',
      totalAmount: '-40',
      splits: [],
    }

    const legs = seedJournalLegsFromSimpleForm({
      splitState,
      categoryId: 'groceries',
      payeeValue: 'Store',
      isTransfer: false,
      accounts,
      budgetId: 'budget-1',
    })
    expect(legs.length).toBeGreaterThanOrEqual(2)
    expect(legs.some((leg) => leg.account === 'checking')).toBe(true)
  })

  it('does not allocate-project mixed-currency sell + fee', () => {
    const legs = [
      newSwapLegDraft('btc', '-0.01'),
      newSwapLegDraft('checking', '495'),
      newSwapLegDraft('fee', '5'),
    ]

    expect(journalLegsToSplitState(legs, accounts, 'unit-usd').ok).toBe(false)
  })

  it('uses payment layout for a same-unit two-leg transfer (YNAB single-line)', () => {
    expect(
      resolveEditorLayout({
        entries: [
          { account: 'checking', amount: -100, category: null, fxRate: null },
          { account: 'savings', amount: 100, category: null, fxRate: null },
        ],
        accounts,
        reportingCurrencyId: 'unit-usd',
      }),
    ).toBe('payment')
    expect(
      shouldExpandTransactionLines({
        entries: [
          { account: 'checking', amount: -100, category: null, fxRate: null },
          { account: 'savings', amount: 100, category: null, fxRate: null },
        ],
        accounts,
        reportingCurrencyId: 'unit-usd',
      }),
    ).toBe(false)
  })

  it('uses payment layout for BTC→USD two-leg transfer (not journal or exchange)', () => {
    const entries = [
      { account: 'btc', amount: -0.01, category: null, fxRate: 50000 },
      { account: 'checking', amount: 500, category: null, fxRate: 1 },
    ]
    expect(isExchangeEntries(entries, accounts)).toBe(true)
    expect(
      resolveEditorLayout({
        entries,
        accounts,
        reportingCurrencyId: 'unit-usd',
      }),
    ).toBe('payment')
  })

  it('keeps DEX merchant legs as transaction type', () => {
    expect(resolveExchangeTransactionType('Kraken')).toBe('transaction')
    expect(resolveExchangeTransactionType('__transfer__:savings')).toBe('transfer')

    const walletLegs = [newSwapLegDraft('xrp', '-100'), newSwapLegDraft('xlm', '200')]
    expect(resolveTypeFromSwapLegs(walletLegs, accounts)).toBe('transfer')

    const dexLegs = [
      { ...newSwapLegDraft('xrp', '-100'), payee: 'Uniswap' },
      newSwapLegDraft('xlm', '200'),
    ]
    expect(resolveTypeFromSwapLegs(dexLegs, accounts)).toBe('transaction')
  })

  it('posts DEX exchange with external payee while using receive account legs', () => {
    const splitState: TransactionSplitFormState = {
      paymentAccount: 'xlm',
      totalAmount: '-100',
      splits: [newTransferSplitDraft('xrp', '50')],
    }

    const posting = buildExchangeFormPosting({
      splitState,
      payeeValue: 'Kraken',
      accounts,
      reportingCurrencyId: 'unit-usd',
    })

    expect(posting.lines).toHaveLength(2)
    expect(posting.lines.map((line) => line.account).sort()).toEqual(['xlm', 'xrp'].sort())
    expect(resolveExchangeTransactionType('Kraken')).toBe('transaction')
  })
})
