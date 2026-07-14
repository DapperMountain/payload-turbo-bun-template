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
  DialogTrigger,
} from '@dappermountain/ui/components/dialog'
import { Input } from '@dappermountain/ui/components/input'
import { Label } from '@dappermountain/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@dappermountain/ui/components/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@dappermountain/ui/components/tabs'
import { Plus } from '@dappermountain/ui/icons'

import { createTransactionAction } from '@/app/(frontend)/actions/transactions'
import { GroupedPicker } from '@/app/(frontend)/_components/grouped-picker'
import { PayeePicker } from '@/app/(frontend)/_components/payee-picker'
import { TransactionAmountField } from '@/app/(frontend)/_components/transaction-amount-field'
import {
  TransactionDialogAccountField,
  TransactionDialogDateField,
} from '@/app/(frontend)/_components/transaction-dialog-fields'
import { TransactionSplitsEditor } from '@/app/(frontend)/_components/transaction-splits-editor'
import {
  defaultCategoryIdForPayee,
  isPayeeTransferId,
  isTransferFromPayee,
  transferDestinationFromPayee,
  transferSkipsCategory,
} from '@/lib/frontend/transaction-payee'
import {
  applyStandardViewCollapse,
  buildEntriesForSave,
  newTransferSplitDraft,
  resolvePostingCategoryId,
  seedSplitsForView,
  shouldPostFromSplitRows,
  splitIsTransfer,
  splitStateAfterCategoryChange,
  syncSingleTransferSplitAmount,
  allSplitsAreTransfers,
  transactionTotalMagnitude,
  type TransactionDialogView,
  type TransactionSplitFormState,
} from '@/lib/frontend/transaction-splits'
import { nowTransactionDateTime, normalizeTransactionDateTime } from '@/lib/frontend/transaction-datetime'
import {
  accountClassificationGroupKey,
  buildGroupedAccountOptions,
  buildGroupedCategoryOptionsByGroup,
} from '@/lib/frontend/transaction-picker-options'
import type { Account, Category, Transaction } from '@/types'
import { useAppTranslation } from '@/utils/i18n.client'

export type TransactionFormDialogProps = {
  accounts: Account[]
  budgetId: string | null
  categories: Category[]
  payeeOptions?: string[]
  defaultPaymentAccountId?: string | null
}

function defaultSplitState(
  accounts: Account[],
  budgetId: string,
  paymentAccountId?: string | null,
): TransactionSplitFormState {
  const accountIds = buildGroupedAccountOptions(accounts, budgetId).map((option) => option.id)
  const payment =
    paymentAccountId && accountIds.includes(paymentAccountId)
      ? paymentAccountId
      : (accountIds[0] ?? '')
  const other = accountIds[1] ?? payment

  return {
    paymentAccount: payment,
    totalAmount: '',
    splits: [],
  }
}

function defaultTransferState(accounts: Account[], budgetId: string): TransactionSplitFormState {
  const accountIds = buildGroupedAccountOptions(accounts, budgetId).map((option) => option.id)
  const from = accountIds[0] ?? ''
  const to = accountIds[1] ?? from

  return {
    paymentAccount: from,
    totalAmount: '',
    splits: [newTransferSplitDraft(to)],
  }
}

