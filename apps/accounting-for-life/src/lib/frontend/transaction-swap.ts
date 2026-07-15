import type { Account, Transaction, TransactionEntry } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

import type { TransactionEntryInput } from '@/lib/frontend/transactions.display'
import {
  hasEditableSplits,
  normalizeSplitFormFromEntries,
  type TransactionDialogView,
} from '@/lib/frontend/transaction-splits'

const BALANCE_EPSILON = 1e-9

export type SwapLegDraft = {
  key: string
  account: string
  /** Signed amount in the account unit. */
  amount: string
  /** Reporting units per 1 account unit; required when unit ≠ reporting currency. */
  fxRate: string
  category: string
}

export function newSwapLegDraft(
  account = '',
  amount = '',
  fxRate = '',
  category = '',
): SwapLegDraft {
  return {
    key: `swap-${crypto.randomUUID()}`,
    account,
    amount,
    fxRate,
    category,
  }
}

export function accountUnitId(account: Account | undefined): string | null {
  if (!account) return null
  return getCollectionId(account.unit) ?? null
}

export function findAccount(accounts: Account[], accountId: string): Account | undefined {
  return accounts.find((account) => account.id === accountId)
}

export function legNeedsFxRate(
  accountId: string,
  accounts: Account[],
  reportingCurrencyId: string | null | undefined,
): boolean {
  if (!reportingCurrencyId || !accountId) return false
  const unitId = accountUnitId(findAccount(accounts, accountId))
  return Boolean(unitId && unitId !== reportingCurrencyId)
}

export function reportingAmountForLeg(
  leg: SwapLegDraft,
  accounts: Account[],
  reportingCurrencyId: string | null | undefined,
): number | null {
  const amount = Number(leg.amount)
  if (!leg.account || !Number.isFinite(amount) || amount === 0) return null

  if (!legNeedsFxRate(leg.account, accounts, reportingCurrencyId)) {
    return amount
  }

  const rate = Number(leg.fxRate)
  if (!Number.isFinite(rate) || rate === 0) return null
  return amount * rate
}

export function swapReportingTotal(
  legs: SwapLegDraft[],
  accounts: Account[],
  reportingCurrencyId: string | null | undefined,
): number | null {
  let total = 0
  for (const leg of legs) {
    const reporting = reportingAmountForLeg(leg, accounts, reportingCurrencyId)
    if (reporting == null) return null
    total += reporting
  }
  return total
}

export function isSwapFormBalanced(
  legs: SwapLegDraft[],
  accounts: Account[],
  reportingCurrencyId: string | null | undefined,
): boolean {
  if (legs.length < 2) return false
  if (legs.some((leg) => !leg.account || !Number.isFinite(Number(leg.amount)) || Number(leg.amount) === 0)) {
    return false
  }
  if (
    legs.some(
      (leg) =>
        legNeedsFxRate(leg.account, accounts, reportingCurrencyId) &&
        (!leg.fxRate || !Number.isFinite(Number(leg.fxRate)) || Number(leg.fxRate) === 0),
    )
  ) {
    return false
  }

  const total = swapReportingTotal(legs, accounts, reportingCurrencyId)
  return total != null && Math.abs(total) < BALANCE_EPSILON
}

export function swapLegsToEntries(
  legs: SwapLegDraft[],
  accounts: Account[],
  reportingCurrencyId: string | null | undefined,
): TransactionEntryInput[] {
  if (!isSwapFormBalanced(legs, accounts, reportingCurrencyId)) {
    throw new Error('Swap legs must balance in reporting currency')
  }

  return legs.map((leg, index) => {
    const amount = Number(leg.amount)
    const needsFx = legNeedsFxRate(leg.account, accounts, reportingCurrencyId)
    return {
      account: leg.account,
      amount,
      category: leg.category || undefined,
      sortOrder: index,
      ...(needsFx ? { fxRate: Number(leg.fxRate) } : {}),
    }
  })
}

export function entriesToSwapLegs(
  entries: Array<Pick<TransactionEntry, 'account' | 'amount' | 'category' | 'fxRate'>>,
): SwapLegDraft[] {
  if (!entries.length) {
    return [newSwapLegDraft(), newSwapLegDraft()]
  }

  return entries.map((entry) =>
    newSwapLegDraft(
      getCollectionId(entry.account) ?? '',
      String(entry.amount),
      entry.fxRate != null && entry.fxRate !== 1 ? String(entry.fxRate) : '',
      getCollectionId(entry.category) ?? '',
    ),
  )
}

export function resolveTypeFromSwapLegs(
  legs: SwapLegDraft[],
  accounts: Account[],
): Extract<Transaction['type'], 'transaction' | 'transfer'> {
  for (const leg of legs) {
    if (leg.category) return 'transaction'
    const account = findAccount(accounts, leg.account)
    if (account && (account.classification === 'income' || account.classification === 'expense')) {
      return 'transaction'
    }
  }
  return 'transfer'
}

/** Multi-currency journals, fee legs, or other free-form N-account books. */
export function entriesPreferSwapView(
  entries: Array<Pick<TransactionEntry, 'account' | 'amount' | 'category' | 'fxRate'>>,
  accounts: Account[],
  reportingCurrencyId: string | null | undefined,
): boolean {
  if (entries.length < 2) return false

  if (entries.some((entry) => entry.fxRate != null && entry.fxRate !== 1)) {
    return true
  }

  const unitIds = new Set<string>()
  for (const entry of entries) {
    const accountId = getCollectionId(entry.account)
    if (!accountId) continue
    const unitId = accountUnitId(findAccount(accounts, accountId))
    if (unitId) unitIds.add(unitId)
  }
  if (unitIds.size > 1) return true

  const accountIds = new Set(
    entries.map((entry) => getCollectionId(entry.account)).filter(Boolean),
  )
  if (accountIds.size >= 3) return true

  const form = normalizeSplitFormFromEntries(entries as TransactionEntry[])
  if (hasEditableSplits(form)) return false
  if (accountIds.size === 2 && entries.length === 2) return false

  return entries.length > 2
}

export function resolveTransactionDialogView(options: {
  entries: Array<Pick<TransactionEntry, 'account' | 'amount' | 'category' | 'fxRate'>>
  accounts: Account[]
  reportingCurrencyId: string | null | undefined
  preferred?: TransactionDialogView
}): TransactionDialogView {
  if (options.preferred === 'swap' || options.preferred === 'split' || options.preferred === 'standard') {
    if (options.preferred === 'swap') return 'swap'
    if (
      options.preferred !== 'split' &&
      entriesPreferSwapView(options.entries, options.accounts, options.reportingCurrencyId)
    ) {
      return 'swap'
    }
    if (options.preferred === 'split') return 'split'
  }

  if (entriesPreferSwapView(options.entries, options.accounts, options.reportingCurrencyId)) {
    return 'swap'
  }

  const form = normalizeSplitFormFromEntries(options.entries as TransactionEntry[])
  return hasEditableSplits(form) ? 'split' : 'standard'
}

export function defaultSwapLegsForBudget(accounts: Account[], budgetId: string): SwapLegDraft[] {
  const scoped = accounts.filter((account) => getCollectionId(account.budget) === budgetId)
  const first = scoped[0]?.id ?? accounts[0]?.id ?? ''
  const second = scoped[1]?.id ?? accounts[1]?.id ?? first
  return [newSwapLegDraft(first), newSwapLegDraft(second)]
}
