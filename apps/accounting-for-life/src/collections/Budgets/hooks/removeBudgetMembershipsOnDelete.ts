import type { CollectionBeforeDeleteHook } from 'payload'

import { getCollectionId } from '@/utils/getCollectionId'
import type { Budget } from '@/types'

/**
 * Clear `user.budgets[]` rows that point at this budget before delete
 * (array relationship rows are NOT NULL and block CASCADE).
 */
export const removeBudgetMembershipsOnDelete: CollectionBeforeDeleteHook = async ({
  id,
  req,
}) => {
  const budgetId = String(id)

  const members = await req.payload.find({
    collection: 'users',
    where: { 'budgets.budget': { equals: budgetId } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
    req,
  })

  for (const member of members.docs) {
    const next = (member.budgets ?? []).filter(
      (row) => getCollectionId(row.budget) !== budgetId,
    )

    await req.payload.update({
      collection: 'users',
      id: member.id,
      data: { budgets: next },
      overrideAccess: true,
      req,
    })
  }
}

// Keep type reference for Payload collection hooks generics.
export type RemoveBudgetMembershipsOnDelete = CollectionBeforeDeleteHook<Budget>
