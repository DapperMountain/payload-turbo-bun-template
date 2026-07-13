import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import { isWorkspaceContent } from '@/access/workspaces'

import { workspaceContentAccess } from './workspaceContent'

/** Members create, update, and delete transactions in their workspace. */
export const transactionsAccess = {
  ...workspaceContentAccess,
  create: requireOne(isSystemAdmin, isWorkspaceContent),
  update: requireOne(isSystemAdmin, isWorkspaceContent),
  delete: requireOne(isSystemAdmin, isWorkspaceContent),
}
