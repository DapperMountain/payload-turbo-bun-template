import type { Account, Category, Transaction, TransactionEntry } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'
import { sortTransactionDateTime, transactionDatePart } from '@/lib/frontend/transaction-datetime'

export type TransactionDisplayLabels = {
  accounts: Record<string, string>
  categories: Record<string, string>
}

export const emptyTransactionDisplayLabels: TransactionDisplayLabels = {
  accounts: {},
  categories: {},
}

export function accountDisplayName(
  account: string | Account | null | undefined,
  labels: Record<string, string>,
): string {
  if (!account) return '—'
  if (typeof account === 'object') return account.name
  return labels[account] ?? '—'
}

export function categoryDisplayName(
  category: string | Category | null | undefined,
  labels: Record<string, string>,
): string | null {
  if (!category) return null
  if (typeof category === 'object') {
    return category.emoji ? `${category.emoji} ${category.name}` : category.name
  }
  return labels[category] ?? null
}

export type PostingLineInput = {
  account: string
  amount: number
  category?: string | null
  sortOrder?: number
}

export function transactionEntries(transaction: Transaction): TransactionEntry[] {
  const entries = transaction.entries
  if (!entries || typeof entries !== 'object' || !('docs' in entries)) return []
  return (entries.docs ?? []).filter(
    (doc): doc is TransactionEntry => typeof doc === 'object' && doc !== null,
  )
}

export function postingLinesFromEntries(entries: TransactionEntry[]): PostingLineInput[] {
  return entries.map((entry, index) => ({
    account: getCollectionId(entry.account)!,
    amount: entry.amount,
    category: getCollectionId(entry.category),
    sortOrder: entry.sortOrder ?? index,
  }))
}

export function registerCategoryLabel(
  transaction: Transaction,
  labels: TransactionDisplayLabels,
): string | null {
  const lines = transactionEntries(transaction)
  const names = [
    ...new Set(
      lines
        .map((line) => categoryDisplayName(line.category, labels.categories))
        .filter((name): name is string => Boolean(name)),
    ),
  ]

  if (names.length === 1) return names[0]!
  if (names.length === 2) return names.join(' · ')
  if (names.length > 2) return `${names[0]} · +${names.length - 1}`

  return null
}

export type SplitLineDraft = {
  key: string
  account: string
  amount: string
  category: string
}

export function splitDraftsFromPostingLines(lines: PostingLineInput[]): SplitLineDraft[] {
  return lines.map((line, index) => ({
    key: `line-${index}`,
    account: line.account,
    amount: String(line.amount),
    category: line.category ?? '',
  }))
}

export function splitDraftsFromEntries(entries: TransactionEntry[]): SplitLineDraft[] {
  return splitDraftsFromPostingLines(postingLinesFromEntries(entries))
}

export function postingLinesFromDrafts(lines: SplitLineDraft[]): PostingLineInput[] {
  return lines
    .filter((line) => line.account && line.amount !== '')
    .map((line, index) => ({
      account: line.account,
      amount: Number(line.amount),
      category: line.category || undefined,
      sortOrder: index,
    }))
}

export function linesBalanceAmount(lines: SplitLineDraft[]): number {
  return lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0)
}

export function serializeSplitDrafts(lines: SplitLineDraft[]): string {
  return JSON.stringify(
    lines.map((line) => ({
      account: line.account,
      amount: line.amount,
      category: line.category,
    })),
  )
}

export function newSplitLineDraft(accountId = ''): SplitLineDraft {
  return {
    key: `line-${crypto.randomUUID()}`,
    account: accountId,
    amount: '',
    category: '',
  }
}

export function applyCategoryToLines(
  lines: PostingLineInput[],
  type: Transaction['type'],
  categoryId: string | null,
): PostingLineInput[] {
  if (type === 'transfer') {
    return lines
  }

  const hasCategorized = lines.some((line) => line.category)

  if (hasCategorized) {
    return lines.map((line) =>
      line.category ? { ...line, category: categoryId ?? undefined } : line,
    )
  }

  let applied = false
  return lines.map((line) => {
    if (!applied && line.amount !== 0) {
      applied = true
      return { ...line, category: categoryId ?? undefined }
    }
    return line
  })
}

