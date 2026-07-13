import type { TransactionEntry } from '@/types'

import {
  isPayeeTransferId,
  toPayeeTransferId,
  transferDestinationFromPayee,
} from '@/lib/frontend/transaction-payee'
import type { PostingLineInput } from '@/lib/frontend/transactions.display'
import { postingLinesFromEntries } from '@/lib/frontend/transactions.display'

export type TransactionDialogView = 'standard' | 'split'

export type SplitDraft = {
  key: string
  payee: string
  category: string
  amount: string
}

export type TransactionSplitFormState = {
  paymentAccount: string
  totalAmount: string
  splits: SplitDraft[]
}

const BALANCE_EPSILON = 1e-9

export function splitIsTransfer(split: SplitDraft): boolean {
  return isPayeeTransferId(split.payee)
}

export function newSplitDraft(payee = '', category = '', amount = ''): SplitDraft {
  return {
    key: `split-${crypto.randomUUID()}`,
    payee,
    category,
    amount,
  }
}

/** @deprecated Use newSplitDraft('', categoryId, amount) */
export function newCategorySplitDraft(categoryId = '', amount = ''): SplitDraft {
  return newSplitDraft('', categoryId, amount)
}

/** @deprecated Use newSplitDraft(toPayeeTransferId(accountId), '', amount) */
export function newTransferSplitDraft(accountId = '', amount = ''): SplitDraft {
  return newSplitDraft(accountId ? toPayeeTransferId(accountId) : '', '', amount)
}

export function splitAllocationTotal(splits: SplitDraft[]): number {
  return splits.reduce((sum, split) => sum + (Number(split.amount) || 0), 0)
}

export function transactionTotalMagnitude(totalAmount: string): number {
  return Math.abs(Number(totalAmount) || 0)
}

export function splitAllocationRemaining(state: TransactionSplitFormState): number {
  return transactionTotalMagnitude(state.totalAmount) - splitAllocationTotal(state.splits)
}

export function isSplitFormBalanced(state: TransactionSplitFormState): boolean {
  if (!state.paymentAccount || !state.totalAmount) return false
  if (state.splits.length === 0) return true
  return Math.abs(splitAllocationRemaining(state)) < BALANCE_EPSILON
}

export function isMultiSplitTransaction(splits: SplitDraft[]): boolean {
  return splits.length > 1
}

/** One split row covering the full transaction amount (type-agnostic). */
export function isSingleFullAmountSplit(state: TransactionSplitFormState): boolean {
  if (state.splits.length !== 1) return false

  const total = transactionTotalMagnitude(state.totalAmount)
  const amount = Number(state.splits[0].amount) || 0
  return Math.abs(amount - total) < BALANCE_EPSILON
}

export type SingleSplitCollapseKind = 'category' | 'transfer'

/** When a lone split can fold into the standard transaction view, which shape it is. */
export function singleSplitCollapseKind(
  state: TransactionSplitFormState,
): SingleSplitCollapseKind | null {
  if (!isSingleFullAmountSplit(state)) return null

  const split = state.splits[0]
  if (splitIsTransfer(split)) return 'transfer'
  if (split.category) return 'category'
  return null
}

export function hasEditableSplits(state: TransactionSplitFormState): boolean {
  if (state.splits.length > 1) return true
  if (state.splits.length === 0) return false

  return singleSplitCollapseKind(state) === null
}

export function isCollapsibleSingleTransferSplit(state: TransactionSplitFormState): boolean {
  return singleSplitCollapseKind(state) === 'transfer'
}

export function isCollapsibleSingleCategorySplit(state: TransactionSplitFormState): boolean {
  return singleSplitCollapseKind(state) === 'category'
}

export function isCollapsibleSingleSplit(state: TransactionSplitFormState): boolean {
  return singleSplitCollapseKind(state) !== null
}

export function splitPercentOfTotal(splitAmount: string, totalAmount: string): string {
  const total = transactionTotalMagnitude(totalAmount)
  if (total <= 0) return ''

  const amount = Number(splitAmount) || 0
  if (amount <= 0) return ''

  const percent = (amount / total) * 100
  if (!Number.isFinite(percent)) return ''

  const rounded = Math.round(percent * 100) / 100
  return String(rounded)
}

export function splitAmountFromPercent(percent: string, totalAmount: string): string {
  const total = transactionTotalMagnitude(totalAmount)
  const p = Number(percent) || 0
  if (total <= 0 || p <= 0) return ''

  const amount = (total * p) / 100
  const rounded = Math.round(amount * 100) / 100
  return String(rounded)
}

