export type TransactionLineInput = {
  amount: number
  category?: string | null
}

const BALANCE_EPSILON = 1e-9

/**
 * Ensures transaction legs sum to zero (double-entry balance).
 */
export function validateTransactionLinesBalance(lines: TransactionLineInput[]): void {
  if (lines.length < 2) {
    throw new Error('A transaction requires at least two entries')
  }

  const total = lines.reduce((sum, line) => sum + line.amount, 0)

  if (Math.abs(total) > BALANCE_EPSILON) {
    throw new Error(`Transaction entries must sum to zero (got ${total})`)
  }
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
