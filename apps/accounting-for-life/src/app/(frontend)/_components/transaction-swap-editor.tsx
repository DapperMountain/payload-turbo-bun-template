'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@dappermountain/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@dappermountain/ui/components/dropdown-menu'
import { Input } from '@dappermountain/ui/components/input'
import { Label } from '@dappermountain/ui/components/label'
import { ArrowRight, ArrowUpDown, ChevronDown, Plus, Trash2 } from '@dappermountain/ui/icons'
import { cn } from '@dappermountain/ui/lib/utils'

import { GroupedPicker } from '@/app/(frontend)/_components/grouped-picker'
import { PayeePicker } from '@/app/(frontend)/_components/payee-picker'
import { TransactionAmountField } from '@/app/(frontend)/_components/transaction-amount-field'
import { isSystemPnlAccount } from '@/lib/frontend/system-pnl-accounts'
import {
  isPayeeTransferId,
  payeeTransferAccountId,
  toPayeeTransferId,
} from '@/lib/frontend/transaction-payee'
import type { RelationshipFilterOption } from '@/lib/filters/relationship-options'
import { interpolateTemplate } from '@/lib/frontend/transaction-payee'
import {
  accountUnitId,
  applySwapPairNote,
  clearSwapPairCategories,
  compileSwapFxFromAmounts,
  detectSwapPairFromLegs,
  displayIndexesForSwapExtras,
  findAccount,
  isSwapFormBalanced,
  newSwapLegDraft,
  resolveSwapPairFromKeys,
  swapPairNote,
  swapQuoteTotal,
  unitCode,
  type DetectedSwapPair,
  type SwapLegDraft,
} from '@/lib/frontend/transaction-swap'
import type { Account, Unit } from '@/types'
import { useAppTranslation } from '@/utils/i18n.client'

export type TransactionSwapEditorProps = {
  legs: SwapLegDraft[]
  onChange: (legs: SwapLegDraft[]) => void
  accountOptions: RelationshipFilterOption[]
  categoryOptions: RelationshipFilterOption[]
  accounts: Account[]
  units: Unit[]
  reportingCurrencyId: string | null
  formatAccountGroup: (group: string) => string
  budgetId?: string
  payeeOptions?: string[]
  disabled?: boolean
}

function formatAmount(amount: number | null): string {
  if (amount == null || !Number.isFinite(amount)) return '—'
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 8,
  }).format(amount)
}

function magnitudeString(signed: string): string {
  const value = Number(signed)
  if (!Number.isFinite(value) || signed === '') return signed
  return String(Math.abs(value))
}

function toSignedOutflow(magnitude: string): string {
  if (magnitude.trim() === '') return ''
  const value = Math.abs(Number(magnitude))
  if (!Number.isFinite(value)) return magnitude
  return value === 0 ? '0' : `-${value}`
}

function toSignedInflow(magnitude: string): string {
  if (magnitude.trim() === '') return ''
  const value = Math.abs(Number(magnitude))
  if (!Number.isFinite(value)) return magnitude
  return String(value)
}

function SwapPairRateSummary(props: {
  give: SwapLegDraft
  receive: SwapLegDraft
  accounts: Account[]
  units: Unit[]
  reportingCurrencyId: string | null
}) {
  const { t } = useAppTranslation()
  const giveAccount = findAccount(props.accounts, props.give.account)
  const receiveAccount = findAccount(props.accounts, props.receive.account)
  const giveUnit = accountUnitId(giveAccount)
  const receiveUnit = accountUnitId(receiveAccount)
  if (!giveUnit || !receiveUnit || giveUnit === receiveUnit) return null

  const leaving = Math.abs(Number(props.give.amount) || 0)
  const received = Math.abs(Number(props.receive.amount) || 0)
  if (!(leaving > 0) || !(received > 0)) return null

  const fromCode = unitCode(props.units, giveUnit) || 'from'
  const toCode = unitCode(props.units, receiveUnit) || 'to'
  const rate = Math.round((received / leaving) * 1e8) / 1e8
  const pairLegs = [props.give, props.receive]
  const compiled = compileSwapFxFromAmounts(pairLegs, props.accounts, props.reportingCurrencyId)
  const reportingDeferred = Boolean(
    compiled &&
      props.reportingCurrencyId &&
      compiled.quoteUnitId !== props.reportingCurrencyId &&
      compiled.quoteToReportingRate == null,
  )

  return (
    <div className="grid gap-1 text-xs text-muted-foreground">
      <p>
        {interpolateTemplate(t('custom:frontend:transactions:transferImpliedRate'), {
          rate: `${rate} ${toCode} per 1 ${fromCode}`,
        })}
      </p>
      {reportingDeferred ? (
        <p>{t('custom:frontend:transactions:transferReportingDeferred')}</p>
      ) : null}
    </div>
  )
}

