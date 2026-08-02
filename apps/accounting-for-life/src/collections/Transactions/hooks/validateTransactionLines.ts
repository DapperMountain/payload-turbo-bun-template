import {
  effectiveQuoteUnitId,
  quoteAmountForEntry,
  resolveEntryFx,
} from '@/collections/Transactions/lib/fx'
import { isPayeeTransferId } from '@/lib/frontend/transaction-payee'

export type TransactionLineInput = {
  amount: number
  category?: string | null
}

export type TransactionBalanceLine = {
  account: string
  amount: number
  fxRate?: number | null
  category?: string | null
  payee?: string | null
}

export type TransactionBalanceContext = {
  reportingUnitId: string | null | undefined
  /** Transaction quote unit; defaults to reporting when omitted. */
  quoteUnitId?: string | null
  /** Reporting per 1 quote when quote ≠ reporting. */
  quoteToReportingRate?: number | null
  /** Account id → unit id */
  unitByAccountId: Record<string, string>
}

const BALANCE_EPSILON = 1e-9

function validateNativeBalance(lines: { amount: number }[]): void {
  const total = lines.reduce((sum, line) => sum + line.amount, 0)

  if (Math.abs(total) > BALANCE_EPSILON) {
    throw new Error(`Transaction entries must sum to zero (got ${total})`)
  }
}

function validateQuoteBalance(
  lines: TransactionBalanceLine[],
  context: TransactionBalanceContext,
  quoteUnitId: string,
): void {
  let quoteTotal = 0

  for (const line of lines) {
    const unitId = context.unitByAccountId[line.account]
    if (!unitId) {
      throw new Error(`Missing unit for account ${line.account}`)
    }

    quoteTotal += quoteAmountForEntry({
      amount: line.amount,
      unitId,
      quoteUnitId,
      fxRate: line.fxRate,
    })

    // Snapshot reporting when possible; null reportingAmount is allowed (deferred valuation).
    resolveEntryFx({
      amount: line.amount,
      unitId,
      reportingUnitId: context.reportingUnitId,
      quoteUnitId,
      fxRate: line.fxRate,
      quoteToReportingRate: context.quoteToReportingRate,
    })
  }

  if (Math.abs(quoteTotal) > BALANCE_EPSILON) {
    throw new Error(`Transaction quote amounts must sum to zero (got ${quoteTotal})`)
  }
}

/**
 * Ensures transaction legs are double-entry balanced.
 *
 * - Same-unit journals: Σ native `amount` ≈ 0
 * - Mixed-unit journals: Σ quote amounts ≈ 0 (via rate-to-quote on each cross-quote leg)
 */
export function validateTransactionLinesBalance(
  lines: TransactionBalanceLine[] | TransactionLineInput[],
  context?: TransactionBalanceContext,
): void {
  if (lines.length < 2) {
    throw new Error('A transaction requires at least two entries')
  }

  if (!context) {
    validateNativeBalance(lines)
    return
  }

  const unitIds = lines.map((line) => {
    if (!('account' in line) || !line.account) {
      throw new Error('Each entry requires an account for balance validation')
    }
    const unitId = context.unitByAccountId[line.account]
    if (!unitId) {
      throw new Error(`Missing unit for account ${line.account}`)
    }
    return unitId
  })

  const uniqueUnits = new Set(unitIds)
  if (uniqueUnits.size === 1) {
    validateNativeBalance(lines)

    const onlyUnit = unitIds[0]!
    const quoteUnitId = effectiveQuoteUnitId({
      quoteUnitId: context.quoteUnitId,
      reportingUnitId: context.reportingUnitId,
    })

    // Same-unit journal still needs FX/snapshot fields when quote/reporting differ from that unit.
    if (quoteUnitId && onlyUnit !== quoteUnitId) {
      validateQuoteBalance(lines as TransactionBalanceLine[], context, quoteUnitId)
    } else if (
      quoteUnitId &&
      context.reportingUnitId &&
      quoteUnitId !== context.reportingUnitId
    ) {
      for (const line of lines as TransactionBalanceLine[]) {
        resolveEntryFx({
          amount: line.amount,
          unitId: onlyUnit,
          reportingUnitId: context.reportingUnitId,
          quoteUnitId,
          fxRate: line.fxRate,
          quoteToReportingRate: context.quoteToReportingRate,
        })
      }
    }

    return
  }

  const quoteUnitId = effectiveQuoteUnitId({
    quoteUnitId: context.quoteUnitId,
    reportingUnitId: context.reportingUnitId,
  })

  if (!quoteUnitId) {
    throw new Error(
      'Mixed-unit journals require a transaction quote unit or workspace reporting currency',
    )
  }

  validateQuoteBalance(lines as TransactionBalanceLine[], context, quoteUnitId)
}

/**
 * Transfer transactions must not assign spending categories to legs.
 *
 * YNAB: asset ↔ asset moves are "category not needed".
 */
export function validateTransferEntries(type: string, lines: TransactionLineInput[]): void {
  if (type !== 'transfer') {
    return
  }

  const hasCategory = lines.some((line) => line.category != null && line.category !== '')

  if (hasCategory) {
    throw new Error('Transfer transactions cannot include category assignments')
  }
}

function lineHasMerchantOrCategory(line: {
  category?: string | null
  payee?: string | null
}): boolean {
  return Boolean((line.category != null && line.category !== '') || line.payee?.trim())
}

function merchantFromPayee(payee: string | null | undefined): string | null {
  const trimmed = payee?.trim()
  if (!trimmed || isPayeeTransferId(trimmed)) return null
  return trimmed
}

/**
 * Posted `type: transaction` books: every categorized (P&L/fee) leg needs a
 * merchant `payee`. Header alone is not enough. Cash/wallet legs stay account-only.
 * Transfers use destination accounts instead.
 *
 * `headerPayee` is accepted for call-site compatibility; it does not satisfy
 * categorized legs.
 */
export function validateTransactionCounterparty(
  type: string,
  _headerPayee: string | null | undefined,
  lines: Array<{ payee?: string | null; category?: string | null }>,
): void {
  if (type !== 'transaction') return

  for (const line of lines) {
    if (line.category == null || line.category === '') continue
    if (!merchantFromPayee(line.payee ?? null)) {
      throw new Error('Each categorized line needs a payee')
    }
  }
}

/**
 * Every leg needs an account. Bare amount-only lines (no category, no merchant payee)
 * are only allowed when they balance a transfer-like or categorized P&L counter-leg
 * (opposite sign, different account).
 */
export function validateEntryCompleteness(
  lines: Array<{
    account?: string | null
    amount: number
    category?: string | null
    payee?: string | null
  }>,
): void {
  for (const line of lines) {
    if (!line.account?.trim()) {
      throw new Error('Each entry requires an account')
    }
  }

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!
    if (line.amount === 0) continue
    if (lineHasMerchantOrCategory(line)) continue

    const hasBalancingCounter = lines.some(
      (other, otherIndex) =>
        otherIndex !== index &&
        Boolean(other.account?.trim()) &&
        other.account !== line.account &&
        other.amount !== 0 &&
        Math.sign(other.amount) !== Math.sign(line.amount),
    )
    if (hasBalancingCounter) continue

    throw new Error(
      'Each entry needs an account plus a category or payee (or a matching transfer / P&L counter-leg)',
    )
  }
}
