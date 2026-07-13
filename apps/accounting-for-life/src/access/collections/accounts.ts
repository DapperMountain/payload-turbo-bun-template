import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import { isWorkspaceContent, isWorkspaceContentAdmin } from '@/access/workspaces'

import { workspaceContentAccess } from './workspaceContent'

/** Members manage on-budget accounts; admins retain full workspace control. */
export const accountsAccess = {
  ...workspaceContentAccess,
  create: requireOne(isSystemAdmin, isWorkspaceContent),
  update: requireOne(isSystemAdmin, isWorkspaceContent),
  delete: requireOne(isSystemAdmin, isWorkspaceContentAdmin),
}
