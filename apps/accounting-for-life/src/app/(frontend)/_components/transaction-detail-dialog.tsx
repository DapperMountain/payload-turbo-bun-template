'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { Button } from '@dappermountain/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@dappermountain/ui/components/dialog'
import { Input } from '@dappermountain/ui/components/input'
import { Label } from '@dappermountain/ui/components/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@dappermountain/ui/components/tabs'

import {
  deleteTransactionAction,
  updateTransactionAction,
  type PostingLineInputClient,
} from '@/app/(frontend)/actions/transactions'
import { GroupedPicker } from '@/app/(frontend)/_components/grouped-picker'
import { PayeePicker } from '@/app/(frontend)/_components/payee-picker'
import { TransactionAmountField } from '@/app/(frontend)/_components/transaction-amount-field'
import {
  TransactionDialogAccountField,
  TransactionDialogDateField,
} from '@/app/(frontend)/_components/transaction-dialog-fields'
import { TransactionSplitsEditor } from '@/app/(frontend)/_components/transaction-splits-editor'
import {
  createPayeeLabelHelpers,
  defaultCategoryIdForPayee,
  interpolateTemplate,
  isPayeeTransferId,
  isTransferFromPayee,
  payeeDisplayLabel,
  payeeValueFromTransaction,
  resolveTransactionTypeFromPayee,
  transferDestinationFromPayee,
  transferSkipsCategory,
} from '@/lib/frontend/transaction-payee'
import {
  normalizeTransactionDateTime,
  transactionDateTimeEquals,
} from '@/lib/frontend/transaction-datetime'
import {
  applyStandardViewCollapse,
  buildPostingLinesForSave,
  defaultTransactionDialogView,
  hasEditableSplits,
  isMultiSplitTransaction,
  newTransferSplitDraft,
  normalizeSplitFormFromEntries,
  seedSplitsForView,
  shouldPostFromSplitRows,
  splitIsTransfer,
  standardAmountLocked,
  syncSingleTransferSplitAmount,
  transactionTotalMagnitude,
  transferSplitCount,
  type TransactionDialogView,
  type TransactionSplitFormState,
} from '@/lib/frontend/transaction-splits'
import { transactionEntries } from '@/lib/frontend/transactions.display'
import {
  accountClassificationGroupKey,
  buildGroupedAccountOptions,
  buildGroupedCategoryOptionsByGroup,
} from '@/lib/frontend/transaction-picker-options'
import type { Account, Category, Transaction } from '@/types'
import { useAppTranslation } from '@/utils/i18n.client'

export type TransactionDetailDialogProps = {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: Account[]
  accountLabels: Record<string, string>
  categories: Category[]
  payeeOptionsByBudget: Record<string, string[]>
  lockedAccountId?: string | null
  initialView?: TransactionDialogView
}

