import 'server-only'

import type { Payload } from 'payload'

import type { User } from '@/types'
import { getCollectionId } from '@/utils'

/**
 * Distinct merchant payee names grouped by budget.
 * Payees live on entry legs only, so the budget comes from each entry's transaction.
 */
export async function findPayeesByBudget(
  payload: Payload,
  options: { user: User; workspaceId: string },
): Promise<Record<string, string[]>> {
  const transactions = await payload.find({
    collection: 'transactions',
    where: { workspace: { equals: options.workspaceId } },
    limit: 1000,
    depth: 0,
    sort: '-date',
    user: options.user,
    overrideAccess: false,
    pagination: false,
  })

  const budgetByTransaction = new Map<string, string>()
  for (const transaction of transactions.docs) {
    const budgetId = getCollectionId(transaction.budget)
    if (budgetId) budgetByTransaction.set(transaction.id, budgetId)
  }

  const entries = await payload.find({
    collection: 'transaction-entries',
    where: {
      and: [{ workspace: { equals: options.workspaceId } }, { payee: { exists: true } }],
    },
    limit: 5000,
    depth: 0,
    user: options.user,
    overrideAccess: false,
    pagination: false,
  })

  const byBudget = new Map<string, Set<string>>()

  for (const entry of entries.docs) {
    const payee = entry.payee?.trim()
    if (!payee) continue

    const transactionId = getCollectionId(entry.transaction)
    const budgetId = transactionId ? budgetByTransaction.get(transactionId) : undefined
    if (!budgetId) continue

    const names = byBudget.get(budgetId) ?? new Set<string>()
    names.add(payee)
    byBudget.set(budgetId, names)
  }

  const out: Record<string, string[]> = {}
  for (const [budgetId, names] of byBudget) {
    out[budgetId] = [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }

  return out
}
