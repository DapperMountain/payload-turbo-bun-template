import { describe, it } from 'bun:test'

import { journalEntriesAccess } from '@/access/collections'
import {
  expectAccess,
  systemAdminUser,
  workspaceMemberUser,
} from '@/access/test'

const workspaceScope = { workspace: { in: ['workspace-a'] } }

describe('journalEntriesAccess', () => {
  describe('read', () => {
    const read = journalEntriesAccess.read!

    it('scopes workspace members to their workspaces', async () => {
      await expectAccess(read, workspaceMemberUser, workspaceScope)
    })
  })

  describe.each(['create', 'update'] as const)('%s', (operation) => {
    const access = journalEntriesAccess[operation]!

    it('allows workspace members in their workspace', async () => {
      await expectAccess(access, workspaceMemberUser, workspaceScope)
    })
  })

  describe('delete', () => {
    const del = journalEntriesAccess.delete!

    it('allows only system admins', async () => {
      await expectAccess(del, systemAdminUser, true)
      await expectAccess(del, workspaceMemberUser, false)
    })
  })
})
