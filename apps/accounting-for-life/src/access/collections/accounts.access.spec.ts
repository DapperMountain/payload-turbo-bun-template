import { describe, it } from 'bun:test'

import { accountsAccess } from '@/access/collections'
import {
  expectAccess,
  systemAdminUser,
  workspaceAdminUser,
  workspaceMemberUser,
} from '@/access/test'

const workspaceScope = { workspace: { in: ['workspace-a'] } }

describe('accountsAccess', () => {
  describe('read', () => {
    const read = accountsAccess.read!

    it('allows system admins full access', async () => {
      await expectAccess(read, systemAdminUser, true)
    })

    it('scopes workspace members to their workspaces', async () => {
      await expectAccess(read, workspaceMemberUser, workspaceScope)
    })
  })

  describe.each(['create', 'update'] as const)('%s', (operation) => {
    const access = accountsAccess[operation]!

    it('allows system admins full access', async () => {
      await expectAccess(access, systemAdminUser, true)
    })

    it('allows workspace members in their workspace', async () => {
      await expectAccess(access, workspaceMemberUser, workspaceScope)
    })

    it('denies unauthenticated requests', async () => {
      await expectAccess(access, null, false)
    })
  })

  describe('delete', () => {
    const del = accountsAccess.delete!

    it('allows system admins', async () => {
      await expectAccess(del, systemAdminUser, true)
    })

    it('allows workspace admins in their workspace', async () => {
      await expectAccess(del, workspaceAdminUser, workspaceScope)
    })

    it('denies workspace members', async () => {
      await expectAccess(del, workspaceMemberUser, false)
    })
  })
})
