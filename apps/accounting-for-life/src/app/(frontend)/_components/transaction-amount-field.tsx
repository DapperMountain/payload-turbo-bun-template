'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input } from '@dappermountain/ui/components/input'
import { Label } from '@dappermountain/ui/components/label'
import { cn } from '@dappermountain/ui/lib/utils'

import {
  formatUnitAmount,
  resolveUnitForAccount,
} from '@/lib/frontend/format-unit-amount'
import {
  formatSignedAmountString,
  isLiabilityPaymentAccount,
  parseSignedAmountString,
  paymentAccountFromList,
  type AmountDirection,
} from '@/lib/frontend/transaction-amount-direction'
import { isCreditCardAccount, interpolateTemplate } from '@/lib/frontend/transaction-payee'
import type { Account } from '@/types'
import { useAppTranslation } from '@/utils/i18n.client'

export type TransactionAmountFieldProps = {
  accounts: Account[]
  paymentAccountId: string
  value: string
  /** Live updates while editing (forms). */
  onValueChange?: (signedAmount: string) => void
  /** Finalized value on input blur (inline register). */
  onCommit?: (signedAmount: string) => void
  disabled?: boolean
  compact?: boolean
  showLabel?: boolean
  /** Override the default "Amount" label. */
  label?: string
  /**
   * When set, debit/credit toggles are hidden and every edit uses this direction.
   * Used for transfers where leave/receive is implied by from/to accounts.
   */
  fixedDirection?: AmountDirection
  className?: string
}

export function TransactionAmountField(props: TransactionAmountFieldProps) {
  const {
    accounts,
    paymentAccountId,
    value,
    onValueChange,
    onCommit,
    disabled,
    compact,
    showLabel = true,
    label,
    fixedDirection,
    className,
  } = props
  const { t } = useAppTranslation()

  const paymentAccount = useMemo(
    () => paymentAccountFromList(accounts, paymentAccountId),
    [accounts, paymentAccountId],
  )

  const parsed = useMemo(
    () => parseSignedAmountString(value, paymentAccount),
    [paymentAccount, value],
  )

  /** Optimistic direction until the signed value prop catches up after a toggle. */
  const [optimisticDirection, setOptimisticDirection] = useState<AmountDirection | null>(null)
  /** Draft magnitude while the number input is focused / being edited. */
  const [draftMagnitude, setDraftMagnitude] = useState<string | null>(null)

  useEffect(() => {
    setOptimisticDirection(null)
    setDraftMagnitude(null)
  }, [value, paymentAccountId])

  const direction = fixedDirection ?? optimisticDirection ?? parsed.direction
  const magnitude = draftMagnitude ?? parsed.magnitude

  const labels = useMemo(() => {
    if (paymentAccount && isCreditCardAccount(paymentAccount)) {
      return {
        outflow: t('custom:frontend:transactions:amountDebitCharge'),
        inflow: t('custom:frontend:transactions:amountCreditRefund'),
        hint: t('custom:frontend:transactions:amountCreditCardHint'),
      }
    }

    if (isLiabilityPaymentAccount(paymentAccount)) {
      return {
        outflow: t('custom:frontend:transactions:amountDebit'),
        inflow: t('custom:frontend:transactions:amountCredit'),
        hint: t('custom:frontend:transactions:amountLiabilityHint'),
      }
    }

    return {
      outflow: t('custom:frontend:transactions:amountDebit'),
      inflow: t('custom:frontend:transactions:amountCredit'),
      hint: t('custom:frontend:transactions:amountAssetHint'),
    }
  }, [paymentAccount, t])

  const emitSigned = (
    nextDirection: AmountDirection,
    nextMagnitude: string,
    commit = false,
  ) => {
    const signed = formatSignedAmountString(nextDirection, nextMagnitude, paymentAccount)
    onValueChange?.(signed)
    if (commit) onCommit?.(signed)
    return signed
  }

  const applyDirection = (nextDirection: AmountDirection, commit = false) => {
    if (fixedDirection) return
    setOptimisticDirection(nextDirection)
    setDraftMagnitude(null)
    emitSigned(nextDirection, magnitude, commit)
  }

  const applyMagnitude = (nextMagnitude: string, commit = false) => {
    setDraftMagnitude(nextMagnitude)
    if (!nextMagnitude.trim()) return
    emitSigned(direction, nextMagnitude, commit)
  }

  const signedPreview = formatSignedAmountString(direction, magnitude, paymentAccount)
  const signedNumber = Number(signedPreview)

  return (
    <div className={cn('grid gap-2', className)}>
      {showLabel ? (
        <Label>{label ?? t('custom:frontend:transactions:amountColumn')}</Label>
      ) : null}

      {!fixedDirection ? (
        <div
          className={cn(
            'grid grid-cols-2 gap-2',
            compact ? 'gap-1' : 'gap-2',
          )}
        >
          <button
            className={cn(
              'rounded-lg border-2 font-semibold transition-colors',
              compact ? 'px-2 py-1.5 text-xs' : 'px-4 py-3 text-sm',
              direction === 'outflow'
                ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50',
              disabled && 'pointer-events-none opacity-50',
            )}
            disabled={disabled}
            onClick={() => applyDirection('outflow', Boolean(onCommit))}
            type="button"
          >
            {labels.outflow}
          </button>
          <button
            className={cn(
              'rounded-lg border-2 font-semibold transition-colors',
              compact ? 'px-2 py-1.5 text-xs' : 'px-4 py-3 text-sm',
              direction === 'inflow'
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50',
              disabled && 'pointer-events-none opacity-50',
            )}
            disabled={disabled}
            onClick={() => applyDirection('inflow', Boolean(onCommit))}
            type="button"
          >
            {labels.inflow}
          </button>
        </div>
      ) : null}

      <Input
        className={cn(compact && 'h-8')}
        disabled={disabled}
        min="0"
        onBlur={() => applyMagnitude(magnitude, true)}
        onChange={(event) => applyMagnitude(event.target.value)}
        placeholder={t('custom:frontend:transactions:amountMagnitudePlaceholder')}
        step="0.01"
        type="number"
        value={magnitude}
      />

      {!compact && signedPreview && Number.isFinite(signedNumber) ? (
        <p className="text-xs text-muted-foreground tabular-nums">
          {interpolateTemplate(t('custom:frontend:transactions:amountSignedPreview'), {
            amount: formatUnitAmount(signedNumber, resolveUnitForAccount(paymentAccount)),
          })}
        </p>
      ) : null}

      {!compact && !fixedDirection ? (
        <p className="text-xs text-muted-foreground">{labels.hint}</p>
      ) : null}
    </div>
  )
}
