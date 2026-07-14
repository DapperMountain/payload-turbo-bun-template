import { getCollectionId } from './getCollectionId'
import type { AuthPrincipal } from './isAppUser'
import { isAppUser } from './isAppUser'
import { BUDGET_WRITER_ROLES, type BudgetId, type BudgetRole } from './budgetRole'

type RoleFilter = BudgetRole | readonly BudgetRole[]

function matchesRoleFilter(rowRoles: BudgetRole[] | null | undefined, role?: RoleFilter): boolean {
  if (!role) return true
  if (!rowRoles?.length) return false

  const wanted = typeof role === 'string' ? [role] : role
  return wanted.some((value) => rowRoles.includes(value))
}

/** Budget ids from `user.budgets`, optionally filtered by role(s). */
export const getUserBudgetIds = (
  user: AuthPrincipal | null | undefined,
  role?: RoleFilter,
): BudgetId[] => {
  if (!isAppUser(user) || !user.budgets?.length) return []

  return user.budgets
    .filter(({ roles }) => matchesRoleFilter(roles as BudgetRole[] | undefined, role))
    .map(({ budget }) => getCollectionId(budget))
    .filter((id): id is BudgetId => Boolean(id))
}

/** Whether the user may write budget-scoped content (admin or member). */
export const getUserWritableBudgetIds = (user: AuthPrincipal | null | undefined): BudgetId[] =>
  getUserBudgetIds(user, BUDGET_WRITER_ROLES)
