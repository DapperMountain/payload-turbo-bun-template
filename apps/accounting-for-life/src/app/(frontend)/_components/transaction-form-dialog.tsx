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
import { cn } from '@dappermountain/ui/lib/utils'

import { createTransactionAction } from '@/app/(frontend)/actions/transactions'
import { GroupedPicker } from '@/app/(frontend)/_components/grouped-picker'
import { PayeePicker } from '@/app/(frontend)/_components/payee-picker'
import { TransactionAmountField } from '@/app/(frontend)/_components/transaction-amount-field'
import {
  TransactionDialogAccountField,
  TransactionDialogDateField,
} from '@/app/(frontend)/_components/transaction-dialog-fields'
import { TransactionSplitsEditor } from '@/app/(frontend)/_components/transaction-splits-editor'
import { TransactionSwapEditor } from '@/app/(frontend)/_components/transaction-swap-editor'
import {
  TransactionStatusChip,
  type TransactionStatus,
} from '@/app/(frontend)/_components/transaction-status-badge'
import {
  defaultCategoryIdForPayee,
  isPayeeTransferId,
  isTransferFromPayee,
  transferDestinationFromPayee,
  transferSkipsCategory,
} from '@/lib/frontend/transaction-payee'
import {
  parseSignedAmountString,
  paymentAccountFromList,
} from '@/lib/frontend/transaction-amount-direction'
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
import {
  defaultSwapLegsForBudget,
  resolveTypeFromSwapLegs,
  swapLegsToEntries,
  type SwapLegDraft,
} from '@/lib/frontend/transaction-swap'
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
  reportingCurrencyId: string | null
}

