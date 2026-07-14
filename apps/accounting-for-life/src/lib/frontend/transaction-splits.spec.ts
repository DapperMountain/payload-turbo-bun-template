import { describe, expect, it } from 'bun:test'

import {
  buildEntriesForSave,
  collapseSplitFormState,
  defaultTransactionDialogView,
  isCollapsibleSingleCategorySplit,
  isCollapsibleSingleTransferSplit,
  newSplitDraft,
  newTransferSplitDraft,
  normalizeSplitFormFromEntries,
  shouldPostFromSplitRows,
  singleSplitCollapseKind,
  splitAmountFromPercent,
  splitPercentOfTotal,
  splitsToEntries,
  syncSingleTransferSplitAmount,
} from '@/lib/frontend/transaction-splits'

describe('transaction-splits', () => {
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
      splits: [newSplitDraft('', 'groceries', '100')],
    }

    expect(singleSplitCollapseKind(single)).toBe('category')
    expect(isCollapsibleSingleCategorySplit(single)).toBe(true)
    expect(
      shouldPostFromSplitRows(single, { view: 'split', isTransfer: false }),
    ).toBe(false)

    const prepared = collapseSplitFormState(single, '')
    expect(prepared.state.splits).toHaveLength(0)
    expect(prepared.categoryId).toBe('groceries')

    const regular = splitsToEntries(prepared.state, {
      singleCategoryId: prepared.categoryId,
    })
    const fromSplit = splitsToEntries(single)

    expect(regular).toEqual(fromSplit)
    expect(regular).toHaveLength(2)
    expect(regular[1]).toMatchObject({ category: 'groceries', amount: 100 })
  })

  it('round-trips a collapsed single category split as a regular transaction', () => {
    const form = {
      paymentAccount: 'checking',
      totalAmount: '-100',
      splits: [newSplitDraft('', 'groceries', '100')],
    }

    const prepared = collapseSplitFormState(form, '')
    const lines = splitsToEntries(prepared.state, { singleCategoryId: prepared.categoryId })

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
    expect(normalized.splits).toHaveLength(0)
    expect(defaultTransactionDialogView(normalized)).toBe('standard')
  })

  it('converts split percent to amount and back', () => {
    expect(splitAmountFromPercent('25', '-200')).toBe('50')
    expect(splitPercentOfTotal('50', '-200')).toBe('25')
  })

  it('buildEntriesForSave handles spending and transfers through one path', () => {
    const spending = buildEntriesForSave({
      splitState: {
        paymentAccount: 'checking',
        totalAmount: '-40',
        splits: [newSplitDraft('', 'groceries', '40')],
      },
      categoryId: '',
      activeView: 'split',
    })
    expect(spending).toHaveLength(2)

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
      activeView: 'standard',
      isTransfer: false,
    })

    expect(lines).toEqual([
      { account: 'checking', amount: 35, sortOrder: 0 },
      { account: 'checking', amount: -35, category: 'other-income', sortOrder: 1 },
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
      activeView: 'standard',
      isTransfer: false,
    })

    const credit = buildEntriesForSave({
      splitState: {
        paymentAccount: 'checking',
        totalAmount: '100',
        splits: [],
      },
      categoryId: 'groceries',
      activeView: 'standard',
      isTransfer: false,
    })

    expect(debit[0]?.amount).toBe(-100)
    expect(debit[1]?.amount).toBe(100)
    expect(credit[0]?.amount).toBe(100)
    expect(credit[1]?.amount).toBe(-100)
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
