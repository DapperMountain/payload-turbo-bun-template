import type { Account, Category, Transaction, TransactionEntry, Unit } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

import {
  buildEntriesForSave,
  hasEditableSplits,
  splitFormFromEntries,
  splitIsTransfer,
  transferDestinationFromSplitState,
  transferUnitsDiffer,
  type TransactionDialogView,
  type TransactionSplitFormState,
} from '@/lib/frontend/transaction-splits'
import {
  accountUnitId,
  compileSwapFxFromAmounts,
  defaultSwapLegsForBudget,
  entriesPreferSwapView,
  entriesToSwapLegs,
  findAccount,
  isExchangeEntries,
  newSwapLegDraft,
  orderLegsGiveReceiveFirst,
  swapLegsToEntries,
  transactionQuotePayloadFromLegs,
  unitCode,
  type SwapLegDraft,
} from '@/lib/frontend/transaction-swap'
import {
  isPayeeTransferId,
  toPayeeTransferId,
  transferDestinationFromPayee,
} from '@/lib/frontend/transaction-payee'
import type { TransactionEntryInput } from '@/lib/frontend/transactions.display'

/** Consumer editor body — not a user-facing tab. */
export type TransactionEditorLayout = 'payment' | 'exchange' | 'journal'

export function entryInputsToJournalLegs(lines: TransactionEntryInput[]): SwapLegDraft[] {
  return lines.map((line) =>
    newSwapLegDraft(
      line.account,
      String(line.amount),
      typeof line.category === 'string' ? line.category : '',
      line.notes?.trim() || '',
      line.payee?.trim() || '',
    ),
  )
}

export function journalLegsToEntryLike(
  legs: SwapLegDraft[],
): Array<Pick<TransactionEntry, 'account' | 'amount' | 'category' | 'fxRate'>> {
  return legs
    .filter((leg) => leg.account && leg.amount !== '')
    .map((leg) => ({
      account: leg.account,
      amount: Number(leg.amount) || 0,
      category: leg.category || null,
      fxRate: null,
    }))
}

export function splitStateToJournalLegs(options: {
  splitState: TransactionSplitFormState
  categoryId?: string | null
  categoryPurpose?: Category['purpose'] | null
  payeeValue?: string
  isTransfer?: boolean
  notes?: string | null
  accounts?: Account[]
  budgetId?: string | null
}): SwapLegDraft[] {
  const lines = buildEntriesForSave({
    splitState: options.splitState,
    categoryId: options.categoryId,
    categoryPurpose: options.categoryPurpose,
    payeeValue: options.payeeValue,
    activeView: 'standard',
    isTransfer: options.isTransfer,
    notes: options.notes,
    accounts: options.accounts,
    budgetId: options.budgetId,
  })
  return entryInputsToJournalLegs(lines)
}

export type JournalToAllocateResult =
  | {
      ok: true
      splitState: TransactionSplitFormState
      displayCategoryId: string
    }
  | { ok: false; reason: 'cannot_allocate' }

/** Project journal legs into allocate form; fails for FX / free-form multi-account books. */
export function journalLegsToSplitState(
  legs: SwapLegDraft[],
  accounts: Account[],
  reportingCurrencyId: string | null | undefined,
): JournalToAllocateResult {
  const entries = journalLegsToEntryLike(legs)
  if (entries.length < 2) {
    return { ok: false, reason: 'cannot_allocate' }
  }

  if (entriesPreferSwapView(entries, accounts, reportingCurrencyId)) {
    return { ok: false, reason: 'cannot_allocate' }
  }

  const form = splitFormFromEntries(entries as TransactionEntry[])
  if (!form.paymentAccount || !form.totalAmount) {
    return { ok: false, reason: 'cannot_allocate' }
  }

  const categorySplit = form.splits.find(
    (split) => !splitIsTransfer(split) && Boolean(split.category),
  )
  const onlySplit = form.splits[0]
  const displayCategoryId =
    form.splits.length === 1 && onlySplit && !splitIsTransfer(onlySplit)
      ? (onlySplit.category ?? '')
      : (categorySplit?.category ?? '')

  return {
    ok: true,
    splitState: form,
    displayCategoryId,
  }
}

