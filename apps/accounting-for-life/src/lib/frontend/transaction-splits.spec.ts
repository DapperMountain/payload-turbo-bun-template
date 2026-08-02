import { describe, expect, it } from 'bun:test'

import {
  buildEntriesForSave,
  clearSelfTransferDestinations,
  collapseSplitFormState,
  defaultTransactionDialogView,
  hasSelfTransferDestination,
  isCollapsibleSingleCategorySplit,
  isCollapsibleSingleTransferSplit,
  merchantPayeesFromSplits,
  newSplitDraft,
  newTransferSplitDraft,
  normalizeSplitFormFromEntries,
  seedAllocateSplitsFromSimpleForm,
  shouldPostFromSplitRows,
  singleSplitCollapseKind,
  splitAmountFromPercent,
  splitFormFromEntries,
  splitPercentOfTotal,
  splitsToEntries,
  syncSingleTransferSplitAmount,
} from '@/lib/frontend/transaction-splits'
import type { SystemPnlAccounts } from '@/lib/frontend/system-pnl-accounts'

const systemPnl: SystemPnlAccounts = {
  expenseAccountId: 'budget-expenses',
  incomeAccountId: 'budget-income',
}

describe('transaction-splits', () => {
  it('clears transfer destinations that equal the payment account', () => {
    const state = {
      paymentAccount: 'checking',
      totalAmount: '-40',
      splits: [newTransferSplitDraft('checking', '40')],
    }
    expect(hasSelfTransferDestination(state, '')).toBe(true)
    expect(hasSelfTransferDestination(state, '__transfer__:checking')).toBe(true)

    const cleared = clearSelfTransferDestinations(state)
    expect(cleared.splits[0]?.payee).toBe('')
    expect(hasSelfTransferDestination(cleared, '')).toBe(false)
  })

  it('posts one payment leg and multiple transfer destinations', () => {
    const lines = splitsToEntries({
      paymentAccount: 'checking',
      totalAmount: '-100',
      splits: [
        newSplitDraft('__transfer__:savings', '', '60'),
        newSplitDraft('__transfer__:cash', '', '40'),
      ],
    })

    expect(lines).toHaveLength(3)
    expect(lines[0]).toMatchObject({ account: 'checking', amount: -100 })
    expect(lines[1]).toMatchObject({ account: 'savings', amount: 60 })
    expect(lines[2]).toMatchObject({ account: 'cash', amount: 40 })
  })

  it('opens split view when transaction has multiple splits', () => {
    const view = defaultTransactionDialogView({
      paymentAccount: 'checking',
      totalAmount: '-100',
      splits: [
        newSplitDraft('', 'groceries', '60'),
        newSplitDraft('', 'dining', '40'),
      ],
    })

    expect(view).toBe('split')
  })

  it('posts from split rows on split view or multi-split spending', () => {
    const multiSplit = {
      paymentAccount: 'checking',
      totalAmount: '-100',
      splits: [
        newSplitDraft('', 'groceries', '60'),
        newSplitDraft('', 'dining', '40'),
      ],
    }

    expect(
      shouldPostFromSplitRows(multiSplit, { view: 'split', isTransfer: false }),
    ).toBe(true)
    expect(
      shouldPostFromSplitRows(multiSplit, { view: 'standard', isTransfer: false }),
    ).toBe(true)

    const unsplit = {
      paymentAccount: 'checking',
      totalAmount: '-50',
      splits: [],
    }

    expect(
      shouldPostFromSplitRows(unsplit, { view: 'standard', isTransfer: false }),
    ).toBe(false)
  })

  it('collapses a single full category split into a regular transaction on save', () => {
    const single = {
      paymentAccount: 'checking',
      totalAmount: '-100',
      splits: [newSplitDraft('Costco', 'groceries', '100')],
    }

    expect(singleSplitCollapseKind(single)).toBe('category')
    expect(isCollapsibleSingleCategorySplit(single)).toBe(true)
    // Explicit split editor keeps posting from the line (preserves per-line payee).
    expect(
      shouldPostFromSplitRows(single, { view: 'split', isTransfer: false }),
    ).toBe(true)
    expect(
      shouldPostFromSplitRows(single, { view: 'standard', isTransfer: false }),
    ).toBe(false)

    const prepared = collapseSplitFormState(single, '')
    expect(prepared.state.splits).toHaveLength(0)
    expect(prepared.categoryId).toBe('groceries')

    const regular = splitsToEntries(prepared.state, {
      singleCategoryId: prepared.categoryId,
      systemPnl,
      merchantPayee: 'Costco',
    })
    const fromSplit = splitsToEntries(single, { systemPnl })

    expect(regular).toEqual(fromSplit)
    expect(regular).toHaveLength(2)
    expect(regular[0]).toMatchObject({ account: 'checking', amount: -100 })
    expect(regular[1]).toMatchObject({
      account: 'budget-expenses',
      category: 'groceries',
      amount: 100,
      payee: 'Costco',
    })
  })

  it('round-trips a collapsed single category split as a regular transaction', () => {
    const form = {
      paymentAccount: 'checking',
      totalAmount: '-100',
      splits: [newSplitDraft('Costco', 'groceries', '100')],
    }

    const prepared = collapseSplitFormState(form, '')
    const lines = splitsToEntries(prepared.state, {
      singleCategoryId: prepared.categoryId,
      systemPnl,
      merchantPayee: 'Costco',
    })

    const entries = lines.map((line, index) => ({
      id: String(index),
      account: line.account,
      amount: line.amount,
      category: line.category ?? null,
      sortOrder: line.sortOrder ?? index,
      transaction: 'tx1',
      workspace: 'ws',
      unit: 'usd',
      updatedAt: '',
      createdAt: '',
    }))

    const normalized = normalizeSplitFormFromEntries(entries as import('@/types').TransactionEntry[])
    expect(normalized.splits).toHaveLength(0)
    expect(normalized.displayCategoryId).toBe('groceries')
    expect(defaultTransactionDialogView(normalized)).toBe('standard')
  })

  it('collapses a single full transfer split into a standard transfer', () => {
    const single = {
      paymentAccount: 'checking',
      totalAmount: '-100',
      splits: [newTransferSplitDraft('savings', '100')],
    }

    expect(singleSplitCollapseKind(single)).toBe('transfer')
    expect(isCollapsibleSingleTransferSplit(single)).toBe(true)
    expect(
      shouldPostFromSplitRows(single, { view: 'split', isTransfer: true }),
    ).toBe(true)
    expect(
      shouldPostFromSplitRows(single, { view: 'standard', isTransfer: true }),
    ).toBe(false)
    expect(defaultTransactionDialogView(single)).toBe('standard')

    const prepared = collapseSplitFormState(single, '')
    expect(prepared.state.splits).toHaveLength(0)
    expect(prepared.transferPayee).toBe('__transfer__:savings')

    const lines = splitsToEntries({
      paymentAccount: 'checking',
      totalAmount: '-100',
      splits: [newTransferSplitDraft('savings', '100')],
    })

    const entries = lines.map((line, index) => ({
      id: String(index),
      account: line.account,
      amount: line.amount,
      category: line.category ?? null,
      sortOrder: line.sortOrder ?? index,
      transaction: 'tx1',
      workspace: 'ws',
      unit: 'usd',
      updatedAt: '',
      createdAt: '',
    }))

    const normalized = normalizeSplitFormFromEntries(entries as import('@/types').TransactionEntry[])
    expect(normalized.splits).toHaveLength(1)
    expect(normalized.splits[0]?.payee).toBe('__transfer__:savings')
    expect(normalized.splits[0]?.amount).toBe('100')
    expect(defaultTransactionDialogView(normalized)).toBe('standard')
  })

  it('keeps an asymmetric cross-unit transfer on the standard view', () => {
    const single = {
      paymentAccount: 'xrp',
      totalAmount: '-100',
      splits: [newTransferSplitDraft('xlm', '200')],
    }

    expect(singleSplitCollapseKind(single)).toBe('transfer')
    expect(defaultTransactionDialogView(single)).toBe('standard')

    const lines = buildEntriesForSave({
      splitState: single,
      payeeValue: '__transfer__:xlm',
      isTransfer: true,
    })
    expect(lines).toEqual([
      { account: 'xrp', amount: -100, sortOrder: 0 },
      { account: 'xlm', amount: 200, sortOrder: 1 },
    ])
  })

  it('converts split percent to amount and back', () => {
    expect(splitAmountFromPercent('25', '-200')).toBe('50')
    expect(splitPercentOfTotal('50', '-200')).toBe('25')
  })

  it('round-trips merchant payee on allocate category legs (ATM shape)', () => {
    const form = {
      paymentAccount: 'checking',
      totalAmount: '-105',
      splits: [
        newTransferSplitDraft('cash', '100'),
        newSplitDraft('ATM Co', 'financial-fees', '5'),
      ],
    }

    const lines = splitsToEntries(form, { systemPnl })
    const feeLine = lines.find((line) => line.category === 'financial-fees')
    const cashLine = lines.find((line) => line.account === 'cash')
    const paymentLine = lines.find((line) => line.account === 'checking')
    expect(paymentLine).toMatchObject({ account: 'checking', amount: -105 })
    expect(feeLine).toMatchObject({
      account: 'budget-expenses',
      amount: 5,
      category: 'financial-fees',
      payee: 'ATM Co',
    })
    expect(cashLine).toMatchObject({ account: 'cash', amount: 100 })
    expect(cashLine?.payee).toBeUndefined()
    expect(merchantPayeesFromSplits(form.splits)).toEqual(['ATM Co'])

    const restored = splitFormFromEntries(
      lines.map((line, index) => ({
        id: String(index),
        account: line.account,
        amount: line.amount,
        category: line.category ?? null,
        payee: line.payee,
        sortOrder: line.sortOrder ?? index,
        transaction: 'tx1',
        workspace: 'ws',
        unit: 'usd',
        updatedAt: '',
        createdAt: '',
      })) as import('@/types').TransactionEntry[],
    )
    const fee = restored.splits.find((split) => split.category === 'financial-fees')
    expect(fee?.payee).toBe('ATM Co')
    expect(merchantPayeesFromSplits(restored.splits)).toEqual(['ATM Co'])
  })

  it('lists every merchant when allocate splits have multiple merchants', () => {
    expect(
      merchantPayeesFromSplits([
        newSplitDraft('Store A', 'groceries', '40'),
        newSplitDraft('Store B', 'dining', '60'),
      ]),
    ).toEqual(['Store A', 'Store B'])
  })

  it('seeds two allocate lines with payee when leaving the simple form', () => {
    const seeded = seedAllocateSplitsFromSimpleForm({
      state: { paymentAccount: 'checking', totalAmount: '-105', splits: [] },
      payee: 'ATM Co',
      categoryId: 'financial-fees',
    })
    expect(seeded.splits).toHaveLength(2)
    expect(seeded.splits[0]?.payee).toBe('ATM Co')
    expect(seeded.splits[1]?.payee).toBe('ATM Co')
    expect(
      shouldPostFromSplitRows(seeded, { view: 'split', isTransfer: false }),
    ).toBe(true)
  })

  it('posts from split rows while the split editor is open even for one full line', () => {
    const single = {
      paymentAccount: 'checking',
      totalAmount: '-40',
      splits: [newSplitDraft('Costco', 'groceries', '40')],
    }
    expect(shouldPostFromSplitRows(single, { view: 'standard', isTransfer: false })).toBe(false)
    expect(shouldPostFromSplitRows(single, { view: 'split', isTransfer: false })).toBe(true)
  })

  it('buildEntriesForSave handles spending and transfers through one path', () => {
    const spending = buildEntriesForSave({
      splitState: {
        paymentAccount: 'checking',
        totalAmount: '-40',
        splits: [newSplitDraft('Costco', 'groceries', '40')],
      },
      categoryId: '',
      activeView: 'split',
      systemPnl,
    })
    expect(spending).toHaveLength(2)
    expect(spending[1]).toMatchObject({
      account: 'budget-expenses',
      category: 'groceries',
      payee: 'Costco',
    })

    const transfer = buildEntriesForSave({
      splitState: {
        paymentAccount: 'checking',
        totalAmount: '-100',
        splits: [],
      },
      payeeValue: '__transfer__:savings',
      isTransfer: true,
    })
    expect(transfer).toHaveLength(2)
    expect(transfer[1]).toMatchObject({ account: 'savings', amount: 100 })
  })

  it('coerces income category saves to an inflow on the payment account', () => {
    const lines = buildEntriesForSave({
      splitState: {
        paymentAccount: 'checking',
        totalAmount: '-35',
        splits: [],
      },
      categoryId: 'other-income',
      categoryPurpose: 'income',
      payeeValue: 'Employer',
      activeView: 'standard',
      isTransfer: false,
      systemPnl,
    })

    expect(lines).toEqual([
      { account: 'checking', amount: 35, sortOrder: 0 },
      {
        account: 'budget-income',
        amount: -35,
        category: 'other-income',
        payee: 'Employer',
        sortOrder: 1,
      },
    ])
  })

  it('flips both legs when the payment amount sign changes on standard save', () => {
    const debit = buildEntriesForSave({
      splitState: {
        paymentAccount: 'checking',
        totalAmount: '-100',
        splits: [],
      },
      categoryId: 'groceries',
      categoryPurpose: 'spending',
      payeeValue: 'Costco',
      activeView: 'standard',
      isTransfer: false,
      systemPnl,
    })

    const credit = buildEntriesForSave({
      splitState: {
        paymentAccount: 'checking',
        totalAmount: '100',
        splits: [],
      },
      categoryId: 'groceries',
      categoryPurpose: 'spending',
      payeeValue: 'Costco',
      activeView: 'standard',
      isTransfer: false,
      systemPnl,
    })

    expect(debit[0]?.amount).toBe(-100)
    expect(debit[1]).toMatchObject({
      account: 'budget-expenses',
      amount: 100,
      payee: 'Costco',
    })
    expect(credit[0]?.amount).toBe(100)
    expect(credit[1]).toMatchObject({
      account: 'budget-expenses',
      amount: -100,
      payee: 'Costco',
    })
  })

  it('rejects spending splits without a payee', () => {
    expect(() =>
      splitsToEntries(
        {
          paymentAccount: 'checking',
          totalAmount: '-50',
          splits: [newSplitDraft('', 'groceries', '50')],
        },
        { systemPnl },
      ),
    ).toThrow(/needs a payee/)
  })

  it('rejects single-category posts without a merchant payee', () => {
    expect(() =>
      splitsToEntries(
        {
          paymentAccount: 'checking',
          totalAmount: '-50',
          splits: [],
        },
        { systemPnl, singleCategoryId: 'groceries' },
      ),
    ).toThrow(/Each categorized line needs a payee/)
  })

  it('moves Checking by the payment amount (Σ on cash account is not cancelled)', () => {
    const lines = splitsToEntries(
      {
        paymentAccount: 'checking',
        totalAmount: '-50',
        splits: [newSplitDraft('Costco', 'groceries', '50')],
      },
      { systemPnl },
    )
    const checkingSum = lines
      .filter((line) => line.account === 'checking')
      .reduce((sum, line) => sum + line.amount, 0)
    expect(checkingSum).toBe(-50)
    expect(lines.find((line) => line.category === 'groceries')?.amount).toBe(50)
  })

  it('keeps a single transfer split amount aligned with the transaction total', () => {
    const synced = syncSingleTransferSplitAmount({
      paymentAccount: 'checking',
      totalAmount: '-175.5',
      splits: [newTransferSplitDraft('savings', '100')],
    })

    expect(synced.splits).toHaveLength(1)
    expect(synced.splits[0]?.amount).toBe('175.5')
  })
})
