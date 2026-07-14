'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { Checkbox } from '@dappermountain/ui/components/checkbox'
import { Input } from '@dappermountain/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@dappermountain/ui/components/select'
import { TableCell, TableRow } from '@dappermountain/ui/components/table'
import { ChevronRight } from '@dappermountain/ui/icons'
import { cn } from '@dappermountain/ui/lib/utils'

import { updateTransactionAction } from '@/app/(frontend)/actions/transactions'
import { GroupedPicker } from '@/app/(frontend)/_components/grouped-picker'
import { PayeePicker } from '@/app/(frontend)/_components/payee-picker'
import { TransactionSplitsPopover } from '@/app/(frontend)/_components/transaction-splits-popover'
import {
  createPayeeLabelHelpers,
  defaultCategoryIdFromPickerOptions,
  interpolateTemplate,
  isPayeeTransferId,
  isTransferFromPayee,
  payeeDisplayLabel,
  payeeValueFromTransaction,
  resolveTransactionTypeFromPayee,
  transferDestinationFromPayee,
  transferSkipsCategory,
} from '@/lib/frontend/transaction-payee'
import type { RegisterColumnId } from '@/app/(frontend)/_components/transactions-register/register-config'
import {
  hasEditableSplits,
  newTransferSplitDraft,
  normalizeSplitFormFromEntries,
  splitFormFromEntries,
  splitsToEntries,
} from '@/lib/frontend/transaction-splits'
import { TransactionDateTimePicker, TransactionDateTimeReadonly } from '@/app/(frontend)/_components/transaction-datetime-picker'
import {
  normalizeTransactionDateTime,
  transactionDateTimeEquals,
} from '@/lib/frontend/transaction-datetime'
import type { TransactionRegisterRow } from '@/lib/frontend/transactions.display'
import {
  entriesFromTransaction,
  transactionEntries,
  transactionIdFromRegisterRowKey,
  uniqueTransactionIdsFromRegisterRowKeys,
  updatePrimaryAccountInLines,
  updatePrimaryAmountInLines,
} from '@/lib/frontend/transactions.display'
import type { RelationshipFilterOption } from '@/lib/filters/relationship-options'
import type { Account, Transaction } from '@/types'
import { useAppTranslation } from '@/utils/i18n.client'

function formatMoney(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount)
}

function primaryCategoryId(transaction: Transaction): string {
  const cat = transactionEntries(transaction).find((entry) => entry.category)?.category
  if (!cat) return ''
  return typeof cat === 'string' ? cat : cat.id
}

export type TransactionsRegisterRowProps = {
  row: TransactionRegisterRow
  transaction: Transaction
  columnOrder: RegisterColumnId[]
  bulkMode: boolean
  selected: boolean
  accountOptions: RelationshipFilterOption[]
  categoryOptions: RelationshipFilterOption[]
  accounts: Account[]
  formatAccountGroup: (group: string) => string
  payeeOptions: string[]
  onOpenDetail: (id: string, view?: 'standard' | 'split') => void
  onToggleSelected: (id: string, checked: boolean) => void
}

