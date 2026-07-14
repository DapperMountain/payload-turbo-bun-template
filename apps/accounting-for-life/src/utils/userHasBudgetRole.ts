import type { Budget } from '@/types'

import { getCollectionId } from './getCollectionId'
import type { AuthPrincipal } from './isAppUser'
import { isAppUser } from './isAppUser'
import type { BudgetRole } from './budgetRole'

/**
 * Whether the user belongs to a budget, optionally with a specific role (or any of several).
 */
export const userHasBudgetRole = (
  user: AuthPrincipal | null | undefined,
  budgetId: Budget['id'],
  role?: BudgetRole | readonly BudgetRole[],
): boolean => {
  if (!isAppUser(user) || !user.budgets?.length) {
    return false
  }

  return user.budgets.some((row) => {
    const id = getCollectionId(row.budget)
    if (!id || id !== budgetId) return false

    if (!role) return true

    const wanted = typeof role === 'string' ? [role] : role
    return wanted.some((value) => (row.roles as BudgetRole[]).includes(value))
  })
}
