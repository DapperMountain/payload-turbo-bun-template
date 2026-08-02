import type { Account, Transaction, TransactionEntry, Unit } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

import { isPayeeTransferId } from '@/lib/frontend/transaction-payee'
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
  category: string
  /** Optional merchant for this leg (fee / other lines). */
  payee: string
  notes: string
}

/** FX derived from leg amounts — no USD price required to log the trade. */
export type CompiledSwapFx = {
  quoteUnitId: string
  /** Null when reporting valuation is deferred (e.g. crypto↔crypto with no feed yet). */
  quoteToReportingRate: number | null
  /** Quote units per 1 native, keyed by unit id. */
  rateByUnitId: Map<string, number>
}

export function newSwapLegDraft(
  account = '',
  amount = '',
  category = '',
  notes = '',
  payee = '',
): SwapLegDraft {
  return {
    key: `swap-${crypto.randomUUID()}`,
    account,
    amount,
    category,
    payee,
    notes,
  }
}

export function accountUnitId(account: Account | undefined): string | null {
  if (!account) return null
  return getCollectionId(account.unit) ?? null
}

export function findAccount(accounts: Account[], accountId: string): Account | undefined {
  return accounts.find((account) => account.id === accountId)
}

export function unitCode(units: Unit[], unitId: string | null | undefined): string {
  if (!unitId) return ''
  return units.find((unit) => unit.id === unitId)?.code ?? ''
}

export function effectiveQuoteUnitId(
  quoteUnitId: string | null | undefined,
  reportingCurrencyId: string | null | undefined,
): string | null {
  return quoteUnitId ?? reportingCurrencyId ?? null
}

function nativeAmountByUnit(
  legs: SwapLegDraft[],
  accounts: Account[],
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const leg of legs) {
    const amount = Number(leg.amount)
    if (!leg.account || !Number.isFinite(amount)) continue
    const unitId = accountUnitId(findAccount(accounts, leg.account))
    if (!unitId) continue
    totals.set(unitId, (totals.get(unitId) ?? 0) + amount)
  }
  return totals
}

function unitsOnLegs(legs: SwapLegDraft[], accounts: Account[]): string[] {
  const ids = new Set<string>()
  for (const leg of legs) {
    if (!leg.account) continue
    const unitId = accountUnitId(findAccount(accounts, leg.account))
    if (unitId) ids.add(unitId)
  }
  return [...ids]
}

/** Prefer reporting when it appears; else the largest outflow (give) unit. */
function pickQuoteUnitId(
  unitIds: string[],
  amountByUnit: Map<string, number>,
  reportingCurrencyId: string | null | undefined,
): string {
  if (reportingCurrencyId && unitIds.includes(reportingCurrencyId)) {
    return reportingCurrencyId
  }

  let best = unitIds[0]!
  let bestOutflow = amountByUnit.get(best) ?? 0
  for (const unitId of unitIds) {
    const total = amountByUnit.get(unitId) ?? 0
    if (total < bestOutflow) {
      best = unitId
      bestOutflow = total
    }
  }
  return best
}

/**
 * Derive quote unit + per-unit rates from amounts alone.
 *
 * - If USD (reporting) is on the form, balance in USD and imply the other unit’s rate.
 * - If not (e.g. XRP↔XLM), balance in the give unit and imply the other; reporting stays unset.
 * - More than two distinct units cannot be fully implied yet.
 */
export function compileSwapFxFromAmounts(
  legs: SwapLegDraft[],
  accounts: Account[],
  reportingCurrencyId: string | null | undefined,
): CompiledSwapFx | null {
  const unitIds = unitsOnLegs(legs, accounts)
  if (unitIds.length === 0) return null

  const amountByUnit = nativeAmountByUnit(legs, accounts)

  if (unitIds.length === 1) {
    const quoteUnitId = unitIds[0]!
    return {
      quoteUnitId,
      quoteToReportingRate:
        reportingCurrencyId && quoteUnitId !== reportingCurrencyId ? null : null,
      rateByUnitId: new Map([[quoteUnitId, 1]]),
    }
  }

  if (unitIds.length > 2) {
    return null
  }

  const quoteUnitId = pickQuoteUnitId(unitIds, amountByUnit, reportingCurrencyId)
  const otherUnitId = unitIds.find((id) => id !== quoteUnitId)
  if (!otherUnitId) return null

  const quoteNative = amountByUnit.get(quoteUnitId) ?? 0
  const otherNative = amountByUnit.get(otherUnitId) ?? 0
  if (Math.abs(otherNative) < BALANCE_EPSILON) return null

  const otherRate = -quoteNative / otherNative
  if (!Number.isFinite(otherRate) || otherRate === 0) return null

  return {
    quoteUnitId,
    quoteToReportingRate:
      reportingCurrencyId && quoteUnitId !== reportingCurrencyId ? null : null,
    rateByUnitId: new Map([
      [quoteUnitId, 1],
      [otherUnitId, otherRate],
    ]),
  }
}

