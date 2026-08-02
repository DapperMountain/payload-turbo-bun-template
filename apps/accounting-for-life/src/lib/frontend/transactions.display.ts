import type { Account, Category, Transaction, TransactionEntry } from '@/types'
import {
  applyCategoryToEntries,
  bubbledEntryNotes,
  storedDocsFromJoin,
  type TransactionEntryInput,
  type TransactionEntryView,
} from '@/collections/Transactions/lib/entries'
import { getCollectionId } from '@/utils/getCollectionId'
import { isPayeeTransferId } from '@/lib/frontend/transaction-payee'
import { sortTransactionDateTime, transactionDatePart } from '@/lib/frontend/transaction-datetime'
import { attachNewestFirstRunningBalances } from '@/lib/ledger/account-balance'

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
    payee: entry.payee?.trim() || undefined,
    notes: entry.notes ?? undefined,
    sortOrder: entry.sortOrder ?? index,
    fxRate: entry.fxRate,
  }))
}

export function entryInputsFromDocs(entries: TransactionEntry[]): TransactionEntryInput[] {
  return entries.map((entry, index) => ({
    account: getCollectionId(entry.account)!,
    amount: entry.amount,
    category: getCollectionId(entry.category),
    payee: entry.payee?.trim() || undefined,
    sortOrder: entry.sortOrder ?? index,
    notes: entry.notes ?? undefined,
    fxRate: entry.fxRate,
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
      payee: line.payee?.trim() || undefined,
      notes: line.notes ?? undefined,
      sortOrder: line.sortOrder ?? index,
      fxRate: line.fxRate,
      unit: '',
      updatedAt: '',
      createdAt: '',
    }))
  }

  const stored = storedDocsFromJoin(transaction.entryJoin)
  return stored
}

/** Multi-account N-leg books (swap + fee, baskets) — not a same-account allocate split. */
export function isMultiAccountJournal(
  entries: Array<Pick<TransactionEntry, 'account'>>,
): boolean {
  if (entries.length <= 2) return false
  const accountIds = new Set(
    entries
      .map((entry) => getCollectionId(entry.account))
      .filter((id): id is string => Boolean(id)),
  )
  return accountIds.size > 1
}

