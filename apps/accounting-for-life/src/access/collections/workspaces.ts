import type { CollectionConfig } from 'payload'

import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import { isWorkspace, isWorkspaceAdmin } from '@/access/workspaces'

/**
 * Access control for the `workspaces` collection.
 *
 * **Read** — System admins see all workspaces. Members see only workspaces they belong to.
 *
 * **Update** — System admins: all rows; workspace admins: `WORKSPACE_ADMIN` scope only.
 *
 * **Create / delete** — System administrators only.
 */
export const workspacesReadAccess = requireOne(isSystemAdmin, isWorkspace)

export const workspacesAccess: NonNullable<CollectionConfig['access']> = {
  read: workspacesReadAccess,
  create: isSystemAdmin,
  update: isWorkspaceAdmin,
  delete: isSystemAdmin,
}