export function legNeedsFxRate(
  accountId: string,
  accounts: Account[],
  quoteUnitId: string | null | undefined,
): boolean {
  if (!quoteUnitId || !accountId) return false
  const unitId = accountUnitId(findAccount(accounts, accountId))
  return Boolean(unitId && unitId !== quoteUnitId)
}

export function resolveQuoteRatesPerLeg(
  legs: SwapLegDraft[],
  accounts: Account[],
  compiled: CompiledSwapFx | null,
): Array<number | null> {
  if (!compiled) return legs.map(() => null)

  return legs.map((leg) => {
    if (!leg.account) return null
    const unitId = accountUnitId(findAccount(accounts, leg.account))
    if (!unitId) return null
    return compiled.rateByUnitId.get(unitId) ?? null
  })
}

export function quoteAmountForLeg(
  leg: SwapLegDraft,
  accounts: Account[],
  quoteUnitId: string | null | undefined,
  quoteRateToQuote?: number | null,
): number | null {
  const amount = Number(leg.amount)
  if (!leg.account || !Number.isFinite(amount) || amount === 0) return null

  if (!legNeedsFxRate(leg.account, accounts, quoteUnitId)) {
    return amount
  }

  if (quoteRateToQuote == null || !Number.isFinite(quoteRateToQuote) || quoteRateToQuote === 0) {
    return null
  }
  return amount * quoteRateToQuote
}

