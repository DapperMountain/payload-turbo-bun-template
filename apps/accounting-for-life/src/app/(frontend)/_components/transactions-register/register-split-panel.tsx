'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useTransition } from 'react'
import { Button } from '@dappermountain/ui/components/button'
import { Label } from '@dappermountain/ui/components/label'
import { ArrowRight } from '@dappermountain/ui/icons'

import { updateTransactionAction } from '@/app/(frontend)/actions/transactions'
import { GroupedPicker } from '@/app/(frontend)/_components/grouped-picker'
import { PayeePicker } from '@/app/(frontend)/_components/payee-picker'
import type { RelationshipFilterOption } from '@/lib/filters/relationship-options'
import {
  formatUnitAmount,
  resolveUnitForAccount,
  unitsByIdFromDocs,
} from '@/lib/frontend/format-unit-amount'
import { isSystemPnlAccount } from '@/lib/frontend/system-pnl-accounts'
import {
  findAccount,
  interpolateTemplate,
  isPayeeTransferId,
  payeeTransferAccountId,
  toPayeeTransferId,
} from '@/lib/frontend/transaction-payee'
import {
  headerPayeeFromAllocateSplits,
  normalizeSplitFormFromEntries,
  splitIsTransfer,
  splitsToEntries,
} from '@/lib/frontend/transaction-splits'
import {
  detectSwapPairFromLegs,
  displayIndexesForSwapExtras,
  entriesToSwapLegs,
  unitCode,
} from '@/lib/frontend/transaction-swap'
import { entriesFromTransaction, transactionEntries } from '@/lib/frontend/transactions.display'
import type { Account, Transaction, Unit } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'
import { useAppTranslation } from '@/utils/i18n.client'

export type RegisterSplitPanelProps = {
  transaction: Transaction
  accounts: Account[]
  categoryOptions: RelationshipFilterOption[]
  units: Unit[]
  payeeOptions?: string[]
  /** Same-account allocate splits vs multi-account journal. */
  mode: 'allocate' | 'journal'
  onOpenDetail: () => void
}

function formatSignedAmount(
  amount: number,
  account: Account | undefined,
  unitsById: ReturnType<typeof unitsByIdFromDocs>,
): string {
  const formatted = formatUnitAmount(Math.abs(amount), resolveUnitForAccount(account, unitsById))
  if (amount < 0) return `−${formatted}`
  if (amount > 0) return `+${formatted}`
  return formatted
}

function headerMerchantPayee(transaction: Transaction): string {
  const header = transaction.payee?.trim()
  if (!header || isPayeeTransferId(header)) return ''
  return header
}

function SwapSummarySide(props: {
  label: string
  legAccountId: string
  legPayee?: string
  amount: number
  accounts: Account[]
  units: Unit[]
  unitsById: ReturnType<typeof unitsByIdFromDocs>
}) {
  const account = findAccount(props.accounts, props.legAccountId)
  const code = unitCode(props.units, getCollectionId(account?.unit) ?? null)
  const payee = props.legPayee?.trim()
  const title = payee || account?.name || '—'

  return (
    <div className="rounded-md border bg-background/80 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {props.label}
      </p>
      <p className="truncate text-sm font-medium">{title}</p>
      {payee && account ? (
        <p className="truncate text-xs text-muted-foreground">{account.name}</p>
      ) : null}
      <p className="text-sm tabular-nums">
        {formatSignedAmount(props.amount, account, props.unitsById)}
        {code ? <span className="text-muted-foreground"> {code}</span> : null}
      </p>
    </div>
  )
}

