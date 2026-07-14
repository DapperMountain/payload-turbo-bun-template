import type { CollectionConfig } from 'payload'

import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import { isBudgetAdmin, isBudgetMember } from '@/access/budgets'
import { isWorkspaceContentAdmin } from '@/access/workspaces'

/**
 * Budgets themselves are membership-scoped; creating a budget still requires
 * workspace admin (then the create hook grants `BUDGET_ADMIN` to the creator).
 */
export const budgetsAccess: NonNullable<CollectionConfig['access']> = {
  read: requireOne(isSystemAdmin, isBudgetMember),
  create: requireOne(isSystemAdmin, isWorkspaceContentAdmin),
  update: requireOne(isSystemAdmin, isBudgetAdmin),
  // Hard delete hits NOT NULL FKs on `users_budgets` / version arrays — system admin only for now.
  delete: isSystemAdmin,
}