function LegCard(props: {
  leg: SwapLegDraft
  title: string
  canRemove: boolean
  disabled?: boolean
  /** Give/receive swap legs omit category (transfer semantics). */
  showCategory?: boolean
  /**
   * YNAB-style line: single Payee field (merchant or transfer account).
   * When set, the separate Account picker is hidden.
   */
  showPayee?: boolean
  /** Fallback account when the user picks a merchant on an empty line. */
  defaultAccountId?: string
  accounts: Account[]
  accountOptions: RelationshipFilterOption[]
  categoryOptions: RelationshipFilterOption[]
  formatAccountGroup: (group: string) => string
  budgetId?: string
  payeeOptions?: string[]
  onUpdate: (patch: Partial<SwapLegDraft>) => void
  onRemove: () => void
}) {
  const { t } = useAppTranslation()
  const {
    leg,
    title,
    canRemove,
    disabled,
    showCategory = true,
    showPayee = false,
    defaultAccountId = '',
    accounts,
    accountOptions,
    categoryOptions,
    formatAccountGroup,
    budgetId,
    payeeOptions = [],
    onUpdate,
    onRemove,
  } = props

  const legAccount = findAccount(accounts, leg.account)
  // Merchant name wins; wallet legs show as Transfer: Account. System P&L chart
  // accounts stay internal (never "Transfer: Budget expenses").
  const payeeFieldValue = leg.payee.trim()
    ? leg.payee.trim()
    : leg.account && !isSystemPnlAccount(legAccount)
      ? toPayeeTransferId(leg.account)
      : ''
  const isTransferPayee = isPayeeTransferId(payeeFieldValue)

  const commitPayee = (value: string) => {
    if (isPayeeTransferId(value)) {
      const accountId = payeeTransferAccountId(value)
      onUpdate({
        account: accountId || leg.account,
        payee: '',
        category: '',
      })
      return
    }
    onUpdate({
      payee: value,
      account: leg.account || defaultAccountId,
    })
  }

  return (
    <div className="grid gap-3 rounded-lg border bg-muted/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        {canRemove ? (
          <Button
            disabled={disabled}
            onClick={onRemove}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-4" />
            <span className="sr-only">{t('custom:frontend:transactions:removeSwapLeg')}</span>
          </Button>
        ) : null}
      </div>

      {showPayee ? (
        <div className="grid gap-2">
          <Label>{t('custom:frontend:filters:fields:payee')}</Label>
          <PayeePicker
            accounts={accounts}
            budgetId={budgetId}
            disabled={disabled}
            onCommit={commitPayee}
            onValueChange={commitPayee}
            payeeOptions={payeeOptions}
            placeholder={t('custom:frontend:transactions:payeePlaceholder')}
            sourceAccountId={leg.account || defaultAccountId}
            value={payeeFieldValue}
          />
        </div>
      ) : (
        <div className="grid gap-2">
          <Label>{t('custom:frontend:filters:fields:account')}</Label>
          <GroupedPicker
            disabled={disabled}
            formatGroup={formatAccountGroup}
            onValueChange={(value) => onUpdate({ account: value })}
            options={accountOptions}
            placeholder={t('custom:frontend:filters:selectValue')}
            searchPlaceholder={t('custom:frontend:filters:searchAccounts')}
            value={leg.account}
          />
        </div>
      )}

      <TransactionAmountField
        accounts={accounts}
        compact
        disabled={disabled}
        onValueChange={(next) => onUpdate({ amount: next })}
        paymentAccountId={leg.account || defaultAccountId}
        value={leg.amount}
      />

      {showCategory && !isTransferPayee ? (
        <div className="grid gap-2">
          <Label>{t('custom:frontend:filters:fields:category')}</Label>
          <GroupedPicker
            disabled={disabled}
            emptyLabel={t('custom:frontend:filters:isEmpty')}
            emptyValue=""
            onValueChange={(value) => onUpdate({ category: value })}
            options={categoryOptions}
            placeholder={t('custom:frontend:filters:selectValue')}
            searchPlaceholder={t('custom:frontend:filters:searchCategories')}
            value={leg.category}
          />
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label>{t('custom:fields:transactions:entryNotes')}</Label>
        <Input
          disabled={disabled}
          onChange={(event) => onUpdate({ notes: event.target.value })}
          placeholder={t('custom:fields:transactions:entryNotesPlaceholder')}
          value={leg.notes}
        />
      </div>
    </div>
  )
}