export type TransactionRegisterRow = {
  id: string
  date: string | null
  memo: string | null
  type: Transaction['type']
  status: Transaction['status']
  budgetId: string
  accountLabel: string
  primaryAccountId: string
  categoryLabel: string | null
  amount: number
  entryCount: number
}

export function primaryEntryIndex(entries: TransactionEntry[]): number {
  if (!entries.length) return 0

  const categorizedIdx = entries.findIndex((entry) => entry.category)
  if (categorizedIdx >= 0) return categorizedIdx

  let best = 0
  for (let index = 1; index < entries.length; index++) {
    if (Math.abs(entries[index].amount) > Math.abs(entries[best].amount)) {
      best = index
    }
  }

  return best
}

export function updatePrimaryAccountInLines(
  lines: PostingLineInput[],
  primaryIdx: number,
  accountId: string,
): PostingLineInput[] {
  return lines.map((line, index) =>
    index === primaryIdx ? { ...line, account: accountId } : line,
  )
}

export function updatePrimaryAmountInLines(
  lines: PostingLineInput[],
  primaryIdx: number,
  newAmount: number,
): PostingLineInput[] {
  if (!lines.length) return lines

  const next = lines.map((line) => ({ ...line }))
  const previousAmount = next[primaryIdx]?.amount ?? 0
  const delta = newAmount - previousAmount

  next[primaryIdx] = { ...next[primaryIdx], amount: newAmount }

  if (next.length === 2) {
    const otherIdx = primaryIdx === 0 ? 1 : 0
    next[otherIdx] = { ...next[otherIdx], amount: (next[otherIdx]?.amount ?? 0) - delta }
    return next
  }

  let targetIdx = -1
  for (let index = 0; index < next.length; index++) {
    if (index === primaryIdx) continue
    if (
      targetIdx < 0 ||
      Math.abs(next[index].amount) > Math.abs(next[targetIdx].amount)
    ) {
      targetIdx = index
    }
  }

  if (targetIdx >= 0) {
    next[targetIdx] = { ...next[targetIdx], amount: (next[targetIdx]?.amount ?? 0) - delta }
  }

  return next
}

export function registerRowFromTransaction(
  transaction: Transaction,
  labels: TransactionDisplayLabels = emptyTransactionDisplayLabels,
): TransactionRegisterRow {
  const lines = transactionEntries(transaction)
  const primaryIndex = primaryEntryIndex(lines)
  const primary = lines[primaryIndex]

  const account = accountDisplayName(primary?.account, labels.accounts)
  const category = registerCategoryLabel(transaction, labels)

  const amount = primary?.amount ?? 0

  return {
    id: transaction.id,
    date: transaction.date ?? null,
    memo: transaction.memo ?? null,
    type: transaction.type,
    status: transaction.status,
    budgetId: getCollectionId(transaction.budget) ?? '',
    accountLabel: account,
    primaryAccountId: getCollectionId(primary?.account) ?? '',
    categoryLabel: category,
    amount,
    entryCount: lines.length,
  }
}

export function groupTransactionsByDate(
  transactions: Transaction[],
  labels: TransactionDisplayLabels = emptyTransactionDisplayLabels,
): { date: string; label: string; total: number; rows: TransactionRegisterRow[] }[] {
  const groups = new Map<string, TransactionRegisterRow[]>()

  for (const transaction of transactions) {
    const date = transactionDatePart(transaction.date) || 'unknown'
    const list = groups.get(date) ?? []
    list.push(registerRowFromTransaction(transaction, labels))
    groups.set(date, list)
  }

  return [...groups.entries()].map(([date, rows]) => ({
    date,
    label: date === 'unknown' ? '—' : new Date(`${date}T12:00:00`).toLocaleDateString(),
    total: rows.reduce((sum, row) => sum + row.amount, 0),
    rows: [...rows].sort((a, b) => sortTransactionDateTime(b.date, a.date)),
  }))
}
