'use client'

import { useEffect, useState } from 'react'

import {
  DEFAULT_REGISTER_COLUMN_ORDER,
  DEFAULT_REGISTER_SORT,
  normalizeColumnOrder,
  normalizeRegisterSort,
  REGISTER_COLUMNS_STORAGE_KEY,
  REGISTER_SORT_STORAGE_KEY,
  type RegisterColumnId,
  type RegisterSortState,
} from '@/app/(frontend)/_components/transactions-register/register-config'

export function useRegisterTableState() {
  const [columnOrder, setColumnOrder] = useState<RegisterColumnId[]>(DEFAULT_REGISTER_COLUMN_ORDER)
  const [sort, setSort] = useState<RegisterSortState>(DEFAULT_REGISTER_SORT)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const storedColumns = localStorage.getItem(REGISTER_COLUMNS_STORAGE_KEY)
      if (storedColumns) {
        const parsed = JSON.parse(storedColumns) as string[]
        if (Array.isArray(parsed)) {
          setColumnOrder(normalizeColumnOrder(parsed))
        }
      }

      const storedSort = localStorage.getItem(REGISTER_SORT_STORAGE_KEY)
      if (storedSort) {
        setSort(normalizeRegisterSort(JSON.parse(storedSort)))
      }
    } catch {
      // ignore invalid storage
    }
    setReady(true)
  }, [])

  const persistColumnOrder = (next: RegisterColumnId[]) => {
    setColumnOrder(next)
    localStorage.setItem(REGISTER_COLUMNS_STORAGE_KEY, JSON.stringify(next))
  }

  const toggleSort = (column: RegisterColumnId) => {
    setSort((prev) => {
      const next: RegisterSortState =
        prev.column === column
          ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
          : { column, direction: column === 'amount' || column === 'balance' ? 'desc' : 'asc' }

      localStorage.setItem(REGISTER_SORT_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  return {
    columnOrder,
    persistColumnOrder,
    ready,
    sort,
    toggleSort,
  }
}
