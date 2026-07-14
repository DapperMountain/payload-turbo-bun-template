import type { Access, AccessArgs, AccessResult } from 'payload'

import { withAuth } from '@/access/helpers'
import {
  BUDGET_WRITER_ROLES,
  getCollectionId,
  userHasBudgetRole,
  type BudgetRole,
} from '@/utils'

import { budgetContentScope, budgetContentWriterScope } from './budgetContentScope'

type BudgetFieldData = {
  budget?: string | { id: string } | null
}

const budgetIdFromData = (data: unknown): string | undefined => {
  if (!data || typeof data !== 'object' || !('budget' in data)) return undefined
  const budget = (data as BudgetFieldData).budget
  if (budget == null) return undefined
  return getCollectionId(budget)
}

/**
 * Create access for budget-owned collections.
 *
 * Payload treats a create `Where` as allow-all, so membership must be a boolean
 * check against the body `budget` field (API authority — not the cookie).
 */
export const canCreateOnBudget =
  (role: BudgetRole | readonly BudgetRole[] = BUDGET_WRITER_ROLES): Access =>
  withAuth(({ req: { user }, data }: AccessArgs): AccessResult => {
    const budgetId = budgetIdFromData(data)
    if (!budgetId) return false
    return userHasBudgetRole(user, budgetId, role)
  })

/**
 * Update access: document `Where` by membership, plus boolean check when body
 * reassigns `budget`.
 */
export const canUpdateOnBudget =
  (role?: BudgetRole | readonly BudgetRole[]): Access =>
  withAuth(async (args: AccessArgs): Promise<AccessResult> => {
    const nextBudgetId = budgetIdFromData(args.data)
    if (nextBudgetId) {
      const allowedRoles = role ?? BUDGET_WRITER_ROLES
      if (!userHasBudgetRole(args.req.user, nextBudgetId, allowedRoles)) {
        return false
      }
    }

    if (role === undefined) {
      return budgetContentWriterScope()(args)
    }

    return budgetContentScope(role)(args)
  })
