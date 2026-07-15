import { resolveEntryFx } from '@/collections/Transactions/lib/fx'

export type TransactionLineInput = {
  amount: number
  category?: string | null
}

export type TransactionBalanceLine = {
  account: string
  amount: number
  fxRate?: number | null
  category?: string | null
}

export type TransactionBalanceContext = {
  reportingUnitId: string | null | undefined
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

function validateReportingBalance(
  lines: TransactionBalanceLine[],
  context: TransactionBalanceContext,
): void {
  let reportingTotal = 0

  for (const line of lines) {
    const unitId = context.unitByAccountId[line.account]
    if (!unitId) {
      throw new Error(`Missing unit for account ${line.account}`)
    }

    const fx = resolveEntryFx({
      amount: line.amount,
      unitId,
      reportingUnitId: context.reportingUnitId,
      fxRate: line.fxRate,
    })

    reportingTotal += fx.reportingAmount ?? 0
  }

  if (Math.abs(reportingTotal) > BALANCE_EPSILON) {
    throw new Error(
      `Transaction reporting amounts must sum to zero (got ${reportingTotal})`,
    )
  }
}

/**
 * Ensures transaction legs are double-entry balanced.
 *
 * - Same-unit journals: Σ native `amount` ≈ 0
 * - Mixed-unit journals: Σ `reportingAmount` ≈ 0 (via {@link resolveEntryFx})
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
    return
  }

  validateReportingBalance(lines as TransactionBalanceLine[], context)
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