export function registerCategoryLabel(
  transaction: Transaction,
  labels: TransactionDisplayLabels,
): string | null {
  const lines = transactionEntries(transaction)

  // Multi-account journals (swap + fee, baskets, …) may categorize one leg only —
  // that fee/category is not the row's category in the register.
  if (isMultiAccountJournal(lines)) {
    return null
  }

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

/** Unique merchant payees stored on entry lines (not transfer destinations). */
export function merchantPayeesFromEntries(
  entries: Array<Pick<TransactionEntry, 'payee'>>,
): string[] {
  const names = new Set<string>()
  for (const entry of entries) {
    const name = entry.payee?.trim()
    if (name && !isPayeeTransferId(name)) names.add(name)
  }
  return [...names]
}

/**
 * Register payee column: prefer entry merchant payees, then header merchant,
 * else null (transfer presentation / untitled).
 *
 * Multi-merchant allocate/journal rows join names (`A · B`). Exchange / swap+fee
 * books still show a single counterparty when the header or one entry merchant
 * is set (e.g. Kraken) — blanking those rows made swaps look untitled.
 */
export function registerPayeeLabel(transaction: Transaction): string | null {
  const lines = transactionEntries(transaction)
  const fromEntries = merchantPayeesFromEntries(lines)

  if (fromEntries.length === 1) return fromEntries[0]!
  if (fromEntries.length === 2) return fromEntries.join(' · ')
  if (fromEntries.length > 2) return `${fromEntries[0]} · +${fromEntries.length - 1}`

  const header = transaction.payee?.trim()
  if (header && !isPayeeTransferId(header)) return header
  return null
}

export function hasMultipleEntryPayees(transaction: Transaction): boolean {
  return merchantPayeesFromEntries(transactionEntries(transaction)).length > 1
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
  options?: { payee?: string | null },
): TransactionEntryInput[] {
  return applyCategoryToEntries(lines, type, categoryId, options)
}

export type TransactionRegisterRow = {
  /** Unique register row key (transaction id + leg index when expanded). */
  id: string
  transactionId: string
  entryIndex: number
  date: string | null
  payee: string | null
  notes: string | null
  type: Transaction['type']
  status: Transaction['status']
  budgetId: string
  accountLabel: string
  primaryAccountId: string
  categoryLabel: string | null
  amount: number
  entryCount: number
  /** Posted running balance after this row (account register, newest-first). */
  runningBalance?: number
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

function accountClassification(
  entry: TransactionEntry,
  accountsById?: Map<string, Account['classification']>,
): Account['classification'] | null {
  const accountId = getCollectionId(entry.account)
  if (!accountId) return null
  if (accountsById?.has(accountId)) return accountsById.get(accountId) ?? null
  if (typeof entry.account === 'object' && entry.account && 'classification' in entry.account) {
    return (entry.account as Account).classification
  }
  return null
}

function isBalanceSheetClassification(
  classification: Account['classification'] | null,
): boolean {
  return classification === 'asset' || classification === 'liability' || classification === 'equity'
}

export function primaryEntryIndex(
  entries: TransactionEntry[],
  accounts?: Account[],
): number {
  if (!entries.length) return 0

  const accountsById = accounts
    ? new Map(accounts.map((account) => [account.id, account.classification]))
    : undefined

  // Prefer asset/liability cash legs over income/expense P&L legs.
  const balanceSheetIdx = entries.findIndex((entry) =>
    isBalanceSheetClassification(accountClassification(entry, accountsById)),
  )
  if (balanceSheetIdx >= 0) return balanceSheetIdx

  // Prefer the uncategorized payment leg over a categorized P&L tag leg.
  const cashIdx = entries.findIndex((entry) => !entry.category)
  if (cashIdx >= 0) return cashIdx

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

/** Prefer the cash (uncategorized / balance-sheet) leg when an account appears on multiple legs. */
export function entryIndexForAccount(
  entries: TransactionEntry[],
  accountId: string,
  accounts?: Account[],
): number {
  const matches = entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => getCollectionId(entry.account) === accountId)

  if (!matches.length) return primaryEntryIndex(entries, accounts)

  const cash = matches.find(({ entry }) => !entry.category)
  if (cash) return cash.index

  return matches[0]!.index
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

  const primaryIdx = primaryEntryIndex(lines)
  const ownNotes = entry?.notes?.trim() || null
  const bubbled = bubbledEntryNotes(lines)
  const notes =
    ownNotes ?? (entryIndex === primaryIdx ? bubbled : null)

  return {
    id: registerRowKey(transaction.id, entryIndex),
    transactionId: transaction.id,
    entryIndex,
    date: transaction.date ?? null,
    payee: registerPayeeLabel(transaction),
    notes,
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
        payee: registerPayeeLabel(transaction),
        notes: null,
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
    const entryIndex = entryIndexForAccount(lines, options.accountId)
    return [registerRowFromEntry(transaction, lines, entryIndex, labels)]
  }

  // One header → one register row. Extra legs are splits (open detail / allocate),
  // not duplicate rows for the other side of a transfer.
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

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, rows]) => ({
      date,
      label:
        date === 'unknown'
          ? '—'
          : new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
      total: rows.reduce((sum, row) => sum + row.amount, 0),
      rows: [...rows].sort((a, b) => sortTransactionDateTime(b.date, a.date)),
    }))
}

export type RegisterDateGroup = {
  date: string
  label: string
  total: number
  rows: TransactionRegisterRow[]
}

/** Stamp newest-first running balances onto account register groups (display order). */
export function withNewestFirstRunningBalances(
  groups: RegisterDateGroup[],
  endingBalance: number,
): RegisterDateGroup[] {
  const flat = groups.flatMap((group) => group.rows)
  const stamped = attachNewestFirstRunningBalances(flat, endingBalance)
  let index = 0

  return groups.map((group) => ({
    ...group,
    rows: group.rows.map(() => stamped[index++]!),
  }))
}
