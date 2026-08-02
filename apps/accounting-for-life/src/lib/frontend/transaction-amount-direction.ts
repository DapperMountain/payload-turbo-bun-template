import {
  formatUnitAmount,
  formatUnitAmountMagnitudeForEdit,
  resolveUnitForAccount,
  type UnitFormatInput,
} from '@/lib/frontend/format-unit-amount'
import { findAccount, isCreditCardAccount } from '@/lib/frontend/transaction-payee'
import type { Account } from '@/types'

/** User-facing flow direction (red = outflow, green = inflow). */
export type AmountDirection = 'outflow' | 'inflow'

export function isLiabilityPaymentAccount(account: Account | undefined): boolean {
  if (!account) return false
  return account.classification === 'liability' || isCreditCardAccount(account)
}

/**
 * Map user outflow/inflow + magnitude to the signed ledger amount on the payment account.
 *
 * Asset (checking/savings): outflow = negative, inflow = positive.
 * Liability (credit card): charge/outflow = positive, credit/refund = negative.
 */
export function signedAmountFromDirection(
  direction: AmountDirection,
  magnitude: number,
  paymentAccount: Account | undefined,
): number {
  const abs = Math.abs(magnitude)
  if (!Number.isFinite(abs) || abs === 0) return 0

  if (isLiabilityPaymentAccount(paymentAccount)) {
    return direction === 'outflow' ? abs : -abs
  }

  return direction === 'outflow' ? -abs : abs
}

export function directionFromSignedAmount(
  amount: number,
  paymentAccount: Account | undefined,
): AmountDirection {
  if (!Number.isFinite(amount) || amount === 0) {
    return 'outflow'
  }

  if (isLiabilityPaymentAccount(paymentAccount)) {
    return amount > 0 ? 'outflow' : 'inflow'
  }

  return amount < 0 ? 'outflow' : 'inflow'
}

export function magnitudeFromSignedAmount(amount: number): number {
  return Math.abs(Number(amount) || 0)
}

/** Absolute amount string for inline edit inputs — respects account unit decimals when known. */
export function formatAmountMagnitudeForEdit(
  amount: number,
  paymentAccount?: Account,
  unitsById?: Record<string, UnitFormatInput>,
): string {
  return formatUnitAmountMagnitudeForEdit(
    amount,
    resolveUnitForAccount(paymentAccount, unitsById),
  )
}

export function parseSignedAmountString(
  signed: string,
  paymentAccount: Account | undefined,
): { direction: AmountDirection; magnitude: string } {
  const num = Number(signed)
  if (!signed.trim() || !Number.isFinite(num)) {
    return { direction: 'outflow', magnitude: '' }
  }

  return {
    direction: directionFromSignedAmount(num, paymentAccount),
    magnitude: Math.abs(num).toFixed(2),
  }
}

export function formatSignedAmountString(
  direction: AmountDirection,
  magnitude: string,
  paymentAccount: Account | undefined,
): string {
  if (!magnitude.trim()) return ''

  const num = Number(magnitude)
  if (!Number.isFinite(num)) return magnitude

  return String(signedAmountFromDirection(direction, num, paymentAccount))
}

export function paymentAccountFromList(
  accounts: Account[],
  accountId: string,
): Account | undefined {
  return findAccount(accounts, accountId)
}

/** Monarch-style register amount: absolute unit amount; inflows get a non-editable `+`. */
export type RegisterAmountDisplay = {
  absoluteText: string
  isCredit: boolean
  prefix: '+' | ''
}

export function registerAmountDisplay(
  amount: number,
  paymentAccount: Account | undefined,
  locale?: string,
  unitsById?: Record<string, UnitFormatInput>,
): RegisterAmountDisplay {
  const absolute = Math.abs(Number(amount) || 0)
  const absoluteText = formatUnitAmount(absolute, resolveUnitForAccount(paymentAccount, unitsById), {
    locale,
    absolute: true,
  })
  const isCredit =
    absolute > 0 && directionFromSignedAmount(amount, paymentAccount) === 'inflow'

  return {
    absoluteText,
    isCredit,
    prefix: isCredit ? '+' : '',
  }
}
