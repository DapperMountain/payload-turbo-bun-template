import { sortTransactionDateTime } from '@/lib/frontend/transaction-datetime'
import type { TransactionRegisterRow } from '@/lib/frontend/transactions.display'

export const REGISTER_COLUMN_IDS = [
  'date',
  'memo',
  'category',
  'account',
  'status',
  'amount',
] as const

export type RegisterColumnId = (typeof REGISTER_COLUMN_IDS)[number]

export const DEFAULT_REGISTER_COLUMN_ORDER: RegisterColumnId[] = [...REGISTER_COLUMN_IDS]

export const REGISTER_COLUMNS_STORAGE_KEY = 'afl-transactions-register-columns'
export const REGISTER_SORT_STORAGE_KEY = 'afl-transactions-register-sort'

export type RegisterSortState = {
  column: RegisterColumnId
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
  date: { id: 'date', labelKey: 'custom:frontend:filters:fields:date' },
  memo: { id: 'memo', labelKey: 'custom:frontend:filters:fields:payee' },
  category: { id: 'category', labelKey: 'custom:frontend:filters:fields:category' },
  account: { id: 'account', labelKey: 'custom:frontend:nav:accounts' },
  status: { id: 'status', labelKey: 'custom:frontend:transactions:statusLabel' },
  amount: { id: 'amount', labelKey: 'custom:frontend:transactions:amountColumn', align: 'right' },
}

export function isRegisterColumnId(value: string): value is RegisterColumnId {
  return (REGISTER_COLUMN_IDS as readonly string[]).includes(value)
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
      case 'date':
        result = sortTransactionDateTime(a.date, b.date)
        break
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
      default:
        result = 0
    }

    if (result !== 0) return result * factor
    return compareStrings(a.id, b.id) * factor
  })
}
