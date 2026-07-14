import type { AccessArgs, CollectionConfig } from 'payload'

import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import { isBudgetAdmin, isBudgetMember } from '@/access/budgets'
import { isWorkspaceContentAdmin } from '@/access/workspaces'
import type { Budget } from '@/types'

/**
 * Budgets themselves are membership-scoped; creating a budget still requires
 * workspace admin (then the create hook grants `BUDGET_ADMIN` to the creator).
 *
 * Delete distinguishes Payload trash vs permanent purge (`trash: true` on the
 * collection): budget admins may soft-delete; only system admins may empty trash.
 */
export const budgetsAccess: NonNullable<CollectionConfig['access']> = {
  read: requireOne(isSystemAdmin, isBudgetMember),
  create: requireOne(isSystemAdmin, isWorkspaceContentAdmin),
  update: requireOne(isSystemAdmin, isBudgetAdmin),
  delete: async (args: AccessArgs<Budget>) => {
    // Soft-delete sets `deletedAt`; permanent delete passes `data: undefined`.
    if (args.data?.deletedAt) {
      return requireOne(isSystemAdmin, isBudgetAdmin)(args)
    }

    return isSystemAdmin(args)
  },
}
