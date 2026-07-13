import type { CollectionConfig } from 'payload'

import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import { isWorkspaceContent, isWorkspaceContentAdmin } from '@/access/workspaces'

/**
 * Starter access map for collections with a plugin `workspace` field.
 *
 * With `useTenantAccess: true`, the plugin also ANDs `{ workspace: { in: memberships } }`.
 */
export const workspaceContentReadAccess = requireOne(isSystemAdmin, isWorkspaceContent)

export const workspaceContentAccess: NonNullable<CollectionConfig['access']> = {
  read: workspaceContentReadAccess,
  create: requireOne(isSystemAdmin, isWorkspaceContentAdmin),
  update: requireOne(isSystemAdmin, isWorkspaceContentAdmin),
  delete: isSystemAdmin,
}