export function swapQuoteTotal(
  legs: SwapLegDraft[],
  accounts: Account[],
  reportingCurrencyId: string | null | undefined,
): number | null {
  const compiled = compileSwapFxFromAmounts(legs, accounts, reportingCurrencyId)
  if (!compiled) return null

  const quoteRates = resolveQuoteRatesPerLeg(legs, accounts, compiled)
  let total = 0
  for (let index = 0; index < legs.length; index++) {
    const leg = legs[index]
    if (!leg) return null
    const quote = quoteAmountForLeg(leg, accounts, compiled.quoteUnitId, quoteRates[index])
    if (quote == null) return null
    total += quote
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

  const unitIds = unitsOnLegs(legs, accounts)
  if (unitIds.length <= 1) {
    const total = legs.reduce((sum, leg) => sum + Number(leg.amount), 0)
    return Math.abs(total) < BALANCE_EPSILON
  }

  const compiled = compileSwapFxFromAmounts(legs, accounts, reportingCurrencyId)
  if (!compiled) return false

  const total = swapQuoteTotal(legs, accounts, reportingCurrencyId)
  return total != null && Math.abs(total) < BALANCE_EPSILON
}

/**
 * Each swap/journal leg needs an account or merchant; categorized other-lines need a merchant.
 */
export function swapLegsHaveCounterparties(legs: SwapLegDraft[]): boolean {
  return legs.every((leg) => {
    const merchant = leg.payee.trim()
    const hasAccount = Boolean(leg.account.trim())
    if (!hasAccount && !merchant) return false
    if (leg.category.trim() && !merchant) return false
    return true
  })
}

export function swapLegsToEntries(
  legs: SwapLegDraft[],
  accounts: Account[],
  reportingCurrencyId: string | null | undefined,
): TransactionEntryInput[] {
  if (!isSwapFormBalanced(legs, accounts, reportingCurrencyId)) {
    throw new Error('Splits must balance')
  }

  if (!swapLegsHaveCounterparties(legs)) {
    throw new Error('Each line needs a payee or account')
  }

  const unitIds = unitsOnLegs(legs, accounts)
  const compiled =
    unitIds.length <= 1 ? null : compileSwapFxFromAmounts(legs, accounts, reportingCurrencyId)
  const quoteRates = compiled ? resolveQuoteRatesPerLeg(legs, accounts, compiled) : null

  return legs.map((leg, index) => {
    const amount = Number(leg.amount)
    const notes = leg.notes.trim() || undefined
    const payee = leg.payee.trim() || undefined
    const category = leg.category.trim() || undefined
    if (category && !payee) {
      throw new Error('Each categorized line needs a payee')
    }
    const needsFx = compiled
      ? legNeedsFxRate(leg.account, accounts, compiled.quoteUnitId)
      : false
    const fxRate = quoteRates?.[index]
    return {
      account: leg.account,
      amount,
      category,
      sortOrder: index,
      ...(needsFx && fxRate != null ? { fxRate } : {}),
      ...(payee ? { payee } : {}),
      ...(notes ? { notes } : {}),
    }
  })
}

export function transactionQuotePayloadFromLegs(
  legs: SwapLegDraft[],
  accounts: Account[],
  reportingCurrencyId: string | null | undefined,
): {
  quoteUnit: string | null
  quoteToReportingRate: number | null
} {
  const unitIds = unitsOnLegs(legs, accounts)
  if (unitIds.length <= 1) {
    return { quoteUnit: null, quoteToReportingRate: null }
  }

  const compiled = compileSwapFxFromAmounts(legs, accounts, reportingCurrencyId)
  if (!compiled) {
    return { quoteUnit: null, quoteToReportingRate: null }
  }

  if (!reportingCurrencyId || compiled.quoteUnitId === reportingCurrencyId) {
    return { quoteUnit: null, quoteToReportingRate: null }
  }

  return {
    quoteUnit: compiled.quoteUnitId,
    quoteToReportingRate: compiled.quoteToReportingRate,
  }
}

/** @deprecated Prefer transactionQuotePayloadFromLegs for Split saves. */
export function transactionQuotePayload(
  quoteUnitId: string | null | undefined,
  reportingCurrencyId: string | null | undefined,
  quoteToReportingRate: string | null | undefined,
): {
  quoteUnit: string | null
  quoteToReportingRate: number | null
} {
  const effectiveQuote = effectiveQuoteUnitId(quoteUnitId, reportingCurrencyId)
  if (!effectiveQuote || !reportingCurrencyId || effectiveQuote === reportingCurrencyId) {
    return { quoteUnit: null, quoteToReportingRate: null }
  }

  if (
    !quoteToReportingRate ||
    !Number.isFinite(Number(quoteToReportingRate)) ||
    Number(quoteToReportingRate) === 0
  ) {
    return { quoteUnit: effectiveQuote, quoteToReportingRate: null }
  }

  return {
    quoteUnit: effectiveQuote,
    quoteToReportingRate: Number(quoteToReportingRate),
  }
}

export function entriesToSwapLegs(
  entries: Array<
    Pick<TransactionEntry, 'account' | 'amount' | 'category' | 'fxRate' | 'notes' | 'payee'>
  >,
): SwapLegDraft[] {
  if (!entries.length) {
    return [newSwapLegDraft(), newSwapLegDraft()]
  }

  return entries.map((entry) =>
    newSwapLegDraft(
      getCollectionId(entry.account) ?? '',
      String(entry.amount),
      getCollectionId(entry.category) ?? '',
      entry.notes?.trim() || '',
      entry.payee?.trim() || '',
    ),
  )
}

/** Unique merchant payees on journal legs (for header sync / register). */
export function merchantPayeesFromSwapLegs(legs: SwapLegDraft[]): string[] {
  const names = new Set<string>()
  for (const leg of legs) {
    const name = leg.payee.trim()
    if (name) names.add(name)
  }
  return [...names]
}

/**
 * Soft header payee sync from journal/swap legs.
 * Multiple distinct merchants → clear the header (`null`). A merchant only on
 * fee/other lines is not promoted — return `undefined` so an existing exchange
 * header (e.g. Kraken) is left alone.
 */
export function headerPayeeFromSwapLegs(
  legs: SwapLegDraft[],
  accounts?: Account[],
): string | null | undefined {
  const merchants = merchantPayeesFromSwapLegs(legs)
  if (merchants.length > 1) return null
  if (merchants.length === 0) return undefined

  if (accounts) {
    const pair = detectSwapPairFromLegs(legs, accounts)
    if (pair && pair.otherIndexes.length > 0) {
      const pairMerchants = new Set<string>()
      for (const index of [pair.giveIndex, pair.receiveIndex]) {
        const name = legs[index]?.payee.trim()
        if (name) pairMerchants.add(name)
      }
      // Fee/other-line-only merchant — do not promote or clear the header.
      if (pairMerchants.size === 0) return undefined
    }
  }

  return merchants[0]!
}

export function resolveTypeFromSwapLegs(
  legs: SwapLegDraft[],
  accounts: Account[],
  /** Header payee — external names (DEX/exchange) force `transaction`, not `transfer`. */
  payeeValue?: string | null,
): Extract<Transaction['type'], 'transaction' | 'transfer'> {
  if (typeof payeeValue === 'string' && payeeValue.trim() !== '' && !isPayeeTransferId(payeeValue)) {
    return 'transaction'
  }

  for (const leg of legs) {
    if (leg.category || leg.payee.trim()) return 'transaction'
    const account = findAccount(accounts, leg.account)
    if (account && (account.classification === 'income' || account.classification === 'expense')) {
      return 'transaction'
    }
  }
  return 'transfer'
}

export type DetectedSwapPair = {
  /** Index of the outflow (give) leg. */
  giveIndex: number
  /** Index of the inflow (receive) leg. */
  receiveIndex: number
  /** Remaining leg indexes (fees, extras) in original order. */
  otherIndexes: number[]
}

/**
 * Indexes of swap “other lines” to show in the UI.
 *
 * Classical DE fees are cash + system P&L (no same-account twins), so every other
 * line is shown. Retained as a stable API for the swap editor / register panel.
 */
export function displayIndexesForSwapExtras(
  _legs: Array<Pick<SwapLegDraft, 'account' | 'amount' | 'category' | 'payee'>>,
  otherIndexes: number[],
): number[] {
  return otherIndexes
}

/** Single UI note for the swap pair — prefers give, else receive. */
export function swapPairNote(legs: SwapLegDraft[], pair: DetectedSwapPair): string {
  const give = legs[pair.giveIndex]?.notes?.trim() ?? ''
  if (give) return give
  return legs[pair.receiveIndex]?.notes?.trim() ?? ''
}

/**
 * Apply one swap note onto the give leg and clear the receive leg.
 * Leaves notes on other (non-pair) legs unchanged.
 */
export function applySwapPairNote(
  legs: SwapLegDraft[],
  pair: DetectedSwapPair,
  notes: string,
): SwapLegDraft[] {
  const trimmed = notes.trim()
  return legs.map((leg, index) => {
    if (index === pair.giveIndex) {
      return { ...leg, notes: trimmed }
    }
    if (index === pair.receiveIndex) {
      return { ...leg, notes: '' }
    }
    return leg
  })
}

/**
 * Give/receive legs are a wallet transfer or DEX trade — no budget category.
 * Merchant payees on the pair are allowed (e.g. receive side = DEX name).
 */
export function clearSwapPairCategories(
  legs: SwapLegDraft[],
  pair: DetectedSwapPair,
): SwapLegDraft[] {
  const pairIndexes = new Set([pair.giveIndex, pair.receiveIndex])
  let changed = false
  const next = legs.map((leg, index) => {
    if (!pairIndexes.has(index) || !leg.category) return leg
    changed = true
    return { ...leg, category: '' }
  })
  return changed ? next : legs
}

/** Resolve a pinned give/receive pair by stable leg keys (UI grouping). */
export function resolveSwapPairFromKeys(
  legs: SwapLegDraft[],
  keys: { giveKey: string; receiveKey: string },
): DetectedSwapPair | null {
  const giveIndex = legs.findIndex((leg) => leg.key === keys.giveKey)
  const receiveIndex = legs.findIndex((leg) => leg.key === keys.receiveKey)
  if (giveIndex < 0 || receiveIndex < 0 || giveIndex === receiveIndex) return null

  const giveAmount = Number(legs[giveIndex]?.amount)
  const receiveAmount = Number(legs[receiveIndex]?.amount)
  // Keep role labels aligned with signs when possible.
  let resolvedGive = giveIndex
  let resolvedReceive = receiveIndex
  if (Number.isFinite(giveAmount) && Number.isFinite(receiveAmount)) {
    if (giveAmount > 0 && receiveAmount < 0) {
      resolvedGive = receiveIndex
      resolvedReceive = giveIndex
    }
  }

  const pairIndexes = new Set([resolvedGive, resolvedReceive])
  return {
    giveIndex: resolvedGive,
    receiveIndex: resolvedReceive,
    otherIndexes: legs.map((_, index) => index).filter((index) => !pairIndexes.has(index)),
  }
}

/**
 * Find the primary give↔receive pair in a multi-leg journal (e.g. XRP/XLM + fee).
 * Prefers opposite-sign asset/liability legs on different units; falls back to
 * any opposite-sign pair on different accounts.
 */
export function detectSwapPairFromLegs(
  legs: SwapLegDraft[],
  accounts: Account[],
): DetectedSwapPair | null {
  type Candidate = { index: number; amount: number; accountId: string; unitId: string | null }
  const candidates: Candidate[] = []

  for (let index = 0; index < legs.length; index += 1) {
    const leg = legs[index]
    if (!leg?.account || leg.amount === '') continue
    const amount = Number(leg.amount)
    if (!Number.isFinite(amount) || amount === 0) continue
    const account = findAccount(accounts, leg.account)
    if (!account) continue
    if (account.classification !== 'asset' && account.classification !== 'liability') continue
    candidates.push({
      index,
      amount,
      accountId: leg.account,
      unitId: accountUnitId(account),
    })
  }

  if (candidates.length < 2) return null

  let best: { give: Candidate; receive: Candidate; score: number } | null = null

  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const a = candidates[i]!
      const b = candidates[j]!
      if (a.accountId === b.accountId) continue
      if (Math.sign(a.amount) === Math.sign(b.amount)) continue

      const give = a.amount < 0 ? a : b
      const receive = a.amount < 0 ? b : a
      if (give.amount >= 0 || receive.amount <= 0) continue

      const differentUnits = Boolean(
        give.unitId && receive.unitId && give.unitId !== receive.unitId,
      )
      // Prefer cross-unit pairs; score by combined magnitude so the trade beats tiny fees.
      const score =
        (differentUnits ? 1_000_000 : 0) + Math.abs(give.amount) + Math.abs(receive.amount)

      if (!best || score > best.score) {
        best = { give, receive, score }
      }
    }
  }

  if (!best) return null

  const pairIndexes = new Set([best.give.index, best.receive.index])
  const otherIndexes = legs
    .map((_, index) => index)
    .filter((index) => !pairIndexes.has(index))

  return {
    giveIndex: best.give.index,
    receiveIndex: best.receive.index,
    otherIndexes,
  }
}