export function RegisterSplitPanel(props: RegisterSplitPanelProps) {
  const {
    transaction,
    accounts,
    categoryOptions,
    units,
    payeeOptions = [],
    mode,
    onOpenDetail,
  } = props
  const { t } = useAppTranslation()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const entries = transactionEntries(transaction)
  const unitsById = useMemo(() => unitsByIdFromDocs(units), [units])
  const budgetId = getCollectionId(transaction.budget) ?? undefined
  const headerPayee = headerMerchantPayee(transaction)

  const legs = useMemo(() => entriesToSwapLegs(entries), [entries])
  const pair = useMemo(() => detectSwapPairFromLegs(legs, accounts), [legs, accounts])
  const extraIndexes = useMemo(
    () => (pair ? displayIndexesForSwapExtras(legs, pair.otherIndexes) : []),
    [pair, legs],
  )
  const allocateForm = useMemo(() => normalizeSplitFormFromEntries(entries), [entries])

  const journalLegPayeeValue = (leg: {
    account: string
    payee: string
    category: string
  }): string => {
    if (leg.payee.trim()) return leg.payee.trim()
    if (leg.category && headerPayee) return headerPayee
    const account = findAccount(accounts, leg.account)
    // Never surface system Income/Expense chart accounts as "Transfer: …".
    if (isSystemPnlAccount(account)) return headerPayee || ''
    if (leg.account) return toPayeeTransferId(leg.account)
    return ''
  }

  const saveJournalLegPayee = (entryIndex: number, payeeValue: string) => {
    startTransition(async () => {
      const lines = entriesFromTransaction(transaction)
      const next = lines.map((line, index) => {
        if (index !== entryIndex) return line
        if (isPayeeTransferId(payeeValue)) {
          const accountId = payeeTransferAccountId(payeeValue)
          return {
            ...line,
            account: accountId || line.account,
            payee: undefined,
            category: undefined,
          }
        }
        return {
          ...line,
          account: getCollectionId(line.account) || line.account,
          payee: payeeValue.trim() || undefined,
        }
      })
      const result = await updateTransactionAction({
        id: transaction.id,
        entries: next,
      })
      if (result.ok) router.refresh()
    })
  }

  const saveJournalLegCategory = (entryIndex: number, categoryId: string) => {
    startTransition(async () => {
      const lines = entriesFromTransaction(transaction)
      const next = lines.map((line, index) => {
        if (index !== entryIndex) return line
        if (!categoryId) {
          return { ...line, category: undefined }
        }
        const payee = line.payee?.trim() || headerPayee || undefined
        return {
          ...line,
          category: categoryId,
          ...(payee ? { payee } : {}),
        }
      })
      const result = await updateTransactionAction({
        id: transaction.id,
        entries: next,
      })
      if (result.ok) router.refresh()
    })
  }

  const saveAllocateSplits = (splits: typeof allocateForm.splits) => {
    startTransition(async () => {
      const form = { ...allocateForm, splits }
      try {
        const nextEntries = splitsToEntries(form, {
          accounts,
          budgetId: getCollectionId(transaction.budget),
        })
        const synced = headerPayeeFromAllocateSplits(splits)
        const result = await updateTransactionAction({
          id: transaction.id,
          entries: nextEntries,
          ...(synced !== undefined ? { payee: synced } : {}),
        })
        if (result.ok) router.refresh()
      } catch {
        // Leave expand open; user can fix amounts/categories in detail.
      }
    })
  }

  const saveAllocateSplitPayee = (splitIndex: number, payeeValue: string) => {
    const splits = allocateForm.splits.map((split, index) =>
      index === splitIndex
        ? {
            ...split,
            payee: payeeValue,
            ...(isPayeeTransferId(payeeValue) ? { category: '' } : {}),
          }
        : split,
    )
    saveAllocateSplits(splits)
  }

  const saveAllocateSplitCategory = (splitIndex: number, categoryId: string) => {
    const splits = allocateForm.splits.map((split, index) =>
      index === splitIndex ? { ...split, category: categoryId } : split,
    )
    saveAllocateSplits(splits)
  }

  const renderJournalLegRow = (index: number, title: string) => {
    const leg = legs[index]
    if (!leg) return null
    const account = findAccount(accounts, leg.account)
    const amount = Number(leg.amount) || 0
    const payeeValue = journalLegPayeeValue(leg)
    const isTransferPayee = isPayeeTransferId(payeeValue)
    const showCategory = !isTransferPayee
    return (
      <li className="grid gap-2 rounded-md border bg-background/80 p-3" key={leg.key}>
        <p className="text-xs text-muted-foreground">{title}</p>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">
            {t('custom:frontend:filters:fields:payee')}
          </Label>
          <PayeePicker
            accounts={accounts}
            budgetId={budgetId}
            disabled={isPending}
            onCommit={(value) => saveJournalLegPayee(index, value)}
            onValueChange={() => undefined}
            payeeOptions={payeeOptions}
            placeholder={t('custom:frontend:transactions:payeePlaceholder')}
            sourceAccountId={leg.account}
            value={payeeValue}
          />
        </div>
        <div className="grid gap-1.5 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">
              {t('custom:frontend:filters:fields:category')}
            </Label>
            {showCategory ? (
              <GroupedPicker
                disabled={isPending}
                emptyLabel={t('custom:frontend:filters:isEmpty')}
                emptyValue=""
                onValueChange={(value) => saveJournalLegCategory(index, value)}
                options={categoryOptions}
                placeholder={t('custom:frontend:filters:selectValue')}
                searchPlaceholder={t('custom:frontend:filters:searchCategories')}
                value={leg.category}
              />
            ) : (
              <GroupedPicker
                disabled
                emptyLabel={t('custom:frontend:transactions:categoryNotNeeded')}
                emptyValue="__none__"
                onValueChange={() => {}}
                options={[]}
                placeholder={t('custom:frontend:transactions:categoryNotNeeded')}
                value="__none__"
              />
            )}
          </div>
          <span className="shrink-0 text-sm tabular-nums sm:pb-2">
            {formatSignedAmount(amount, account, unitsById)}
          </span>
        </div>
      </li>
    )
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      {mode === 'journal' && pair ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('custom:frontend:transactions:swapPairTitle')}
          </p>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <SwapSummarySide
              accounts={accounts}
              amount={Number(legs[pair.giveIndex]?.amount) || 0}
              label={t('custom:frontend:transactions:exchangeGiveAccount')}
              legAccountId={legs[pair.giveIndex]?.account ?? ''}
              legPayee={legs[pair.giveIndex]?.payee ?? ''}
              units={units}
              unitsById={unitsById}
            />
            <ArrowRight className="mx-auto size-4 text-muted-foreground max-sm:rotate-90" />
            <SwapSummarySide
              accounts={accounts}
              amount={Number(legs[pair.receiveIndex]?.amount) || 0}
              label={t('custom:frontend:transactions:exchangeReceiveAccount')}
              legAccountId={legs[pair.receiveIndex]?.account ?? ''}
              legPayee={legs[pair.receiveIndex]?.payee ?? ''}
              units={units}
              unitsById={unitsById}
            />
          </div>

          {extraIndexes.length > 0 ? (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('custom:frontend:transactions:swapExtraTitle')}
              </p>
              <ul className="space-y-3">
                {extraIndexes.map((index, displayOffset) =>
                  renderJournalLegRow(
                    index,
                    interpolateTemplate(t('custom:frontend:transactions:swapExtraLine'), {
                      index: String(displayOffset + 1),
                    }),
                  ),
                )}
              </ul>
            </div>
          ) : null}
        </div>
      ) : mode === 'journal' ? (
        <ul className="space-y-3">
          {legs.map((leg, index) =>
            renderJournalLegRow(
              index,
              interpolateTemplate(t('custom:frontend:transactions:splitLine'), {
                index: String(index + 1),
              }),
            ),
          )}
        </ul>
      ) : (
        <ul className="space-y-3">
          {allocateForm.splits.map((split, index) => {
            const isTransfer = splitIsTransfer(split)
            const amount = Number(split.amount) || 0
            const paymentAccount = findAccount(accounts, allocateForm.paymentAccount)

            return (
              <li className="grid gap-2 rounded-md border bg-background/80 p-3" key={split.key}>
                <p className="text-xs text-muted-foreground">
                  {interpolateTemplate(t('custom:frontend:transactions:splitLine'), {
                    index: String(index + 1),
                  })}
                </p>
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {t('custom:frontend:filters:fields:payee')}
                  </Label>
                  <PayeePicker
                    accounts={accounts}
                    budgetId={budgetId}
                    disabled={isPending}
                    onCommit={(value) => saveAllocateSplitPayee(index, value)}
                    onValueChange={() => undefined}
                    payeeOptions={payeeOptions}
                    placeholder={t('custom:frontend:transactions:payeePlaceholder')}
                    sourceAccountId={allocateForm.paymentAccount}
                    transaction={transaction}
                    value={split.payee}
                  />
                </div>
                <div className="grid gap-1.5 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {t('custom:frontend:filters:fields:category')}
                    </Label>
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
                        disabled={isPending}
                        emptyLabel={t('custom:frontend:filters:isEmpty')}
                        emptyValue=""
                        onValueChange={(value) => saveAllocateSplitCategory(index, value)}
                        options={categoryOptions}
                        placeholder={t('custom:frontend:filters:selectValue')}
                        searchPlaceholder={t('custom:frontend:filters:searchCategories')}
                        value={split.category}
                      />
                    )}
                  </div>
                  <span className="shrink-0 text-sm tabular-nums sm:pb-2">
                    {formatUnitAmount(amount, resolveUnitForAccount(paymentAccount, unitsById))}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="pt-1">
        <Button onClick={onOpenDetail} size="sm" type="button" variant="outline">
          {t('custom:frontend:transactions:openDetail')}
        </Button>
      </div>
    </div>
  )
}
