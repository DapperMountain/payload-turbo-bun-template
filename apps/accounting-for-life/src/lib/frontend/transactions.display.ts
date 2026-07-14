import type { Account, Category, Transaction, TransactionEntry } from '@/types'
import {
  applyCategoryToEntries,
  storedDocsFromJoin,
  type TransactionEntryInput,
  type TransactionEntryView,
} from '@/collections/Transactions/lib/entries'
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

export function entriesFromTransaction(transaction: Transaction): TransactionEntryInput[] {
  return transactionEntries(transaction).map((entry, index) => ({
    account: getCollectionId(entry.account) ?? '',
    amount: entry.amount,
    category: getCollectionId(entry.category),
    sortOrder: entry.sortOrder ?? index,
  }))
}

export function entryInputsFromDocs(entries: TransactionEntry[]): TransactionEntryInput[] {
  return entries.map((entry, index) => ({
    account: getCollectionId(entry.account)!,
    amount: entry.amount,
    category: getCollectionId(entry.category),
    sortOrder: entry.sortOrder ?? index,
  }))
}

export type { TransactionEntryInput, TransactionEntryView } from '@/collections/Transactions/lib/entries'

export function transactionEntries(transaction: Transaction): TransactionEntry[] {
  const entries = transaction.entries

  if (Array.isArray(entries)) {
    return entries.map((line, index) => ({
      id: line.id ?? `line-${index}`,
      workspace: getCollectionId(transaction.workspace) ?? '',
      transaction: transaction.id,
      account: line.account,
      amount: line.amount,
      category: line.category ?? undefined,
      sortOrder: line.sortOrder ?? index,
      unit: '',
      updatedAt: '',
      createdAt: '',
    }))
  }

  const stored = storedDocsFromJoin(transaction.entryJoin)
  return stored
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

export function entryInputsFromDrafts(lines: SplitLineDraft[]): TransactionEntryInput[] {
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
  lines: TransactionEntryInput[],
  type: Transaction['type'],
  categoryId: string | null,
): TransactionEntryInput[] {
  return applyCategoryToEntries(lines, type, categoryId)
}

export type TransactionRegisterRow = {
  /** Unique register row key (transaction id + leg index when expanded). */
  id: string
  transactionId: string
  entryIndex: number
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

export function registerRowKey(transactionId: string, entryIndex: number): string {
  return `${transactionId}#${entryIndex}`
}

export function transactionIdFromRegisterRowKey(rowKey: string): string {
  const hash = rowKey.lastIndexOf('#')
  if (hash === -1) return rowKey
  return rowKey.slice(0, hash)
}

export function uniqueTransactionIdsFromRegisterRowKeys(rowKeys: Iterable<string>): string[] {
  return [...new Set([...rowKeys].map(transactionIdFromRegisterRowKey))]
}

export type RegisterRowsOptions = {
  /** Account detail view — show the leg for this account only. */
  accountId?: string | null
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
  lines: TransactionEntryInput[],
  primaryIdx: number,
  accountId: string,
): TransactionEntryInput[] {
  return lines.map((line, index) =>
    index === primaryIdx ? { ...line, account: accountId } : line,
  )
}

export function updatePrimaryAmountInLines(
  lines: TransactionEntryInput[],
  primaryIdx: number,
  newAmount: number,
): TransactionEntryInput[] {
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

export function registerRowFromEntry(
  transaction: Transaction,
  lines: TransactionEntry[],
  entryIndex: number,
  labels: TransactionDisplayLabels = emptyTransactionDisplayLabels,
): TransactionRegisterRow {
  const entry = lines[entryIndex]
  const category =
    transaction.type === 'transfer'
      ? categoryDisplayName(entry?.category, labels.categories)
      : registerCategoryLabel(transaction, labels)

  return {
    id: registerRowKey(transaction.id, entryIndex),
    transactionId: transaction.id,
    entryIndex,
    date: transaction.date ?? null,
    memo: transaction.memo ?? null,
    type: transaction.type,
    status: transaction.status,
    budgetId: getCollectionId(transaction.budget) ?? '',
    accountLabel: accountDisplayName(entry?.account, labels.accounts),
    primaryAccountId: getCollectionId(entry?.account) ?? '',
    categoryLabel: category,
    amount: entry?.amount ?? 0,
    entryCount: lines.length,
  }
}

export function registerRowsFromTransaction(
  transaction: Transaction,
  labels: TransactionDisplayLabels = emptyTransactionDisplayLabels,
  options?: RegisterRowsOptions,
): TransactionRegisterRow[] {
  const lines = transactionEntries(transaction)

  if (!lines.length) {
    return [
      {
        id: registerRowKey(transaction.id, 0),
        transactionId: transaction.id,
        entryIndex: 0,
        date: transaction.date ?? null,
        memo: transaction.memo ?? null,
        type: transaction.type,
        status: transaction.status,
        budgetId: getCollectionId(transaction.budget) ?? '',
        accountLabel: '—',
        primaryAccountId: '',
        categoryLabel: null,
        amount: 0,
        entryCount: 0,
      },
    ]
  }

  if (options?.accountId) {
    const scopedIndex = lines.findIndex(
      (entry) => getCollectionId(entry.account) === options.accountId,
    )
    const entryIndex = scopedIndex >= 0 ? scopedIndex : primaryEntryIndex(lines)
    return [registerRowFromEntry(transaction, lines, entryIndex, labels)]
  }

  if (transaction.type === 'transfer' && lines.length >= 2) {
    return lines.map((_, index) => registerRowFromEntry(transaction, lines, index, labels))
  }

  const primaryIndex = primaryEntryIndex(lines)
  return [registerRowFromEntry(transaction, lines, primaryIndex, labels)]
}

/** @deprecated Prefer {@link registerRowsFromTransaction} */
export function registerRowFromTransaction(
  transaction: Transaction,
  labels: TransactionDisplayLabels = emptyTransactionDisplayLabels,
): TransactionRegisterRow {
  return registerRowsFromTransaction(transaction, labels)[0]!
}

export function groupTransactionsByDate(
  transactions: Transaction[],
  labels: TransactionDisplayLabels = emptyTransactionDisplayLabels,
  options?: RegisterRowsOptions,
): { date: string; label: string; total: number; rows: TransactionRegisterRow[] }[] {
  const groups = new Map<string, TransactionRegisterRow[]>()

  for (const transaction of transactions) {
    const date = transactionDatePart(transaction.date) || 'unknown'
    const list = groups.get(date) ?? []
    list.push(...registerRowsFromTransaction(transaction, labels, options))
    groups.set(date, list)
  }

  return [...groups.entries()].map(([date, rows]) => ({
    date,
    label: date === 'unknown' ? '—' : new Date(`${date}T12:00:00`).toLocaleDateString(),
    total: rows.reduce((sum, row) => sum + row.amount, 0),
    rows: [...rows].sort((a, b) => sortTransactionDateTime(b.date, a.date)),
  }))
}
