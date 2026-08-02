import type { RelationshipFilterOption } from '@/lib/filters/relationship-options'
import { isSystemPnlAccount } from '@/lib/frontend/system-pnl-accounts'
import { merchantPayeesFromEntries, transactionEntries } from '@/lib/frontend/transactions.display'
import { splitFormFromEntries } from '@/lib/frontend/transaction-splits'
import type { AmountDirection } from '@/lib/frontend/transaction-amount-direction'
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
        accountIcon: {
          subtype: account.subtype,
          classification: account.classification,
        },
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
        accountIcon: {
          subtype: account.subtype,
          classification: account.classification,
        },
      })
    }
  }

  return result
}

export function buildPayeeMerchantOptions(
  payees: string[],
  query = '',
): RelationshipFilterOption[] {
  const q = query.trim().toLowerCase()
  const unique = [...new Set(payees.map((payee) => payee.trim()).filter(Boolean))]

  const filtered = q
    ? unique.filter((payee) => payee.toLowerCase().includes(q))
    : unique

  return filtered
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map((payee) => ({
      id: payee,
      label: payee,
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

export type TransferAccountPair = {
  source: Account
  destination: Account
}

export type TransferPayeePresentation = TransferAccountPair & {
  /** Relative to the viewing/payment account when known. */
  mode: 'outbound' | 'inbound' | 'pair'
  isPayment: boolean
}

/**
 * Resolve who money left and who received it for a transfer (or card payment).
 *
 * Prefers the transfer payee destination + the other posted leg / payment account.
 */
export function resolveTransferPair(
  accounts: Account[],
  options: {
    transaction?: Pick<Transaction, 'entries' | 'entryJoin' | 'type'> | null
    payeeValue?: string
    paymentAccountId?: string | null
  },
): TransferAccountPair | null {
  const payeeValue =
    options.payeeValue ??
    (options.transaction ? payeeValueFromTransaction(options.transaction as Transaction) : '')

  const destinationId = transferDestinationFromPayee(payeeValue)
  const lineAccountIds = options.transaction
    ? transactionEntries(options.transaction as Transaction)
        .map((entry) => getCollectionId(entry.account))
        .filter((id): id is string => Boolean(id))
    : []

  let sourceId: string | null = null
  let resolvedDestinationId = destinationId

  if (resolvedDestinationId) {
    sourceId =
      options.paymentAccountId && options.paymentAccountId !== resolvedDestinationId
        ? options.paymentAccountId
        : (lineAccountIds.find((id) => {
            if (id === resolvedDestinationId) return false
            // Skip system Income/Expense chart accounts — not user-facing transfer sides.
            return !isSystemPnlAccount(findAccount(accounts, id))
          }) ?? null)
  } else if (lineAccountIds.length >= 2) {
    const lines = transactionEntries(options.transaction as Transaction)
    const outflow = lines.find(
      (entry) =>
        entry.amount < 0 && !isSystemPnlAccount(findAccount(accounts, getCollectionId(entry.account) ?? '')),
    )
    const inflow = lines.find(
      (entry) =>
        entry.amount > 0 && !isSystemPnlAccount(findAccount(accounts, getCollectionId(entry.account) ?? '')),
    )
    sourceId = getCollectionId(outflow?.account) ?? lineAccountIds[0] ?? null
    resolvedDestinationId = getCollectionId(inflow?.account) ?? lineAccountIds[1] ?? null
  }

  if (!sourceId || !resolvedDestinationId || sourceId === resolvedDestinationId) {
    return null
  }

  const source = findAccount(accounts, sourceId)
  const destination = findAccount(accounts, resolvedDestinationId)
  if (!source || !destination) return null
  if (isSystemPnlAccount(source) || isSystemPnlAccount(destination)) return null

  return { source, destination }
}

/** How to render a transfer relative to the account being viewed (or payment account). */
export function transferPayeePresentation(
  pair: TransferAccountPair,
  viewingAccountId?: string | null,
  /** When set, inflow reverses the arrow vs the structural source→destination pair. */
  amountDirection?: AmountDirection | null,
): TransferPayeePresentation {
  const isPayment = isCreditCardAccount(pair.destination)

  let source = pair.source
  let destination = pair.destination
  let mode: TransferPayeePresentation['mode'] = 'pair'

  if (viewingAccountId && viewingAccountId === pair.source.id) {
    mode = 'outbound'
  } else if (viewingAccountId && viewingAccountId === pair.destination.id) {
    mode = 'inbound'
  }

  if (amountDirection === 'inflow' && mode !== 'pair') {
    ;[source, destination] = [destination, source]
    mode = mode === 'outbound' ? 'inbound' : 'outbound'
  }

  return { source, destination, mode, isPayment }
}

/**
 * Payee picker value for a stored transaction — derived from entries only.
 * Prefers an entry merchant; otherwise synthesizes `__transfer__:dest` from the
 * reverse-projected two-leg wallet book (works for `type: transfer` and for
 * wallet↔wallet books still typed as `transaction`).
 */
export function payeeValueFromTransaction(transaction: Transaction): string {
  const entries = transactionEntries(transaction)
  const merchant = merchantPayeesFromEntries(entries)[0]
  if (merchant) return merchant

  const form = splitFormFromEntries(entries)
  const transfer = form.splits.find((split) => isPayeeTransferId(split.payee))
  return transfer?.payee ?? ''
}

export function transferDestinationFromPayee(payeeValue: string): string | null {
  if (!isPayeeTransferId(payeeValue)) return null
  return payeeTransferAccountId(payeeValue)
}

/** True when payee is a transfer to the same account as the payment/source account. */
export function isTransferToSameAccount(
  paymentAccountId: string | null | undefined,
  payeeValue: string,
): boolean {
  if (!paymentAccountId) return false
  const destinationId = transferDestinationFromPayee(payeeValue)
  return Boolean(destinationId && destinationId === paymentAccountId)
}

type PayeeSplitLike = { payee: string }

/**
 * Whether the current payee / split rows represent a pure transfer.
 * Mixed category + transfer allocate rows stay a normal transaction — journals that
 * reverse-project wallet legs as `__transfer__` splits must not flip the whole row.
 */
export function isTransferFromPayee(
  payeeValue: string,
  splits: PayeeSplitLike[] = [],
): boolean {
  if (isPayeeTransferId(payeeValue)) return true
  if (splits.length === 0) return false
  return splits.every((split) => isPayeeTransferId(split.payee))
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
