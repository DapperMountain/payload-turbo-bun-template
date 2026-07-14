import type { Budget } from '@/types'

import type { AuthPrincipal } from './isAppUser'
import { userHasBudgetRole } from './userHasBudgetRole'

export const userBelongsToBudget = (
  user: AuthPrincipal | null | undefined,
  budgetId: Budget['id'],
): boolean => userHasBudgetRole(user, budgetId)

export const userIsBudgetAdmin = (
  user: AuthPrincipal | null | undefined,
  budgetId?: Budget['id'],
): boolean => {
  if (budgetId) {
    return userHasBudgetRole(user, budgetId, 'BUDGET_ADMIN')
  }

  if (!user || !('budgets' in user) || !user.budgets?.length) return false
  return user.budgets.some((row) => (row.roles as string[]).includes('BUDGET_ADMIN'))
}
