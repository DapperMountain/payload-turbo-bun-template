import type { Workspace, User } from '@/types'

import { userHasWorkspaceRole } from './userHasWorkspaceRole'

/** Whether the user is a member of the workspace (any workspace role). */
export const userBelongsToWorkspace = (
  user: User | null | undefined,
  workspaceId: Workspace['id'],
): boolean => userHasWorkspaceRole(user, workspaceId)