/** Two opposite-signed account legs with no categories — a wallet transfer (any units). */
export function isWalletTransferEntries(
  entries: Array<Pick<TransactionEntry, 'account' | 'amount' | 'category' | 'fxRate'>>,
): boolean {
  if (entries.length !== 2) return false

  const first = entries[0]
  const second = entries[1]
  if (!first || !second) return false

  if (getCollectionId(first.category) || getCollectionId(second.category)) return false

  const accountA = getCollectionId(first.account)
  const accountB = getCollectionId(second.account)
  if (!accountA || !accountB || accountA === accountB) return false

  if (first.amount === 0 || second.amount === 0) return false
  if (Math.sign(first.amount) === Math.sign(second.amount)) return false

  return true
}

/**
 * Two-sided give/receive between asset/liability accounts (transfer or DEX swap).
 * Opens the exchange editor body — not the multi-line journal.
 */
export function isExchangeEntries(
  entries: Array<Pick<TransactionEntry, 'account' | 'amount' | 'category' | 'fxRate'>>,
  accounts: Account[],
): boolean {
  if (!isWalletTransferEntries(entries)) return false

  for (const entry of entries) {
    const accountId = getCollectionId(entry.account)
    if (!accountId) return false
    const account = findAccount(accounts, accountId)
    if (!account) return false
    if (account.classification !== 'asset' && account.classification !== 'liability') {
      return false
    }
  }

  return true
}

