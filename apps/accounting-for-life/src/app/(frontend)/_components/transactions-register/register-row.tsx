'use client'

import { useRouter } from 'next/navigation'
import { Fragment, useEffect, useMemo, useState, useTransition, type ReactNode } from 'react'
import { Checkbox } from '@dappermountain/ui/components/checkbox'
import { TableCell, TableRow } from '@dappermountain/ui/components/table'
import { ChevronDown, ChevronRight, Split, StickyNote } from '@dappermountain/ui/icons'
import { cn } from '@dappermountain/ui/lib/utils'

import { updateTransactionAction } from '@/app/(frontend)/actions/transactions'
import { AccountLabel } from '@/app/(frontend)/_components/account-label'
import { GroupedPicker } from '@/app/(frontend)/_components/grouped-picker'
import { PayeePicker } from '@/app/(frontend)/_components/payee-picker'
import { TransactionStatusDot } from '@/app/(frontend)/_components/transaction-status-badge'
import { TransferPayeeLabel } from '@/app/(frontend)/_components/transfer-payee-label'
import { RegisterSplitPanel } from '@/app/(frontend)/_components/transactions-register/register-split-panel'
import {
  defaultCategoryIdFromPickerOptions,
  findAccount,
  isPayeeTransferId,
  payeeValueFromTransaction,
  resolveTransactionTypeFromPayee,
  resolveTransferPair,
  toPayeeTransferId,
  transferDestinationFromPayee,
  transferPayeePresentation,
  transferSkipsCategory,
} from '@/lib/frontend/transaction-payee'
import {
  detectSwapPairFromLegs,
  entriesToSwapLegs,
  isWalletTransferEntries,
} from '@/lib/frontend/transaction-swap'
import type { RegisterColumnId } from '@/app/(frontend)/_components/transactions-register/register-config'
import { REGISTER_COLUMN_CLASS } from '@/app/(frontend)/_components/transactions-register/register-config'
import {
  hasEditableSplits,
  merchantPayeeFromValue,
  newTransferSplitDraft,
  normalizeSplitFormFromEntries,
  splitFormFromEntries,
  splitIsTransfer,
  splitsToEntries,
  transferUnitsDiffer,
} from '@/lib/frontend/transaction-splits'
import {
  formatUnitAmount,
  resolveUnitForAccount,
  type UnitFormatInput,
} from '@/lib/frontend/format-unit-amount'
import {
  formatAmountMagnitudeForEdit,
  registerAmountDisplay,
  signedAmountFromDirection,
  directionFromSignedAmount,
} from '@/lib/frontend/transaction-amount-direction'
import type { TransactionRegisterRow } from '@/lib/frontend/transactions.display'
import {
  entriesFromTransaction,
  hasMultipleEntryPayees,
  isMultiAccountJournal,
  transactionEntries,
  updatePrimaryAccountInLines,
  updatePrimaryAmountInLines,
} from '@/lib/frontend/transactions.display'
import { EconomicKindBadge } from '@/app/(frontend)/_components/economic-kind-badge'
import {
  deriveEconomicKind,
  economicKindOverrideFromTransaction,
} from '@/lib/frontend/transaction-economic-kind'
import type { RelationshipFilterOption } from '@/lib/filters/relationship-options'
import type { Account, Category, Transaction, Unit } from '@/types'
import { useAppTranslation } from '@/utils/i18n.client'

function primaryCategoryId(transaction: Transaction): string {
  const cat = transactionEntries(transaction).find((entry) => entry.category)?.category
  if (!cat) return ''
  return typeof cat === 'string' ? cat : cat.id
}