function SwapSideCard(props: {
  roleLabel: string
  amountLabel: string
  leg: SwapLegDraft
  disabled?: boolean
  accounts: Account[]
  budgetId?: string
  payeeOptions?: string[]
  /** Fallback wallet when the side is a merchant/DEX name. */
  defaultAccountId?: string
  signedAs: 'outflow' | 'inflow'
  onUpdate: (patch: Partial<SwapLegDraft>) => void
}) {
  const { t } = useAppTranslation()
  const {
    roleLabel,
    amountLabel,
    leg,
    disabled,
    accounts,
    budgetId,
    payeeOptions = [],
    defaultAccountId = '',
    signedAs,
    onUpdate,
  } = props

  const sideAccount = findAccount(accounts, leg.account)
  const payeeFieldValue = leg.payee.trim()
    ? leg.payee.trim()
    : leg.account && !isSystemPnlAccount(sideAccount)
      ? toPayeeTransferId(leg.account)
      : ''

  const commitPayee = (value: string) => {
    if (isPayeeTransferId(value)) {
      onUpdate({
        account: payeeTransferAccountId(value) || leg.account,
        payee: '',
        category: '',
      })
      return
    }
    onUpdate({
      payee: value,
      account: leg.account || defaultAccountId,
      category: '',
    })
  }

  return (
    <div className="grid gap-3 rounded-md border bg-background/80 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {roleLabel}
        </span>
      </div>
      <div className="grid gap-2">
        <Label>{t('custom:frontend:filters:fields:payee')}</Label>
        <PayeePicker
          accounts={accounts}
          budgetId={budgetId}
          disabled={disabled}
          onCommit={commitPayee}
          onValueChange={commitPayee}
          payeeOptions={payeeOptions}
          placeholder={t('custom:frontend:transactions:payeePlaceholder')}
          sourceAccountId={leg.account || defaultAccountId}
          value={payeeFieldValue}
        />
      </div>
      <div className="grid gap-2">
        <Label>{amountLabel}</Label>
        <Input
          disabled={disabled}
          inputMode="decimal"
          onChange={(event) =>
            onUpdate({
              amount:
                signedAs === 'outflow'
                  ? toSignedOutflow(event.target.value)
                  : toSignedInflow(event.target.value),
            })
          }
          placeholder="0"
          value={magnitudeString(leg.amount)}
        />
      </div>
    </div>
  )
}

function pairKeysFromPair(legs: SwapLegDraft[], pair: DetectedSwapPair) {
  const giveKey = legs[pair.giveIndex]?.key
  const receiveKey = legs[pair.receiveIndex]?.key
  if (!giveKey || !receiveKey) return null
  return { giveKey, receiveKey }
}

