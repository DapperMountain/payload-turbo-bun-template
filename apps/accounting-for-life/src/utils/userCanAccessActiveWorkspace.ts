import type { Workspace } from '@/types'
import type { PayloadRequest } from 'payload'

import { getWorkspaceFromCookie } from './getWorkspaceFromCookie'
import type { WorkspaceRole } from './workspaceRole'
import { userHasWorkspaceRole } from './userHasWorkspaceRole'

type Args = Pick<PayloadRequest, 'headers' | 'payload' | 'user'>

/**
 * Whether the user may act in the admin-selected workspace (`payload-tenant` cookie).
 */
export const userCanAccessActiveWorkspace = (req: Args, role?: WorkspaceRole): boolean => {
  const idType = req.payload.db.defaultIDType === 'number' ? 'number' : 'text'
  const workspaceId = getWorkspaceFromCookie(req.headers, idType)

  if (workspaceId == null || workspaceId === '') {
    return false
  }

  return userHasWorkspaceRole(req.user, workspaceId as Workspace['id'], role)
}
