import type { Transaction, TransactionEntry } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

/** Write payload for one ledger leg (virtual `entries` on create/update). */
export type TransactionEntryInput = {
  account: string
  amount: number
  category?: string | null
  sortOrder?: number
}

/** Read shape returned on `transactions.entries` after `shapeTransactionEntriesOnRead`. */
export type TransactionEntryView = TransactionEntryInput & {
  id: string
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
    sortOrder: entry.sortOrder ?? index,
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
 * Matches `splitsToEntries`: payment cash leg stays uncategorized; category goes on the
 * opposite-sign same-account offset leg (expense debit / income credit).
 */
export function applyCategoryToEntries(
  lines: TransactionEntryInput[],
  type: Transaction['type'],
  categoryId: string | null,
): TransactionEntryInput[] {
  if (type === 'transfer') {
    return lines
  }

  if (!categoryId) {
    return lines.map((line) => ({ ...line, category: undefined }))
  }

  const hasCategorized = lines.some((line) => line.category)

  if (hasCategorized) {
    return lines.map((line) =>
      line.category ? { ...line, category: categoryId } : line,
    )
  }

  const sorted = [...lines].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const payment = sorted.find((line) => line.amount !== 0) ?? sorted[0]
  if (!payment) return lines

  const paymentSign = Math.sign(payment.amount) || -1
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
    return lines.map((line, index) =>
      offsetIndexes.has(index) ? { ...line, category: categoryId } : line,
    )
  }

  // Fallback: categorize every non-payment leg (multi-account posts).
  let taggedPayment = false
  return lines.map((line) => {
    if (!taggedPayment && line.account === payment.account && line.amount === payment.amount) {
      taggedPayment = true
      return line
    }
    if (line.amount === 0) return line
    return { ...line, category: categoryId }
  })
}