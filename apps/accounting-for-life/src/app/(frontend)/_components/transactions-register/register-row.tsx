'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { Checkbox } from '@dappermountain/ui/components/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@dappermountain/ui/components/select'
import { TableCell, TableRow } from '@dappermountain/ui/components/table'
import { ChevronRight, StickyNote } from '@dappermountain/ui/icons'
import { cn } from '@dappermountain/ui/lib/utils'

import { updateTransactionAction } from '@/app/(frontend)/actions/transactions'
import { AccountLabel } from '@/app/(frontend)/_components/account-label'
import { GroupedPicker } from '@/app/(frontend)/_components/grouped-picker'
import { PayeePicker } from '@/app/(frontend)/_components/payee-picker'
import { TransactionSplitsPopover } from '@/app/(frontend)/_components/transaction-splits-popover'
import { TransferPayeeLabel } from '@/app/(frontend)/_components/transfer-payee-label'
import {
  defaultCategoryIdFromPickerOptions,
  findAccount,
  interpolateTemplate,
  isPayeeTransferId,
  isTransferFromPayee,
  payeeValueFromTransaction,
  resolveTransactionTypeFromPayee,
  resolveTransferPair,
  transferDestinationFromPayee,
  transferPayeePresentation,
  transferSkipsCategory,
} from '@/lib/frontend/transaction-payee'
import type { RegisterColumnId } from '@/app/(frontend)/_components/transactions-register/register-config'
import { REGISTER_COLUMN_CLASS } from '@/app/(frontend)/_components/transactions-register/register-config'
import {
  hasEditableSplits,
  newTransferSplitDraft,
  normalizeSplitFormFromEntries,
  splitFormFromEntries,
  splitsToEntries,
} from '@/lib/frontend/transaction-splits'
import {
  formatAmountMagnitudeForEdit,
  registerAmountDisplay,
  signedAmountFromDirection,
  directionFromSignedAmount,
} from '@/lib/frontend/transaction-amount-direction'
import type { TransactionRegisterRow } from '@/lib/frontend/transactions.display'
import {
  entriesFromTransaction,
  transactionEntries,
} from '@/lib/frontend/transactions.display'
import {
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

function RegisterAmountText(props: {
  amount: number
  account: Account | undefined
  className?: string
}) {
  const display = registerAmountDisplay(props.amount, props.account)
  return (
    <span
      className={cn(
        'tabular-nums',
        display.isCredit && 'font-semibold text-emerald-700 dark:text-emerald-400',
        props.className,
      )}
    >
      {display.prefix}
      {display.absoluteText}
    </span>
  )
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
  const [editingAmount, setEditingAmount] = useState(false)

  const [payeeValue, setPayeeValue] = useState(() => payeeValueFromTransaction(transaction))
  const [categoryId, setCategoryId] = useState(primaryCategoryId(transaction))
  const [accountId, setAccountId] = useState(row.primaryAccountId)
  const [amountDraft, setAmountDraft] = useState(() => formatAmountMagnitudeForEdit(row.amount))
  const [status, setStatus] = useState(row.status)

  const resolvedPaymentAccount = useMemo(
    () => findAccount(accounts, accountId),
    [accountId, accounts],
  )

  const amountDisplay = useMemo(
    () => registerAmountDisplay(row.amount, resolvedPaymentAccount),
    [resolvedPaymentAccount, row.amount],
  )

  const hasNotes = Boolean(row.notes?.trim())

  const readOnly = false
  const canInlineEdit = !bulkMode
  const canInlineEditLines =
    !bulkMode && (row.status === 'posted' || row.status === 'pending')
  const splitForm = normalizeSplitFormFromEntries(transactionEntries(transaction))
  const isTransfer = isTransferFromPayee(payeeValue, splitForm.splits)
  const categoryDisabled = isTransfer && transferSkipsCategory()
  const showSplitEditor = canInlineEditLines && !isTransfer && hasEditableSplits(splitForm)

  const transferPresentation = useMemo(() => {
    if (!isTransfer) return null
    const pair = resolveTransferPair(accounts, {
      transaction,
      payeeValue,
      paymentAccountId: accountId,
    })
    if (!pair) return null
    return transferPayeePresentation(pair, row.primaryAccountId || accountId)
  }, [accountId, accounts, isTransfer, payeeValue, row.primaryAccountId, transaction])

  useEffect(() => {
    setPayeeValue(payeeValueFromTransaction(transaction))
    setCategoryId(primaryCategoryId(transaction))
    setAccountId(row.primaryAccountId)
    setAmountDraft(formatAmountMagnitudeForEdit(row.amount))
    setStatus(row.status)
    setEditingAmount(false)
    setRowError(null)
  }, [
    row.id,
    row.memo,
    row.notes,
    row.primaryAccountId,
    row.amount,
    row.status,
    transaction.id,
    transaction.updatedAt,
    transaction.memo,
    transaction.notes,
    transaction.type,
  ])

  const saveField = (patch: {
    memo?: string | null
    payeeValue?: string
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

  const commitAmountDraft = () => {
    const magnitude = Math.abs(Number(amountDraft))
    if (!Number.isFinite(magnitude)) {
      setAmountDraft(formatAmountMagnitudeForEdit(row.amount))
      setEditingAmount(false)
      return
    }

    const direction = directionFromSignedAmount(row.amount, resolvedPaymentAccount)
    const next = signedAmountFromDirection(direction, magnitude, resolvedPaymentAccount)
    setEditingAmount(false)
    if (next === row.amount) return
    saveField({ amount: next })
  }

  const renderCell = (columnId: RegisterColumnId) => {
    switch (columnId) {
      case 'memo':
        if (canInlineEdit) {
          return (
            <PayeePicker
              accounts={accounts}
              appearance="plain"
              budgetId={row.budgetId}
              className="h-7 min-w-[8rem]"
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
              transaction={transaction}
              value={payeeValue}
            />
          )
        }

        return transferPresentation ? (
          <TransferPayeeLabel className="font-medium" presentation={transferPresentation} />
        ) : (
          <span
            className="truncate font-medium"
            title={row.memo || t('custom:frontend:transactions:untitled')}
          >
            {row.memo || t('custom:frontend:transactions:untitled')}
          </span>
        )
      case 'category':
        if (categoryDisabled) {
          return (
            <GroupedPicker
              appearance="plain"
              className="h-7 w-auto min-w-[6rem] max-w-[14rem]"
              disabled
              emptyLabel={t('custom:frontend:transactions:categoryNotNeeded')}
              emptyValue="__none__"
              onValueChange={() => {}}
              options={[]}
              placeholder={t('custom:frontend:transactions:categoryNotNeeded')}
              value="__none__"
            />
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
              appearance="plain"
              className="h-7 w-auto min-w-[6rem] max-w-[14rem]"
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
              appearance="plain"
              className="h-7 w-auto min-w-[6rem] max-w-[12rem]"
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

        {
          const account = findAccount(accounts, row.primaryAccountId)
          if (account) {
            return (
              <AccountLabel
                account={account}
                className="text-muted-foreground"
                name={row.accountLabel}
              />
            )
          }

          return <span className="text-muted-foreground">{row.accountLabel}</span>
        }

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
                className="h-7 w-auto min-w-[5.5rem] border-transparent bg-transparent px-1 shadow-none hover:bg-muted/50"
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

      case 'amount': {
        const amountControl = (
          <div
            className={cn(
              'inline-flex h-7 w-[6.75rem] shrink-0 items-center justify-end overflow-hidden rounded-sm',
              editingAmount && 'bg-background ring-1 ring-inset ring-input',
            )}
            onClick={(event) => event.stopPropagation()}
          >
            {canInlineEditLines && editingAmount ? (
              <>
                {amountDisplay.isCredit ? (
                  <span
                    aria-hidden
                    className="pl-1 font-semibold text-emerald-700 dark:text-emerald-400"
                  >
                    +
                  </span>
                ) : null}
                <input
                  autoFocus
                  className={cn(
                    'h-full min-w-0 flex-1 bg-transparent px-1 text-right text-sm tabular-nums outline-none',
                    amountDisplay.isCredit &&
                      'font-semibold text-emerald-700 dark:text-emerald-400',
                  )}
                  disabled={isPending}
                  inputMode="decimal"
                  onBlur={commitAmountDraft}
                  onChange={(event) => setAmountDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                    if (event.key === 'Escape') {
                      setAmountDraft(formatAmountMagnitudeForEdit(row.amount))
                      setEditingAmount(false)
                    }
                  }}
                  type="text"
                  value={amountDraft}
                />
              </>
            ) : canInlineEditLines ? (
              <button
                className="h-full w-full px-1 text-right hover:bg-muted/50"
                disabled={isPending}
                onClick={() => {
                  setAmountDraft(formatAmountMagnitudeForEdit(row.amount))
                  setEditingAmount(true)
                }}
                type="button"
              >
                <RegisterAmountText amount={row.amount} account={resolvedPaymentAccount} />
              </button>
            ) : (
              <div className="px-1">
                <RegisterAmountText amount={row.amount} account={resolvedPaymentAccount} />
              </div>
            )}
          </div>
        )

        return (
          <div className="flex items-center justify-end gap-1">
            <span className="inline-flex size-3.5 shrink-0 items-center justify-center">
              {hasNotes ? (
                <StickyNote
                  aria-label={t('custom:frontend:transactions:hasNotes')}
                  className="size-3.5 text-muted-foreground"
                />
              ) : null}
            </span>
            {amountControl}
          </div>
        )
      }

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
          className={REGISTER_COLUMN_CLASS[columnId]}
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