function RegisterAmountText(props: {
  amount: number
  account: Account | undefined
  unitsById?: Record<string, UnitFormatInput>
  className?: string
}) {
  const display = registerAmountDisplay(
    props.amount,
    props.account,
    undefined,
    props.unitsById,
  )
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
  categories: Category[]
  reportingCurrencyId: string | null
  units: Unit[]
  unitsById: Record<string, UnitFormatInput>
  /** When set (account register), running balances use this account’s unit. */
  balanceAccountId?: string | null
  formatAccountGroup: (group: string) => string
  payeeOptions: string[]
  /** Total table columns for expand-row colspan. */
  columnCount: number
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
    categories,
    reportingCurrencyId,
    units,
    unitsById,
    balanceAccountId,
    formatAccountGroup,
    payeeOptions,
    columnCount,
    onOpenDetail,
    onToggleSelected,
  } = props
  const { t } = useAppTranslation()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rowError, setRowError] = useState<string | null>(null)
  const [editingAmount, setEditingAmount] = useState(false)
  const [splitsExpanded, setSplitsExpanded] = useState(false)

  const [payeeValue, setPayeeValue] = useState(() => payeeValueFromTransaction(transaction))
  const [categoryId, setCategoryId] = useState(primaryCategoryId(transaction))
  const [accountId, setAccountId] = useState(row.primaryAccountId)
  const [amountDraft, setAmountDraft] = useState(() =>
    formatAmountMagnitudeForEdit(row.amount, findAccount(accounts, row.primaryAccountId), unitsById),
  )

  const resolvedPaymentAccount = useMemo(
    () => findAccount(accounts, accountId),
    [accountId, accounts],
  )

  const balanceAccount = useMemo(
    () => (balanceAccountId ? findAccount(accounts, balanceAccountId) : resolvedPaymentAccount),
    [accounts, balanceAccountId, resolvedPaymentAccount],
  )

  const amountDisplay = useMemo(
    () => registerAmountDisplay(row.amount, resolvedPaymentAccount, undefined, unitsById),
    [resolvedPaymentAccount, row.amount, unitsById],
  )

  const notesText = row.notes?.trim() ?? ''
  const hasNotes = Boolean(notesText)

  const readOnly = false
  const canInlineEdit = !bulkMode
  const canInlineEditLines =
    !bulkMode && (row.status === 'posted' || row.status === 'pending')
  const entryLines = transactionEntries(transaction)
  const splitForm = normalizeSplitFormFromEntries(entryLines)
  // Do not infer transfer from reverse-projected allocate splits — multi-leg journals
  // (e.g. Kraken swap + fee) invent `__transfer__` rows and drop fee categories.
  const isTransfer =
    transaction.type === 'transfer' ||
    isPayeeTransferId(payeeValue) ||
    isWalletTransferEntries(entryLines)
  const crossUnitTransfer = isTransfer && transferUnitsDiffer(splitForm, accounts)
  const categoryDisabled = isTransfer && transferSkipsCategory()
  // Allocate popover is for same-account category splits only — not journals whose
  // reverse projection invents transfer rows (swap + fee, etc.).
  const isJournalRow = !isTransfer && isMultiAccountJournal(entryLines)
  const isMultiPayeeRow = hasMultipleEntryPayees(transaction)
  const showSplitEditor =
    canInlineEditLines &&
    !isTransfer &&
    !isJournalRow &&
    hasEditableSplits(splitForm) &&
    splitForm.splits.every((split) => !splitIsTransfer(split))
  const isSplitTransaction =
    !isTransfer && (hasEditableSplits(splitForm) || entryLines.length > 2)
  // Split transactions edit payee per line in detail / allocate — not a single header cell.
  const payeeReadOnly = isJournalRow || isMultiPayeeRow || isSplitTransaction

  const toggleSplitsExpanded = () => {
    setSplitsExpanded((open) => !open)
  }

  const withSplitIcon = (content: ReactNode) => (
    <div className="flex min-w-0 items-center gap-1.5">
      {isSplitTransaction ? (
        <Split
          aria-hidden
          className="size-3.5 shrink-0 text-muted-foreground"
          title={t('custom:frontend:transactions:splitTransactionIcon')}
        />
      ) : null}
      <div className="min-w-0 flex-1">{content}</div>
    </div>
  )

  const economic = useMemo(() => {
    const lines = transactionEntries(transaction)
    return deriveEconomicKind({
      entries: lines,
      accounts,
      categories,
      reportingCurrencyId,
      viewpointAccountId: balanceAccountId || row.primaryAccountId,
      viewpointAmount: row.amount,
      override: economicKindOverrideFromTransaction(transaction),
      transactionType: transaction.type,
    })
  }, [
    accounts,
    balanceAccountId,
    categories,
    reportingCurrencyId,
    row.amount,
    row.primaryAccountId,
    transaction,
  ])

  const transferPresentation = useMemo(() => {
    const viewingId = row.primaryAccountId || accountId
    const paymentAccount = findAccount(accounts, viewingId)

    if (isTransfer) {
      const pair = resolveTransferPair(accounts, {
        transaction,
        payeeValue,
        paymentAccountId: accountId,
      })
      if (!pair) return null
      return transferPayeePresentation(
        pair,
        viewingId,
        directionFromSignedAmount(row.amount, paymentAccount),
      )
    }

    // Multi-account swap (+ fees): show give → receive, not a single fee/DEX name.
    if (isJournalRow && !row.payee) {
      const legs = entriesToSwapLegs(entryLines)
      const swapPair = detectSwapPairFromLegs(legs, accounts)
      if (!swapPair) return null
      const giveId = legs[swapPair.giveIndex]?.account
      const receiveId = legs[swapPair.receiveIndex]?.account
      if (!giveId || !receiveId) return null
      const pair = resolveTransferPair(accounts, {
        transaction,
        payeeValue: toPayeeTransferId(receiveId),
        paymentAccountId: giveId,
      })
      if (!pair) return null
      return transferPayeePresentation(
        pair,
        viewingId || giveId,
        directionFromSignedAmount(row.amount, paymentAccount),
      )
    }

    return null
  }, [
    accountId,
    accounts,
    entryLines,
    isJournalRow,
    isTransfer,
    payeeValue,
    row.amount,
    row.payee,
    row.primaryAccountId,
    transaction,
  ])

  useEffect(() => {
    setPayeeValue(payeeValueFromTransaction(transaction))
    setCategoryId(primaryCategoryId(transaction))
    setAccountId(row.primaryAccountId)
    setAmountDraft(
      formatAmountMagnitudeForEdit(row.amount, findAccount(accounts, row.primaryAccountId), unitsById),
    )
    setEditingAmount(false)
    setRowError(null)
  }, [
    row.id,
    row.payee,
    row.notes,
    row.primaryAccountId,
    row.amount,
    row.status,
    transaction.id,
    transaction.updatedAt,
    transaction.notes,
    transaction.type,
  ])

  const saveField = (patch: {
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
            const nextPayee = merchantPayeeFromValue(patch.payeeValue)
            if (!nextPayee) {
              setRowError(t('custom:frontend:transactions:payeeRequired'))
              return
            }
            entriesPayload = splitsToEntries(normalized, {
              singleCategoryId: category,
              accounts,
              budgetId: row.budgetId,
              categoryPurpose: categories.find((category) => category.id === category)?.purpose,
              merchantPayee: nextPayee,
            })
          }
        }

        if (patch.categoryId !== undefined && !isTransfer) {
          const normalized = normalizeSplitFormFromEntries(entries)
          if (hasEditableSplits(normalized)) {
            setRowError(t('custom:frontend:transactions:editSplitsInline'))
            return
          }
          const merchant = merchantPayeeFromValue(payeeValue)
          if (!merchant) {
            setRowError(t('custom:frontend:transactions:payeeRequired'))
            return
          }
          entriesPayload = splitsToEntries(normalized, {
            singleCategoryId: patch.categoryId,
            accounts,
            budgetId: row.budgetId,
            categoryPurpose: categories.find((category) => category.id === patch.categoryId)
              ?.purpose,
            merchantPayee: merchant,
          })
        } else if (patch.accountId !== undefined || patch.amount !== undefined) {
          const storedLines = entriesFromTransaction(transaction)
          const isMultiLegTransfer = row.type === 'transfer' && storedLines.length >= 2

          if (isMultiLegTransfer && transferUnitsDiffer(form, accounts)) {
            setRowError(t('custom:frontend:transactions:editCrossUnitTransferInline'))
            return
          }

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

            const singleCategory = form.splits.length ? null : categoryId || null
            if (singleCategory && !isTransfer && !merchantPayeeFromValue(payeeValue)) {
              setRowError(t('custom:frontend:transactions:payeeRequired'))
              return
            }
            entriesPayload = splitsToEntries(form, {
              singleCategoryId: singleCategory,
              accounts,
              budgetId: row.budgetId,
              categoryPurpose: categories.find((category) => category.id === categoryId)?.purpose,
              merchantPayee: merchantPayeeFromValue(payeeValue),
            })
          }
        }

        const result = await updateTransactionAction({
          id: row.transactionId,
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
      setAmountDraft(
      formatAmountMagnitudeForEdit(row.amount, findAccount(accounts, row.primaryAccountId), unitsById),
    )
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
      case 'payee': {
        // Journals / multi-payee splits aren't a single header edit — open detail.
        const payeeControl = payeeReadOnly ? (
          <button
            className="h-7 min-w-[8rem] truncate text-left text-sm font-medium hover:underline"
            onClick={() => onOpenDetail(row.transactionId)}
            type="button"
          >
            {transferPresentation ? (
              <TransferPayeeLabel className="font-medium" presentation={transferPresentation} />
            ) : (
              row.payee || t('custom:frontend:transactions:untitled')
            )}
          </button>
        ) : canInlineEdit ? (
          <PayeePicker
            accounts={accounts}
            amountDirection={directionFromSignedAmount(row.amount, resolvedPaymentAccount)}
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
        ) : transferPresentation ? (
          <TransferPayeeLabel className="font-medium" presentation={transferPresentation} />
        ) : (
          <span className="font-medium">
            {row.payee || t('custom:frontend:transactions:untitled')}
          </span>
        )

        return (
          <div className="flex min-w-0 items-center gap-2">
            <EconomicKindBadge
              ambiguous={economic.confidence === 'ambiguous'}
              kind={economic.kind}
            />
            <div className="min-w-0 flex-1">{payeeControl}</div>
          </div>
        )
      }
      case 'category':
        if (categoryDisabled) {
          return withSplitIcon(
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
            />,
          )
        }

        // Split / journal rows: category label (if any) + expand via the split icon.
        if (isSplitTransaction && canInlineEditLines) {
          if (!row.categoryLabel) {
            return withSplitIcon(
              <button
                className="h-7 max-w-[14rem] truncate text-left text-sm text-muted-foreground hover:underline"
                onClick={(event) => {
                  event.stopPropagation()
                  toggleSplitsExpanded()
                }}
                type="button"
              >
                {t('custom:frontend:transactions:categorySeeLines')}
              </button>,
            )
          }

          return withSplitIcon(
            <button
              className="h-7 max-w-[14rem] truncate text-left text-sm hover:underline"
              onClick={(event) => {
                event.stopPropagation()
                toggleSplitsExpanded()
              }}
              type="button"
            >
              {row.categoryLabel}
            </button>,
          )
        }

        if (canInlineEditLines && !isTransfer) {
          return withSplitIcon(
            <GroupedPicker
              appearance="plain"
              className="h-7 w-auto min-w-[6rem] max-w-[14rem]"
              disabled={isPending}
              emptyLabel={t('custom:frontend:transactions:categoryNone')}
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
            />,
          )
        }

        if (!row.categoryLabel && isSplitTransaction) {
          return withSplitIcon(
            <span className="truncate text-sm text-muted-foreground">
              {t('custom:frontend:transactions:categorySeeLines')}
            </span>,
          )
        }

        return withSplitIcon(
          <span className="text-muted-foreground">
            {row.categoryLabel ?? t('custom:frontend:transactions:categoryNone')}
          </span>,
        )

      case 'account':
        if (canInlineEditLines && accountOptions.length && !crossUnitTransfer) {
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

      case 'amount': {
        const canEditAmountInline = canInlineEditLines && !crossUnitTransfer
        const amountControl = (
          <div
            className={cn(
              'inline-flex h-7 w-[6.75rem] shrink-0 items-center justify-end overflow-hidden rounded-sm',
              editingAmount && 'bg-background ring-1 ring-inset ring-input',
            )}
            onClick={(event) => event.stopPropagation()}
          >
            {canEditAmountInline && editingAmount ? (
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
                      setAmountDraft(
      formatAmountMagnitudeForEdit(row.amount, findAccount(accounts, row.primaryAccountId), unitsById),
    )
                      setEditingAmount(false)
                    }
                  }}
                  type="text"
                  value={amountDraft}
                />
              </>
            ) : canEditAmountInline ? (
              <button
                className="h-full w-full px-1 text-right hover:bg-muted/50"
                disabled={isPending}
                onClick={() => {
                  setAmountDraft(
      formatAmountMagnitudeForEdit(row.amount, findAccount(accounts, row.primaryAccountId), unitsById),
    )
                  setEditingAmount(true)
                }}
                type="button"
              >
                <RegisterAmountText
                  account={resolvedPaymentAccount}
                  amount={row.amount}
                  unitsById={unitsById}
                />
              </button>
            ) : (
              <div className="px-1">
                <RegisterAmountText
                  account={resolvedPaymentAccount}
                  amount={row.amount}
                  unitsById={unitsById}
                />
              </div>
            )}
          </div>
        )

        return (
          <div className="flex items-center justify-end gap-1">
            <span className="inline-flex size-3.5 shrink-0 items-center justify-center">
              {hasNotes ? (
                <span
                  aria-label={notesText}
                  className="inline-flex"
                  title={notesText}
                >
                  <StickyNote
                    aria-hidden
                    className="size-3.5 text-muted-foreground"
                  />
                </span>
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
          <span className="tabular-nums">
            {formatUnitAmount(
              row.runningBalance,
              resolveUnitForAccount(balanceAccount, unitsById),
            )}
          </span>
        )

      default:
        return null
    }
  }

  return (
    <Fragment>
      <TableRow className={cn(bulkMode && 'cursor-default', rowError && 'bg-destructive/5')}>
        {bulkMode ? (
          <TableCell onClick={(event) => event.stopPropagation()}>
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onToggleSelected(row.id, checked === true)}
            />
          </TableCell>
        ) : null}

        <TableCell className="w-8 px-0">
          {isSplitTransaction && canInlineEditLines ? (
            <button
              aria-expanded={splitsExpanded}
              aria-label={
                splitsExpanded
                  ? t('custom:frontend:transactions:collapseSplits')
                  : t('custom:frontend:transactions:expandSplits')
              }
              className="flex size-8 items-center justify-center rounded-md hover:bg-muted"
              onClick={(event) => {
                event.stopPropagation()
                toggleSplitsExpanded()
              }}
              type="button"
            >
              <ChevronDown
                className={cn(
                  'size-4 text-muted-foreground transition-transform',
                  splitsExpanded && 'rotate-180',
                )}
              />
            </button>
          ) : null}
        </TableCell>

        <TableCell className="w-6 px-1">
          <div className="flex h-7 items-center justify-center">
            <TransactionStatusDot status={row.status} />
          </div>
        </TableCell>

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

      {splitsExpanded && isSplitTransaction && canInlineEditLines ? (
        <TableRow className="bg-muted/10 hover:bg-muted/10">
          <TableCell className="py-3" colSpan={columnCount}>
            <RegisterSplitPanel
              accounts={accounts}
              categoryOptions={categoryOptions}
              mode={isJournalRow || !showSplitEditor ? 'journal' : 'allocate'}
              onOpenDetail={() => onOpenDetail(row.transactionId)}
              payeeOptions={payeeOptions}
              transaction={transaction}
              units={units}
            />
          </TableCell>
        </TableRow>
      ) : null}
    </Fragment>
  )
}
