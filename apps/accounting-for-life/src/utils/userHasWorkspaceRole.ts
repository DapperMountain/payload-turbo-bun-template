import type { Workspace } from '@/types'

import { getCollectionId } from './getCollectionId'
import type { AuthPrincipal } from './isAppUser'
import { isAppUser } from './isAppUser'
import type { WorkspaceRole } from './workspaceRole'

/**
 * Whether the user belongs to a workspace, optionally with a specific role.
 */
export const userHasWorkspaceRole = (
  user: AuthPrincipal | null | undefined,
  workspaceId: Workspace['id'],
  role?: WorkspaceRole,
): boolean => {
  if (!isAppUser(user) || !user.workspaces?.length) {
    return false
  }

  return user.workspaces.some((row) => {
    const id = getCollectionId(row.workspace)

    if (!id || id !== workspaceId) {
      return false
    }

    return !role || row.roles.includes(role)
  })
}