export function TransactionsRegisterRowInline(props: TransactionsRegisterRowProps) {
  const {
    row,
    transaction,
    columnOrder,
    bulkMode,
    selected,
    accountOptions,
    categoryOptions,
    accounts,
    formatAccountGroup,
    payeeOptions,
    onOpenDetail,
    onToggleSelected,
  } = props
  const { t } = useAppTranslation()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rowError, setRowError] = useState<string | null>(null)

  const payeeLabels = useMemo(
    () =>
      createPayeeLabelHelpers((key) =>
        t(key as 'custom:frontend:transactions:transferToAccountNamed'),
      ),
    [t],
  )

  const [payeeValue, setPayeeValue] = useState(() => payeeValueFromTransaction(transaction))
  const [date, setDate] = useState(() => normalizeTransactionDateTime(row.date))
  const [categoryId, setCategoryId] = useState(primaryCategoryId(transaction))
  const [accountId, setAccountId] = useState(row.primaryAccountId)
  const [amount, setAmount] = useState(String(row.amount))
  const [status, setStatus] = useState(row.status)

  const readOnly = false
  const canInlineEdit = !bulkMode
  const canInlineEditLines =
    !bulkMode && (row.status === 'posted' || row.status === 'pending')
  const splitForm = normalizeSplitFormFromEntries(transactionEntries(transaction))
  const isTransfer = isTransferFromPayee(payeeValue, splitForm.splits)
  const categoryDisabled = isTransfer && transferSkipsCategory()
  const showSplitEditor = canInlineEditLines && !isTransfer && hasEditableSplits(splitForm)

  useEffect(() => {
    setPayeeValue(payeeValueFromTransaction(transaction))
    setDate((current) => {
      const next = normalizeTransactionDateTime(row.date)
      return transactionDateTimeEquals(current, next) ? current : next
    })
    setCategoryId(primaryCategoryId(transaction))
    setAccountId(row.primaryAccountId)
    setAmount(String(row.amount))
    setStatus(row.status)
    setRowError(null)
  }, [
    row.id,
    row.memo,
    row.date,
    row.primaryAccountId,
    row.amount,
    row.status,
    transaction.id,
    transaction.updatedAt,
    transaction.memo,
    transaction.type,
  ])

  const saveField = (patch: {
    memo?: string | null
    payeeValue?: string
    date?: string
    categoryId?: string | null
    accountId?: string
    amount?: number
    status?: Transaction['status']
  }) => {
    if (readOnly) return

    setRowError(null)
    startTransition(async () => {
      let entriesPayload

      try {
        const entries = transactionEntries(transaction)
        let form = splitFormFromEntries(entries)

        if (patch.date !== undefined || patch.memo !== undefined || patch.status !== undefined) {
          // header-only fields handled below
        }

        if (patch.payeeValue !== undefined) {
          const destination = transferDestinationFromPayee(patch.payeeValue)
          if (destination) {
            const magnitude = Math.abs(Number(form.totalAmount) || Math.abs(row.amount))
            entriesPayload = splitsToEntries({
              paymentAccount: form.paymentAccount,
              totalAmount: String(-magnitude),
              splits: [newTransferSplitDraft(destination, String(magnitude))],
            })
          } else if (row.type === 'transfer' || isPayeeTransferId(payeeValue)) {
            const normalized = normalizeSplitFormFromEntries(entries)
            const category =
              categoryId || defaultCategoryIdFromPickerOptions(categoryOptions)
            entriesPayload = splitsToEntries(normalized, {
              singleCategoryId: category,
            })
          }
        }

        if (patch.categoryId !== undefined && !isTransfer) {
          const normalized = normalizeSplitFormFromEntries(entries)
          if (hasEditableSplits(normalized)) {
            setRowError(t('custom:frontend:transactions:editSplitsInline'))
            return
          }
          entriesPayload = splitsToEntries(normalized, {
            singleCategoryId: patch.categoryId,
          })
        } else if (patch.accountId !== undefined || patch.amount !== undefined) {
          const storedLines = entriesFromTransaction(transaction)
          const isMultiLegTransfer = row.type === 'transfer' && storedLines.length >= 2

          if (isMultiLegTransfer) {
            let next = storedLines
            if (patch.amount !== undefined) {
              next = updatePrimaryAmountInLines(next, row.entryIndex, patch.amount)
            }
            if (patch.accountId !== undefined) {
              next = updatePrimaryAccountInLines(next, row.entryIndex, patch.accountId)
            }
            entriesPayload = next
          } else {
            if (patch.accountId !== undefined) {
              form = { ...form, paymentAccount: patch.accountId }
            }

            if (patch.amount !== undefined) {
              form = { ...form, totalAmount: String(patch.amount) }
            }

            entriesPayload = splitsToEntries(form, {
              singleCategoryId: form.splits.length ? null : categoryId || null,
            })
          }
        }

        const result = await updateTransactionAction({
          id: row.transactionId,
          memo:
            patch.payeeValue !== undefined
              ? isPayeeTransferId(patch.payeeValue)
                ? null
                : patch.payeeValue || null
              : patch.memo !== undefined
                ? patch.memo
                : undefined,
          date: patch.date,
          status: patch.status,
          type:
            patch.payeeValue !== undefined &&
            resolveTransactionTypeFromPayee(patch.payeeValue) !== row.type
              ? resolveTransactionTypeFromPayee(patch.payeeValue)
              : undefined,
          entries: entriesPayload,
        })

        if (!result.ok) {
          setRowError(result.error)
          return
        }

        router.refresh()
      } catch (cause) {
        setRowError(cause instanceof Error ? cause.message : 'Update failed')
      }
    })
  }

  const renderCell = (columnId: RegisterColumnId) => {
    switch (columnId) {
      case 'date':
        return canInlineEdit ? (
          <div onClick={(event) => event.stopPropagation()}>
            <TransactionDateTimePicker
              disabled={isPending}
              id={`tx-datetime-${row.id}`}
              key={row.id}
              onChange={setDate}
              onCommit={(next) => {
                if (next && !transactionDateTimeEquals(next, row.date)) {
                  saveField({ date: normalizeTransactionDateTime(next) })
                }
              }}
              value={date}
              variant="compact"
            />
          </div>
        ) : (
          <TransactionDateTimeReadonly value={row.date} />
        )

      case 'memo':
        if (canInlineEdit) {
          return (
            <PayeePicker
              accounts={accounts}
              budgetId={row.budgetId}
              className="h-8"
              disabled={isPending}
              onCommit={(value) => {
                setPayeeValue(value)
                if (
                  !isPayeeTransferId(value) &&
                  (row.type === 'transfer' || isPayeeTransferId(payeeValue))
                ) {
                  setCategoryId(
                    (current) => current || defaultCategoryIdFromPickerOptions(categoryOptions),
                  )
                }
                const initial = payeeValueFromTransaction(transaction)
                if (value !== initial) {
                  saveField({ payeeValue: value })
                }
              }}
              payeeOptions={payeeOptions}
              sourceAccountId={accountId}
              value={payeeValue}
            />
          )
        }

        return (
          <span className="font-medium">
            {isPayeeTransferId(payeeValue)
              ? payeeDisplayLabel(payeeValue, accounts, payeeLabels)
              : row.memo || t('custom:frontend:transactions:untitled')}
          </span>
        )

      case 'category':
        if (categoryDisabled) {
          return (
            <span className="text-muted-foreground">
              {t('custom:frontend:transactions:categoryNotNeeded')}
            </span>
          )
        }

        if (showSplitEditor) {
          return (
            <TransactionSplitsPopover
              accounts={accounts}
              categoryOptions={categoryOptions}
              label={
                row.categoryLabel ??
                interpolateTemplate(t('custom:frontend:transactions:splitCount'), {
                  count: String(splitForm.splits.length),
                })
              }
              onOpenDetail={() => onOpenDetail(row.transactionId, 'split')}
              onSaved={() => router.refresh()}
              payeeOptions={payeeOptions}
              transaction={transaction}
            />
          )
        }

        if (canInlineEditLines && !isTransfer) {
          return (
            <GroupedPicker
              className="h-8 min-w-[10rem] border-0 bg-transparent shadow-none"
              disabled={isPending}
              emptyLabel="—"
              emptyValue="__none__"
              onValueChange={(value) => {
                const next = value === '__none__' ? '' : value
                setCategoryId(next)
                if (next !== primaryCategoryId(transaction)) {
                  saveField({ categoryId: next || null })
                }
              }}
              options={categoryOptions}
              placeholder={t('custom:frontend:filters:fields:category')}
              searchPlaceholder={t('custom:frontend:filters:searchCategories')}
              value={categoryId || '__none__'}
            />
          )
        }

        return (
          <span className="text-muted-foreground">{row.categoryLabel ?? '—'}</span>
        )

      case 'account':
        if (canInlineEditLines && accountOptions.length) {
          return (
            <GroupedPicker
              className="h-8 min-w-[10rem] border-0 bg-transparent shadow-none"
              disabled={isPending}
              formatGroup={formatAccountGroup}
              onValueChange={(value) => {
                setAccountId(value)
                if (value !== row.primaryAccountId) {
                  saveField({ accountId: value })
                }
              }}
              options={accountOptions}
              placeholder={t('custom:collections:accounts:singular')}
              searchPlaceholder={t('custom:frontend:filters:searchAccounts')}
              value={accountId}
            />
          )
        }

        return <span className="text-muted-foreground">{row.accountLabel}</span>

      case 'status':
        if (canInlineEdit) {
          return (
            <Select
              disabled={isPending}
              onValueChange={(value) => {
                const next = value as Transaction['status']
                setStatus(next)
                if (next !== row.status) {
                  saveField({ status: next })
                }
              }}
              value={status}
            >
              <SelectTrigger
                className="h-8 w-[7.5rem] border-0 bg-transparent shadow-none"
                onClick={(event) => event.stopPropagation()}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['pending', 'posted'] as const).map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`custom:fields:transactions:status:${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }

        return (
          <span className="text-muted-foreground">
            {t(`custom:fields:transactions:status:${row.status}`)}
          </span>
        )

      case 'amount':
        if (canInlineEditLines) {
          return (
            <Input
              className="h-8 w-[7rem] text-right tabular-nums"
              disabled={isPending}
              onBlur={() => {
                const next = Number(amount)
                if (!Number.isFinite(next) || next === row.amount) return
                saveField({ amount: next })
              }}
              onChange={(event) => setAmount(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur()
              }}
              step="0.01"
              type="number"
              value={amount}
            />
          )
        }

        return <span className="tabular-nums">{formatMoney(row.amount)}</span>

      case 'balance':
        return row.runningBalance == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="tabular-nums">{formatMoney(row.runningBalance)}</span>
        )

      default:
        return null
    }
  }

  return (
    <TableRow className={cn(bulkMode && 'cursor-default', rowError && 'bg-destructive/5')}>
      {bulkMode ? (
        <TableCell onClick={(event) => event.stopPropagation()}>
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onToggleSelected(row.id, checked === true)}
          />
        </TableCell>
      ) : null}

      {columnOrder.map((columnId) => (
        <TableCell
          className={cn(
            columnId === 'memo' && 'max-w-xs',
            (columnId === 'amount' || columnId === 'balance') && 'text-right',
          )}
          key={columnId}
          onClick={(event) => {
            if (canInlineEdit) {
              event.stopPropagation()
            }
          }}
        >
          {renderCell(columnId)}
        </TableCell>
      ))}

      <TableCell className="w-10">
        {!bulkMode ? (
          <button
            className="flex size-8 items-center justify-center rounded-md hover:bg-muted"
            onClick={() => onOpenDetail(row.transactionId)}
            type="button"
          >
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        ) : null}
        {rowError ? <p className="text-xs text-destructive">{rowError}</p> : null}
      </TableCell>
    </TableRow>
  )
}
