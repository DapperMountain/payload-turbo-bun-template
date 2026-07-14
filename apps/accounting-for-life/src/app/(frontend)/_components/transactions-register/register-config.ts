import { sortTransactionDateTime } from '@/lib/frontend/transaction-datetime'
import type { TransactionRegisterRow } from '@/lib/frontend/transactions.display'

export const REGISTER_COLUMN_IDS = [
  'memo',
  'category',
  'account',
  'status',
  'amount',
  'balance',
] as const

export type RegisterColumnId = (typeof REGISTER_COLUMN_IDS)[number]

/** Sort key — `date` orders day groups (not a visible column). */
export type RegisterSortColumnId = RegisterColumnId | 'date'

export const DEFAULT_REGISTER_COLUMN_ORDER: RegisterColumnId[] = [...REGISTER_COLUMN_IDS]

export const REGISTER_COLUMNS_STORAGE_KEY = 'afl-transactions-register-columns-v2'
export const REGISTER_SORT_STORAGE_KEY = 'afl-transactions-register-sort-v2'

export type RegisterSortState = {
  column: RegisterSortColumnId
  direction: 'asc' | 'desc'
}

export const DEFAULT_REGISTER_SORT: RegisterSortState = {
  column: 'date',
  direction: 'desc',
}

export type RegisterColumnDef = {
  id: RegisterColumnId
  labelKey: string
  align?: 'left' | 'right'
}

export const REGISTER_COLUMN_DEFS: Record<RegisterColumnId, RegisterColumnDef> = {
  memo: { id: 'memo', labelKey: 'custom:frontend:filters:fields:payee' },
  category: { id: 'category', labelKey: 'custom:frontend:filters:fields:category' },
  account: { id: 'account', labelKey: 'custom:frontend:nav:accounts' },
  status: { id: 'status', labelKey: 'custom:frontend:transactions:statusLabel' },
  amount: { id: 'amount', labelKey: 'custom:frontend:transactions:amountColumn', align: 'right' },
  balance: {
    id: 'balance',
    labelKey: 'custom:frontend:transactions:balanceColumn',
    align: 'right',
  },
}

/** Shared cell/header sizing so auto layout does not crush columns. */
export const REGISTER_COLUMN_CLASS: Record<RegisterColumnId, string> = {
  memo: 'min-w-[12rem]',
  category: 'min-w-[10rem]',
  account: 'min-w-[9rem]',
  status: 'min-w-[6.5rem]',
  amount: 'w-[8rem] min-w-[8rem] text-right',
  balance: 'w-[8rem] min-w-[8rem] text-right',
}

export function isRegisterColumnId(value: string): value is RegisterColumnId {
  return (REGISTER_COLUMN_IDS as readonly string[]).includes(value)
}

export function isRegisterSortColumnId(value: string): value is RegisterSortColumnId {
  return value === 'date' || isRegisterColumnId(value)
}

export function normalizeColumnOrder(order: string[]): RegisterColumnId[] {
  const seen = new Set<RegisterColumnId>()
  const result: RegisterColumnId[] = []

  for (const id of order) {
    if (!isRegisterColumnId(id) || seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }

  for (const id of DEFAULT_REGISTER_COLUMN_ORDER) {
    if (!seen.has(id)) result.push(id)
  }

  return result
}

export function normalizeRegisterSort(value: unknown): RegisterSortState {
  if (!value || typeof value !== 'object') return DEFAULT_REGISTER_SORT
  const parsed = value as { column?: string; direction?: string }
  if (!parsed.column || !isRegisterSortColumnId(parsed.column)) return DEFAULT_REGISTER_SORT
  if (parsed.direction !== 'asc' && parsed.direction !== 'desc') return DEFAULT_REGISTER_SORT
  return { column: parsed.column, direction: parsed.direction }
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

export function sortRegisterRows(
  rows: TransactionRegisterRow[],
  column: RegisterColumnId,
  direction: 'asc' | 'desc',
): TransactionRegisterRow[] {
  const factor = direction === 'asc' ? 1 : -1

  return [...rows].sort((a, b) => {
    let result = 0

    switch (column) {
      case 'memo':
        result = compareStrings(a.memo ?? '', b.memo ?? '')
        break
      case 'category':
        result = compareStrings(a.categoryLabel ?? '', b.categoryLabel ?? '')
        break
      case 'account':
        result = compareStrings(a.accountLabel, b.accountLabel)
        break
      case 'status':
        result = compareStrings(a.status, b.status)
        break
      case 'amount':
        result = a.amount - b.amount
        break
      case 'balance':
        result = (a.runningBalance ?? 0) - (b.runningBalance ?? 0)
        break
      default:
        result = 0
    }

    if (result !== 0) return result * factor
    return sortTransactionDateTime(a.date, b.date) * factor || compareStrings(a.id, b.id) * factor
  })
}
