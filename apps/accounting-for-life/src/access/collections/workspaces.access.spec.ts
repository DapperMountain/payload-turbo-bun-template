import { describe, it } from 'bun:test'

import { workspacesAccess } from '@/access/collections'
import {
  accessArgs,
  expectAccess,
  systemAdminUser,
  userWithoutWorkspaces,
  workspaceAdminUser,
  workspaceMemberUser,
} from '@/access/test'

describe('workspacesAccess', () => {
  describe('read', () => {
    const read = workspacesAccess.read!

    it('allows system admins to read all workspaces', async () => {
      await expectAccess(read, systemAdminUser, true)
    })

    it('allows workspace members to read only their workspaces', async () => {
      await expectAccess(read, workspaceMemberUser, { id: { in: ['workspace-a'] } })
    })

    it('allows workspace admins to read only their administered workspaces', async () => {
      await expectAccess(read, workspaceAdminUser, { id: { in: ['workspace-a'] } })
    })

    it('denies users with no workspace memberships', async () => {
      await expectAccess(read, userWithoutWorkspaces, false)
    })

    it('denies unauthenticated requests', async () => {
      await expectAccess(read, null, false)
    })
  })

  describe('update', () => {
    const update = workspacesAccess.update!

    it('allows system admins to update any workspace', async () => {
      await expectAccess(update, systemAdminUser, true)
    })

    it('scopes workspace admins to workspaces where they hold WORKSPACE_ADMIN', async () => {
      await expectAccess(update, workspaceAdminUser, { id: { in: ['workspace-a'] } })
    })

    it('denies workspace members without WORKSPACE_ADMIN', async () => {
      await expectAccess(update, workspaceMemberUser, false)
    })
  })
})
