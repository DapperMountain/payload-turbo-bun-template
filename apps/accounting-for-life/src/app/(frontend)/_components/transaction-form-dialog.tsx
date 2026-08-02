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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@dappermountain/ui/components/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@dappermountain/ui/components/select'
import { ChevronDown, Plus } from '@dappermountain/ui/icons'
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
  isTransferToSameAccount,
  resolveTransactionTypeFromPayee,
  toPayeeTransferId,
  transferDestinationFromPayee,
} from '@/lib/frontend/transaction-payee'
import {
  parseSignedAmountString,
  paymentAccountFromList,
} from '@/lib/frontend/transaction-amount-direction'
import { EconomicKindBadge } from '@/app/(frontend)/_components/economic-kind-badge'
import {
  buildSimpleFormPosting,
  journalLegsToEntryLike,
  journalLegsToSplitState,
  seedJournalLegsFromSimpleForm,
  splitStateToJournalLegs,
  type TransactionEditorLayout,
} from '@/lib/frontend/transaction-assistance'
import {
  deriveEconomicKind,
  type EconomicKindOverride,
} from '@/lib/frontend/transaction-economic-kind'
import {
  allocateSplitsHaveCounterparties,
  clearSelfTransferDestinations,
  hasEditableSplits,
  hasSelfTransferDestination,
  merchantPayeeFromValue,
  merchantPayeesFromSplits,
  newSplitDraft,
  newTransferSplitDraft,
  resolvePostingCategoryId,
  seedAllocateSplitsFromSimpleForm,
  shouldPostFromSplitRows,
  splitIsTransfer,
  splitStateAfterCategoryChange,
  allSplitsAreTransfers,
  transactionTotalMagnitude,
  transferDestinationFromSplitState,
  type TransactionDialogView,
  type TransactionSplitFormState,
} from '@/lib/frontend/transaction-splits'
import {
  defaultSwapLegsForBudget,
  detectSwapPairFromLegs,
  newSwapLegDraft,
  orderLegsGiveReceiveFirst,
  resolveTypeFromSwapLegs,
  swapLegsHaveCounterparties,
  swapLegsToEntries,
  transactionQuotePayloadFromLegs,
  type SwapLegDraft,
} from '@/lib/frontend/transaction-swap'
import { nowTransactionDateTime, normalizeTransactionDateTime } from '@/lib/frontend/transaction-datetime'
import {
  accountClassificationGroupKey,
  buildGroupedAccountOptions,
  buildGroupedCategoryOptionsByGroup,
} from '@/lib/frontend/transaction-picker-options'
import type { Account, Category, Unit } from '@/types'
import { useAppTranslation } from '@/utils/i18n.client'

