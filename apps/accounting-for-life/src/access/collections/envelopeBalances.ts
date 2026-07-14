import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import { isWorkspaceContent } from '@/access/workspaces'

import { workspaceContentAccess } from './workspaceContent'

/** Members assign monthly envelope amounts; delete stays admin-only. */
export const envelopeBalancesAccess = {
  ...workspaceContentAccess,
  create: requireOne(isSystemAdmin, isWorkspaceContent),
  update: requireOne(isSystemAdmin, isWorkspaceContent),
}
