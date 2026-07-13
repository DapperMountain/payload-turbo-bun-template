import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import { isWorkspaceContent } from '@/access/workspaces'

import { workspaceContentAccess } from './workspaceContent'

/** Members create and read journal entries; only system admins delete. */
export const journalEntriesAccess = {
  ...workspaceContentAccess,
  create: requireOne(isSystemAdmin, isWorkspaceContent),
  update: requireOne(isSystemAdmin, isWorkspaceContent),
  delete: isSystemAdmin,
}
