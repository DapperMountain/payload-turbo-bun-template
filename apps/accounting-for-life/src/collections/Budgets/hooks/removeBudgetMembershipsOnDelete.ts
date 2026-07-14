import type { CollectionBeforeDeleteHook } from 'payload'

import { getCollectionId } from '@/utils/getCollectionId'
import type { Budget } from '@/types'

/**
 * Clear live `user.budgets[]` rows that point at this budget before permanent
 * delete (array FKs are NOT NULL). Soft-delete (`trash`) only sets `deletedAt`
 * and does not run this hook — memberships stay so restore keeps access.
 *
 * User version history may still reference the budget; Empty trash can require
 * system-admin handling until those FKs are cascaded in schema.
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