/** Collapse entry-backed split form for standard views (spending + transfers). */
export function normalizeSplitFormFromEntries(
  entries: TransactionEntry[],
): TransactionSplitFormState & { displayCategoryId: string } {
  const form = splitFormFromEntries(entries)
  const kind = singleSplitCollapseKind(form)

  if (kind === 'category') {
    return {
      ...collapseToSingleCategory(form),
      displayCategoryId: form.splits[0].category,
    }
  }

  if (kind === 'transfer') {
    return {
      ...collapseToSingleCategory(form),
      displayCategoryId: '',
    }
  }

  const categorySplit = form.splits.find((split) => !splitIsTransfer(split) && Boolean(split.category))

  return {
    ...form,
    displayCategoryId:
      form.splits.length === 0 ? primaryCategoryFromSplitForm(form, entries) : (categorySplit?.category ?? ''),
  }
}

export function splitFormWithCategorySeed(
  state: TransactionSplitFormState,
  categoryId: string,
): TransactionSplitFormState {
  if (state.splits.length > 0 || !categoryId) return state

  const magnitude = transactionTotalMagnitude(state.totalAmount)
  if (magnitude <= 0) return state

  return {
    ...state,
    splits: [newSplitDraft('', categoryId, String(magnitude))],
  }
}

export function serializeSplitForm(state: TransactionSplitFormState): string {
  return JSON.stringify({
    paymentAccount: state.paymentAccount,
    totalAmount: state.totalAmount,
    splits: state.splits.map((split) => ({
      payee: split.payee,
      category: split.category,
      amount: split.amount,
    })),
  })
}

export function removeSplitDraft(splits: SplitDraft[], index: number): SplitDraft[] {
  if (index < 0 || index >= splits.length) return splits
  return splits.filter((_, splitIndex) => splitIndex !== index)
}

export function collapseToSingleCategory(state: TransactionSplitFormState): TransactionSplitFormState {
  return {
    ...state,
    splits: [],
  }
}

export function resolvePostingCategoryId(
  state: TransactionSplitFormState,
  categoryId?: string | null,
): string | null {
  if (singleSplitCollapseKind(state) === 'category') {
    return state.splits[0].category
  }
  return categoryId ?? null
}

export type PostingSplitCollapse = {
  state: TransactionSplitFormState
  categoryId: string | null
  transferPayee?: string | null
  kind: SingleSplitCollapseKind | null
}

/** Fold a collapsible single split into standard-view state (spending or transfer). */
export function collapseSplitFormState(
  state: TransactionSplitFormState,
  categoryId?: string | null,
): PostingSplitCollapse {
  const kind = singleSplitCollapseKind(state)

  if (kind === 'category') {
    return {
      kind,
      state: collapseToSingleCategory(state),
      categoryId: state.splits[0].category,
    }
  }

  if (kind === 'transfer') {
    return {
      kind,
      state: collapseToSingleCategory(state),
      categoryId: categoryId ?? null,
      transferPayee: state.splits[0].payee,
    }
  }

  return { kind: null, state, categoryId: categoryId ?? null }
}

/** @deprecated Use collapseSplitFormState */
export function collapseSplitStateForStandardView(
  state: TransactionSplitFormState,
  categoryId?: string | null,
): PostingSplitCollapse {
  return collapseSplitFormState(state, categoryId)
}

/** @deprecated Use collapseSplitFormState */
export function postingStateForSave(
  state: TransactionSplitFormState,
  categoryId?: string | null,
): PostingSplitCollapse {
  return collapseSplitFormState(state, categoryId)
}

export type StandardViewCollapsePatch = {
  splitState: TransactionSplitFormState
  categoryId?: string
  transferPayee?: string
}

/** Apply collapsed split state to standard-view form fields. */
export function applyStandardViewCollapse(
  state: TransactionSplitFormState,
  categoryId?: string | null,
): StandardViewCollapsePatch {
  const collapsed = collapseSplitFormState(state, categoryId)
  return {
    splitState: collapsed.state,
    categoryId: collapsed.categoryId ?? undefined,
    transferPayee: collapsed.transferPayee ?? undefined,
  }
}

export function seedSplitsForView(
  state: TransactionSplitFormState,
  options: { categoryId?: string; payeeValue?: string; isTransfer?: boolean },
): TransactionSplitFormState {
  const payeeValue = options.payeeValue ?? ''
  if (options.isTransfer || isPayeeTransferId(payeeValue)) {
    return seedTransferSplitsFromPayee(state, payeeValue)
  }
  return splitFormWithCategorySeed(state, options.categoryId ?? '')
}

export type BuildPostingLinesInput = {
  splitState: TransactionSplitFormState
  categoryId?: string | null
  payeeValue?: string
  activeView?: TransactionDialogView
  isTransfer?: boolean
}

function resolveIsTransfer(input: BuildPostingLinesInput): boolean {
  if (input.isTransfer) return true
  if (isPayeeTransferId(input.payeeValue ?? '')) return true
  return allSplitsAreTransfers(input.splitState.splits)
}