export function TransactionDetailDialog(props: TransactionDetailDialogProps) {
  const {
    transaction,
    open,
    onOpenChange,
    accounts,
    categories,
    payeeOptionsByBudget,
    lockedAccountId = null,
    initialView = 'standard',
  } = props
  const { t } = useAppTranslation()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [activeView, setActiveView] = useState<TransactionDialogView>('standard')
  const [date, setDate] = useState('')
  const [payeeValue, setPayeeValue] = useState('')
  const [initialPayeeValue, setInitialPayeeValue] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [splitState, setSplitState] = useState<TransactionSplitFormState>({
    paymentAccount: '',
    totalAmount: '',
    splits: [],
  })

  const budgetId =
    transaction && typeof transaction.budget === 'object' && transaction.budget
      ? transaction.budget.id
      : typeof transaction?.budget === 'string'
        ? transaction.budget
        : ''

  const accountOptions = useMemo(
    () => buildGroupedAccountOptions(accounts, budgetId || undefined),
    [accounts, budgetId],
  )

  const categoryOptions = useMemo(
    () => buildGroupedCategoryOptionsByGroup(categories, budgetId || undefined),
    [categories, budgetId],
  )

  const formatAccountGroup = (group: string) =>
    t(accountClassificationGroupKey(group) as 'custom:fields:accounts:classification:asset')

  const payeeLabels = useMemo(
    () =>
      createPayeeLabelHelpers((key) =>
        t(key as 'custom:frontend:transactions:transferToAccountNamed'),
      ),
    [t],
  )

  useEffect(() => {
    if (!open || !transaction) return

    const lines = transactionEntries(transaction)
    const normalized = normalizeSplitFormFromEntries(lines)

    setActiveView(defaultTransactionDialogView(normalized))
    setDate(normalizeTransactionDateTime(transaction.date))
    const nextPayee = payeeValueFromTransaction(transaction)
    setPayeeValue(nextPayee)
    setInitialPayeeValue(nextPayee)
    setCategoryId(normalized.displayCategoryId)
    setSplitState(normalized)
    setError(null)
    setConfirmDelete(false)
  }, [open, transaction, initialView])

  if (!transaction) {
    return null
  }

  const readOnly = false
  const isTransfer = isTransferFromPayee(payeeValue, splitState.splits)
  const payeeDirty = payeeValue !== initialPayeeValue
  const showMultiSplit = isMultiSplitTransaction(splitState.splits)
  const categoryDisabled = isTransfer && transferSkipsCategory()
  const postFromSplits = shouldPostFromSplitRows(splitState, { view: activeView, isTransfer })

  const payeeTitle = (() => {
    const transfers = transferSplitCount(splitState.splits)
    if (transfers > 1) {
      return interpolateTemplate(t('custom:frontend:transactions:splitTransferCount'), {
        count: String(transfers),
      })
    }
    if (isPayeeTransferId(payeeValue)) {
      return payeeDisplayLabel(payeeValue, accounts, payeeLabels)
    }
    return payeeValue || t('custom:frontend:transactions:untitled')
  })()

  const payeeOptions = budgetId ? (payeeOptionsByBudget[budgetId] ?? []) : []

  const applyPayeeCommit = (next: string) => {
    setPayeeValue(next)

    const destination = transferDestinationFromPayee(next)
    if (destination) {
      setCategoryId('')
      setSplitState((prev) => ({
        ...prev,
        splits: [
          newTransferSplitDraft(
            destination,
            prev.splits[0] && splitIsTransfer(prev.splits[0])
              ? prev.splits[0].amount
              : String(transactionTotalMagnitude(prev.totalAmount) || ''),
          ),
        ],
      }))
      return
    }

    if (isPayeeTransferId(payeeValue) || transaction.type === 'transfer') {
      setSplitState((prev) => ({ ...prev, splits: [] }))
    }

    if (budgetId) {
      setCategoryId((current) => current || defaultCategoryIdForPayee(categories, budgetId))
    }
  }

  const handleViewChange = (view: TransactionDialogView) => {
    if (view === 'split') {
      setSplitState((prev) =>
        seedSplitsForView(prev, { categoryId, payeeValue, isTransfer }),
      )
    } else {
      const patch = applyStandardViewCollapse(splitState, categoryId)
      if (patch.categoryId && patch.categoryId !== categoryId) {
        setCategoryId(patch.categoryId)
      }
      if (patch.transferPayee) {
        setPayeeValue(patch.transferPayee)
      }
      setSplitState(patch.splitState)
    }
    setActiveView(view)
  }

  const buildPostingLines = ():
    | { ok: true; lines: PostingLineInputClient[] }
    | { ok: false } => {
    if (readOnly) {
      return { ok: false }
    }

    try {
      return {
        ok: true,
        lines: buildPostingLinesForSave({
          splitState,
          categoryId,
          payeeValue,
          activeView,
          isTransfer,
        }),
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Invalid transaction')
      return { ok: false }
    }
  }

  const save = () => {
    if (readOnly) return

    setError(null)
    startTransition(async () => {
      const built = buildPostingLines()
      if (!built.ok) return

      const resolvedMemo = isPayeeTransferId(payeeValue) ? null : payeeValue || null

      const resolvedType = resolveTransactionTypeFromPayee(payeeValue, splitState.splits)
      const typeDirty = resolvedType !== transaction.type
      const dateDirty = !transactionDateTimeEquals(date, transaction.date)

      const result = await updateTransactionAction({
        id: transaction.id,
        date: dateDirty ? normalizeTransactionDateTime(date) : undefined,
        memo: payeeDirty ? resolvedMemo : undefined,
        type: typeDirty ? resolvedType : undefined,
        postingLines: built.lines,
      })

      if (!result.ok) {
        setError(result.error)
        return
      }

      onOpenChange(false)
      router.refresh()
    })
  }

  const remove = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteTransactionAction({ id: transaction.id })

      if (!result.ok) {
        setError(result.error)
        return
      }

      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{payeeTitle}</DialogTitle>
          <DialogDescription>
            {t(`custom:fields:transactions:type:${transaction.type}`)}
            {' · '}
            {t(`custom:fields:transactions:status:${transaction.status}`)}
            {showMultiSplit ? ` · ${t('custom:frontend:transactions:splits')}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Tabs onValueChange={(value) => handleViewChange(value as TransactionDialogView)} value={activeView}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="standard">{t('custom:frontend:transactions:tabStandard')}</TabsTrigger>
              <TabsTrigger value="split">{t('custom:frontend:transactions:tabSplit')}</TabsTrigger>
            </TabsList>

            <div className="grid gap-4 pt-4">
              <TransactionDialogDateField
                disabled={readOnly || isPending}
                id="tx-edit-date"
                onChange={setDate}
                value={date}
              />
              <TransactionDialogAccountField
                accountOptions={accountOptions}
                accounts={accounts}
                disabled={readOnly || isPending}
                formatAccountGroup={formatAccountGroup}
                lockedAccountId={lockedAccountId}
                onChange={(value) =>
                  setSplitState((prev) => ({ ...prev, paymentAccount: value }))
                }
                value={splitState.paymentAccount}
              />
            </div>

            <TabsContent className="grid gap-4 pt-4" value="standard">
              <div className="grid gap-2">
                <Label htmlFor="tx-edit-payee">{t('custom:frontend:filters:fields:payee')}</Label>
                <PayeePicker
                  accounts={accounts}
                  budgetId={budgetId || undefined}
                  disabled={readOnly || isPending}
                  id="tx-edit-payee"
                  onCommit={applyPayeeCommit}
                  onValueChange={setPayeeValue}
                  payeeOptions={payeeOptions}
                  sourceAccountId={splitState.paymentAccount}
                  value={payeeValue}
                />
              </div>

              <TransactionAmountField
                accounts={accounts}
                disabled={readOnly || isPending || standardAmountLocked(splitState, isTransfer)}
                onValueChange={(next) =>
                  setSplitState((prev) =>
                    syncSingleTransferSplitAmount({ ...prev, totalAmount: next }),
                  )
                }
                paymentAccountId={splitState.paymentAccount}
                value={splitState.totalAmount}
              />

              {!isTransfer && !postFromSplits ? (
                <div className="grid gap-2">
                  <Label>{t('custom:frontend:filters:fields:category')}</Label>
                  <GroupedPicker
                    disabled={isPending || readOnly}
                    onValueChange={setCategoryId}
                    options={categoryOptions}
                    placeholder={t('custom:frontend:filters:selectValue')}
                    searchPlaceholder={t('custom:frontend:filters:searchCategories')}
                    value={categoryId}
                  />
                </div>
              ) : null}

              {categoryDisabled ? (
                <div className="grid gap-2">
                  <Label>{t('custom:frontend:filters:fields:category')}</Label>
                  <Input
                    disabled
                    readOnly
                    value={t('custom:frontend:transactions:categoryNotNeeded')}
                  />
                </div>
              ) : null}

              {hasEditableSplits(splitState) && !isTransfer ? (
                <p className="text-sm text-muted-foreground">
                  {t('custom:frontend:transactions:splitViewHint')}
                </p>
              ) : null}
            </TabsContent>

            <TabsContent className="pt-4" value="split">
              {readOnly ? (
                <p className="text-sm text-muted-foreground">
                  {t('custom:fields:transactions:postingLinesDescription')}
                </p>
              ) : (
                <TransactionSplitsEditor
                  accounts={accounts}
                  budgetId={budgetId || undefined}
                  categoryOptions={categoryOptions}
                  disabled={isPending || readOnly}
                  onChange={setSplitState}
                  onCollapsedToRegular={(nextCategory) => {
                    if (nextCategory) setCategoryId(nextCategory)
                    setActiveView('standard')
                  }}
                  payeeOptions={payeeOptions}
                  preferredCategoryId={categoryId}
                  state={splitState}
                />
              )}
            </TabsContent>
          </Tabs>

          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

          {confirmDelete ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {t('custom:frontend:transactions:deleteConfirm')}
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {confirmDelete ? (
            <>
              <Button
                disabled={isPending}
                onClick={() => setConfirmDelete(false)}
                type="button"
                variant="outline"
              >
                {t('custom:frontend:forms:cancel')}
              </Button>
              <Button disabled={isPending} onClick={remove} type="button" variant="destructive">
                {t('custom:frontend:transactions:deleteConfirmAction')}
              </Button>
            </>
          ) : (
            <>
              <Button
                disabled={isPending}
                onClick={() => setConfirmDelete(true)}
                type="button"
                variant="outline"
              >
                {t('custom:frontend:transactions:delete')}
              </Button>
              <Button disabled={readOnly || isPending} onClick={save} type="button">
                {t('custom:frontend:forms:save')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
