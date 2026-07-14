import { withAuth } from '@/access/helpers'
import {
  getUserBudgetIds,
  getUserWritableBudgetIds,
  type BudgetRole,
} from '@/utils'
import type { Access } from 'payload'

/** Relationship field on budget-scoped collections. */
export const budgetFieldName = 'budget' as const

/**
 * Row-level access for documents with a `budget` relationship.
 *
 * @param role - When set, only memberships that include this role (or any listed) count.
 * @param budgetField - Relationship field name (default `budget`).
 */
export const budgetContentScope =
  (role?: BudgetRole | readonly BudgetRole[], budgetField = budgetFieldName): Access =>
  withAuth(({ req: { user } }) => {
    const budgetIds = getUserBudgetIds(user, role)
    return budgetIds.length ? { [budgetField]: { in: budgetIds } } : false
  })

/** Scope where the user may write budget content (admin or member). */
export const budgetContentWriterScope = (budgetField = budgetFieldName): Access =>
  withAuth(({ req: { user } }) => {
    const budgetIds = getUserWritableBudgetIds(user)
    return budgetIds.length ? { [budgetField]: { in: budgetIds } } : false
  })

/** Scope for the `budgets` collection itself (`id` in membership). */
export const budgetDocumentScope =
  (role?: BudgetRole | readonly BudgetRole[]): Access =>
  withAuth(({ req: { user } }) => {
    const budgetIds = getUserBudgetIds(user, role)
    return budgetIds.length ? { id: { in: budgetIds } } : false
  })
