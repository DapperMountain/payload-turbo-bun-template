import { withAuth } from '@/access/helpers'
import { getUserWorkspaceIds, type WorkspaceRole } from '@/utils'
import type { Access } from 'payload'

/**
 * Row-level access limited to workspace documents the user belongs to.
 *
 * @param role - When set, only workspace memberships whose `roles` include this value count.
 */
export const workspaceScope =
  (role?: WorkspaceRole): Access =>
  withAuth(({ req: { user } }) => {
    const workspaceIds = getUserWorkspaceIds(user, role)

    return workspaceIds.length ? { id: { in: workspaceIds } } : false
  })
