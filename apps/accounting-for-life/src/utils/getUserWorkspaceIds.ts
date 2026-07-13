import type { Workspace } from '@/types'

import { getCollectionId } from './getCollectionId'
import type { AuthPrincipal } from './isAppUser'
import { isAppUser } from './isAppUser'
import type { WorkspaceRole } from './workspaceRole'

/**
 * Workspace ids assigned to a user via `user.workspaces`.
 *
 * @param user - The user object containing workspace relationships.
 * @param role - Optional role filter on membership rows.
 */
export const getUserWorkspaceIds = (
  user: AuthPrincipal | null | undefined,
  role?: WorkspaceRole,
): Workspace['id'][] => {
  if (!isAppUser(user) || !user.workspaces?.length) return []

  return user.workspaces
    .filter(({ roles }) => !role || roles.includes(role))
    .map(({ workspace }) => getCollectionId(workspace))
    .filter((id): id is Workspace['id'] => Boolean(id))
}