function swapLegsNeedDefaultSeed(legs: SwapLegDraft[]): boolean {
  return legs.length < 2 || legs.every((leg) => !leg.amount)
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
  const {
    accounts,
    budgetId,
    categories,
    payeeOptions = [],
    defaultPaymentAccountId,
    reportingCurrencyId,
  } = props
  const { t } = useAppTranslation()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [activeView, setActiveView] = useState<TransactionDialogView>('standard')

  const [date, setDate] = useState(() => nowTransactionDateTime())
  const [payeeValue, setPayeeValue] = useState('')
  const [type, setType] = useState<Transaction['type']>('transaction')
  const [status, setStatus] = useState<TransactionStatus>('posted')
  const [categoryId, setCategoryId] = useState('')
  const [splitState, setSplitState] = useState<TransactionSplitFormState>(() =>
    budgetId
      ? defaultSplitState(accounts, budgetId, defaultPaymentAccountId)
      : { paymentAccount: '', totalAmount: '', splits: [] },
  )
  const [swapLegs, setSwapLegs] = useState<SwapLegDraft[]>(() =>
    budgetId ? defaultSwapLegsForBudget(accounts, budgetId) : [],
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
  const amountDirection = parseSignedAmountString(
    splitState.totalAmount,
    paymentAccountFromList(accounts, splitState.paymentAccount),
  ).direction

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
      const next =
        accountIds.includes(prev.paymentAccount)
          ? prev.paymentAccount
          : defaultPaymentAccountId && accountIds.includes(defaultPaymentAccountId)
            ? defaultPaymentAccountId
            : (accountIds[0] ?? '')
      return { ...prev, paymentAccount: next }
    })
  }, [accounts, budgetId, defaultPaymentAccountId])

  const handleViewChange = (view: TransactionDialogView) => {
    if (view === 'split') {
      setSplitState((prev) =>
        seedSplitsForView(prev, { categoryId, payeeValue, isTransfer }),
      )
    } else if (view === 'swap') {
      if (budgetId && swapLegsNeedDefaultSeed(swapLegs)) {
        setSwapLegs(defaultSwapLegsForBudget(accounts, budgetId))
      }
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
    setStatus('posted')
    setCategoryId('')
    setActiveView('standard')
    setSplitState(
      budgetId
        ? defaultSplitState(accounts, budgetId, defaultPaymentAccountId)
        : { paymentAccount: '', totalAmount: '', splits: [] },
    )
    setSwapLegs(budgetId ? defaultSwapLegsForBudget(accounts, budgetId) : [])
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

  const submit = () => {
    if (!budgetId) {
      setError(t('custom:frontend:budgets:selectorLabel'))
      return
    }

    const asPending = status === 'pending'
    const isSwap = activeView === 'swap'

    if (
      !asPending &&
      !isSwap &&
      !isTransfer &&
      !shouldPostFromSplitRows(splitState, { view: activeView, isTransfer }) &&
      !resolvePostingCategoryId(splitState, categoryId)
    ) {
      setError(t('custom:frontend:transactions:categoryNeedsSplits'))
      return
    }

    const resolvedType = isSwap
      ? resolveTypeFromSwapLegs(swapLegs, accounts)
      : isPayeeTransferId(payeeValue) || allSplitsAreTransfers(splitState.splits)
        ? 'transfer'
        : type
    const resolvedPayee =
      isPayeeTransferId(payeeValue) || (!isSwap && resolvedType === 'transfer')
        ? undefined
        : payeeValue || undefined

    setError(null)

    let entries: ReturnType<typeof buildEntriesForSave> | undefined

    if (!asPending) {
      try {
        entries = isSwap
          ? swapLegsToEntries(swapLegs, accounts, reportingCurrencyId)
          : buildEntriesForSave({
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
        payee: resolvedPayee,
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
      <DialogContent
        className={cn(
          'flex max-h-[90vh] flex-col gap-4 overflow-hidden',
          activeView === 'swap' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <DialogHeader>
          <DialogTitle>{t('custom:frontend:transactions:createTitle')}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex items-center justify-between gap-3">
              <span>{t('custom:collections:transactions:description')}</span>
              <TransactionStatusChip
                disabled={isPending}
                onStatusChange={setStatus}
                status={status}
              />
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Tabs onValueChange={(value) => handleViewChange(value as TransactionDialogView)} value={activeView}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="standard">{t('custom:frontend:transactions:tabStandard')}</TabsTrigger>
              <TabsTrigger value="split">{t('custom:frontend:transactions:tabSplit')}</TabsTrigger>
              <TabsTrigger value="swap">{t('custom:frontend:transactions:tabSwap')}</TabsTrigger>
            </TabsList>

            <TabsContent className="grid gap-4 pt-4" value="standard">
              <TransactionDialogDateField
                id="tx-date"
                onChange={setDate}
                value={date}
              />
              <TransactionDialogAccountField
                accountOptions={accountOptions}
                formatAccountGroup={formatAccountGroup}
                onChange={(value) =>
                  setSplitState((prev) => ({ ...prev, paymentAccount: value }))
                }
                value={splitState.paymentAccount}
              />
              <div className="grid gap-2">
                <Label htmlFor="tx-payee">{t('custom:frontend:filters:fields:payee')}</Label>
                <PayeePicker
                  accounts={accounts}
                  amountDirection={amountDirection}
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
                  <div
                    aria-disabled
                    className="flex h-9 cursor-not-allowed items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground"
                  >
                    {t('custom:frontend:transactions:categoryNotNeeded')}
                  </div>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent className="grid gap-4 pt-4" value="split">
              <TransactionDialogDateField
                id="tx-date-split"
                onChange={setDate}
                value={date}
              />
              <TransactionDialogAccountField
                accountOptions={accountOptions}
                formatAccountGroup={formatAccountGroup}
                onChange={(value) =>
                  setSplitState((prev) => ({ ...prev, paymentAccount: value }))
                }
                value={splitState.paymentAccount}
              />
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

            <TabsContent className="grid gap-4 pt-4" value="swap">
              <TransactionDialogDateField
                id="tx-date-swap"
                onChange={setDate}
                value={date}
              />
              <div className="grid gap-2">
                <Label htmlFor="tx-payee-swap">{t('custom:frontend:filters:fields:payee')}</Label>
                <PayeePicker
                  accounts={accounts}
                  amountDirection={amountDirection}
                  budgetId={budgetId ?? undefined}
                  id="tx-payee-swap"
                  onCommit={setPayeeValue}
                  onValueChange={setPayeeValue}
                  payeeOptions={payeeOptions}
                  sourceAccountId=""
                  value={payeeValue}
                />
              </div>
              <TransactionSwapEditor
                accountOptions={accountOptions}
                accounts={accounts}
                categoryOptions={categoryOptions}
                formatAccountGroup={formatAccountGroup}
                legs={swapLegs}
                onChange={setSwapLegs}
                reportingCurrencyId={reportingCurrencyId}
              />
            </TabsContent>
          </Tabs>

          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button disabled={isPending || !budgetId} onClick={submit} type="button">
            {t('custom:frontend:forms:save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
