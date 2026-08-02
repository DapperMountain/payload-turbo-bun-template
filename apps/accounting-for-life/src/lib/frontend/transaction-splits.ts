import type { Account, Category, TransactionEntry } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

import {
  isPayeeTransferId,
  toPayeeTransferId,
  transferDestinationFromPayee,
} from '@/lib/frontend/transaction-payee'
import {
  attachSingleNoteToEntries,
  type TransactionEntryInput,
} from '@/collections/Transactions/lib/entries'
import { entryInputsFromDocs } from '@/lib/frontend/transactions.display'
import {
  pnlAccountForCategoryLeg,
  resolveSystemPnlAccounts,
  type SystemPnlAccounts,
} from '@/lib/frontend/system-pnl-accounts'

export type TransactionDialogView = 'standard' | 'split' | 'swap'

export type SplitDraft = {
  key: string
  payee: string
  category: string
  amount: string
  notes: string
}

export type TransactionSplitFormState = {
  paymentAccount: string
  totalAmount: string
  splits: SplitDraft[]
}

const BALANCE_EPSILON = 1e-9

/** When the user picks an income category, force the payment total to an inflow. */
export function splitStateAfterCategoryChange(
  state: TransactionSplitFormState,
  categoryId: string,
  categories: Category[],
): TransactionSplitFormState {
  const purpose = categories.find((category) => category.id === categoryId)?.purpose
  return coerceSplitStateForCategoryPurpose(state, purpose)
}

export function splitIsTransfer(split: SplitDraft): boolean {
  return isPayeeTransferId(split.payee)
}

