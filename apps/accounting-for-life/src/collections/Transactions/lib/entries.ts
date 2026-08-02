import type { Transaction, TransactionEntry } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

/** Write payload for one ledger leg (virtual `entries` on create/update). */
export type TransactionEntryInput = {
  account: string
  amount: number
  category?: string | null
  /** Optional merchant payee for this leg (fee lines, split spending). */
  payee?: string | null
  /** Optional note for this leg; register bubbles it when only one entry has notes. */
  notes?: string | null
  sortOrder?: number
  /**
   * Reporting-currency units per 1 unit of `amount` when the account unit
   * differs from the workspace reporting currency.
   */
  fxRate?: number | null
}

/** Read shape returned on `transactions.entries` after `shapeTransactionEntriesOnRead`. */
export type TransactionEntryView = TransactionEntryInput & {
  id: string
  reportingAmount?: number | null
}

/** When exactly one entry has notes, that note is the transaction-level display note. */
export function bubbledEntryNotes(
  entries: Array<{ notes?: string | null }>,
): string | null {
  const noted = entries
    .map((entry) => entry.notes?.trim() ?? '')
    .filter((note) => note.length > 0)
  return noted.length === 1 ? noted[0]! : null
}

export function entriesHaveNotes(entries: Array<{ notes?: string | null }>): boolean {
  return entries.some((entry) => Boolean(entry.notes?.trim()))
}

/**
 * Put a single UI note onto the best display leg (categorized, else last counterparty),
 * clearing notes on other legs.
 */
export function attachSingleNoteToEntries(
  lines: TransactionEntryInput[],
  notes: string | null | undefined,
): TransactionEntryInput[] {
  const trimmed = notes?.trim() ?? ''
  if (!lines.length) return lines

  if (!trimmed) {
    return lines.map((line) => ({ ...line, notes: undefined }))
  }

  const categorizedIdx = lines.findIndex((line) => Boolean(line.category))
  const preferredIdx = categorizedIdx >= 0 ? categorizedIdx : Math.max(lines.length - 1, 0)

  return lines.map((line, index) =>
    index === preferredIdx ? { ...line, notes: trimmed } : { ...line, notes: undefined },
  )
}

export function normalizeEntryInputs(lines: TransactionEntryInput[]): TransactionEntryInput[] {
  return lines.map((line) => ({
    ...line,
    account: typeof line.account === 'string' ? line.account : (line.account as { id: string }).id,
    category:
      line.category == null
        ? undefined
        : typeof line.category === 'string'
          ? line.category
          : (line.category as { id: string }).id,
  }))
}

export function entryViewsFromStoredDocs(docs: TransactionEntry[]): TransactionEntryView[] {
  return docs.map((entry, index) => ({
    id: entry.id,
    account: getCollectionId(entry.account) ?? '',
    amount: entry.amount,
    category: getCollectionId(entry.category),
    payee: entry.payee?.trim() || undefined,
    notes: entry.notes ?? undefined,
    sortOrder: entry.sortOrder ?? index,
    fxRate: entry.fxRate,
    reportingAmount: entry.reportingAmount,
  }))
}

export function storedDocsFromJoin(
  join: Transaction['entryJoin'] | undefined,
): TransactionEntry[] {
  if (!join || typeof join !== 'object' || !('docs' in join)) return []
  return (join.docs ?? []).filter(
    (doc): doc is TransactionEntry => typeof doc === 'object' && doc !== null,
  )
}

/**
 * Assign a category on update.
 *
 * Classical DE: payment cash/liability leg stays uncategorized; category tags the
 * opposite-signed P&L (other-account) leg. Legacy same-account offsets are still
 * recognized so older rows can be re-categorized before rewrite.
 */
export function applyCategoryToEntries(
  lines: TransactionEntryInput[],
  type: Transaction['type'],
  categoryId: string | null,
  options?: { payee?: string | null },
): TransactionEntryInput[] {
  if (type === 'transfer') {
    return lines
  }

  if (!categoryId) {
    return lines.map((line) => ({ ...line, category: undefined }))
  }

  const merchant = options?.payee?.trim() || undefined
  const withCategory = (line: TransactionEntryInput): TransactionEntryInput => ({
    ...line,
    category: categoryId,
    ...(merchant && !line.payee?.trim() ? { payee: merchant } : {}),
  })

  const hasCategorized = lines.some((line) => line.category)

  if (hasCategorized) {
    return lines.map((line) => (line.category ? withCategory(line) : line))
  }

  const sorted = [...lines].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const payment = sorted.find((line) => line.amount !== 0) ?? sorted[0]
  if (!payment) return lines

  const paymentSign = Math.sign(payment.amount) || -1

  // Prefer opposite-sign other-account legs (classical cash + P&L).
  const pnlIndexes = new Set(
    lines.flatMap((line, index) =>
      line.account !== payment.account &&
      line.amount !== 0 &&
      Math.sign(line.amount) !== paymentSign
        ? [index]
        : [],
    ),
  )

  if (pnlIndexes.size > 0) {
    return lines.map((line, index) => (pnlIndexes.has(index) ? withCategory(line) : line))
  }

  // Legacy: opposite-sign same-account offset.
  const offsetIndexes = new Set(
    lines.flatMap((line, index) =>
      line.account === payment.account &&
      line.amount !== 0 &&
      Math.sign(line.amount) !== paymentSign
        ? [index]
        : [],
    ),
  )

  if (offsetIndexes.size > 0) {
    return lines.map((line, index) => (offsetIndexes.has(index) ? withCategory(line) : line))
  }

  // Fallback: categorize every non-payment leg (multi-account posts).
  let taggedPayment = false
  return lines.map((line) => {
    if (!taggedPayment && line.account === payment.account && line.amount === payment.amount) {
      taggedPayment = true
      return line
    }
    if (line.amount === 0) return line
    return withCategory(line)
  })
}