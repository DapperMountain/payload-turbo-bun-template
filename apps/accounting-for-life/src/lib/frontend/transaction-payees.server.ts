import 'server-only'

import type { Payload } from 'payload'

import type { User } from '@/types'
import { getCollectionId } from '@/utils'

/** Distinct merchant payee names (transaction memos) grouped by budget. */
export async function findPayeeMemosByBudget(
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
    const memo = transaction.memo?.trim()
    if (!memo) continue

    const budgetId = getCollectionId(transaction.budget)
    if (!budgetId) continue

    const memos = byBudget.get(budgetId) ?? new Set<string>()
    memos.add(memo)
    byBudget.set(budgetId, memos)
  }

  const out: Record<string, string[]> = {}
  for (const [budgetId, memos] of byBudget) {
    out[budgetId] = [...memos].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }

  return out
}