export function newSplitDraft(payee = '', category = '', amount = '', notes = ''): SplitDraft {
  return {
    key: `split-${crypto.randomUUID()}`,
    payee,
    category,
    amount,
    notes,
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
  if (state.splits.length !== 1) return null

  const split = state.splits[0]
  if (!split) return null

  // Wallet transfers stay on the simple form even when destination amount ≠ payment
  // (cross-unit / FX swaps like −100 XRP / +200 XLM).
  if (splitIsTransfer(split)) return 'transfer'

  if (!isSingleFullAmountSplit(state)) return null
  if (split.category) return 'category'
  return null
}

function accountUnitId(account: Account | undefined): string | null {
  if (!account) return null
  return getCollectionId(account.unit) ?? null
}

/** True when the payment account and transfer destination use different units. */
export function transferUnitsDiffer(
  state: TransactionSplitFormState,
  accounts: Account[],
  payeeValue = '',
): boolean {
  const destinationId =
    transferDestinationFromSplitState(state) ?? transferDestinationFromPayee(payeeValue)
  if (!state.paymentAccount || !destinationId) return false

  const paymentUnit = accountUnitId(accounts.find((account) => account.id === state.paymentAccount))
  const destinationUnit = accountUnitId(accounts.find((account) => account.id === destinationId))
  return Boolean(paymentUnit && destinationUnit && paymentUnit !== destinationUnit)
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
    // Keep the transfer split so destination amount survives (esp. cross-unit / FX).
    return {
      ...form,
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

export type BuildEntriesInput = {
  splitState: TransactionSplitFormState
  categoryId?: string | null
  /** When the header/single category is income, coerce the payment total to an inflow. */
  categoryPurpose?: Category['purpose'] | null
  payeeValue?: string
  activeView?: TransactionDialogView
  isTransfer?: boolean
  /** Standard / single-line note — attached to the display leg when not posting from split rows. */
  notes?: string | null
  /** Classical DE: system Income/Expense account ids (or resolve from accounts + budgetId). */
  systemPnl?: SystemPnlAccounts
  accounts?: Account[]
  budgetId?: string | null
}

function resolveSystemPnlForPosting(input: {
  systemPnl?: SystemPnlAccounts
  accounts?: Account[]
  budgetId?: string | null
}): SystemPnlAccounts | undefined {
  if (input.systemPnl) return input.systemPnl
  const budgetId = input.budgetId
  if (input.accounts && budgetId) {
    try {
      return resolveSystemPnlAccounts(input.accounts, budgetId)
    } catch {
      // Transfers do not need P&L accounts; categorized posts throw in splitsToEntries.
      return undefined
    }
  }
  return undefined
}

function resolveIsTransfer(input: BuildEntriesInput): boolean {
  if (input.isTransfer) return true
  if (isPayeeTransferId(input.payeeValue ?? '')) return true
  return allSplitsAreTransfers(input.splitState.splits)
}

/** Income must land on the account as an inflow (payment leg positive on assets). */
export function coerceSplitStateForCategoryPurpose(
  state: TransactionSplitFormState,
  purpose: Category['purpose'] | null | undefined,
): TransactionSplitFormState {
  if (purpose !== 'income') return state

  const total = Number(state.totalAmount)
  if (!Number.isFinite(total) || total >= 0) return state

  return {
    ...state,
    totalAmount: String(Math.abs(total)),
  }
}

/** Build entries for create/update from split + standard header fields. */
export function buildEntriesForSave(input: BuildEntriesInput): TransactionEntryInput[] {
  const {
    categoryId = null,
    categoryPurpose = null,
    payeeValue = '',
    activeView = 'standard',
    notes = null,
  } = input
  const splitState = coerceSplitStateForCategoryPurpose(input.splitState, categoryPurpose)
  const isTransfer = resolveIsTransfer({ ...input, splitState })
  const view = activeView
  const systemPnl = resolveSystemPnlForPosting(input)
  const headerMerchant =
    payeeValue.trim() && !isPayeeTransferId(payeeValue) ? payeeValue.trim() : undefined
  const splitOptions = {
    systemPnl,
    categoryPurpose,
    headerPayee: headerMerchant,
  }

  if (isTransfer) {
    if (shouldPostFromSplitRows(splitState, { view, isTransfer: true })) {
      if (splitState.splits.some((split) => !splitIsTransfer(split))) {
        throw new Error('Transfer transactions cannot include category splits')
      }
      // Single transfer split may use a different destination magnitude (cross-unit / FX).
      if (
        !(allSplitsAreTransfers(splitState.splits) && splitState.splits.length === 1) &&
        !isSplitFormBalanced(splitState)
      ) {
        throw new Error('Splits must balance to the transaction total')
      }
      return splitsToEntries(splitState, splitOptions)
    }

    // Prefer an existing transfer split (may carry a different destination amount for FX).
    const withTransferSplit = seedTransferSplitsFromPayee(splitState, payeeValue)
    if (withTransferSplit.splits.length === 1 && splitIsTransfer(withTransferSplit.splits[0])) {
      const destinationAmount = Number(withTransferSplit.splits[0].amount)
      if (destinationAmount > 0) {
        return attachSingleNoteToEntries(splitsToEntries(withTransferSplit, splitOptions), notes)
      }
      // Split row present but empty — do not invent an equal-magnitude destination.
      throw new Error('Transfer requires an amount leaving and an amount received')
    }

    const collapsed = collapseSplitFormState(splitState, categoryId)
    const transferPayee = collapsed.transferPayee ?? payeeValue
    const destination = transferDestinationFromPayee(transferPayee)
    const amount = Number(splitState.totalAmount)
    if (!splitState.paymentAccount || !destination || !Number.isFinite(amount) || amount === 0) {
      throw new Error('Transfer requires from account, destination, and amount')
    }

    const magnitude = Math.abs(amount)
    return attachSingleNoteToEntries(
      splitsToEntries(
        {
          paymentAccount: splitState.paymentAccount,
          totalAmount: String(-magnitude),
          splits: [newTransferSplitDraft(destination, String(magnitude))],
        },
        splitOptions,
      ),
      notes,
    )
  }

  if (shouldPostFromSplitRows(splitState, { view, isTransfer: false })) {
    if (!isSplitFormBalanced(splitState)) {
      throw new Error('Splits must balance to the transaction total')
    }
    return splitsToEntries(splitState, splitOptions)
  }

  const collapsed = collapseSplitFormState(splitState, categoryId)
  if (!isSplitFormBalanced(collapsed.state)) {
    throw new Error('Splits must balance to the transaction total')
  }

  return attachSingleNoteToEntries(
    splitsToEntries(collapsed.state, {
      ...splitOptions,
      singleCategoryId: collapsed.categoryId,
    }),
    notes,
  )
}

export type SplitsToEntriesOptions = {
  singleCategoryId?: string | null
  systemPnl?: SystemPnlAccounts
  categoryPurpose?: Category['purpose'] | null
  accounts?: Account[]
  budgetId?: string | null
  /** Merchant on the header — copied onto the P&L leg for single-category posts. */
  headerPayee?: string | null
}

/** Merchant name from a payee picker value (excludes transfer-account ids). */
export function merchantPayeeFromValue(payeeValue: string | null | undefined): string | undefined {
  const trimmed = payeeValue?.trim()
  if (!trimmed || isPayeeTransferId(trimmed)) return undefined
  return trimmed
}

/**
 * True when allocate spending splits each have a merchant, and transfer splits have a destination.
 * Empty form (simple payment) is not allocate — caller checks header payee separately.
 */
export function allocateSplitsHaveCounterparties(splits: SplitDraft[]): boolean {
  if (splits.length === 0) return true
  return splits.every((split) => {
    if (splitIsTransfer(split)) return Boolean(transferDestinationFromPayee(split.payee))
    return Boolean(merchantPayeeFromValue(split.payee))
  })
}

/**
 * User-facing splits → balanced classical double-entry lines.
 *
 * - Payment leg: signed total on the user cash/liability account (no category).
 * - Category splits: opposite-signed legs on the system Income/Expense account + category tag.
 * - Transfer splits: destination account (unchanged).
 */
export function splitsToEntries(
  state: TransactionSplitFormState,
  options?: SplitsToEntriesOptions,
): TransactionEntryInput[] {
  const total = Number(state.totalAmount)
  if (!state.paymentAccount || !Number.isFinite(total) || Math.abs(total) < BALANCE_EPSILON) {
    throw new Error('Transaction requires a payment account and non-zero amount')
  }

  const singleCategoryId = options?.singleCategoryId ?? null
  const systemPnl = resolveSystemPnlForPosting({
    systemPnl: options?.systemPnl,
    accounts: options?.accounts,
    budgetId: options?.budgetId,
  })
  const categoryPurpose = options?.categoryPurpose ?? null
  const headerMerchant = merchantPayeeFromValue(options?.headerPayee)

  const requireSystemPnl = (): SystemPnlAccounts => {
    if (!systemPnl) {
      throw new Error(
        'Categorized posts require system Income/Expense accounts (Budget income / Budget expenses)',
      )
    }
    return systemPnl
  }

  if (state.splits.length === 0) {
    if (!singleCategoryId) {
      throw new Error('Assign a category or add splits before posting')
    }

    if (!headerMerchant) {
      throw new Error('Each categorized line needs a payee')
    }

    const pnl = requireSystemPnl()
    const magnitude = Math.abs(total)
    const categorySign = total < 0 ? magnitude : -magnitude
    const pnlAccount = pnlAccountForCategoryLeg(pnl, { paymentTotal: total, categoryPurpose })

    return [
      { account: state.paymentAccount, amount: total, sortOrder: 0 },
      {
        account: pnlAccount,
        amount: categorySign,
        category: singleCategoryId,
        sortOrder: 1,
        payee: headerMerchant,
      },
    ]
  }

  // Pure transfer splits may use a different destination magnitude (cross-unit / FX).
  // Category splits must still allocate the payment total.
  if (!allSplitsAreTransfers(state.splits)) {
    const allocated = splitAllocationTotal(state.splits)
    if (Math.abs(allocated - Math.abs(total)) > BALANCE_EPSILON) {
      throw new Error(`Splits must sum to ${Math.abs(total)} (got ${allocated})`)
    }
  }

  const categoryLegSign = total < 0 ? 1 : -1
  const transferLegSign = total < 0 ? 1 : -1

  const lines: TransactionEntryInput[] = [
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

      const splitNotes = split.notes.trim() || undefined
      lines.push({
        account,
        amount: transferLegSign * amount,
        sortOrder: sortOrder++,
        ...(splitNotes ? { notes: splitNotes } : {}),
      })
      continue
    }

    if (!split.category) {
      throw new Error('Each spending split needs a category')
    }

    const merchantPayee = merchantPayeeFromValue(split.payee)
    if (!merchantPayee) {
      throw new Error('Each spending split needs a payee')
    }

    const pnl = requireSystemPnl()
    const pnlAccount = pnlAccountForCategoryLeg(pnl, { paymentTotal: total, categoryPurpose })
    const splitNotes = split.notes.trim() || undefined
    lines.push({
      account: pnlAccount,
      amount: categoryLegSign * amount,
      category: split.category,
      payee: merchantPayee,
      sortOrder: sortOrder++,
      ...(splitNotes ? { notes: splitNotes } : {}),
    })
  }

  return lines
}

/** Unique merchant payees on allocate splits (excludes transfer destinations). */
export function merchantPayeesFromSplits(splits: SplitDraft[]): string[] {
  const names = new Set<string>()
  for (const split of splits) {
    if (splitIsTransfer(split)) continue
    const name = split.payee.trim()
    if (name && !isPayeeTransferId(name)) names.add(name)
  }
  return [...names]
}

/**
 * Header payee after an allocate save: single merchant → that name;
 * several → clear (register uses entry payees); none → leave unchanged (null sentinel).
 */
export function headerPayeeFromAllocateSplits(
  splits: SplitDraft[],
): string | null | undefined {
  const merchants = merchantPayeesFromSplits(splits)
  if (merchants.length === 1) return merchants[0]!
  if (merchants.length > 1) return null
  return undefined
}

export function splitFormFromEntries(entries: TransactionEntry[]): TransactionSplitFormState {
  const lines = entryInputsFromDocs(entries)

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
          newSplitDraft(
            toPayeeTransferId(positive.account),
            '',
            String(Math.abs(positive.amount)),
            positive.notes?.trim() || negative.notes?.trim() || '',
          ),
        ],
      }
    }
  }

  // Prefer uncategorized cash/liability leg (not a categorized P&L leg).
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

  // Classical DE: category tags live on the opposite-signed P&L (or legacy same-account) leg.
  const categorySplits: SplitDraft[] = lines
    .filter((line) => line.category && Math.sign(line.amount) !== paymentSign)
    .map((line) =>
      newSplitDraft(
        line.payee?.trim() || '',
        line.category!,
        String(Math.abs(line.amount)),
        line.notes?.trim() || '',
      ),
    )

  const transferSplits: SplitDraft[] = lines
    .filter((line) => !line.category && line.account !== paymentAccount)
    .map((line) =>
      newSplitDraft(
        toPayeeTransferId(line.account),
        '',
        String(Math.abs(line.amount)),
        line.notes?.trim() || '',
      ),
    )

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

  const lines = entryInputsFromDocs(entries)
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

