import { isCashLikeAccount, isHoldingAccount } from '@/lib/frontend/account-subtype'
import { directionFromSignedAmount } from '@/lib/frontend/transaction-amount-direction'
import { findAccount, isCreditCardAccount } from '@/lib/frontend/transaction-payee'
import { accountUnitId, isWalletTransferEntries } from '@/lib/frontend/transaction-swap'
import type { Account, Category, Transaction, TransactionEntry } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

/** User-facing economic label (derived or overridden). */
export type EconomicKind =
  | 'transfer'
  | 'withdraw'
  | 'deposit'
  | 'buy'
  | 'sell'
  | 'spend'
  | 'earn'
  | 'other'

/**
 * Persisted when cash↔holding is ambiguous (buy vs sell vs internal transfer).
 * Null / omitted = derive.
 */
export type EconomicKindOverride = 'buy' | 'sell' | 'transfer'

export type EconomicKindResult = {
  kind: EconomicKind
  confidence: 'certain' | 'ambiguous'
  /** Shown when the user should confirm (cash↔holding). */
  choices?: EconomicKindOverride[]
}

type EntryLike = Pick<TransactionEntry, 'account' | 'amount' | 'category'>

function categoryPurpose(
  categoryRef: EntryLike['category'],
  categories: Category[],
): Category['purpose'] | null {
  const id = getCollectionId(categoryRef)
  if (!id) return null
  return categories.find((category) => category.id === id)?.purpose ?? null
}

function guessBuyOrSell(cash: Account, holding: Account, entries: EntryLike[]): EconomicKindOverride {
  const cashId = cash.id
  const cashLeg = entries.find((entry) => getCollectionId(entry.account) === cashId)
  if (!cashLeg) return 'buy'

  // Cash leaving → buying a holding; cash arriving → selling a holding.
  return cashLeg.amount < 0 ? 'buy' : 'sell'
}

/**
 * Derive an economic label from journal legs.
 *
 * Certain: spend/earn (categories), internal transfer, withdraw/deposit (with viewpoint).
 * Ambiguous: cash-like ↔ holding — guess buy/sell but expose choices for confirmation.
 */
export function deriveEconomicKind(options: {
  entries: EntryLike[]
  accounts: Account[]
  categories?: Category[]
  reportingCurrencyId?: string | null
  /** Account register context — rewrites transfer → withdraw/deposit. */
  viewpointAccountId?: string | null
  /** Amount on the viewpoint leg (for withdraw/deposit). */
  viewpointAmount?: number | null
  override?: EconomicKindOverride | null
  transactionType?: Transaction['type']
}): EconomicKindResult {
  const {
    entries,
    accounts,
    categories = [],
    reportingCurrencyId,
    viewpointAccountId,
    viewpointAmount,
    override,
    transactionType,
  } = options

  if (override === 'buy' || override === 'sell' || override === 'transfer') {
    return applyViewpoint(
      { kind: override, confidence: 'certain' },
      viewpointAccountId,
      viewpointAmount,
      accounts,
    )
  }

  if (transactionType === 'opening_balance' || transactionType === 'adjustment') {
    return { kind: 'other', confidence: 'certain' }
  }

  const purposes = entries
    .map((entry) => categoryPurpose(entry.category, categories))
    .filter((purpose): purpose is Category['purpose'] => purpose != null)

  if (purposes.includes('income')) {
    return { kind: 'earn', confidence: 'certain' }
  }
  if (purposes.includes('expense') || purposes.includes('credit_card_payment')) {
    // Card spend still lands as everyday spending in the register.
    if (purposes.includes('expense')) {
      return { kind: 'spend', confidence: 'certain' }
    }
  }

  if (!isWalletTransferEntries(entries as TransactionEntry[])) {
    // Categorized spending without purpose lookup still counts as spend when any category exists.
    if (entries.some((entry) => getCollectionId(entry.category))) {
      return { kind: 'spend', confidence: 'certain' }
    }
    return { kind: 'other', confidence: 'certain' }
  }

  const accountIds = entries
    .map((entry) => getCollectionId(entry.account))
    .filter((id): id is string => Boolean(id))
  const first = findAccount(accounts, accountIds[0] ?? '')
  const second = findAccount(accounts, accountIds[1] ?? '')
  if (!first || !second) {
    return applyViewpoint(
      { kind: 'transfer', confidence: 'certain' },
      viewpointAccountId,
      viewpointAmount,
      accounts,
    )
  }

  const cash =
    (isCashLikeAccount(first) && first) || (isCashLikeAccount(second) && second) || null
  const holding =
    (isHoldingAccount(first) && first) || (isHoldingAccount(second) && second) || null
  const involvesCard = isCreditCardAccount(first) || isCreditCardAccount(second)

  if (involvesCard) {
    return applyViewpoint(
      { kind: 'transfer', confidence: 'certain' },
      viewpointAccountId,
      viewpointAmount,
      accounts,
    )
  }

  if (cash && holding) {
    const guessed = guessBuyOrSell(cash, holding, entries)
    return {
      kind: guessed,
      confidence: 'ambiguous',
      choices: ['buy', 'sell', 'transfer'],
    }
  }

  // Same-unit or crypto↔crypto (or two cash accounts): internal move.
  const unitA = accountUnitId(first)
  const unitB = accountUnitId(second)
  const touchesReporting =
    Boolean(reportingCurrencyId) &&
    (unitA === reportingCurrencyId || unitB === reportingCurrencyId)

  if (unitA && unitB && unitA !== unitB && touchesReporting && !cash && !holding) {
    // e.g. EUR checking ↔ USD checking — treat as transfer (FX), not buy/sell.
    return applyViewpoint(
      { kind: 'transfer', confidence: 'certain' },
      viewpointAccountId,
      viewpointAmount,
      accounts,
    )
  }

  return applyViewpoint(
    { kind: 'transfer', confidence: 'certain' },
    viewpointAccountId,
    viewpointAmount,
    accounts,
  )
}

function applyViewpoint(
  result: EconomicKindResult,
  viewpointAccountId: string | null | undefined,
  viewpointAmount: number | null | undefined,
  accounts: Account[],
): EconomicKindResult {
  if (result.kind !== 'transfer' || !viewpointAccountId) return result
  if (viewpointAmount == null || !Number.isFinite(viewpointAmount) || viewpointAmount === 0) {
    return result
  }

  const account = findAccount(accounts, viewpointAccountId)
  const direction = directionFromSignedAmount(viewpointAmount, account)
  return {
    ...result,
    kind: direction === 'outflow' ? 'withdraw' : 'deposit',
  }
}

/** Resolve override from a transaction document (generated field may lag). */
export function economicKindOverrideFromTransaction(
  transaction: Pick<Transaction, 'id'> & { economicKind?: string | null },
): EconomicKindOverride | null {
  const value = transaction.economicKind
  if (value === 'buy' || value === 'sell' || value === 'transfer') return value
  return null
}