export function TransactionFormDialog(props: TransactionFormDialogProps) {
  const { accounts, budgetId, categories, payeeOptions = [], defaultPaymentAccountId } = props
  const { t } = useAppTranslation()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [activeView, setActiveView] = useState<TransactionDialogView>('standard')
  const lockedAccountId = defaultPaymentAccountId ?? null

  const [date, setDate] = useState(() => nowTransactionDateTime())
  const [payeeValue, setPayeeValue] = useState('')
  const [type, setType] = useState<Transaction['type']>('transaction')
  const [categoryId, setCategoryId] = useState('')
  const [splitState, setSplitState] = useState<TransactionSplitFormState>(() =>
    budgetId
      ? defaultSplitState(accounts, budgetId, defaultPaymentAccountId)
      : { paymentAccount: '', totalAmount: '', splits: [] },
  )

  const accountOptions = useMemo(
    () => buildGroupedAccountOptions(accounts, budgetId ?? undefined),
    [accounts, budgetId],
  )

  const categoryOptions = useMemo(
    () => buildGroupedCategoryOptionsByGroup(categories, budgetId ?? undefined),
    [categories, budgetId],
  )

  const formatAccountGroup = (group: string) =>
    t(accountClassificationGroupKey(group) as 'custom:fields:accounts:classification:asset')

  const isTransfer = isTransferFromPayee(payeeValue, splitState.splits)
  const hasCategorySplits = splitState.splits.some((split) => !splitIsTransfer(split))
  const categoryDisabled = isTransfer && transferSkipsCategory()

  const applyPayeeCommit = (next: string) => {
    setPayeeValue(next)

    const destination = transferDestinationFromPayee(next)
    if (destination) {
      setType('transfer')
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

    if (type === 'transfer' || isPayeeTransferId(payeeValue)) {
      setType('transaction')
      setSplitState((prev) => ({ ...prev, splits: [] }))
      if (budgetId) {
        setCategoryId((current) => current || defaultCategoryIdForPayee(categories, budgetId))
      }
    }
  }

  useEffect(() => {
    if (!budgetId) return
    setSplitState((prev) => {
      const accountIds = buildGroupedAccountOptions(accounts, budgetId).map((option) => option.id)
      const locked =
        lockedAccountId && accountIds.includes(lockedAccountId)
          ? lockedAccountId
          : accountIds.includes(prev.paymentAccount)
            ? prev.paymentAccount
            : (accountIds[0] ?? '')
      return { ...prev, paymentAccount: locked }
    })
  }, [accounts, budgetId, lockedAccountId])

  const handleViewChange = (view: TransactionDialogView) => {
    if (view === 'split') {
      setSplitState((prev) =>
        seedSplitsForView(prev, { categoryId, payeeValue, isTransfer }),
      )
    } else {
      const patch = applyStandardViewCollapse(splitState, categoryId)
      if (patch.categoryId) {
        setCategoryId(patch.categoryId)
      }
      if (patch.transferPayee) {
        setPayeeValue(patch.transferPayee)
        setType('transfer')
      }
      setSplitState(patch.splitState)
    }
    setActiveView(view)
  }

  const reset = () => {
    setDate(nowTransactionDateTime())
    setPayeeValue('')
    setType('transaction')
    setCategoryId('')
    setActiveView('standard')
    setSplitState(
      budgetId
        ? defaultSplitState(accounts, budgetId, defaultPaymentAccountId)
        : { paymentAccount: '', totalAmount: '', splits: [] },
    )
    setError(null)
  }

  const handleTypeChange = (next: Transaction['type']) => {
    setType(next)
    setCategoryId('')

    if (next === 'transfer') {
      if (!budgetId) return
      setPayeeValue('')
      setSplitState(defaultTransferState(accounts, budgetId))
      return
    }

    if (isPayeeTransferId(payeeValue)) {
      setPayeeValue('')
    }

    if (!budgetId) return
    setSplitState(defaultSplitState(accounts, budgetId, defaultPaymentAccountId))
  }

  const submit = (asDraft: boolean) => {
    if (!budgetId) {
      setError(t('custom:frontend:budgets:selectorLabel'))
      return
    }

    if (
      !asDraft &&
      !isTransfer &&
      !shouldPostFromSplitRows(splitState, { view: activeView, isTransfer }) &&
      !resolvePostingCategoryId(splitState, categoryId)
    ) {
      setError(t('custom:frontend:transactions:categoryNeedsSplits'))
      return
    }

    const resolvedType =
      isPayeeTransferId(payeeValue) || allSplitsAreTransfers(splitState.splits)
        ? 'transfer'
        : type
    const resolvedMemo =
      resolvedType === 'transfer' || isPayeeTransferId(payeeValue) ? undefined : payeeValue || undefined

    setError(null)

    let entries: ReturnType<typeof buildEntriesForSave> | undefined

    if (!asDraft) {
      try {
        entries = buildEntriesForSave({
          splitState,
          categoryId,
          categoryPurpose: categories.find((category) => category.id === categoryId)?.purpose,
          payeeValue,
          activeView,
          isTransfer: resolvedType === 'transfer' || isTransfer,
        })
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Failed to post transaction')
        return
      }
    }

    startTransition(async () => {
      const result = await createTransactionAction({
        budget: budgetId,
        date: normalizeTransactionDateTime(date),
        memo: resolvedMemo,
        type: resolvedType,
        entries,
      })

      if (!result.ok) {
        setError(result.error)
        return
      }

      setOpen(false)
      reset()
      router.refresh()
    })
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button disabled={!budgetId} size="sm">
          <Plus className="size-4" />
          {t('custom:frontend:transactions:create')}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('custom:frontend:transactions:createTitle')}</DialogTitle>
          <DialogDescription>{t('custom:collections:transactions:description')}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Tabs onValueChange={(value) => handleViewChange(value as TransactionDialogView)} value={activeView}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="standard">{t('custom:frontend:transactions:tabStandard')}</TabsTrigger>
              <TabsTrigger value="split">{t('custom:frontend:transactions:tabSplit')}</TabsTrigger>
            </TabsList>

            <div className="grid gap-4 pt-4">
              <TransactionDialogDateField
                id="tx-date"
                onChange={setDate}
                value={date}
              />
              <TransactionDialogAccountField
                accountOptions={accountOptions}
                accounts={accounts}
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
                <Label htmlFor="tx-payee">{t('custom:frontend:filters:fields:payee')}</Label>
                <PayeePicker
                  accounts={accounts}
                  budgetId={budgetId ?? undefined}
                  id="tx-payee"
                  onCommit={applyPayeeCommit}
                  onValueChange={setPayeeValue}
                  payeeOptions={payeeOptions}
                  sourceAccountId={splitState.paymentAccount}
                  value={payeeValue}
                />
              </div>

              <div className="grid gap-2">
                <Label>{t('custom:frontend:transactions:typeLabel')}</Label>
                <Select onValueChange={(value) => handleTypeChange(value as Transaction['type'])} value={type}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['transaction', 'adjustment', 'opening_balance'] as const).map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`custom:fields:transactions:type:${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <TransactionAmountField
                accounts={accounts}
                onValueChange={(next) =>
                  setSplitState((prev) =>
                    syncSingleTransferSplitAmount({ ...prev, totalAmount: next }),
                  )
                }
                paymentAccountId={splitState.paymentAccount}
                value={splitState.totalAmount}
              />

              {!isTransfer && !hasCategorySplits ? (
                <div className="grid gap-2">
                  <Label>{t('custom:frontend:filters:fields:category')}</Label>
                  <GroupedPicker
                    onValueChange={(next) => {
                      setCategoryId(next)
                      setSplitState((prev) => splitStateAfterCategoryChange(prev, next, categories))
                    }}
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
            </TabsContent>

            <TabsContent className="pt-4" value="split">
              <TransactionSplitsEditor
                accounts={accounts}
                budgetId={budgetId ?? undefined}
                categoryOptions={categoryOptions}
                onChange={setSplitState}
                onCollapsedToRegular={(nextCategory) => {
                  if (nextCategory) setCategoryId(nextCategory)
                  setActiveView('standard')
                }}
                payeeOptions={payeeOptions}
                preferredCategoryId={categoryId}
                state={splitState}
              />
            </TabsContent>
          </Tabs>

          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            disabled={isPending || !budgetId}
            onClick={() => submit(true)}
            type="button"
            variant="outline"
          >
            {t('custom:frontend:transactions:savePending')}
          </Button>
          <Button disabled={isPending || !budgetId} onClick={() => submit(false)} type="button">
            {t('custom:frontend:transactions:post')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
