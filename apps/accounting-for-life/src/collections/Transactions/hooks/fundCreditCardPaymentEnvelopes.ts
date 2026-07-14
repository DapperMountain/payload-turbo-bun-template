import type { PayloadRequest } from 'payload'

import { transactionDatePart } from '@/lib/frontend/transaction-datetime'
import type { Transaction } from '@/types'
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

  for (const line of lines) {
    const categoryId = line.category ? String(line.category) : ''
    if (!categoryId || !line.account) continue

    const magnitude = Math.abs(Number(line.amount) || 0)
    if (magnitude === 0) continue

    const account = await req.payload.findByID({
      collection: 'accounts',
      id: line.account,
      depth: 0,
      overrideAccess: true,
      req,
    })

    if (account.subtype !== 'credit_card') continue

    const paymentCategoryId = getCollectionId(account.category)
    if (!paymentCategoryId || paymentCategoryId === categoryId) continue

    const spendCategory = await req.payload.findByID({
      collection: 'categories',
      id: categoryId,
      depth: 0,
      overrideAccess: true,
      req,
    })

    if (spendCategory.purpose !== 'spending') continue

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