/**
 * Which editor body to show for an existing transaction.
 * Legacy `preferred` (`split` / `swap`) is a soft hint only when the layout is ambiguous.
 */
export function resolveEditorLayout(options: {
  entries: Array<Pick<TransactionEntry, 'account' | 'amount' | 'category' | 'fxRate'>>
  accounts: Account[]
  reportingCurrencyId: string | null | undefined
  preferred?: TransactionDialogView
}): TransactionEditorLayout {
  if (isExchangeEntries(options.entries, options.accounts)) {
    return 'exchange'
  }

  if (entriesPreferSwapView(options.entries, options.accounts, options.reportingCurrencyId)) {
    return 'journal'
  }

  // Allocate splits (payment + category / transfer lines): stay on payment body.
  const form = splitFormFromEntries(options.entries as TransactionEntry[])
  if (hasEditableSplits(form)) {
    return 'payment'
  }

  // Soft hint: deep-link asked for journal only when we would otherwise show payment.
  if (options.preferred === 'swap' || options.preferred === 'split') {
    return 'journal'
  }

  return 'payment'
}

/** @deprecated Prefer {@link resolveEditorLayout} — true when layout is journal. */
export function shouldExpandTransactionLines(options: {
  entries: Array<Pick<TransactionEntry, 'account' | 'amount' | 'category' | 'fxRate'>>
  accounts: Account[]
  reportingCurrencyId: string | null | undefined
  preferred?: TransactionDialogView
}): boolean {
  return resolveEditorLayout(options) === 'journal'
}

/** Header type for the exchange body: account payee → transfer; DEX/name → transaction. */
export function resolveExchangeTransactionType(
  payeeValue: string,
): Extract<Transaction['type'], 'transaction' | 'transfer'> {
  return isPayeeTransferId(payeeValue) ? 'transfer' : 'transaction'
}

/**
 * Post give/receive legs from exchange form state.
 * Uses the receive account from the transfer split (or account payee), so DEX
 * trades can keep an external header payee while posting two wallet legs.
 */
export function buildExchangeFormPosting(options: {
  splitState: TransactionSplitFormState
  payeeValue?: string
  notes?: string | null
  accounts: Account[]
  reportingCurrencyId: string | null | undefined
}): {
  lines: TransactionEntryInput[]
  quoteUnit: string | null
  quoteToReportingRate: number | null
} {
  const destination =
    transferDestinationFromSplitState(options.splitState) ??
    transferDestinationFromPayee(options.payeeValue ?? '')
  if (!destination) {
    throw new Error('Exchange requires a receive account')
  }

  return buildSimpleFormPosting({
    splitState: options.splitState,
    payeeValue: toPayeeTransferId(destination),
    isTransfer: true,
    notes: options.notes,
    accounts: options.accounts,
    reportingCurrencyId: options.reportingCurrencyId,
  })
}

export function journalLegsFromEntries(
  entries: Array<Pick<TransactionEntry, 'account' | 'amount' | 'category' | 'fxRate'>>,
): SwapLegDraft[] {
  return entriesToSwapLegs(entries)
}

export function seedJournalLegsFromSimpleForm(options: {
  splitState: TransactionSplitFormState
  categoryId?: string | null
  categoryPurpose?: Category['purpose'] | null
  payeeValue?: string
  isTransfer?: boolean
  notes?: string | null
  accounts: Account[]
  budgetId?: string | null
}): SwapLegDraft[] {
  try {
    return orderLegsGiveReceiveFirst(splitStateToJournalLegs(options), options.accounts)
  } catch {
    if (options.budgetId) {
      return defaultSwapLegsForBudget(options.accounts, options.budgetId)
    }
    return [newSwapLegDraft(), newSwapLegDraft()]
  }
}