/** Build posting lines for create/update from split + standard header fields. */
export function buildPostingLinesForSave(input: BuildPostingLinesInput): PostingLineInput[] {
  const {
    splitState,
    categoryId = null,
    payeeValue = '',
    activeView = 'standard',
  } = input
  const isTransfer = resolveIsTransfer(input)
  const view = activeView

  if (isTransfer) {
    if (shouldPostFromSplitRows(splitState, { view, isTransfer: true })) {
      if (splitState.splits.some((split) => !splitIsTransfer(split))) {
        throw new Error('Transfer transactions cannot include category splits')
      }
      if (!isSplitFormBalanced(splitState)) {
        throw new Error('Splits must balance to the transaction total')
      }
      return splitsToPostingLines(splitState)
    }

    const collapsed = collapseSplitFormState(splitState, categoryId)
    const transferPayee = collapsed.transferPayee ?? payeeValue
    const destination = transferDestinationFromPayee(transferPayee)
    const amount = Number(splitState.totalAmount)
    if (!splitState.paymentAccount || !destination || !Number.isFinite(amount) || amount === 0) {
      throw new Error('Transfer requires from account, destination, and amount')
    }

    const magnitude = Math.abs(amount)
    return splitsToPostingLines({
      paymentAccount: splitState.paymentAccount,
      totalAmount: String(-magnitude),
      splits: [newTransferSplitDraft(destination, String(magnitude))],
    })
  }

  if (shouldPostFromSplitRows(splitState, { view, isTransfer: false })) {
    if (!isSplitFormBalanced(splitState)) {
      throw new Error('Splits must balance to the transaction total')
    }
    return splitsToPostingLines(splitState)
  }

  const collapsed = collapseSplitFormState(splitState, categoryId)
  if (!isSplitFormBalanced(collapsed.state)) {
    throw new Error('Splits must balance to the transaction total')
  }

  return splitsToPostingLines(collapsed.state, { singleCategoryId: collapsed.categoryId })
}

/**
 * User-facing splits → balanced double-entry posting lines.
 *
 * - Payment leg: signed total on the payment account.
 * - Payee = merchant + category: opposite sign on same account with category.
 * - Payee = transfer account: inflow on target account.
 */
export function splitsToPostingLines(
  state: TransactionSplitFormState,
  options?: { singleCategoryId?: string | null },
): PostingLineInput[] {
  const total = Number(state.totalAmount)
  if (!state.paymentAccount || !Number.isFinite(total) || Math.abs(total) < BALANCE_EPSILON) {
    throw new Error('Transaction requires a payment account and non-zero amount')
  }

  const singleCategoryId = options?.singleCategoryId ?? null

  if (state.splits.length === 0) {
    if (!singleCategoryId) {
      throw new Error('Assign a category or add splits before posting')
    }

    const magnitude = Math.abs(total)
    const categorySign = total < 0 ? magnitude : -magnitude

    return [
      { account: state.paymentAccount, amount: total, sortOrder: 0 },
      {
        account: state.paymentAccount,
        amount: categorySign,
        category: singleCategoryId,
        sortOrder: 1,
      },
    ]
  }

  const allocated = splitAllocationTotal(state.splits)
  if (Math.abs(allocated - Math.abs(total)) > BALANCE_EPSILON) {
    throw new Error(`Splits must sum to ${Math.abs(total)} (got ${allocated})`)
  }

  const categoryLegSign = total < 0 ? 1 : -1
  const transferLegSign = total < 0 ? 1 : -1

  const lines: PostingLineInput[] = [
    { account: state.paymentAccount, amount: total, sortOrder: 0 },
  ]

  let sortOrder = 1
  for (const split of state.splits) {
    const amount = Number(split.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Each split needs a positive amount')
    }

    if (splitIsTransfer(split)) {
      const account = transferDestinationFromPayee(split.payee)
      if (!account) {
        throw new Error('Each transfer split needs a destination account')
      }

      lines.push({
        account,
        amount: transferLegSign * amount,
        sortOrder: sortOrder++,
      })
      continue
    }

    if (!split.category) {
      throw new Error('Each spending split needs a category')
    }

    lines.push({
      account: state.paymentAccount,
      amount: categoryLegSign * amount,
      category: split.category,
      sortOrder: sortOrder++,
    })
  }

  return lines
}

