import type { PayloadRequest } from 'payload'

import { transactionDatePart } from '@/lib/frontend/transaction-datetime'
import type { Account, Transaction } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

export type CreditCardFundingLine = {
  account: string
  amount: number
  category?: string | null
}

/**
 * YNAB: credit card purchases move budget coverage into the card's payment envelope.
 *
 * Increases (or reverses) `envelope-balances.assigned` on the linked payment category for
 * the transaction month. Ledger lines stay untouched — this is budget-layer bookkeeping.
 */
export async function adjustCreditCardPaymentFunding(
  req: PayloadRequest,
  transaction: Pick<Transaction, 'date' | 'budget' | 'workspace' | 'type' | 'status'>,
  lines: CreditCardFundingLine[],
  direction: 1 | -1,
): Promise<void> {
  if (transaction.type === 'transfer' || transaction.type === 'opening_balance') {
    return
  }

  if (transaction.status && transaction.status !== 'posted') {
    return
  }

  const budgetId = getCollectionId(transaction.budget)
  const workspaceId = getCollectionId(transaction.workspace)
  if (!budgetId || !workspaceId) return

  const datePart = transactionDatePart(transaction.date)
  if (!datePart) return

  const [yearText, monthText] = datePart.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  if (!Number.isFinite(year) || !Number.isFinite(month)) return

  const deltas = new Map<string, number>()
  const accountCache = new Map<string, Account>()

  async function loadAccount(accountId: string): Promise<Account> {
    const cached = accountCache.get(accountId)
    if (cached) return cached
    const account = await req.payload.findByID({
      collection: 'accounts',
      id: accountId,
      depth: 0,
      overrideAccess: true,
      req,
    })
    accountCache.set(accountId, account)
    return account
  }

  /**
   * Classical DE: category sits on the system expense account; the credit-card
   * cash/liability leg is a sibling. Legacy twins put category on the card itself.
   */
  async function resolveCreditCardForFunding(line: CreditCardFundingLine) {
    if (!line.account) return null

    const direct = await loadAccount(line.account)
    if (direct.subtype === 'credit_card') return direct

    const lineSign = Math.sign(Number(line.amount) || 0)
    for (const other of lines) {
      if (!other.account || other.account === line.account) continue
      if (Math.sign(Number(other.amount) || 0) === lineSign) continue
      const sibling = await loadAccount(other.account)
      if (sibling.subtype === 'credit_card') return sibling
    }

    return null
  }

  for (const line of lines) {
    const categoryId = line.category ? String(line.category) : ''
    if (!categoryId || !line.account) continue

    const magnitude = Math.abs(Number(line.amount) || 0)
    if (magnitude === 0) continue

    const spendCategory = await req.payload.findByID({
      collection: 'categories',
      id: categoryId,
      depth: 0,
      overrideAccess: true,
      req,
    })

    if (spendCategory.purpose !== 'spending') continue

    const card = await resolveCreditCardForFunding(line)
    if (!card) continue

    const paymentCategoryId = getCollectionId(card.category)
    if (!paymentCategoryId || paymentCategoryId === categoryId) continue

    deltas.set(
      paymentCategoryId,
      (deltas.get(paymentCategoryId) ?? 0) + magnitude * direction,
    )
  }

  for (const [categoryId, delta] of deltas) {
    if (Math.abs(delta) < 1e-9) continue
    await applyAssignedDelta(req, {
      budgetId,
      workspaceId,
      categoryId,
      year,
      month,
      delta,
    })
  }
}

async function applyAssignedDelta(
  req: PayloadRequest,
  options: {
    budgetId: string
    workspaceId: string
    categoryId: string
    year: number
    month: number
    delta: number
  },
): Promise<void> {
  const existing = await req.payload.find({
    collection: 'envelope-balances',
    where: {
      and: [
        { budget: { equals: options.budgetId } },
        { category: { equals: options.categoryId } },
        { year: { equals: options.year } },
        { month: { equals: options.month } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })

  const current = existing.docs[0]
  if (current) {
    await req.payload.update({
      collection: 'envelope-balances',
      id: current.id,
      data: { assigned: (current.assigned ?? 0) + options.delta },
      overrideAccess: true,
      req,
    })
    return
  }

  await req.payload.create({
    collection: 'envelope-balances',
    data: {
      workspace: options.workspaceId,
      budget: options.budgetId,
      category: options.categoryId,
      year: options.year,
      month: options.month,
      assigned: options.delta,
    },
    overrideAccess: true,
    req,
  })
}

export function fundingLinesFromEntries(
  entries: { account: unknown; amount: number; category?: unknown }[],
): CreditCardFundingLine[] {
  return entries.map((entry) => ({
    account: getCollectionId(entry.account) ?? '',
    amount: entry.amount,
    category: getCollectionId(entry.category),
  }))
}