function unitIdsOnEntries(
  entries: Array<Pick<TransactionEntry, 'account' | 'amount' | 'category' | 'fxRate'>>,
  accounts: Account[],
): Set<string> {
  const unitIds = new Set<string>()
  for (const entry of entries) {
    const accountId = getCollectionId(entry.account)
    if (!accountId) continue
    const unitId = accountUnitId(findAccount(accounts, accountId))
    if (unitId) unitIds.add(unitId)
  }
  return unitIds
}

/**
 * Two-sided exchanges that use the exchange (give/receive) body — all units,
 * including cash↔holding (BTC→USD). Prefer {@link isExchangeEntries}.
 */
export function isSimpleTransferEntries(
  entries: Array<Pick<TransactionEntry, 'account' | 'amount' | 'category' | 'fxRate'>>,
  accounts: Account[],
  _reportingCurrencyId?: string | null,
): boolean {
  return isExchangeEntries(entries, accounts)
}

/** Multi-leg journals, fee legs, or other free-form N-account books (journal body). */
export function entriesPreferSwapView(
  entries: Array<Pick<TransactionEntry, 'account' | 'amount' | 'category' | 'fxRate'>>,
  accounts: Account[],
  _quoteUnitId?: string | null | undefined,
): boolean {
  if (entries.length < 2) return false

  // Two-sided wallet / DEX moves use the exchange body, not the journal.
  if (isExchangeEntries(entries, accounts)) return false

  // FX / multi-unit books always use the journal (even if they parse as splits).
  if (entries.some((entry) => entry.fxRate != null && entry.fxRate !== 1)) {
    return true
  }

  const unitIds = unitIdsOnEntries(entries, accounts)
  if (unitIds.size > 1) return true

  // Same-unit allocate (payment + category / transfer / system P&L) stays on payment.
  const form = normalizeSplitFormFromEntries(entries as TransactionEntry[])
  if (hasEditableSplits(form)) return false

  const accountIds = new Set(
    entries.map((entry) => getCollectionId(entry.account)).filter(Boolean),
  )
  if (accountIds.size >= 3) return true

  if (accountIds.size === 2 && entries.length === 2) return false

  return entries.length > 2
}

