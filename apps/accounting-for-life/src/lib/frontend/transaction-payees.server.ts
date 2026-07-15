import 'server-only'

import type { Payload } from 'payload'

import type { User } from '@/types'
import { getCollectionId } from '@/utils'

/** Distinct merchant payee names grouped by budget. */
export async function findPayeesByBudget(
  payload: Payload,
  options: { user: User; workspaceId: string },
): Promise<Record<string, string[]>> {
  const result = await payload.find({
    collection: 'transactions',
    where: {
      and: [
        { workspace: { equals: options.workspaceId } },
        { type: { not_equals: 'transfer' } },
      ],
    },
    limit: 1000,
    depth: 0,
    sort: '-date',
    user: options.user,
    overrideAccess: false,
    pagination: false,
  })

  const byBudget = new Map<string, Set<string>>()

  for (const transaction of result.docs) {
    const payee = transaction.payee?.trim()
    if (!payee) continue

    const budgetId = getCollectionId(transaction.budget)
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
