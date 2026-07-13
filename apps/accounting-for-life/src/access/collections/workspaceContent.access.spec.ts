import { describe, it } from 'bun:test'

import { workspaceContentAccess } from '@/access/collections'
import {
  expectAccess,
  systemAdminUser,
  workspaceAdminUser,
  workspaceMemberUser,
} from '@/access/test'

const workspaceScope = { workspace: { in: ['workspace-a'] } }

describe('workspaceContentAccess', () => {
  describe('read', () => {
    const read = workspaceContentAccess.read!

    it('allows system admins full access', async () => {
      await expectAccess(read, systemAdminUser, true)
    })

    it('scopes workspace members to their workspaces', async () => {
      await expectAccess(read, workspaceMemberUser, workspaceScope)
    })

    it('denies unauthenticated requests', async () => {
      await expectAccess(read, null, false)
    })
  })

  describe.each(['create', 'update'] as const)('%s', (operation) => {
    const access = workspaceContentAccess[operation]!

    it('allows system admins full access', async () => {
      await expectAccess(access, systemAdminUser, true)
    })

    it('scopes workspace admins to their workspaces', async () => {
      await expectAccess(access, workspaceAdminUser, workspaceScope)
    })

    it('denies workspace members without WORKSPACE_ADMIN', async () => {
      await expectAccess(access, workspaceMemberUser, false)
    })
  })

  describe('delete', () => {
    const del = workspaceContentAccess.delete!

    it.each([
      ['system admin', systemAdminUser, true],
      ['workspace admin', workspaceAdminUser, false],
      ['workspace member', workspaceMemberUser, false],
    ])('%s', async (_label, user, allowed) => {
      await expectAccess(del, user, allowed)
    })
  })
})