export function resolveTransactionDialogView(options: {
  entries: Array<Pick<TransactionEntry, 'account' | 'amount' | 'category' | 'fxRate'>>
  accounts: Account[]
  reportingCurrencyId: string | null | undefined
  quoteUnitId?: string | null
  preferred?: TransactionDialogView
}): TransactionDialogView {
  const quoteUnitId = effectiveQuoteUnitId(options.quoteUnitId, options.reportingCurrencyId)

  if (options.preferred === 'swap' || options.preferred === 'split' || options.preferred === 'standard') {
    if (options.preferred === 'swap') return 'swap'
    if (
      options.preferred !== 'split' &&
      entriesPreferSwapView(options.entries, options.accounts, quoteUnitId)
    ) {
      return 'swap'
    }
    if (options.preferred === 'split') return 'split'
  }

  if (entriesPreferSwapView(options.entries, options.accounts, quoteUnitId)) {
    return 'swap'
  }

  const form = normalizeSplitFormFromEntries(options.entries as TransactionEntry[])
  return hasEditableSplits(form) ? 'split' : 'standard'
}

export function defaultSwapLegsForBudget(accounts: Account[], budgetId: string): SwapLegDraft[] {
  const scoped = accounts.filter(
    (account) =>
      getCollectionId(account.budget) === budgetId &&
      account.classification !== 'income' &&
      account.classification !== 'expense' &&
      !account.isSystemDefault,
  )
  const first = scoped[0]?.id ?? accounts[0]?.id ?? ''
  const second = scoped[1]?.id ?? accounts[1]?.id ?? first
  return [newSwapLegDraft(first), newSwapLegDraft(second)]
}

/** Stable [give, receive, …others] order for the simple swap editor and journal seed. */
export function orderLegsGiveReceiveFirst(
  legs: SwapLegDraft[],
  accounts: Account[],
): SwapLegDraft[] {
  const pair = detectSwapPairFromLegs(legs, accounts)
  if (!pair) return legs
  const give = legs[pair.giveIndex]
  const receive = legs[pair.receiveIndex]
  if (!give || !receive) return legs
  return [
    give,
    receive,
    ...pair.otherIndexes
      .map((index) => legs[index])
      .filter((leg): leg is SwapLegDraft => Boolean(leg)),
  ]
}
