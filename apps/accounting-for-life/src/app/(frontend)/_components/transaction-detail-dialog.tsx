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
import { Label } from '@dappermountain/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@dappermountain/ui/components/select'
import { Textarea } from '@dappermountain/ui/components/textarea'
import { Plus } from '@dappermountain/ui/icons'
import { cn } from '@dappermountain/ui/lib/utils'

import {
  deleteTransactionAction,
  updateTransactionAction,
  type TransactionEntryInputClient,
} from '@/app/(frontend)/actions/transactions'
import { GroupedPicker } from '@/app/(frontend)/_components/grouped-picker'
import { PayeePicker } from '@/app/(frontend)/_components/payee-picker'
import { TransactionAmountField } from '@/app/(frontend)/_components/transaction-amount-field'
import {
  TransactionDialogAccountField,
  TransactionDialogDateField,
} from '@/app/(frontend)/_components/transaction-dialog-fields'
import { TransactionSplitsEditor } from '@/app/(frontend)/_components/transaction-splits-editor'
import { TransactionSwapEditor } from '@/app/(frontend)/_components/transaction-swap-editor'
import { TransactionStatusChip } from '@/app/(frontend)/_components/transaction-status-badge'
import { TransferPayeeLabel } from '@/app/(frontend)/_components/transfer-payee-label'
import {
  createPayeeLabelHelpers,
  defaultCategoryIdForPayee,
  interpolateTemplate,
  isPayeeTransferId,
  isTransferFromPayee,
  payeeDisplayLabel,
  payeeValueFromTransaction,
  resolveTransactionTypeFromPayee,
  resolveTransferPair,
  toPayeeTransferId,
  transferDestinationFromPayee,
  transferPayeePresentation,
} from '@/lib/frontend/transaction-payee'
import {
  parseSignedAmountString,
  paymentAccountFromList,
} from '@/lib/frontend/transaction-amount-direction'
import {
  normalizeTransactionDateTime,
  transactionDateTimeEquals,
} from '@/lib/frontend/transaction-datetime'
import { bubbledEntryNotes } from '@/collections/Transactions/lib/entries'
import { EconomicKindBadge } from '@/app/(frontend)/_components/economic-kind-badge'
import {
  buildSimpleFormPosting,
  journalLegsToEntryLike,
  resolveEditorLayout,
  seedJournalLegsFromSimpleForm,
  splitStateToJournalLegs,
  type TransactionEditorLayout,
} from '@/lib/frontend/transaction-assistance'
import {
  deriveEconomicKind,
  economicKindOverrideFromTransaction,
  type EconomicKindOverride,
} from '@/lib/frontend/transaction-economic-kind'
import {
  allocateSplitsHaveCounterparties,
  hasEditableSplits,
  headerPayeeFromAllocateSplits,
  isMultiSplitTransaction,
  merchantPayeeFromValue,
  merchantPayeesFromSplits,
  newTransferSplitDraft,
  normalizeSplitFormFromEntries,
  seedAllocateSplitsFromSimpleForm,
  shouldPostFromSplitRows,
  splitIsTransfer,
  splitStateAfterCategoryChange,
  standardAmountLocked,
  transactionTotalMagnitude,
  transferSplitCount,
  type TransactionDialogView,
  type TransactionSplitFormState,
} from '@/lib/frontend/transaction-splits'
import {
  detectSwapPairFromLegs,
  entriesToSwapLegs,
  headerPayeeFromSwapLegs,
  merchantPayeesFromSwapLegs,
  orderLegsGiveReceiveFirst,
  resolveTypeFromSwapLegs,
  swapLegsHaveCounterparties,
  swapLegsToEntries,
  transactionQuotePayloadFromLegs,
  type SwapLegDraft,
} from '@/lib/frontend/transaction-swap'
import { transactionEntries } from '@/lib/frontend/transactions.display'
import {
  accountClassificationGroupKey,
  buildGroupedAccountOptions,
  buildGroupedCategoryOptionsByGroup,
} from '@/lib/frontend/transaction-picker-options'
import type { Account, Category, Transaction, Unit } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'
import { useAppTranslation } from '@/utils/i18n.client'

