import type { RelationshipFilterOption } from '@/lib/filters/relationship-options'
import { transactionEntries } from '@/lib/frontend/transactions.display'
import { splitFormFromEntries } from '@/lib/frontend/transaction-splits'
import type { Account, Category, Transaction } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

export const PAYEE_TRANSFER_PREFIX = '__transfer__:'

export const PAYEE_TRANSFER_GROUP = 'payments_and_transfers'

export const PAYEE_MERCHANT_GROUP = 'payees'

export function isPayeeTransferId(value: string): boolean {
  return value.startsWith(PAYEE_TRANSFER_PREFIX)
}

export function toPayeeTransferId(accountId: string): string {
  return `${PAYEE_TRANSFER_PREFIX}${accountId}`
}

export function payeeTransferAccountId(value: string): string {
  return value.slice(PAYEE_TRANSFER_PREFIX.length)
}

export function findAccount(accounts: Account[], accountId: string): Account | undefined {
  return accounts.find((account) => account.id === accountId)
}

export function isCreditCardAccount(account: Account): boolean {
  return account.subtype === 'credit_card'
}

/** Transfers between budget accounts do not use spending categories (YNAB semantics). */
export function transferSkipsCategory(): boolean {
  return true
}

export function payeeLabelForTransferAccount(
  account: Account,
  labels: { transferTo: (name: string) => string; paymentToCredit: (name: string) => string },
): string {
  if (isCreditCardAccount(account)) {
    return labels.paymentToCredit(account.name)
  }

  return labels.transferTo(account.name)
}

/** Interpolate `{name}` when Payload `t()` does not substitute variables. */
export function interpolateNamedTemplate(template: string, name: string): string {
  return template.includes('{name}') ? template.replaceAll('{name}', name) : `${template} ${name}`.trim()
}

/** Interpolate `{key}` placeholders when Payload `t()` does not substitute variables. */
export function interpolateTemplate(template: string, values: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{${key}}`, value)
  }
  return result
}

/** Build label helpers that work even when Payload `t()` does not interpolate `{name}`. */
export function createPayeeLabelHelpers(
  t: (key: 'custom:frontend:transactions:transferToAccountNamed' | 'custom:frontend:transactions:paymentToCreditNamed') => string,
) {
  const withName = (template: string, name: string) =>
    template.includes('{name}') ? template.replaceAll('{name}', name) : `${template} ${name}`.trim()

  return {
    transferTo: (name: string) =>
      withName(t('custom:frontend:transactions:transferToAccountNamed'), name),
    paymentToCredit: (name: string) =>
      withName(t('custom:frontend:transactions:paymentToCreditNamed'), name),
  }
}

export function buildPayeeTransferOptions(
  accounts: Account[],
  labels: { transferTo: (name: string) => string; paymentToCredit: (name: string) => string },
  budgetId?: string,
  excludeAccountId?: string,
): RelationshipFilterOption[] {
  const filtered = budgetId
    ? accounts.filter((account) => getCollectionId(account.budget) === budgetId)
    : accounts

  const result: RelationshipFilterOption[] = []

  for (const account of filtered) {
    if (account.id === excludeAccountId) continue

    if (account.classification === 'asset' && account.subtype !== 'credit_card') {
      result.push({
        id: toPayeeTransferId(account.id),
        label: payeeLabelForTransferAccount(account, labels),
        group: PAYEE_TRANSFER_GROUP,
      })
    }
  }

  for (const account of filtered) {
    if (account.id === excludeAccountId) continue

    if (isCreditCardAccount(account)) {
      result.push({
        id: toPayeeTransferId(account.id),
        label: payeeLabelForTransferAccount(account, labels),
        group: PAYEE_TRANSFER_GROUP,
      })
    }
  }

  return result
}

export function buildPayeeMerchantOptions(
  memos: string[],
  query = '',
): RelationshipFilterOption[] {
  const q = query.trim().toLowerCase()
  const unique = [...new Set(memos.map((memo) => memo.trim()).filter(Boolean))]

  const filtered = q
    ? unique.filter((memo) => memo.toLowerCase().includes(q))
    : unique

  return filtered
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map((memo) => ({
      id: memo,
      label: memo,
      group: PAYEE_MERCHANT_GROUP,
    }))
}

export function payeeDisplayLabel(
  value: string,
  accounts: Account[],
  labels: { transferTo: (name: string) => string; paymentToCredit: (name: string) => string },
): string {
  if (!value) return ''

  if (isPayeeTransferId(value)) {
    const account = findAccount(accounts, payeeTransferAccountId(value))
    if (account) return payeeLabelForTransferAccount(account, labels)
    return value
  }

  return value
}

export function payeeValueFromTransaction(transaction: Transaction): string {
  if (transaction.type !== 'transfer') {
    return transaction.memo ?? ''
  }

  const form = splitFormFromEntries(transactionEntries(transaction))
  const transfer = form.splits.find((split) => isPayeeTransferId(split.payee))

  if (transfer?.payee) {
    return transfer.payee
  }

  return transaction.memo ?? ''
}

export function transferDestinationFromPayee(payeeValue: string): string | null {
  if (!isPayeeTransferId(payeeValue)) return null
  return payeeTransferAccountId(payeeValue)
}

type PayeeSplitLike = { payee: string }

/** Whether the current payee / split rows represent a transfer (not persisted transaction.type). */
export function isTransferFromPayee(
  payeeValue: string,
  splits: PayeeSplitLike[] = [],
): boolean {
  if (isPayeeTransferId(payeeValue)) return true
  return splits.some((split) => isPayeeTransferId(split.payee))
}

export function resolveTransactionTypeFromPayee(
  payeeValue: string,
  splits: PayeeSplitLike[] = [],
): Transaction['type'] {
  return isTransferFromPayee(payeeValue, splits) ? 'transfer' : 'transaction'
}

/**
 * Placeholder until payee→category rules (last used, most used, merchant defaults, …).
 * Prefer the first spending category in the budget.
 */
export function defaultCategoryIdForPayee(categories: Category[], budgetId: string): string {
  const inBudget = categories.filter((category) => getCollectionId(category.budget) === budgetId)
  const spending = inBudget.find((category) => category.purpose === 'spending')
  return spending?.id ?? inBudget[0]?.id ?? ''
}

/** Fallback when only grouped picker options are available (e.g. register row). */
export function defaultCategoryIdFromPickerOptions(options: { id: string }[]): string {
  return options[0]?.id ?? ''
}
