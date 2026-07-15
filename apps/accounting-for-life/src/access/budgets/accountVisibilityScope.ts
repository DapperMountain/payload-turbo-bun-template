import type { Access, Where } from 'payload'

import { withAuth } from '@/access/helpers'
import { getUserBudgetIds } from '@/utils'

/**
 * Builds a `Where` that limits rows by account visibility (US-3.2).
 *
 * - `all_members` (or missing): any budget membership
 * - `admins`: only budgets where the user is `BUDGET_ADMIN`
 *
 * @param accountField - Relationship path prefix to the account doc (`''` for
 *   the accounts collection itself; `'account'` for transaction-entries).
 */
export function accountVisibilityWhere(
  user: Parameters<typeof getUserBudgetIds>[0],
  accountField: '' | 'account' = '',
): Where | false {
  const allBudgetIds = getUserBudgetIds(user)
  if (!allBudgetIds.length) return false

  const adminBudgetIds = getUserBudgetIds(user, 'BUDGET_ADMIN')
  const budgetPath = accountField ? `${accountField}.budget` : 'budget'
  const visibilityPath = accountField ? `${accountField}.visibility` : 'visibility'

  const memberVisible: Where = {
    and: [
      { [budgetPath]: { in: allBudgetIds } },
      {
        or: [
          { [visibilityPath]: { equals: 'all_members' } },
          { [visibilityPath]: { exists: false } },
        ],
      },
    ],
  }

  if (!adminBudgetIds.length) return memberVisible

  return {
    or: [
      memberVisible,
      {
        and: [
          { [budgetPath]: { in: adminBudgetIds } },
          { [visibilityPath]: { equals: 'admins' } },
        ],
      },
    ],
  }
}

/**
 * Row-level read scope for `accounts` (budget membership ∩ visibility).
 */
export const accountVisibilityScope: Access = withAuth(({ req: { user } }) =>
  accountVisibilityWhere(user),
)

/**
 * Row-level read scope for `transaction-entries` via related account visibility.
 */
export const transactionEntryVisibilityScope: Access = withAuth(({ req: { user } }) =>
  accountVisibilityWhere(user, 'account'),
)

/**
 * Transaction headers visible when the user admins the budget, the txn is still
 * pending, or at least one entry joins an `all_members` (or unset) account.
 */
export const transactionVisibilityScope: Access = withAuth(({ req: { user } }) => {
  const allBudgetIds = getUserBudgetIds(user)
  if (!allBudgetIds.length) return false

  const adminBudgetIds = getUserBudgetIds(user, 'BUDGET_ADMIN')
  const clauses: Where[] = []

  if (adminBudgetIds.length) {
    clauses.push({ budget: { in: adminBudgetIds } })
  }

  clauses.push({
    and: [
      { budget: { in: allBudgetIds } },
      {
        or: [
          { 'entryJoin.account.visibility': { equals: 'all_members' } },
          { 'entryJoin.account.visibility': { exists: false } },
          { status: { equals: 'pending' } },
        ],
      },
    ],
  })

  return clauses.length === 1 ? clauses[0]! : { or: clauses }
})
