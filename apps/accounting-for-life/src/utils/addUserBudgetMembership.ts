import type { Payload, PayloadRequest } from 'payload'

import { getCollectionId } from '@/utils/getCollectionId'
import type { BudgetRole } from '@/utils/budgetRole'

/**
 * Append a budget membership on a user when missing (idempotent).
 * Does not remove or shrink existing roles on that budget.
 */
export async function addUserBudgetMembership(
  payload: Payload,
  options: {
    userId: string
    budgetId: string
    roles: BudgetRole[]
    req?: PayloadRequest
  },
): Promise<void> {
  const user = await payload.findByID({
    collection: 'users',
    id: options.userId,
    depth: 0,
    overrideAccess: true,
    req: options.req,
  })

  const existing = user.budgets ?? []
  const index = existing.findIndex(
    (row) => getCollectionId(row.budget) === options.budgetId,
  )

  if (index >= 0) {
    const current = existing[index]!
    const merged = [...new Set([...(current.roles ?? []), ...options.roles])] as BudgetRole[]
    if (merged.length === (current.roles?.length ?? 0)) return

    const next = existing.map((row, rowIndex) =>
      rowIndex === index ? { ...row, roles: merged } : row,
    )

    await payload.update({
      collection: 'users',
      id: options.userId,
      data: { budgets: next },
      overrideAccess: true,
      req: options.req,
    })
    return
  }

  await payload.update({
    collection: 'users',
    id: options.userId,
    data: {
      budgets: [...existing, { budget: options.budgetId, roles: options.roles }],
    },
    overrideAccess: true,
    req: options.req,
  })
}
