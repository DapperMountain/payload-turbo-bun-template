export type JournalLineInput = {
  amount: number
  category?: string | null
}

const BALANCE_EPSILON = 1e-9

/**
 * Ensures journal lines sum to zero (double-entry balance).
 *
 * @throws {Error} When the signed amounts do not net to zero.
 */
export function validateJournalLinesBalance(lines: JournalLineInput[]): void {
  if (lines.length < 2) {
    throw new Error('A journal entry requires at least two lines')
  }

  const total = lines.reduce((sum, line) => sum + line.amount, 0)

  if (Math.abs(total) > BALANCE_EPSILON) {
    throw new Error(`Journal lines must sum to zero (got ${total})`)
  }
}

/**
 * Transfer entries must not assign spending categories to lines.
 */
export function validateTransferLines(type: string, lines: JournalLineInput[]): void {
  if (type !== 'transfer') {
    return
  }

  const hasCategory = lines.some((line) => line.category != null && line.category !== '')

  if (hasCategory) {
    throw new Error('Transfer journal entries cannot include category assignments')
  }
}