export function TransactionSwapEditor(props: TransactionSwapEditorProps) {
  const {
    legs,
    onChange,
    accountOptions,
    categoryOptions,
    accounts,
    budgetId,
    payeeOptions = [],
    units,
    reportingCurrencyId,
    formatAccountGroup,
    disabled,
  } = props
  const { t } = useAppTranslation()

  /** Stable identity of the grouped pair — never re-picks other legs after the user clears it. */
  const [pinnedKeys, setPinnedKeys] = useState<{ giveKey: string; receiveKey: string } | null>(
    null,
  )
  /** After the user removes a swap, do not auto-group remaining lines. */
  const [suppressAutoPin, setSuppressAutoPin] = useState(false)
  const didInitialPin = useRef(false)

  const detectedPair = useMemo(
    () => detectSwapPairFromLegs(legs, accounts),
    [legs, accounts],
  )

  // Only the pinned pair is a swap. Never fall back to live detection for display.
  const pair = useMemo(() => {
    if (!pinnedKeys) return null
    return resolveSwapPairFromKeys(legs, pinnedKeys)
  }, [pinnedKeys, legs])

  /** Account used when a merchant is picked on a new other-line (YNAB register account). */
  const defaultOtherAccountId = useMemo(() => {
    const otherIndexes = pair?.otherIndexes ?? []
    for (const index of otherIndexes) {
      const accountId = legs[index]?.account
      if (accountId) return accountId
    }
    for (const leg of legs) {
      if (leg.payee.trim() && leg.account) return leg.account
    }
    return accountOptions[0]?.id ?? ''
  }, [pair, legs, accountOptions])

  // Initial open: pin a detectable pair once. Never re-pin after the user clears the swap.
  useEffect(() => {
    if (didInitialPin.current || suppressAutoPin || pinnedKeys) return
    if (!detectedPair) return
    const keys = pairKeysFromPair(legs, detectedPair)
    if (!keys) return
    didInitialPin.current = true
    setPinnedKeys(keys)
  }, [detectedPair, legs, pinnedKeys, suppressAutoPin])

  // If a pinned leg disappeared (e.g. external replace), drop the pin without stealing other lines.
  useEffect(() => {
    if (!pinnedKeys) return
    if (!resolveSwapPairFromKeys(legs, pinnedKeys)) {
      setPinnedKeys(null)
      setSuppressAutoPin(true)
    }
  }, [pinnedKeys, legs])

  // Transfer / DEX pair legs never carry a budget category — only other lines may.
  useEffect(() => {
    if (!pair) return
    const next = clearSwapPairCategories(legs, pair)
    if (next !== legs) onChange(next)
  }, [pair, legs, onChange])

  const compiled = compileSwapFxFromAmounts(legs, accounts, reportingCurrencyId)
  const quoteCode = unitCode(units, compiled?.quoteUnitId)
  const quoteTotal = swapQuoteTotal(legs, accounts, reportingCurrencyId)
  const balanced = isSwapFormBalanced(legs, accounts, reportingCurrencyId)
  const reportingDeferred = Boolean(
    compiled &&
      reportingCurrencyId &&
      compiled.quoteUnitId !== reportingCurrencyId &&
      compiled.quoteToReportingRate == null,
  )

  const updateLeg = (index: number, patch: Partial<SwapLegDraft>) => {
    onChange(legs.map((leg, legIndex) => (legIndex === index ? { ...leg, ...patch } : leg)))
  }

  const removeLeg = (index: number) => {
    if (legs.length <= 2) return
    const remaining = legs.filter((_, legIndex) => legIndex !== index)
    if (remaining.length < 2) return
    onChange(remaining)
  }

  const removeSwapGroup = () => {
    if (!pair) return
    const drop = new Set([pair.giveIndex, pair.receiveIndex])
    const remaining = legs.filter((_, index) => !drop.has(index))
    setPinnedKeys(null)
    setSuppressAutoPin(true)
    onChange(remaining.length > 0 ? remaining : [newSwapLegDraft(), newSwapLegDraft()])
  }

  const swapPairSides = () => {
    if (!pair) return
    const give = legs[pair.giveIndex]
    const receive = legs[pair.receiveIndex]
    if (!give || !receive) return

    setPinnedKeys({ giveKey: receive.key, receiveKey: give.key })
    onChange(
      legs.map((leg, index) => {
        if (index === pair.giveIndex) {
          return {
            ...receive,
            amount: toSignedOutflow(magnitudeString(receive.amount)),
          }
        }
        if (index === pair.receiveIndex) {
          return {
            ...give,
            amount: toSignedInflow(magnitudeString(give.amount)),
          }
        }
        return leg
      }),
    )
  }

  const addLine = () => {
    onChange([...legs, newSwapLegDraft(defaultOtherAccountId)])
  }

  const addSwap = () => {
    const give = newSwapLegDraft('', '')
    const receive = newSwapLegDraft('', '')
    setSuppressAutoPin(false)
    setPinnedKeys({ giveKey: give.key, receiveKey: receive.key })
    onChange([...legs, give, receive])
  }

  const give = pair ? legs[pair.giveIndex] : null
  const receive = pair ? legs[pair.receiveIndex] : null
  const extraIndexes = pair ? displayIndexesForSwapExtras(legs, pair.otherIndexes) : []

  return (
    <div className="grid gap-4">
      {pair && give && receive ? (
        <>
          <div className="grid gap-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{t('custom:frontend:transactions:swapPairTitle')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('custom:frontend:transactions:swapPairHint')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  disabled={disabled}
                  onClick={swapPairSides}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <ArrowUpDown className="size-4" />
                  {t('custom:frontend:transactions:swapPairFlip')}
                </Button>
                <Button
                  disabled={disabled}
                  onClick={removeSwapGroup}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">
                    {t('custom:frontend:transactions:swapRemoveGroup')}
                  </span>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
              <SwapSideCard
                amountLabel={t('custom:frontend:transactions:transferAmountLeaving')}
                accounts={accounts}
                budgetId={budgetId}
                defaultAccountId={defaultOtherAccountId}
                disabled={disabled}
                leg={give}
                onUpdate={(patch) => updateLeg(pair.giveIndex, patch)}
                payeeOptions={payeeOptions}
                roleLabel={t('custom:frontend:transactions:exchangeGiveAccount')}
                signedAs="outflow"
              />

              <div className="flex items-center justify-center py-1 sm:pt-10">
                <ArrowRight className="size-4 text-muted-foreground max-sm:rotate-90" />
              </div>

              <SwapSideCard
                amountLabel={t('custom:frontend:transactions:transferAmountReceived')}
                accounts={accounts}
                budgetId={budgetId}
                defaultAccountId={defaultOtherAccountId}
                disabled={disabled}
                leg={receive}
                onUpdate={(patch) => updateLeg(pair.receiveIndex, patch)}
                payeeOptions={payeeOptions}
                roleLabel={t('custom:frontend:transactions:exchangeReceiveAccount')}
                signedAs="inflow"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="swap-pair-note">
                {t('custom:frontend:transactions:swapPairNote')}
              </Label>
              <Input
                disabled={disabled}
                id="swap-pair-note"
                onChange={(event) => onChange(applySwapPairNote(legs, pair, event.target.value))}
                placeholder={t('custom:frontend:transactions:swapPairNotePlaceholder')}
                value={swapPairNote(legs, pair)}
              />
            </div>

            <SwapPairRateSummary
              accounts={accounts}
              give={give}
              receive={receive}
              reportingCurrencyId={reportingCurrencyId}
              units={units}
            />
          </div>

          {extraIndexes.length > 0 ? (
            <div className="grid gap-2">
              <div>
                <p className="text-sm font-medium">
                  {t('custom:frontend:transactions:swapExtraTitle')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('custom:frontend:transactions:swapExtraHint')}
                </p>
              </div>
              <div className="grid gap-3">
                {extraIndexes.map((index, displayOffset) => {
                  const leg = legs[index]
                  if (!leg) return null
                  return (
                    <LegCard
                      accounts={accounts}
                      accountOptions={accountOptions}
                      budgetId={budgetId}
                      canRemove={legs.length > 2}
                      categoryOptions={categoryOptions}
                      defaultAccountId={defaultOtherAccountId}
                      disabled={disabled}
                      formatAccountGroup={formatAccountGroup}
                      key={leg.key}
                      leg={leg}
                      onRemove={() => removeLeg(index)}
                      onUpdate={(patch) => updateLeg(index, patch)}
                      payeeOptions={payeeOptions}
                      showPayee
                      title={interpolateTemplate(t('custom:frontend:transactions:swapExtraLine'), {
                        index: String(displayOffset + 1),
                      })}
                    />
                  )
                })}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t('custom:frontend:transactions:splitAdvancedDescription')}
          </p>
          <div className="grid gap-3">
            {legs.map((leg, index) => (
              <LegCard
                accounts={accounts}
                accountOptions={accountOptions}
                budgetId={budgetId}
                canRemove={legs.length > 2}
                categoryOptions={categoryOptions}
                defaultAccountId={defaultOtherAccountId}
                disabled={disabled}
                formatAccountGroup={formatAccountGroup}
                key={leg.key}
                leg={leg}
                onRemove={() => removeLeg(index)}
                onUpdate={(patch) => updateLeg(index, patch)}
                payeeOptions={payeeOptions}
                showPayee
                title={interpolateTemplate(t('custom:frontend:transactions:splitLine'), {
                  index: String(index + 1),
                })}
              />
            ))}
          </div>
        </>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button disabled={disabled} size="sm" type="button" variant="outline">
            <Plus className="size-4" />
            {t('custom:frontend:transactions:addEntry')}
            <ChevronDown className="size-4 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem disabled={disabled} onSelect={addLine}>
            {t('custom:frontend:transactions:addEntryLine')}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={disabled || Boolean(pair)} onSelect={addSwap}>
            {t('custom:frontend:transactions:addEntrySwap')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div
        className={cn(
          'rounded-md border px-3 py-2 text-sm',
          balanced
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
            : 'border-destructive/40 bg-destructive/10 text-destructive',
        )}
      >
        <div>
          {compiled && quoteCode
            ? interpolateTemplate(t('custom:frontend:transactions:splitQuoteBalance'), {
                quoteCode,
                amount: formatAmount(quoteTotal),
              })
            : interpolateTemplate(t('custom:frontend:transactions:splitNativeBalance'), {
                amount: formatAmount(
                  legs.every((leg) => Number.isFinite(Number(leg.amount)))
                    ? legs.reduce((sum, leg) => sum + Number(leg.amount), 0)
                    : null,
                ),
              })}
        </div>
        {reportingDeferred ? (
          <div className="mt-1 text-xs opacity-90">
            {t('custom:frontend:transactions:reportingDeferredHint')}
          </div>
        ) : null}
      </div>
    </div>
  )
}