export function splitFormFromEntries(entries: TransactionEntry[]): TransactionSplitFormState {
  const lines = postingLinesFromEntries(entries)

  if (lines.length === 0) {
    return { paymentAccount: '', totalAmount: '', splits: [] }
  }

  if (lines.length === 2 && lines.every((line) => !line.category)) {
    const negative = lines.find((line) => line.amount < 0) ?? lines[0]
    const positive = lines.find((line) => line.amount > 0) ?? lines[1]

    if (negative.account !== positive.account) {
      return {
        paymentAccount: negative.account,
        totalAmount: String(negative.amount),
        splits: [
          newSplitDraft(toPayeeTransferId(positive.account), '', String(Math.abs(positive.amount))),
        ],
      }
    }
  }

  const paymentLine =
    lines.find(
      (line) =>
        !line.category &&
        Math.abs(line.amount) === Math.max(...lines.map((entry) => Math.abs(entry.amount))),
    ) ??
    lines.find((line) => !line.category) ??
    lines.reduce((best, line) => (Math.abs(line.amount) > Math.abs(best.amount) ? line : best))

  const paymentAccount = paymentLine.account
  const totalAmount = paymentLine.amount
  const paymentSign = Math.sign(totalAmount) || -1

  const categorySplits: SplitDraft[] = lines
    .filter(
      (line) =>
        line.category &&
        line.account === paymentAccount &&
        Math.sign(line.amount) !== paymentSign,
    )
    .map((line) => newSplitDraft('', line.category!, String(Math.abs(line.amount))))

  const transferSplits: SplitDraft[] = lines
    .filter((line) => !line.category && line.account !== paymentAccount)
    .map((line) =>
      newSplitDraft(toPayeeTransferId(line.account), '', String(Math.abs(line.amount))),
    )

  if (categorySplits.length === 0 && transferSplits.length === 0 && lines.length === 2) {
    const categorized = lines.find((line) => line.category)
    const other = lines.find((line) => line !== categorized)
    if (categorized && other && !other.category && categorized.account !== other.account) {
      return {
        paymentAccount: categorized.account,
        totalAmount: String(categorized.amount),
        splits: [newSplitDraft('', categorized.category!, String(Math.abs(other.amount)))],
      }
    }
  }

  return {
    paymentAccount,
    totalAmount: String(totalAmount),
    splits: [...categorySplits, ...transferSplits],
  }
}

export function primaryCategoryFromSplitForm(
  state: TransactionSplitFormState,
  entries: TransactionEntry[],
): string {
  const categorySplit = state.splits.find((split) => !splitIsTransfer(split) && Boolean(split.category))
  if (categorySplit) return categorySplit.category

  const lines = postingLinesFromEntries(entries)
  const categorized = lines.find((line) => line.category)
  return categorized?.category ?? ''
}

export function allSplitsAreTransfers(splits: SplitDraft[]): boolean {
  return splits.length > 0 && splits.every(splitIsTransfer)
}

/** Seed a single transfer split from the header payee when opening the splits editor. */
export function seedTransferSplitsFromPayee(
  state: TransactionSplitFormState,
  payeeValue: string,
): TransactionSplitFormState {
  if (state.splits.length > 0) return state

  const destination = transferDestinationFromPayee(payeeValue)
  if (!destination) return state

  const magnitude = transactionTotalMagnitude(state.totalAmount)
  return {
    ...state,
    splits: [newTransferSplitDraft(destination, magnitude > 0 ? String(magnitude) : '')],
  }
}

/** Keep the lone transfer split amount in sync when the transaction total changes on Details. */
export function syncSingleTransferSplitAmount(state: TransactionSplitFormState): TransactionSplitFormState {
  if (state.splits.length !== 1 || !splitIsTransfer(state.splits[0])) {
    return state
  }

  const magnitude = transactionTotalMagnitude(state.totalAmount)
  return {
    ...state,
    splits: [{ ...state.splits[0], amount: magnitude > 0 ? String(magnitude) : '' }],
  }
}

export function transferSplitCount(splits: SplitDraft[]): number {
  return splits.filter(splitIsTransfer).length
}

export function transferDestinationFromSplitState(state: TransactionSplitFormState): string | null {
  const transfer = state.splits.find((split) => splitIsTransfer(split))
  if (!transfer) return null
  return transferDestinationFromPayee(transfer.payee)
}

/** Initial dialog view from loaded posting state. */
export function defaultTransactionDialogView(
  state: TransactionSplitFormState,
): TransactionDialogView {
  return hasEditableSplits(state) ? 'split' : 'standard'
}

/** Whether save should post from split rows vs a single category on standard view. */
export function shouldPostFromSplitRows(
  state: TransactionSplitFormState,
  options: { view: TransactionDialogView; isTransfer: boolean },
): boolean {
  if (isCollapsibleSingleSplit(state)) return false
  if (options.view === 'split' && state.splits.length > 0) return true
  if (state.splits.length > 1) return true
  if (hasEditableSplits(state)) return true
  return false
}

/** Whether standard-view amount should be locked because splits own the total. */
export function standardAmountLocked(
  state: TransactionSplitFormState,
  isTransfer: boolean,
): boolean {
  return hasEditableSplits(state) && !isTransfer
}