export type TransactionFormDialogProps = {
  accounts: Account[]
  budgetId: string | null
  categories: Category[]
  payeeOptions?: string[]
  defaultPaymentAccountId?: string | null
  reportingCurrencyId: string | null
  units: Unit[]
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

  return {
    paymentAccount: payment,
    totalAmount: '',
    splits: [],
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
    units,
  } = props
  const { t } = useAppTranslation()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [layout, setLayout] = useState<TransactionEditorLayout>('payment')
  const [paymentView, setPaymentView] = useState<TransactionDialogView>('standard')

  const [date, setDate] = useState(() => nowTransactionDateTime())
  const [payeeValue, setPayeeValue] = useState('')
  const [status, setStatus] = useState<TransactionStatus>('posted')
  const [categoryId, setCategoryId] = useState('')
  const [notes, setNotes] = useState('')
  const [splitState, setSplitState] = useState<TransactionSplitFormState>(() =>
    budgetId
      ? defaultSplitState(accounts, budgetId, defaultPaymentAccountId)
      : { paymentAccount: '', totalAmount: '', splits: [] },
  )
  const [swapLegs, setSwapLegs] = useState<SwapLegDraft[]>(() =>
    budgetId ? defaultSwapLegsForBudget(accounts, budgetId) : [],
  )
  /** Remount + pin give/receive group when opening via Add → Swap. */
  const [forceSwapPair, setForceSwapPair] = useState(false)
  const [swapEditorKey, setSwapEditorKey] = useState(0)
  const [economicKind, setEconomicKind] = useState<EconomicKindOverride | null>(null)

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

  const exchangeType = resolveTypeFromSwapLegs(swapLegs, accounts)
  const isTransfer =
    layout === 'exchange'
      ? exchangeType === 'transfer'
      : isTransferFromPayee(payeeValue, splitState.splits)
  const paymentAccount = paymentAccountFromList(accounts, splitState.paymentAccount)
  const transferDestinationId =
    transferDestinationFromPayee(payeeValue) ??
    (splitState.splits[0] && splitIsTransfer(splitState.splits[0])
      ? transferDestinationFromPayee(splitState.splits[0].payee)
      : null)
  const postFromSplits = shouldPostFromSplitRows(splitState, {
    view: paymentView,
    isTransfer,
  })
  const showAllocateEditor = layout === 'payment' && paymentView === 'split'
  const amountDirection = parseSignedAmountString(
    splitState.totalAmount,
    paymentAccount,
  ).direction

  const economic = useMemo(() => {
    let entries: Array<{ account: string; amount: number; category: string | null }> = []
    try {
      if (layout === 'journal' || layout === 'exchange') {
        entries = swapLegs
          .filter((leg) => leg.account && leg.amount !== '')
          .map((leg) => ({
            account: leg.account,
            amount: Number(leg.amount) || 0,
            category: leg.category || null,
          }))
      } else {
        entries = journalLegsToEntryLike(
          splitStateToJournalLegs({
            splitState,
            categoryId,
            categoryPurpose: categories.find((category) => category.id === categoryId)?.purpose,
            payeeValue,
            isTransfer,
            notes: notes || undefined,
          }),
        ).map((entry) => ({
          account: typeof entry.account === 'string' ? entry.account : '',
          amount: entry.amount,
          category: typeof entry.category === 'string' ? entry.category : null,
        }))
      }
    } catch {
      entries = []
    }

    const derivedType =
      layout === 'journal' || layout === 'exchange'
        ? exchangeType
        : resolveTransactionTypeFromPayee(payeeValue, splitState.splits)

    return deriveEconomicKind({
      entries,
      accounts,
      categories,
      reportingCurrencyId,
      override: economicKind,
      transactionType: derivedType,
    })
  }, [
    accounts,
    categories,
    categoryId,
    economicKind,
    exchangeType,
    isTransfer,
    layout,
    notes,
    payeeValue,
    reportingCurrencyId,
    splitState,
    swapLegs,
  ])

  const applyPaymentAccountChange = (nextAccountId: string) => {
    setSplitState((prev) =>
      clearSelfTransferDestinations({ ...prev, paymentAccount: nextAccountId }),
    )
    if (isTransferToSameAccount(nextAccountId, payeeValue)) {
      setPayeeValue('')
      if (budgetId) {
        setCategoryId((current) => current || defaultCategoryIdForPayee(categories, budgetId))
      }
    }
    setError(null)
  }

  const applyPayeeCommit = (next: string) => {
    const destination = transferDestinationFromPayee(next)
    if (destination && isTransferToSameAccount(splitState.paymentAccount, next)) {
      setError(t('custom:frontend:transactions:transferSameAccount'))
      return
    }

    setPayeeValue(next)
    setError(null)

    if (destination) {
      setCategoryId('')
      const nextSplitState = {
        ...splitState,
        splits: [
          newTransferSplitDraft(
            destination,
            splitState.splits[0] && splitIsTransfer(splitState.splits[0])
              ? splitState.splits[0].amount
              : String(transactionTotalMagnitude(splitState.totalAmount) || ''),
          ),
        ],
      }
      setSplitState(nextSplitState)
      setSwapLegs(
        seedJournalLegsFromSimpleForm({
          splitState: nextSplitState,
          payeeValue: toPayeeTransferId(destination),
          isTransfer: true,
          notes: notes || undefined,
          accounts,
          budgetId,
        }),
      )
      setPaymentView('standard')
      // YNAB: account payee stays on the single-line payment body (never 2-leg exchange).
      setLayout('payment')
      return
    }

    if (isPayeeTransferId(payeeValue)) {
      setSplitState((prev) => ({ ...prev, splits: [] }))
      setLayout('payment')
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
      return clearSelfTransferDestinations({ ...prev, paymentAccount: next })
    })
  }, [accounts, budgetId, defaultPaymentAccountId])

  // Payment account changed (or defaulted) onto the transfer destination — clear self-transfer.
  useEffect(() => {
    if (!isTransferToSameAccount(splitState.paymentAccount, payeeValue)) return
    setPayeeValue('')
    setSplitState((prev) => clearSelfTransferDestinations(prev))
  }, [splitState.paymentAccount, payeeValue])

  const openAllocateSplits = () => {
    const merchant =
      !isPayeeTransferId(payeeValue) && payeeValue.trim() ? payeeValue.trim() : ''
    setSplitState((prev) =>
      seedAllocateSplitsFromSimpleForm({
        state: prev,
        payee: merchant,
        categoryId,
        notes: notes.trim() || '',
      }),
    )
    setPaymentView('split')
    setError(null)
  }

  const addAllocateLine = () => {
    if (showAllocateEditor) {
      setSplitState((prev) => ({
        ...prev,
        splits: [...prev.splits, newSplitDraft()],
      }))
      setError(null)
      return
    }
    openAllocateSplits()
  }

  /** Open signed multi-leg / swap body with a pinned give/receive group. */
  const openSwapEditor = () => {
    const destination = transferDestinationId
    const seeded = seedJournalLegsFromSimpleForm({
      splitState,
      categoryId: layout === 'payment' && !showAllocateEditor ? categoryId : '',
      categoryPurpose:
        layout === 'payment' && !showAllocateEditor
          ? categories.find((category) => category.id === categoryId)?.purpose
          : null,
      payeeValue: destination ? toPayeeTransferId(destination) : payeeValue,
      isTransfer,
      notes: notes || undefined,
      accounts,
      budgetId,
    })
    // Cash+P&L seeds do not detect as a swap — start a real give/receive pair instead.
    const legs = detectSwapPairFromLegs(seeded, accounts)
      ? orderLegsGiveReceiveFirst(seeded, accounts)
      : (() => {
          const raw = splitState.totalAmount.trim()
          const mag = Math.abs(Number(raw))
          const giveAmount =
            raw !== '' && Number.isFinite(mag) && mag > 0 ? `-${mag}` : ''
          return [
            newSwapLegDraft(splitState.paymentAccount, giveAmount),
            newSwapLegDraft(destination ?? '', ''),
          ]
        })()
    setForceSwapPair(true)
    setSwapEditorKey((key) => key + 1)
    setSwapLegs(legs)
    setLayout('journal')
    setError(null)
  }

  const applyProjectedPayment = (
    projected: Extract<ReturnType<typeof journalLegsToSplitState>, { ok: true }>,
  ) => {
    setSplitState(projected.splitState)
    setCategoryId(projected.displayCategoryId)

    const destinationId = transferDestinationFromSplitState(projected.splitState)
    if (destinationId) {
      setPayeeValue(toPayeeTransferId(destinationId))
    } else {
      const merchants = merchantPayeesFromSplits(projected.splitState.splits)
      setPayeeValue(merchants.length === 1 ? merchants[0]! : '')
    }

    setPaymentView(hasEditableSplits(projected.splitState) ? 'split' : 'standard')
    setForceSwapPair(false)
    setLayout('payment')
    setError(null)
  }

  /**
   * When the user removes a give/receive pair and the remaining legs project to
   * payment/allocate, collapse automatically. Free-form journals (no pair) stay put.
   */
  const handleSwapLegsChange = (nextLegs: SwapLegDraft[]) => {
    const hadPair = Boolean(detectSwapPairFromLegs(swapLegs, accounts))
    setSwapLegs(nextLegs)
    if (!hadPair || detectSwapPairFromLegs(nextLegs, accounts)) return

    const projected = journalLegsToSplitState(nextLegs, accounts, reportingCurrencyId)
    if (projected.ok) {
      applyProjectedPayment(projected)
    }
  }

  const reset = () => {
    setDate(nowTransactionDateTime())
    setPayeeValue('')
    setStatus('posted')
    setCategoryId('')
    setNotes('')
    setLayout('payment')
    setPaymentView('standard')
    setForceSwapPair(false)
    setEconomicKind(null)
    setSplitState(
      budgetId
        ? defaultSplitState(accounts, budgetId, defaultPaymentAccountId)
        : { paymentAccount: '', totalAmount: '', splits: [] },
    )
    setSwapLegs(budgetId ? defaultSwapLegsForBudget(accounts, budgetId) : [])
    setError(null)
  }

  const submit = () => {
    if (!budgetId) {
      setError(t('custom:frontend:budgets:selectorLabel'))
      return
    }

    const asPending = status === 'pending'

    if (hasSelfTransferDestination(splitState, payeeValue)) {
      setError(t('custom:frontend:transactions:transferSameAccount'))
      return
    }

    if (
      !asPending &&
      layout === 'payment' &&
      !isTransfer &&
      !shouldPostFromSplitRows(splitState, { view: paymentView, isTransfer }) &&
      !resolvePostingCategoryId(splitState, categoryId)
    ) {
      setError(t('custom:frontend:transactions:categoryNeedsSplits'))
      return
    }

    const postingAsTransfer =
      isTransfer ||
      isPayeeTransferId(payeeValue) ||
      allSplitsAreTransfers(splitState.splits)

    if (!asPending && layout === 'payment' && !postingAsTransfer) {
      if (shouldPostFromSplitRows(splitState, { view: paymentView, isTransfer: false })) {
        if (!allocateSplitsHaveCounterparties(splitState.splits)) {
          setError(t('custom:frontend:transactions:payeeRequiredOnSplits'))
          return
        }
      } else if (!merchantPayeeFromValue(payeeValue)) {
        setError(t('custom:frontend:transactions:payeeRequired'))
        return
      }
    }

    if (
      !asPending &&
      (layout === 'journal' || layout === 'exchange') &&
      !(layout === 'exchange' && exchangeType === 'transfer')
    ) {
      if (!swapLegsHaveCounterparties(swapLegs)) {
        setError(t('custom:frontend:transactions:payeeRequiredOnSplits'))
        return
      }
    }

    const resolvedType =
      layout === 'journal' || layout === 'exchange'
        ? exchangeType
        : resolveTransactionTypeFromPayee(payeeValue, splitState.splits)

    setError(null)

    let entries: ReturnType<typeof buildSimpleFormPosting>['lines'] | undefined
    let quoteFields: { quoteUnit: string | null; quoteToReportingRate: number | null } = {
      quoteUnit: null,
      quoteToReportingRate: null,
    }

    if (!asPending) {
      try {
        if (layout === 'journal' || layout === 'exchange') {
          entries = swapLegsToEntries(swapLegs, accounts, reportingCurrencyId)
          quoteFields = transactionQuotePayloadFromLegs(swapLegs, accounts, reportingCurrencyId)
        } else {
          const posting = buildSimpleFormPosting({
            splitState,
            categoryId,
            categoryPurpose: categories.find((category) => category.id === categoryId)?.purpose,
            payeeValue,
            isTransfer: resolvedType === 'transfer' || isTransfer,
            activeView: paymentView,
            notes: notes || undefined,
            accounts,
            reportingCurrencyId,
          })
          entries = posting.lines
          quoteFields = {
            quoteUnit: posting.quoteUnit,
            quoteToReportingRate: posting.quoteToReportingRate,
          }
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Failed to post transaction')
        return
      }
    }

    startTransition(async () => {
      const result = await createTransactionAction({
        budget: budgetId,
        date: normalizeTransactionDateTime(date),
        type: resolvedType,
        economicKind:
          economic.confidence === 'ambiguous'
            ? economicKind ??
              (economic.kind === 'buy' || economic.kind === 'sell' || economic.kind === 'transfer'
                ? economic.kind
                : null)
            : null,
        entries,
        ...quoteFields,
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

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    // Always start create on the payment body — closing after "Edit as journal"
    // must not leave layout stuck for the next open.
    if (next) {
      reset()
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button disabled={!budgetId} size="sm">
          <Plus className="size-4" />
          {t('custom:frontend:transactions:create')}
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          'flex max-h-[90vh] flex-col gap-4 overflow-hidden',
          layout === 'journal' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <DialogHeader>
          <DialogTitle>{t('custom:frontend:transactions:createTitle')}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex items-center justify-between gap-3">
              <span>
                {layout === 'exchange'
                  ? t('custom:frontend:transactions:exchangeHint')
                  : t('custom:frontend:transactions:editorHint')}
              </span>
              <TransactionStatusChip
                disabled={isPending}
                onStatusChange={setStatus}
                status={status}
              />
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-4">
            <TransactionDialogDateField id="tx-date" onChange={setDate} value={date} />

            {layout === 'payment' ? (
              <>
                <TransactionDialogAccountField
                  accountOptions={accountOptions}
                  formatAccountGroup={formatAccountGroup}
                  onChange={applyPaymentAccountChange}
                  value={splitState.paymentAccount}
                />
                {!showAllocateEditor ? (
                  <div className="grid gap-2">
                    <Label htmlFor="tx-payee">{t('custom:frontend:filters:fields:payee')}</Label>
                    <PayeePicker
                      accounts={accounts}
                      amountDirection={amountDirection}
                      budgetId={budgetId ?? undefined}
                      id="tx-payee"
                      onCommit={applyPayeeCommit}
                      onValueChange={(next) => {
                        if (isTransferToSameAccount(splitState.paymentAccount, next)) {
                          setError(t('custom:frontend:transactions:transferSameAccount'))
                          return
                        }
                        setPayeeValue(next)
                      }}
                      payeeOptions={payeeOptions}
                      sourceAccountId={splitState.paymentAccount}
                      value={payeeValue}
                    />
                  </div>
                ) : null}

                <TransactionAmountField
                  accounts={accounts}
                  disabled={showAllocateEditor}
                  onValueChange={(next) =>
                    setSplitState((prev) => ({ ...prev, totalAmount: next }))
                  }
                  paymentAccountId={splitState.paymentAccount}
                  value={splitState.totalAmount}
                />

                {economic.kind !== 'other' ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{t('custom:frontend:transactions:economicKindLabel')}</span>
                    <EconomicKindBadge kind={economic.kind} />
                  </div>
                ) : null}

                {!showAllocateEditor ? (
                  <div className="grid gap-2">
                    <Label>{t('custom:frontend:filters:fields:category')}</Label>
                    {isTransfer ? (
                      <GroupedPicker
                        disabled
                        emptyLabel={t('custom:frontend:transactions:categoryNotNeeded')}
                        emptyValue="__none__"
                        onValueChange={() => {}}
                        options={[]}
                        placeholder={t('custom:frontend:transactions:categoryNotNeeded')}
                        value="__none__"
                      />
                    ) : (
                      <GroupedPicker
                        onValueChange={(next) => {
                          setCategoryId(next)
                          setSplitState((prev) =>
                            splitStateAfterCategoryChange(prev, next, categories),
                          )
                        }}
                        options={categoryOptions}
                        placeholder={t('custom:frontend:filters:selectValue')}
                        searchPlaceholder={t('custom:frontend:filters:searchCategories')}
                        value={categoryId}
                      />
                    )}
                  </div>
                ) : null}

                {showAllocateEditor ? (
                  <TransactionSplitsEditor
                    accounts={accounts}
                    budgetId={budgetId ?? undefined}
                    categoryOptions={categoryOptions}
                    hideAddButton
                    onChange={setSplitState}
                    onCollapsedToRegular={(nextCategoryId) => {
                      setCategoryId(nextCategoryId)
                      setPaymentView('standard')
                    }}
                    payeeOptions={payeeOptions}
                    preferredCategoryId={categoryId}
                    state={splitState}
                    units={units}
                  />
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="tx-notes">{t('custom:fields:transactions:entryNotes')}</Label>
                    <Input
                      id="tx-notes"
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder={t('custom:fields:transactions:entryNotesPlaceholder')}
                      value={notes}
                    />
                  </div>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" type="button" variant="outline">
                      <Plus className="size-4" />
                      {t('custom:frontend:transactions:addEntry')}
                      <ChevronDown className="size-4 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onSelect={addAllocateLine}>
                      {t('custom:frontend:transactions:addEntryLine')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={openSwapEditor}>
                      {t('custom:frontend:transactions:addEntrySwap')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : null}

            {layout === 'exchange' || layout === 'journal' ? (
              <>
                <TransactionSwapEditor
                  key={swapEditorKey}
                  accountOptions={accountOptions}
                  accounts={accounts}
                  budgetId={budgetId ?? undefined}
                  categoryOptions={categoryOptions}
                  forceSwapPair={forceSwapPair}
                  formatAccountGroup={formatAccountGroup}
                  legs={swapLegs}
                  onChange={handleSwapLegsChange}
                  payeeOptions={payeeOptions}
                  reportingCurrencyId={reportingCurrencyId}
                  units={units}
                />

                {layout === 'exchange' &&
                economic.confidence === 'ambiguous' &&
                economic.choices ? (
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-2">
                      {t('custom:frontend:transactions:economicKindLabel')}
                      <EconomicKindBadge ambiguous kind={economic.kind} />
                    </Label>
                    <Select
                      onValueChange={(value) => setEconomicKind(value as EconomicKindOverride)}
                      value={
                        economicKind ??
                        (economic.kind === 'buy' ||
                        economic.kind === 'sell' ||
                        economic.kind === 'transfer'
                          ? economic.kind
                          : 'sell')
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {economic.choices.map((choice) => (
                          <SelectItem key={choice} value={choice}>
                            {t(`custom:frontend:transactions:economicKind:${choice}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {t('custom:frontend:transactions:economicKindHint')}
                    </p>
                  </div>
                ) : layout === 'exchange' && economic.kind !== 'other' ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{t('custom:frontend:transactions:economicKindLabel')}</span>
                    <EconomicKindBadge kind={economic.kind} />
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

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
