import type { Workspace } from '@/types'

import type { AuthPrincipal } from './isAppUser'
import { getUserWorkspaceIds } from './getUserWorkspaceIds'
import { userHasWorkspaceRole } from './userHasWorkspaceRole'

/**
 * Whether the user has the `WORKSPACE_ADMIN` role on a workspace.
 */
export const userIsWorkspaceAdmin = (
  user: AuthPrincipal | null | undefined,
  workspaceId?: Workspace['id'],
): boolean =>
  workspaceId !== undefined
    ? userHasWorkspaceRole(user, workspaceId, 'WORKSPACE_ADMIN')
    : getUserWorkspaceIds(user, 'WORKSPACE_ADMIN').length > 0