/** Entries (+ optional quote fields) for the collapsed simple form, including cross-unit transfers. */
export function buildSimpleFormPosting(options: {
  splitState: TransactionSplitFormState
  categoryId?: string | null
  categoryPurpose?: Category['purpose'] | null
  payeeValue?: string
  isTransfer?: boolean
  /** Use `split` while the allocate editor is open (payee per line). */
  activeView?: TransactionDialogView
  notes?: string | null
  accounts: Account[]
  reportingCurrencyId: string | null | undefined
}): {
  lines: TransactionEntryInput[]
  quoteUnit: string | null
  quoteToReportingRate: number | null
} {
  const payeeValue = options.payeeValue ?? ''
  const isTransfer = Boolean(options.isTransfer)
  const budgetId =
    options.splitState.paymentAccount &&
    getCollectionId(
      options.accounts.find((account) => account.id === options.splitState.paymentAccount)?.budget,
    )

  const lines = buildEntriesForSave({
    splitState: options.splitState,
    categoryId: options.categoryId,
    categoryPurpose: options.categoryPurpose,
    payeeValue,
    activeView: options.activeView ?? 'standard',
    isTransfer,
    notes: options.notes,
    accounts: options.accounts,
    budgetId: budgetId ?? undefined,
  })

  if (isTransfer && transferUnitsDiffer(options.splitState, options.accounts, payeeValue)) {
    const legs = entryInputsToJournalLegs(lines)
    return {
      lines: swapLegsToEntries(legs, options.accounts, options.reportingCurrencyId),
      ...transactionQuotePayloadFromLegs(legs, options.accounts, options.reportingCurrencyId),
    }
  }

  return { lines, quoteUnit: null, quoteToReportingRate: null }
}

/** Short FX summary for exchange / cross-unit give→receive forms. */
export function transferImpliedRateSummary(options: {
  splitState: TransactionSplitFormState
  accounts: Account[]
  units: Unit[]
  payeeValue?: string
  reportingCurrencyId: string | null | undefined
}): { impliedRate: string; reportingDeferred: boolean } | null {
  const payeeValue = options.payeeValue ?? ''
  const destinationId =
    transferDestinationFromSplitState(options.splitState) ??
    transferDestinationFromPayee(payeeValue)
  if (!destinationId) return null

  const paymentUnit = accountUnitId(
    findAccount(options.accounts, options.splitState.paymentAccount),
  )
  const receivedUnit = accountUnitId(findAccount(options.accounts, destinationId))
  if (!paymentUnit || !receivedUnit || paymentUnit === receivedUnit) return null

  try {
    const legs = splitStateToJournalLegs({
      splitState: options.splitState,
      payeeValue: toPayeeTransferId(destinationId),
      isTransfer: true,
    })
    const compiled = compileSwapFxFromAmounts(legs, options.accounts, options.reportingCurrencyId)
    if (!compiled || compiled.rateByUnitId.size < 2) return null

    const leaving = Math.abs(Number(options.splitState.totalAmount) || 0)
    const received = Math.abs(Number(options.splitState.splits[0]?.amount) || 0)
    if (!(leaving > 0) || !(received > 0)) return null

    const fromCode = unitCode(options.units, paymentUnit) || 'from'
    const toCode = unitCode(options.units, receivedUnit) || 'to'
    const rate = received / leaving
    const rounded = Math.round(rate * 1e8) / 1e8

    return {
      impliedRate: `${rounded} ${toCode} per 1 ${fromCode}`,
      reportingDeferred: Boolean(
        options.reportingCurrencyId &&
          compiled.quoteUnitId !== options.reportingCurrencyId &&
          compiled.quoteToReportingRate == null,
      ),
    }
  } catch {
    return null
  }
}
