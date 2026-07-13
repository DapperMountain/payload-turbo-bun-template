import { withAuth } from '@/access/helpers'
import { getUserWorkspaceIds, type WorkspaceRole } from '@/utils'
import type { Access } from 'payload'

/** Plugin relationship field on workspace-scoped collections. */
export const workspaceFieldName = 'workspace' as const

/**
 * Row-level access for workspace-owned documents (plugin `workspace` relationship field).
 *
 * When `useTenantAccess: true` on a collection, the plugin also adds a membership filter.
 *
 * @param role - When set, only memberships whose `roles` include this value count.
 * @param workspaceField - Relationship field name (default `workspace`).
 */
export const workspaceContentScope =
  (role?: WorkspaceRole, workspaceField = workspaceFieldName): Access =>
  withAuth(({ req: { user } }) => {
    const workspaceIds = getUserWorkspaceIds(user, role)

    return workspaceIds.length ? { [workspaceField]: { in: workspaceIds } } : false
  })
