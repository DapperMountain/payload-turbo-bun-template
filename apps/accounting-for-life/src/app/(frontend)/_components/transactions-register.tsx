'use client'

import { Fragment, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@dappermountain/ui/components/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@dappermountain/ui/components/table'
import { DndContext } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'

import {
  bulkDeleteTransactionsAction,
  bulkSetTransactionCategoryAction,
  bulkUpdateTransactionsAction,
  matchTransactionsAction,
  type BulkTransactionResult,
} from '@/app/(frontend)/actions/transactions'
import { GroupedPicker } from '@/app/(frontend)/_components/grouped-picker'
import { TransactionDateTimePicker } from '@/app/(frontend)/_components/transaction-datetime-picker'
import { TransactionDetailDialog } from '@/app/(frontend)/_components/transaction-detail-dialog'
import { sortRegisterRows } from '@/app/(frontend)/_components/transactions-register/register-config'
import {
  TransactionsRegisterHeaderRow,
  useRegisterColumnDrag,
} from '@/app/(frontend)/_components/transactions-register/register-header'
import { TransactionsRegisterRowInline } from '@/app/(frontend)/_components/transactions-register/register-row'
import { useRegisterTableState } from '@/app/(frontend)/_components/transactions-register/use-register-table-state'
import { combineTransactionDateTime, normalizeTransactionDateTime } from '@/lib/frontend/transaction-datetime'
import type { TransactionRegisterRow } from '@/lib/frontend/transactions.display'
import {
  transactionIdFromRegisterRowKey,
  uniqueTransactionIdsFromRegisterRowKeys,
} from '@/lib/frontend/transactions.display'
import {
  accountClassificationGroupKey,
  buildGroupedAccountOptions,
  buildGroupedCategoryOptionsByGroup,
} from '@/lib/frontend/transaction-picker-options'
import type { Account, Category, Transaction } from '@/types'
import { useAppTranslation } from '@/utils/i18n.client'

export type TransactionsRegisterProps = {
  transactions: Transaction[]
  accounts: Account[]
  accountLabels: Record<string, string>
  payeeOptionsByBudget: Record<string, string[]>
  reportingCurrencyId: string | null
  registerGroups: {
    date: string
    label: string
    total: number
    rows: TransactionRegisterRow[]
  }[]
  categories: Category[]
  hiddenColumns?: import('@/app/(frontend)/_components/transactions-register/register-config').RegisterColumnId[]
}

export function TransactionsRegister(props: TransactionsRegisterProps) {
  const {
    transactions,
    registerGroups,
    categories,
    accounts,
    accountLabels,
    payeeOptionsByBudget,
    reportingCurrencyId,
    hiddenColumns,
  } = props
  const { t } = useAppTranslation()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { columnOrder, persistColumnOrder, sort, toggleSort } = useRegisterTableState()
  const columnDrag = useRegisterColumnDrag(columnOrder, persistColumnOrder)

  const visibleColumnOrder = useMemo(
    () => columnOrder.filter((columnId) => !hiddenColumns?.includes(columnId)),
    [columnOrder, hiddenColumns],
  )

  const [bulkMode, setBulkMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkDate, setBulkDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailInitialView, setDetailInitialView] = useState<
    'standard' | 'split' | 'swap'
  >('standard')

  const allCategoryOptions = useMemo(
    () => buildGroupedCategoryOptionsByGroup(categories),
    [categories],
  )

  const byId = useMemo(
    () => new Map(transactions.map((transaction) => [transaction.id, transaction])),
    [transactions],
  )

  const categoryOptionsByBudget = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildGroupedCategoryOptionsByGroup>>()
    for (const row of registerGroups.flatMap((group) => group.rows)) {
      if (!map.has(row.budgetId)) {
        map.set(row.budgetId, buildGroupedCategoryOptionsByGroup(categories, row.budgetId))
      }
    }
    return map
  }, [categories, registerGroups])

  const accountOptionsByBudget = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildGroupedAccountOptions>>()
    for (const row of registerGroups.flatMap((group) => group.rows)) {
      if (!map.has(row.budgetId)) {
        map.set(row.budgetId, buildGroupedAccountOptions(accounts, row.budgetId))
      }
    }
    return map
  }, [accounts, registerGroups])

  const formatAccountGroup = (group: string) =>
    t(accountClassificationGroupKey(group) as 'custom:fields:accounts:classification:asset')

  const allRowIds = useMemo(
    () => registerGroups.flatMap((group) => group.rows.map((row) => row.id)),
    [registerGroups],
  )

  const displayGroups = useMemo(() => {
    const groupFactor = sort.column === 'date' && sort.direction === 'asc' ? 1 : -1
    const groups = [...registerGroups].sort((a, b) => a.date.localeCompare(b.date) * groupFactor)

    if (sort.column === 'date') {
      return groups
    }

    return groups.map((group) => ({
      ...group,
      rows: sortRegisterRows(group.rows, sort.column, sort.direction),
    }))
  }, [registerGroups, sort])

  const detailTransaction = detailId ? (byId.get(detailId) ?? null) : null
  const selectedTransactionIds = useMemo(
    () => uniqueTransactionIdsFromRegisterRowKeys(selected),
    [selected],
  )
  const canMatch = selectedTransactionIds.length === 2
  // Data columns + fixed status gutter + detail chevron (+ bulk checkbox when active).
  const columnCount = visibleColumnOrder.length + (bulkMode ? 3 : 2)

  const toggleSelected = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(allRowIds) : new Set())
  }

  const exitBulkMode = () => {
    setBulkMode(false)
    setSelected(new Set())
    setBulkCategory('')
    setBulkDate('')
    setError(null)
  }

  const openDetail = (id: string, view: 'standard' | 'split' | 'swap' = 'standard') => {
    if (bulkMode) return
    setDetailId(id)
    setDetailInitialView(view)
    setDetailOpen(true)
  }

  const runBulk = (
    action: () => Promise<BulkTransactionResult | { ok: false; error: string }>,
  ) => {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError('error' in result ? result.error : t('custom:frontend:transactions:bulkFailed'))
        return
      }
      if ('updated' in result && result.errors?.length) {
        setError(
          t('custom:frontend:transactions:bulkPartial', {
            updated: result.updated,
            failed: result.errors.length,
          }),
        )
      }
      setSelected(new Set())
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          onClick={() => (bulkMode ? exitBulkMode() : setBulkMode(true))}
          size="sm"
          variant={bulkMode ? 'secondary' : 'outline'}
        >
          {bulkMode
            ? t('custom:frontend:transactions:doneSelecting')
            : t('custom:frontend:transactions:editMultiple')}
        </Button>

        {bulkMode && selected.size > 0 ? (
          <span className="text-sm text-muted-foreground">
            {t('custom:frontend:filters:selectedCount', { count: selected.size })}
          </span>
        ) : null}
      </div>

      {bulkMode && selected.size > 0 ? (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-3">
          <div className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t('custom:frontend:filters:fields:category')}
            </span>
            <GroupedPicker
              className="w-[14rem]"
              onValueChange={setBulkCategory}
              options={allCategoryOptions}
              placeholder={t('custom:frontend:transactions:setCategory')}
              searchPlaceholder={t('custom:frontend:filters:searchCategories')}
              value={bulkCategory}
            />
          </div>

          <div className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t('custom:frontend:transactions:dateTimeLabel')}
            </span>
            <TransactionDateTimePicker
              className="w-[12rem]"
              id="bulk-transaction-datetime"
              onChange={setBulkDate}
              value={bulkDate}
              variant="compact"
            />
          </div>

          <Button
            disabled={!bulkCategory || isPending}
            onClick={() =>
              runBulk(() =>
                bulkSetTransactionCategoryAction({
                  ids: selectedTransactionIds,
                  categoryId: bulkCategory,
                }),
              )
            }
            size="sm"
          >
            {t('custom:frontend:transactions:applyCategory')}
          </Button>

          <Button
            disabled={!bulkDate || isPending}
            onClick={() =>
              runBulk(() =>
                bulkUpdateTransactionsAction({
                  ids: selectedTransactionIds,
                  patch: { date: normalizeTransactionDateTime(bulkDate) },
                }),
              )
            }
            size="sm"
            variant="outline"
          >
            {t('custom:frontend:transactions:applyDate')}
          </Button>

          <Button
            disabled={!canMatch || isPending}
            onClick={() => {
              setError(null)
              startTransition(async () => {
                const result = await matchTransactionsAction({ ids: selectedTransactionIds })
                if (!result.ok) {
                  setError(result.error || t('custom:frontend:transactions:matchFailed'))
                  return
                }
                setSelected(new Set())
                router.refresh()
              })
            }}
            size="sm"
            title={t('custom:frontend:transactions:matchHint')}
            variant="outline"
          >
            {t('custom:frontend:transactions:matchSelected')}
          </Button>

          <Button
            disabled={isPending}
            onClick={() =>
              runBulk(() =>
                bulkDeleteTransactionsAction({
                  ids: selectedTransactionIds,
                }),
              )
            }
            size="sm"
            variant="destructive"
          >
            {t('custom:frontend:transactions:deleteSelected')}
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-hidden rounded-lg border">
        <DndContext
          collisionDetection={columnDrag.collisionDetection}
          onDragEnd={columnDrag.onDragEnd}
          sensors={columnDrag.sensors}
        >
          <SortableContext items={visibleColumnOrder} strategy={horizontalListSortingStrategy}>
            <Table>
              <TableHeader>
                <TransactionsRegisterHeaderRow
                  bulkMode={bulkMode}
                  columnOrder={visibleColumnOrder}
                  onSort={toggleSort}
                  onToggleAll={toggleAll}
                  selectedCount={selected.size}
                  sort={sort}
                  totalCount={allRowIds.length}
                />
              </TableHeader>
              <TableBody>
                {displayGroups.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={columnCount}>
                      {t('custom:frontend:transactions:empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayGroups.map((group) => (
                    <Fragment key={group.date}>
                      <TableRow className="border-b-0 bg-muted/40 hover:bg-muted/40">
                        <TableCell
                          className="py-2 text-sm font-medium text-muted-foreground"
                          colSpan={columnCount}
                        >
                          {group.label}
                        </TableCell>
                      </TableRow>

                      {group.rows.map((row) => {
                        const transaction = byId.get(transactionIdFromRegisterRowKey(row.id))
                        if (!transaction) return null

                        return (
                          <TransactionsRegisterRowInline
                            accountOptions={accountOptionsByBudget.get(row.budgetId) ?? []}
                            accounts={accounts}
                            bulkMode={bulkMode}
                            categoryOptions={categoryOptionsByBudget.get(row.budgetId) ?? []}
                            columnOrder={visibleColumnOrder}
                            formatAccountGroup={formatAccountGroup}
                            key={row.id}
                            onOpenDetail={openDetail}
                            onToggleSelected={toggleSelected}
                            payeeOptions={payeeOptionsByBudget[row.budgetId] ?? []}
                            row={row}
                            selected={selected.has(row.id)}
                            transaction={transaction}
                          />
                        )
                      })}
                    </Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </SortableContext>
        </DndContext>
      </div>

      <TransactionDetailDialog
        accountLabels={accountLabels}
        accounts={accounts}
        categories={categories}
        initialView={detailInitialView}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setDetailInitialView('standard')
        }}
        open={detailOpen}
        payeeOptionsByBudget={payeeOptionsByBudget}
        reportingCurrencyId={reportingCurrencyId}
        transaction={detailTransaction}
      />
    </div>
  )
}