/**
 * Keep the lone transfer split amount in sync when the transaction total changes.
 * Cross-unit transfers keep an independent destination amount.
 */
export function syncSingleTransferSplitAmount(
  state: TransactionSplitFormState,
  accounts?: Account[],
  payeeValue = '',
): TransactionSplitFormState {
  if (state.splits.length !== 1 || !splitIsTransfer(state.splits[0])) {
    return state
  }

  if (accounts && transferUnitsDiffer(state, accounts, payeeValue)) {
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
  if (options.view === 'swap') return false
  // Explicit split editor: always post from line rows (payee/category per line),
  // even when a lone row still covers the full total.
  if (options.view === 'split' && state.splits.length > 0) return true
  if (isCollapsibleSingleSplit(state)) return false
  if (state.splits.length > 1) return true
  if (hasEditableSplits(state)) return true
  return false
}

/**
 * Seed allocate rows when leaving the simple payment form (YNAB-style split).
 * Always creates at least two lines so the transaction is a true split with
 * payee-per-line — not a single collapsible category row.
 */
export function seedAllocateSplitsFromSimpleForm(options: {
  state: TransactionSplitFormState
  payee?: string
  categoryId?: string
  notes?: string
}): TransactionSplitFormState {
  const { state, categoryId = '', notes = '' } = options
  const payee =
    options.payee?.trim() && !isPayeeTransferId(options.payee) ? options.payee.trim() : ''

  if (state.splits.length >= 2) return state

  if (state.splits.length === 1) {
    return {
      ...state,
      splits: [...state.splits, newSplitDraft(payee)],
    }
  }

  // Leave amounts empty so "left to allocate" matches the payment total until the
  // user fills each line (payee + category/transfer + amount).
  return {
    ...state,
    splits: [newSplitDraft(payee, categoryId, '', notes), newSplitDraft(payee)],
  }
}

/** Whether standard-view amount should be locked because splits own the total. */
export function standardAmountLocked(
  state: TransactionSplitFormState,
  isTransfer: boolean,
): boolean {
  return hasEditableSplits(state) && !isTransfer
}