export type TransactionDetailDialogProps = {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: Account[]
  accountLabels: Record<string, string>
  categories: Category[]
  payeeOptionsByBudget: Record<string, string[]>
  reportingCurrencyId: string | null
  units: Unit[]
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
    reportingCurrencyId,
    units,
    initialView = 'standard',
  } = props
  const { t } = useAppTranslation()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [layout, setLayout] = useState<TransactionEditorLayout>('payment')
  /** Payment body: simple fields vs allocate editor (payee per line). */
  const [paymentView, setPaymentView] = useState<TransactionDialogView>('standard')
  const [date, setDate] = useState('')
  const [payeeValue, setPayeeValue] = useState('')
  const [initialPayeeValue, setInitialPayeeValue] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<Transaction['status']>('pending')
  const [categoryId, setCategoryId] = useState('')
  const [splitState, setSplitState] = useState<TransactionSplitFormState>({
    paymentAccount: '',
    totalAmount: '',
    splits: [],
  })
  const [swapLegs, setSwapLegs] = useState<SwapLegDraft[]>([])
  const [economicKind, setEconomicKind] = useState<EconomicKindOverride | null>(null)

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

    const nextLayout = resolveEditorLayout({
      entries: lines,
      accounts,
      reportingCurrencyId,
      preferred: initialView,
    })
    setLayout(nextLayout)
    setPaymentView(
      nextLayout === 'payment' &&
        (hasEditableSplits(normalized) ||
          initialView === 'split' ||
          normalized.splits.length > 1)
        ? 'split'
        : 'standard',
    )
    setDate(normalizeTransactionDateTime(transaction.date))
    const nextPayee = payeeValueFromTransaction(transaction)
    setPayeeValue(nextPayee)
    setInitialPayeeValue(nextPayee)
    setNotes(bubbledEntryNotes(lines) ?? '')
    setStatus(transaction.status)
    setCategoryId(normalized.displayCategoryId)
    setSplitState(normalized)
    const headerMerchant =
      nextPayee && !isPayeeTransferId(nextPayee) ? nextPayee.trim() : ''
    const seededLegs = entriesToSwapLegs(lines).map((leg) =>
      !leg.payee && leg.category && headerMerchant
        ? { ...leg, payee: headerMerchant }
        : leg,
    )
    setSwapLegs(orderLegsGiveReceiveFirst(seededLegs, accounts))
    setEconomicKind(economicKindOverrideFromTransaction(transaction))
    setError(null)
    setConfirmDelete(false)
    // Re-seed when the dialog opens or switches transaction — not on every prop identity change.
  }, [open, transaction?.id, initialView])

  const economic = useMemo(() => {
    if (!transaction) {
      return { kind: 'other' as const, confidence: 'certain' as const }
    }

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
            isTransfer: isTransferFromPayee(payeeValue, splitState.splits),
            notes: notes || undefined,
          }),
        ).map((entry) => ({
          account: getCollectionId(entry.account) ?? '',
          amount: entry.amount,
          category: getCollectionId(entry.category) ?? null,
        }))
      }
    } catch {
      entries = transactionEntries(transaction).map((entry) => ({
        account: getCollectionId(entry.account) ?? '',
        amount: entry.amount,
        category: getCollectionId(entry.category) ?? null,
      }))
    }

    return deriveEconomicKind({
      entries,
      accounts,
      categories,
      reportingCurrencyId,
      override: economicKind,
      transactionType: transaction.type,
    })
  }, [
    accounts,
    categories,
    categoryId,
    economicKind,
    layout,
    notes,
    payeeValue,
    reportingCurrencyId,
    splitState,
    swapLegs,
    transaction,
  ])

  if (!transaction) {
    return null
  }

  const readOnly = false
  const isAccountTransferPayee = isPayeeTransferId(payeeValue)
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
  const payeeDirty = payeeValue !== initialPayeeValue
  const showMultiSplit = isMultiSplitTransaction(splitState.splits)
  const postFromSplits = shouldPostFromSplitRows(splitState, {
    view: paymentView,
    isTransfer: layout === 'exchange' || isTransfer,
  })
  const showAllocateEditor = layout === 'payment' && paymentView === 'split'
  const amountDirection = parseSignedAmountString(
    splitState.totalAmount,
    paymentAccount,
  ).direction

  const resolvedType =
    layout === 'journal' || layout === 'exchange'
      ? resolveTypeFromSwapLegs(swapLegs, accounts, payeeValue)
      : resolveTransactionTypeFromPayee(payeeValue, splitState.splits)
  const displayType: Transaction['type'] =
    resolvedType === 'transfer'
      ? 'transfer'
      : transaction.type === 'transfer'
        ? 'transaction'
        : transaction.type

  const payeeTitle = (() => {
    if (layout === 'exchange' || layout === 'journal') {
      const swapPair = detectSwapPairFromLegs(swapLegs, accounts)
      if (swapPair) {
        const giveId = swapLegs[swapPair.giveIndex]?.account ?? ''
        const receiveId = swapLegs[swapPair.receiveIndex]?.account ?? ''
        const givePayee = swapLegs[swapPair.giveIndex]?.payee.trim() ?? ''
        const receivePayee = swapLegs[swapPair.receiveIndex]?.payee.trim() ?? ''
        // Pair-side merchants only (not fee-line payees).
        const pairMerchants = [givePayee, receivePayee].filter(Boolean)
        if (pairMerchants.length === 1 && new Set(pairMerchants).size === 1) {
          return pairMerchants[0]!
        }
        if (giveId && receiveId) {
          const pair = resolveTransferPair(accounts, {
            transaction: transaction ?? undefined,
            payeeValue: toPayeeTransferId(receiveId),
            paymentAccountId: giveId,
          })
          if (pair) {
            return (
              <TransferPayeeLabel
                presentation={transferPayeePresentation(pair, giveId, amountDirection)}
              />
            )
          }
        }
        if (pairMerchants.length >= 2) {
          return `${pairMerchants[0]} · ${pairMerchants[1]}`
        }
      }

      const merchants = merchantPayeesFromSwapLegs(swapLegs)
      if (merchants.length >= 2) {
        if (merchants.length === 2) return merchants.join(' · ')
        return `${merchants[0]} · +${merchants.length - 1}`
      }
      // Single merchant only when it is not just a fee line on a multi-leg book.
      if (merchants.length === 1 && !(swapPair && swapPair.otherIndexes.length > 0)) {
        return merchants[0]!
      }
      return t('custom:frontend:transactions:splitTransaction')
    }

    const transfers = transferSplitCount(splitState.splits)
    if (transfers > 1) {
      return interpolateTemplate(t('custom:frontend:transactions:splitTransferCount'), {
        count: String(transfers),
      })
    }
    if (isTransfer) {
      const pair = resolveTransferPair(accounts, {
        transaction: transaction ?? undefined,
        payeeValue,
        paymentAccountId: splitState.paymentAccount,
      })
      if (pair) {
        return (
          <TransferPayeeLabel
            presentation={transferPayeePresentation(
              pair,
              splitState.paymentAccount,
              amountDirection,
            )}
          />
        )
      }
    }

    // Allocate / split lines: title from per-line merchants (not a single header field).
    if (showAllocateEditor || postFromSplits) {
      const merchants = merchantPayeesFromSplits(splitState.splits)
      if (merchants.length === 1) return merchants[0]!
      if (merchants.length === 2) return merchants.join(' · ')
      if (merchants.length > 2) {
        return `${merchants[0]} · +${merchants.length - 1}`
      }
      return t('custom:frontend:transactions:splitTransaction')
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
      setLayout('exchange')
      return
    }

    if (isPayeeTransferId(payeeValue) || transaction.type === 'transfer') {
      setSplitState((prev) => ({ ...prev, splits: [] }))
      setLayout('payment')
    }

    if (budgetId) {
      setCategoryId((current) => current || defaultCategoryIdForPayee(categories, budgetId))
    }
  }

  /** YNAB-style: turn a simple payment into allocate lines with payee per line. */
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

  const openJournal = () => {
    if (layout !== 'exchange') {
      const destination = transferDestinationId
      setSwapLegs(
        seedJournalLegsFromSimpleForm({
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
        }),
      )
    }
    setLayout('journal')
    setError(null)
  }

  const buildEntries = ():
    | {
        ok: true
        lines: TransactionEntryInputClient[] | undefined
        quoteUnit?: string | null
        quoteToReportingRate?: number | null
      }
    | { ok: false } => {
    if (readOnly) {
      return { ok: false }
    }

    if (layout === 'journal' || layout === 'exchange') {
      if (status === 'pending') {
        return { ok: true, lines: undefined }
      }

      try {
        return {
          ok: true,
          lines: swapLegsToEntries(swapLegs, accounts, reportingCurrencyId),
          ...transactionQuotePayloadFromLegs(swapLegs, accounts, reportingCurrencyId),
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Invalid transaction')
        return { ok: false }
      }
    }

    try {
      const posting = buildSimpleFormPosting({
        splitState,
        categoryId,
        categoryPurpose: categories.find((category) => category.id === categoryId)?.purpose,
        payeeValue,
        isTransfer,
        activeView: paymentView,
        notes: notes || undefined,
        accounts,
        reportingCurrencyId,
      })
      return { ok: true, ...posting }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Invalid transaction')
      return { ok: false }
    }
  }

  const save = () => {
    if (readOnly) return

    const asPending = status === 'pending'
    if (!asPending && layout === 'payment' && !isTransfer) {
      if (showAllocateEditor || postFromSplits) {
        if (!allocateSplitsHaveCounterparties(splitState.splits)) {
          setError(t('custom:frontend:transactions:payeeRequiredOnSplits'))
          return
        }
      } else if (!merchantPayeeFromValue(payeeValue)) {
        setError(t('custom:frontend:transactions:payeeRequired'))
        return
      }
    }

    if (!asPending && (layout === 'journal' || layout === 'exchange') && !isTransfer) {
      if (!swapLegsHaveCounterparties(swapLegs)) {
        setError(t('custom:frontend:transactions:payeeRequiredOnSplits'))
        return
      }
    }

    setError(null)
    startTransition(async () => {
      const built = buildEntries()
      if (!built.ok) return

      const exchangeIsTransfer = layout === 'exchange' && exchangeType === 'transfer'
      let resolvedPayee =
        isAccountTransferPayee || exchangeIsTransfer ? null : payeeValue || null
      const clearStaleHumanPayee =
        (isAccountTransferPayee || exchangeIsTransfer) &&
        Boolean(transaction.payee) &&
        !isPayeeTransferId(String(transaction.payee))

      const syncedHeaderPayee =
        layout === 'journal' || layout === 'exchange'
          ? headerPayeeFromSwapLegs(swapLegs, accounts)
          : layout === 'payment' && (showAllocateEditor || postFromSplits)
            ? headerPayeeFromAllocateSplits(splitState.splits)
            : undefined
      const headerPayeeFromLines = syncedHeaderPayee !== undefined
      if (headerPayeeFromLines) {
        resolvedPayee = syncedHeaderPayee
      }

      const resolvedEconomicKind: Transaction['economicKind'] =
        economic.confidence === 'ambiguous'
          ? economicKind ??
            (economic.kind === 'buy' || economic.kind === 'sell' || economic.kind === 'transfer'
              ? economic.kind
              : null)
          : null

      const nextType =
        layout === 'journal' || layout === 'exchange'
          ? resolveTypeFromSwapLegs(swapLegs, accounts, payeeValue)
          : resolveTransactionTypeFromPayee(payeeValue, splitState.splits)
      const typeDirty = nextType !== transaction.type
      const dateDirty = !transactionDateTimeEquals(date, transaction.date)
      const statusDirty = status !== transaction.status
      const economicDirty =
        resolvedEconomicKind !== economicKindOverrideFromTransaction(transaction)

      const result = await updateTransactionAction({
        id: transaction.id,
        date: dateDirty ? normalizeTransactionDateTime(date) : undefined,
        payee:
          payeeDirty || clearStaleHumanPayee || headerPayeeFromLines ? resolvedPayee : undefined,
        status: statusDirty ? status : undefined,
        type: typeDirty ? nextType : undefined,
        economicKind: economicDirty ? resolvedEconomicKind : undefined,
        entries: built.lines,
        ...(built.quoteUnit !== undefined
          ? { quoteUnit: built.quoteUnit, quoteToReportingRate: built.quoteToReportingRate }
          : {}),
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
      <DialogContent
        className={cn(
          'flex max-h-[90vh] flex-col gap-4 overflow-hidden',
          layout === 'journal' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <DialogHeader>
          <DialogTitle>{payeeTitle}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex items-center justify-between gap-3">
              <span className="flex flex-wrap items-center gap-2">
                <EconomicKindBadge
                  ambiguous={economic.confidence === 'ambiguous'}
                  kind={economic.kind}
                />
                <span className="text-muted-foreground">
                  {t(`custom:fields:transactions:type:${displayType}`)}
                  {layout === 'journal'
                    ? detectSwapPairFromLegs(swapLegs, accounts)
                      ? ` · ${t('custom:frontend:transactions:swapPairTitle')}`
                      : ` · ${t('custom:frontend:transactions:splits')}`
                    : layout === 'exchange'
                      ? ` · ${t('custom:frontend:transactions:exchangeLabel')}`
                      : showMultiSplit
                        ? ` · ${t('custom:frontend:transactions:splits')}`
                        : ''}
                </span>
              </span>
              <TransactionStatusChip
                disabled={readOnly || isPending}
                onStatusChange={setStatus}
                status={status}
              />
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-4">
            <TransactionDialogDateField
              disabled={readOnly || isPending}
              id="tx-edit-date"
              onChange={setDate}
              value={date}
            />

            {layout === 'payment' ? (
              <>
                <TransactionDialogAccountField
                  accountOptions={accountOptions}
                  disabled={readOnly || isPending}
                  formatAccountGroup={formatAccountGroup}
                  onChange={(value) =>
                    setSplitState((prev) => ({ ...prev, paymentAccount: value }))
                  }
                  value={splitState.paymentAccount}
                />

                {!showAllocateEditor ? (
                  <div className="grid gap-2">
                    <Label htmlFor="tx-edit-payee">{t('custom:frontend:filters:fields:payee')}</Label>
                    <PayeePicker
                      accounts={accounts}
                      amountDirection={amountDirection}
                      budgetId={budgetId || undefined}
                      disabled={readOnly || isPending}
                      id="tx-edit-payee"
                      onCommit={applyPayeeCommit}
                      onValueChange={setPayeeValue}
                      payeeOptions={payeeOptions}
                      sourceAccountId={splitState.paymentAccount}
                      transaction={transaction}
                      value={payeeValue}
                    />
                  </div>
                ) : null}

                <TransactionAmountField
                  accounts={accounts}
                  disabled={
                    readOnly ||
                    isPending ||
                    standardAmountLocked(splitState, isTransfer) ||
                    showAllocateEditor
                  }
                  onValueChange={(next) =>
                    setSplitState((prev) => ({ ...prev, totalAmount: next }))
                  }
                  paymentAccountId={splitState.paymentAccount}
                  value={splitState.totalAmount}
                />

                {!isTransfer && !showAllocateEditor ? (
                  <div className="grid gap-2">
                    <Label>{t('custom:frontend:filters:fields:category')}</Label>
                    <GroupedPicker
                      disabled={isPending || readOnly}
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

                {showAllocateEditor ? (
                  <TransactionSplitsEditor
                    accounts={accounts}
                    budgetId={budgetId || undefined}
                    categoryOptions={categoryOptions}
                    disabled={readOnly || isPending}
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
                    <Label htmlFor="tx-edit-notes">{t('custom:fields:transactions:entryNotes')}</Label>
                    <Textarea
                      disabled={readOnly || isPending}
                      id="tx-edit-notes"
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder={t('custom:fields:transactions:entryNotesPlaceholder')}
                      rows={2}
                      value={notes}
                    />
                  </div>
                )}

                {!readOnly ? (
                  <div className="flex flex-wrap gap-2">
                    {!showAllocateEditor ? (
                      <Button
                        disabled={isPending}
                        onClick={openAllocateSplits}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Plus className="size-4" />
                        {t('custom:frontend:transactions:addLine')}
                      </Button>
                    ) : null}
                    <Button
                      disabled={isPending}
                      onClick={openJournal}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {t('custom:frontend:transactions:editAsJournal')}
                    </Button>
                  </div>
                ) : null}
              </>
            ) : null}

            {layout === 'exchange' || layout === 'journal' ? (
              <>
                {!isTransfer ? (
                  <div className="grid gap-2">
                    <Label htmlFor="tx-edit-swap-payee">
                      {t('custom:frontend:filters:fields:payee')}
                    </Label>
                    <PayeePicker
                      accounts={accounts}
                      budgetId={budgetId || undefined}
                      disabled={readOnly || isPending}
                      id="tx-edit-swap-payee"
                      onCommit={setPayeeValue}
                      onValueChange={setPayeeValue}
                      payeeOptions={payeeOptions}
                      placeholder={t('custom:frontend:transactions:payeePlaceholder')}
                      value={payeeValue}
                    />
                  </div>
                ) : null}

                <TransactionSwapEditor
                  accountOptions={accountOptions}
                  accounts={accounts}
                  budgetId={budgetId || undefined}
                  categoryOptions={categoryOptions}
                  disabled={isPending || readOnly}
                  formatAccountGroup={formatAccountGroup}
                  legs={swapLegs}
                  onChange={setSwapLegs}
                  payeeOptions={payeeOptions}
                  reportingCurrencyId={reportingCurrencyId}
                  units={units}
                />

                {layout === 'exchange' &&
                economic.confidence === 'ambiguous' &&
                economic.choices ? (
                  <div className="grid gap-2">
                    <Label>{t('custom:frontend:transactions:economicKindLabel')}</Label>
                    <Select
                      disabled={readOnly || isPending}
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
                ) : null}
              </>
            ) : null}
          </div>

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
